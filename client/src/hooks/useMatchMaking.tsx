import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { toast } from "sonner";
import {
  HEARTBEAT_INTERVAL_MS,
  MATCH_POLL_INTERVAL_MS,
  MATCH_POLL_WINDOW_MS,
  STALE_AFTER_MS,
  addCandidate,
  claimRoom,
  createRoom,
  deleteRoomTree,
  findWaitingRooms,
  publishAnswer,
  publishOffer,
  resetRoomForNextJoiner,
  sendHeartbeat,
  subscribeToCandidates,
  subscribeToRoom,
  sweepStaleRooms,
  type CandidateDoc,
  type ClaimResult,
  type Role,
  type RoomWithId,
  type SignalUser,
} from "@/firebase/rooms";
import { useWebRTC } from "@/hooks/useWebRTC";
import type { MediaMode } from "@/providers/WebRTCProvider";

export type ChatStatus =
  | "lobby"
  | "searching"
  | "waiting"
  | "connecting"
  | "matched";

/** Give up on a pairing whose SDP/ICE never converges. */
const NEGOTIATION_TIMEOUT_MS = 25_000;
/** Retry a signaling write that Firestore rejected before giving up. */
const SIGNAL_RETRY_MS = 3_000;
const SIGNAL_MAX_ATTEMPTS = 3;
/** A peer that briefly reports `disconnected` gets this long to come back. */
const DISCONNECT_GRACE_MS = 10_000;
/** How often we check that the stranger's heartbeat is still advancing. */
const PRESENCE_CHECK_INTERVAL_MS = 5_000;

type TimerKey =
  | "search"
  | "offer-retry"
  | "answer-retry"
  | "negotiation"
  | "disconnect"
  | "presence";

interface Presence {
  value: number | null;
  changedAt: number;
}

export const useMatchmaking = (authUser: User | null) => {
  const webrtc = useWebRTC();
  const webrtcRef = useRef(webrtc);
  webrtcRef.current = webrtc;

  const [status, setStatus] = useState<ChatStatus>("lobby");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [room, setRoom] = useState<RoomWithId | null>(null);
  const [mode, setMode] = useState<MediaMode>("video");

  const statusRef = useRef<ChatStatus>("lobby");
  const roomIdRef = useRef<string | null>(null);
  const roleRef = useRef<Role | null>(null);
  const roomRef = useRef<RoomWithId | null>(null);
  const modeRef = useRef<MediaMode>("video");
  const offerSentRef = useRef(false);
  const answerSentRef = useRef(false);
  const answerAppliedRef = useRef(false);
  const remoteGoneRef = useRef(false);
  const mountedRef = useRef(true);
  const seenCandidatesRef = useRef(new Set<string>());
  const avoidRoomIdRef = useRef<string | null>(null);
  const presenceRef = useRef<Presence>({ value: null, changedAt: 0 });
  const signalAttemptsRef = useRef(0);
  /**
   * The local SDP is created once per pairing. A retry only republishes it,
   * because creating a second answer on the same peer throws.
   */
  const pendingOfferRef = useRef<{
    pairId: string;
    offer: RTCSessionDescriptionInit;
  } | null>(null);
  const pendingAnswerRef = useRef<{
    pairId: string;
    answer: RTCSessionDescriptionInit;
  } | null>(null);

  /** Every start/teardown bumps this so late async work can detect it is stale. */
  const generationRef = useRef(0);
  const startInFlightRef = useRef(false);
  const teardownPromiseRef = useRef<Promise<void> | null>(null);
  const allowUnloadRef = useRef(false);

  const unsubscribeRoomRef = useRef<(() => void) | null>(null);
  const unsubscribeCandidatesRef = useRef<(() => void) | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const timersRef = useRef(new Map<TimerKey, number>());

  const clearTimer = useCallback((key: TimerKey) => {
    const handle = timersRef.current.get(key);
    if (handle !== undefined) {
      window.clearTimeout(handle);
      timersRef.current.delete(key);
    }
  }, []);

  const setTimer = useCallback(
    (key: TimerKey, ms: number, run: () => void) => {
      clearTimer(key);
      const handle = window.setTimeout(() => {
        timersRef.current.delete(key);
        run();
      }, ms);
      timersRef.current.set(key, handle);
    },
    [clearTimer]
  );

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((handle) => window.clearTimeout(handle));
    timersRef.current.clear();
  }, []);

  const updateStatus = useCallback((next: ChatStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current !== null) {
      window.clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(
    (activeRoomId: string, activeRole: Role) => {
      clearHeartbeat();

      const beat = () => {
        sendHeartbeat(activeRoomId, activeRole).catch((error) => {
          console.error("Heartbeat failed", error);
        });
      };

      beat();
      heartbeatTimerRef.current = window.setInterval(
        beat,
        HEARTBEAT_INTERVAL_MS
      );
    },
    [clearHeartbeat]
  );

  const stopSubscriptions = useCallback(() => {
    unsubscribeRoomRef.current?.();
    unsubscribeRoomRef.current = null;
    unsubscribeCandidatesRef.current?.();
    unsubscribeCandidatesRef.current = null;
    clearHeartbeat();
    clearTimers();
    webrtcRef.current.setOnIceCandidate(null);
    seenCandidatesRef.current.clear();
  }, [clearHeartbeat, clearTimers]);

  const resetSignalingFlags = useCallback(() => {
    offerSentRef.current = false;
    answerSentRef.current = false;
    answerAppliedRef.current = false;
    remoteGoneRef.current = false;
    signalAttemptsRef.current = 0;
    presenceRef.current = { value: null, changedAt: 0 };
    pendingOfferRef.current = null;
    pendingAnswerRef.current = null;
    clearTimer("offer-retry");
    clearTimer("answer-retry");
    clearTimer("negotiation");
    clearTimer("disconnect");
  }, [clearTimer]);

  const subscribeToCandidatesFor = useCallback(
    (activeRoomId: string, uid: string) => {
      unsubscribeCandidatesRef.current?.();

      unsubscribeCandidatesRef.current = subscribeToCandidates(
        activeRoomId,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type !== "added") return;
            if (seenCandidatesRef.current.has(change.doc.id)) return;

            seenCandidatesRef.current.add(change.doc.id);
            const data = change.doc.data() as CandidateDoc;

            if (!data || data.from === uid) return;

            webrtcRef.current
              .addRemoteCandidate(data.candidate)
              .catch((error) =>
                console.error("Failed to add remote candidate", error)
              );
          });
        },
        (error) => {
          // A room that was just deleted rejects reads of its subcollection.
          // That only happens while we are tearing down, so it is not worth
          // reporting unless the room is still the active one.
          if (roomIdRef.current !== activeRoomId) return;
          console.error("Candidate listener failed", error);
        }
      );
    },
    []
  );

  const attachIcePublisher = useCallback(
    (activeRoomId: string, uid: string) => {
      webrtcRef.current.setOnIceCandidate((candidate) => {
        addCandidate(activeRoomId, candidate.toJSON(), uid).catch((error) =>
          console.error("Failed to publish ICE candidate", error)
        );
      });
    },
    []
  );

  const createOffererPeer = useCallback(
    (activeRoomId: string, uid: string) => {
      webrtcRef.current.createNewPeerConnection(true);
      attachIcePublisher(activeRoomId, uid);
    },
    [attachIcePublisher]
  );

  const createAnswererPeer = useCallback(
    (activeRoomId: string, uid: string) => {
      webrtcRef.current.createNewPeerConnection(false);
      attachIcePublisher(activeRoomId, uid);
    },
    [attachIcePublisher]
  );

  /**
   * Clears the current match, optionally removing the room document, and
   * returns the UI to the requested state. Concurrent callers share the same
   * in-flight promise instead of silently dropping the request, so a teardown
   * can never be skipped halfway through a new search.
   */
  const teardown = useCallback(
    async (options: {
      stopMedia?: boolean;
      status?: ChatStatus;
      removeRoom?: "delete" | "reset" | "none";
    }) => {
      const inFlight = teardownPromiseRef.current;
      if (inFlight) await inFlight;

      const run = (async () => {
        generationRef.current += 1;

        const activeRoomId = roomIdRef.current;
        const activeRole = roleRef.current;

        stopSubscriptions();
        webrtcRef.current.resetPeerConnection({
          stopMedia: options.stopMedia,
        });

        roomIdRef.current = null;
        roleRef.current = null;
        roomRef.current = null;
        resetSignalingFlags();

        if (mountedRef.current) {
          setRoomId(null);
          setRole(null);
          setRoom(null);
          updateStatus(options.status ?? "lobby");
        }

        if (!activeRoomId || !activeRole) return;

        const removeRoom =
          options.removeRoom ??
          (activeRole === "creator" ? "delete" : "reset");

        // Do not immediately re-match with the stranger we just left.
        if (activeRole === "joiner" && removeRoom === "reset") {
          avoidRoomIdRef.current = activeRoomId;
        }

        try {
          if (removeRoom === "delete") {
            await deleteRoomTree(activeRoomId);
          } else if (removeRoom === "reset") {
            await resetRoomForNextJoiner(activeRoomId);
          }
        } catch (error) {
          console.error("Room cleanup failed", error);
        }
      })();

      teardownPromiseRef.current = run;
      try {
        await run;
      } finally {
        if (teardownPromiseRef.current === run) {
          teardownPromiseRef.current = null;
        }
      }
    },
    [resetSignalingFlags, stopSubscriptions, updateStatus]
  );

  /**
   * A joiner can only tear down its own half; the creator keeps the room open
   * and waits for the next stranger.
   */
  const returnCreatorToWaiting = useCallback(
    async (activeRoomId: string, uid: string) => {
      if (roomIdRef.current !== activeRoomId) return;

      webrtcRef.current.resetPeerConnection();
      resetSignalingFlags();
      roomRef.current = null;
      updateStatus("waiting");

      // Build the next offerer peer *before* the room becomes claimable again,
      // otherwise a fast joiner could arrive before we are ready to offer.
      createOffererPeer(activeRoomId, uid);

      try {
        await resetRoomForNextJoiner(activeRoomId);
      } catch (error) {
        console.error("Failed to reset room", error);
      }

      // Only now are the previous stranger's candidates gone, so the fresh
      // listener cannot pick up stale ICE. The presence watch is already
      // running for this room and keeps re-arming itself.
      unsubscribeCandidatesRef.current?.();
      seenCandidatesRef.current.clear();
      subscribeToCandidatesFor(activeRoomId, uid);
    },
    [
      createOffererPeer,
      resetSignalingFlags,
      subscribeToCandidatesFor,
      updateStatus,
    ]
  );

  const handleRemoteGone = useCallback(
    async (activeRoomId: string, activeRole: Role, uid: string) => {
      if (remoteGoneRef.current) return;
      if (roomIdRef.current !== activeRoomId) return;
      remoteGoneRef.current = true;

      if (activeRole === "creator") {
        toast.info("Stranger disconnected. Waiting for someone new...");
        await returnCreatorToWaiting(activeRoomId, uid);
        return;
      }

      toast.error("Stranger disconnected");
      await teardown({ status: "lobby", stopMedia: false });
    },
    [returnCreatorToWaiting, teardown]
  );

  /**
   * A pairing that never produces a working connection is abandoned instead of
   * leaving both strangers on "Connecting..." forever.
   */
  const armNegotiationWatch = useCallback(
    (activeRoomId: string, uid: string) => {
      setTimer("negotiation", NEGOTIATION_TIMEOUT_MS, () => {
        if (roomIdRef.current !== activeRoomId) return;
        if (statusRef.current === "matched") return;

        // The creator keeps its room and waits for someone new; a joiner goes
        // back to the lobby.
        void handleRemoteGone(activeRoomId, roleRef.current ?? "creator", uid);
      });
    },
    [handleRemoteGone, setTimer]
  );

  const handleRoomSnapshotRef = useRef<
    ((snapshot: RoomWithId, activeRole: Role, uid: string) => Promise<void>) | null
  >(null);

  /**
   * A rejected signaling write produces no new snapshot, so a failure has to
   * schedule its own retry. After a few attempts the pairing is abandoned.
   */
  const retrySignal = useCallback(
    (kind: "offer" | "answer", activeRoomId: string, uid: string) => {
      signalAttemptsRef.current += 1;

      if (signalAttemptsRef.current > SIGNAL_MAX_ATTEMPTS) {
        toast.error("Could not reach your match. Please try again.");
        void teardown({ status: "lobby", stopMedia: false });
        return;
      }

      setTimer(
        kind === "offer" ? "offer-retry" : "answer-retry",
        SIGNAL_RETRY_MS,
        () => {
          if (roomIdRef.current !== activeRoomId) return;
          if (kind === "offer") offerSentRef.current = false;
          else answerSentRef.current = false;

          const snapshot = roomRef.current;
          if (!snapshot) return;
          void handleRoomSnapshotRef.current?.(snapshot, roleRef.current ?? "joiner", uid);
        }
      );
    },
    [setTimer, teardown]
  );

  const handleRoomSnapshot = useCallback(
    async (snapshot: RoomWithId, activeRole: Role, uid: string) => {
      if (roomIdRef.current !== snapshot.id) return;

      roomRef.current = snapshot;
      setRoom(snapshot);

      // Presence is measured by whether the stranger's timestamp keeps moving,
      // never by comparing their clock with ours.
      const otherLastSeen =
        activeRole === "creator" ? snapshot.joinerLastSeen : snapshot.creatorLastSeen;
      const strangerPresent =
        activeRole === "creator" ? snapshot.joinedBy !== null : true;

      if (!strangerPresent) {
        presenceRef.current = { value: null, changedAt: 0 };
      } else {
        const value = otherLastSeen?.toMillis() ?? 0;
        if (presenceRef.current.value !== value) {
          presenceRef.current = { value, changedAt: Date.now() };
        }
      }

      if (activeRole === "creator") {
        const pairId = snapshot.pairId;

        if (snapshot.joinedBy && pairId && !snapshot.offer && !offerSentRef.current) {
          armNegotiationWatch(snapshot.id, uid);
          offerSentRef.current = true;
          try {
            let offer =
              pendingOfferRef.current?.pairId === pairId
                ? pendingOfferRef.current.offer
                : null;

            if (!offer) {
              offer = await webrtcRef.current.createOffer();
              if (offer) pendingOfferRef.current = { pairId, offer };
            }

            if (offer) await publishOffer(snapshot.id, offer, pairId);
          } catch (error) {
            console.error("Failed to publish offer", error);
            retrySignal("offer", snapshot.id, uid);
          }
        }

        // Only apply an answer that belongs to the current pairing.
        if (
          snapshot.joinedBy &&
          pairId &&
          snapshot.answer?.pairId === pairId &&
          !answerAppliedRef.current
        ) {
          answerAppliedRef.current = true;
          try {
            await webrtcRef.current.setRemoteAnswer(snapshot.answer);
          } catch (error) {
            console.error("Failed to apply answer", error);
            answerAppliedRef.current = false;
          }
        }

        if (!snapshot.joinedBy && statusRef.current !== "waiting") {
          await returnCreatorToWaiting(snapshot.id, uid);
        }
      }

      if (activeRole === "joiner") {
        const offer = snapshot.offer;

        // An offer from a previous pairing is ignored instead of answered.
        if (
          offer &&
          snapshot.pairId &&
          offer.pairId === snapshot.pairId &&
          !answerSentRef.current
        ) {
          answerSentRef.current = true;
          try {
            let answer =
              pendingAnswerRef.current?.pairId === snapshot.pairId
                ? pendingAnswerRef.current.answer
                : null;

            if (!answer) {
              answer = await webrtcRef.current.createAnswer(offer);
              if (answer) {
                pendingAnswerRef.current = { pairId: snapshot.pairId, answer };
              }
            }

            if (answer) {
              await publishAnswer(snapshot.id, answer, snapshot.pairId);
            }
          } catch (error) {
            console.error("Failed to publish answer", error);
            retrySignal("answer", snapshot.id, uid);
          }
        }
      }
    },
    [armNegotiationWatch, retrySignal, returnCreatorToWaiting]
  );

  handleRoomSnapshotRef.current = handleRoomSnapshot;

  const subscribeToRoomFor = useCallback(
    (activeRoomId: string, activeRole: Role, uid: string) => {
      unsubscribeRoomRef.current?.();

      unsubscribeRoomRef.current = subscribeToRoom(
        activeRoomId,
        (snapshot) => {
          handleRoomSnapshot(snapshot, activeRole, uid).catch((error) =>
            console.error("Room handler failed", error)
          );
        },
        () => {
          if (roomIdRef.current !== activeRoomId) return;
          if (remoteGoneRef.current) return;

          // The document is already gone, so there is nothing left to clean up.
          toast.info("The stranger closed the room");
          void teardown({ status: "lobby", removeRoom: "none" });
        },
        (error) => console.error("Room listener failed", error)
      );
    },
    [handleRoomSnapshot, teardown]
  );

  /**
   * Detects a stranger whose heartbeat stopped. This runs on its own interval
   * instead of relying on snapshots, because a dead peer stops writing and
   * therefore stops producing snapshot events.
   */
  const startPresenceWatch = useCallback(
    (activeRoomId: string, uid: string) => {
      const tick = () => {
        if (roomIdRef.current !== activeRoomId) return;

        const activeRole = roleRef.current;
        const { value, changedAt } = presenceRef.current;

        if (
          activeRole &&
          value !== null &&
          changedAt > 0 &&
          Date.now() - changedAt > STALE_AFTER_MS
        ) {
          void handleRemoteGone(activeRoomId, activeRole, uid);
          return;
        }

        setTimer("presence", PRESENCE_CHECK_INTERVAL_MS, tick);
      };

      setTimer("presence", PRESENCE_CHECK_INTERVAL_MS, tick);
    },
    [handleRemoteGone, setTimer]
  );

  const adoptJoiner = useCallback(
    (claim: ClaimResult, uid: string) => {
      roomIdRef.current = claim.roomId;
      roleRef.current = "joiner";
      roomRef.current = claim.room;
      presenceRef.current = { value: null, changedAt: 0 };

      setRoomId(claim.roomId);
      setRole("joiner");
      setRoom(claim.room);

      createAnswererPeer(claim.roomId, uid);
      subscribeToRoomFor(claim.roomId, "joiner", uid);
      subscribeToCandidatesFor(claim.roomId, uid);
      startHeartbeat(claim.roomId, "joiner");
      startPresenceWatch(claim.roomId, uid);
      armNegotiationWatch(claim.roomId, uid);
      updateStatus("connecting");
    },
    [
      armNegotiationWatch,
      createAnswererPeer,
      startHeartbeat,
      startPresenceWatch,
      subscribeToCandidatesFor,
      subscribeToRoomFor,
      updateStatus,
    ]
  );

  const adoptCreator = useCallback(
    (newRoomId: string, uid: string) => {
      roomIdRef.current = newRoomId;
      roleRef.current = "creator";
      roomRef.current = null;
      presenceRef.current = { value: null, changedAt: 0 };

      setRoomId(newRoomId);
      setRole("creator");
      setRoom(null);

      createOffererPeer(newRoomId, uid);
      subscribeToRoomFor(newRoomId, "creator", uid);
      subscribeToCandidatesFor(newRoomId, uid);
      startHeartbeat(newRoomId, "creator");
      startPresenceWatch(newRoomId, uid);
      updateStatus("waiting");
    },
    [
      createOffererPeer,
      startHeartbeat,
      startPresenceWatch,
      subscribeToCandidatesFor,
      subscribeToRoomFor,
      updateStatus,
    ]
  );

  /**
   * Claims the oldest waiting room it is allowed to take. When `ownRoomId` is
   * set only older rooms are eligible, which is what stops two strangers who
   * started at the same moment from claiming each other.
   */
  const claimAnyRoom = useCallback(
    async (
      user: User,
      nextMode: MediaMode,
      generation: number,
      ownRoomId?: string
    ): Promise<ClaimResult | null> => {
      const waitingRooms = (await findWaitingRooms(user, nextMode))
        .filter((candidate) => candidate.id !== avoidRoomIdRef.current)
        .filter((candidate) => !ownRoomId || candidate.id < ownRoomId);

      if (generationRef.current === generation) avoidRoomIdRef.current = null;

      for (const candidate of waitingRooms) {
        if (generationRef.current !== generation) return null;

        const claim = await claimRoom(candidate.id, user, nextMode);
        if (claim) return claim;
      }

      return null;
    },
    []
  );

  /**
   * A fresh creator keeps looking for a stranger who was already waiting. Only
   * rooms with an older id qualify, so exactly one of two simultaneous
   * searchers gives up its own room and joins the other.
   */
  const scheduleCreatorPoll = useCallback(
    (ownRoomId: string, nextMode: MediaMode, generation: number, uid: string) => {
      const deadline = Date.now() + MATCH_POLL_WINDOW_MS;

      const poll = async () => {
        if (generationRef.current !== generation) return;
        if (roomIdRef.current !== ownRoomId) return;
        if (statusRef.current !== "waiting") return;
        if (Date.now() > deadline) return;
        if (!authUser) return;

        try {
          const claim = await claimAnyRoom(authUser, nextMode, generation, ownRoomId);

          if (generationRef.current !== generation) {
            if (claim) await resetRoomForNextJoiner(claim.roomId);
            return;
          }

          if (claim) {
            if (roomIdRef.current !== ownRoomId) {
              // Somebody joined us while we were claiming: hand the other room
              // back to the pool instead of stranding its creator.
              await resetRoomForNextJoiner(claim.roomId);
              return;
            }

            stopSubscriptions();
            webrtcRef.current.resetPeerConnection();
            roomIdRef.current = null;
            roleRef.current = null;
            roomRef.current = null;
            await deleteRoomTree(ownRoomId);
            adoptJoiner(claim, uid);
            return;
          }
        } catch (error) {
          console.warn("Match poll failed", error);
        }

        if (generationRef.current !== generation) return;
        if (roomIdRef.current !== ownRoomId) return;
        setTimer("search", MATCH_POLL_INTERVAL_MS, () => void poll());
      };

      setTimer("search", MATCH_POLL_INTERVAL_MS, () => void poll());
    },
    [adoptJoiner, authUser, claimAnyRoom, setTimer, stopSubscriptions]
  );

  const start = useCallback(
    async (nextMode: MediaMode = "video") => {
      if (!authUser) {
        toast.error("You must be logged in to start a chat");
        return;
      }

      if (startInFlightRef.current) return;
      startInFlightRef.current = true;

      const uid = authUser.uid;

      try {
        // Release anything we still hold before starting a new search.
        if (roomIdRef.current) await teardown({ status: "lobby" });

        const generation = (generationRef.current += 1);
        const alive = () =>
          generationRef.current === generation && mountedRef.current;

        modeRef.current = nextMode;
        setMode(nextMode);
        resetSignalingFlags();
        updateStatus("searching");

        try {
          await webrtcRef.current.prepareMedia(nextMode);
        } catch (error) {
          console.error("Media access failed", error);
          toast.error("Camera and microphone access is required for video chat");
          if (alive()) updateStatus("lobby");
          return;
        }

        if (!alive()) return;

        // Housekeeping must never delay finding a match.
        void sweepStaleRooms().catch(() => 0);

        const claim = await claimAnyRoom(authUser, nextMode, generation);

        if (!alive()) {
          if (claim) await resetRoomForNextJoiner(claim.roomId);
          return;
        }

        if (claim) {
          adoptJoiner(claim, uid);
          return;
        }

        const newRoomId = await createRoom(authUser, nextMode);

        if (!alive()) {
          void deleteRoomTree(newRoomId);
          return;
        }

        adoptCreator(newRoomId, uid);
        scheduleCreatorPoll(newRoomId, nextMode, generation, uid);
      } catch (error) {
        console.error("Matchmaking failed", error);
        toast.error("Could not find a stranger. Please try again.");
        await teardown({ status: "lobby" });
      } finally {
        startInFlightRef.current = false;
      }
    },
    [
      adoptCreator,
      adoptJoiner,
      authUser,
      claimAnyRoom,
      resetSignalingFlags,
      scheduleCreatorPoll,
      teardown,
      updateStatus,
    ]
  );

  const leave = useCallback(async () => {
    await teardown({ status: "lobby", stopMedia: true });
  }, [teardown]);

  const next = useCallback(async () => {
    const currentMode = modeRef.current;
    await teardown({ status: "lobby", stopMedia: false });
    await start(currentMode);
  }, [start, teardown]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!webrtc.isPeerConnected) return;

    if (
      statusRef.current === "waiting" ||
      statusRef.current === "connecting"
    ) {
      clearTimer("negotiation");
      updateStatus("matched");
    }
  }, [clearTimer, updateStatus, webrtc.isPeerConnected]);

  useEffect(() => {
    const state = webrtc.connectionState;
    const activeRoomId = roomIdRef.current;
    const activeRole = roleRef.current;

    if (!activeRoomId || !activeRole || !authUser) return;

    if (state === "failed" || state === "closed") {
      void handleRemoteGone(activeRoomId, activeRole, authUser.uid);
      return;
    }

    if (state === "disconnected") {
      setTimer("disconnect", DISCONNECT_GRACE_MS, () => {
        if (webrtcRef.current.connectionState !== "disconnected") return;
        void handleRemoteGone(activeRoomId, activeRole, authUser.uid);
      });
      return;
    }

    clearTimer("disconnect");
  }, [
    authUser,
    clearTimer,
    handleRemoteGone,
    setTimer,
    webrtc.connectionState,
  ]);

  // A tab that comes back from the background must re-assert its presence
  // before the stranger's staleness check fires.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;

      const activeRoomId = roomIdRef.current;
      const activeRole = roleRef.current;
      if (!activeRoomId || !activeRole) return;

      sendHeartbeat(activeRoomId, activeRole).catch((error) =>
        console.error("Heartbeat failed", error)
      );
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    const bestEffortCleanup = () => {
      const activeRoomId = roomIdRef.current;
      const activeRole = roleRef.current;
      if (!activeRoomId || !activeRole) return;

      if (activeRole === "creator") {
        void deleteRoomTree(activeRoomId);
      } else {
        void resetRoomForNextJoiner(activeRoomId);
      }

      webrtcRef.current.stopMedia();
    };

    const handlePageHide = () => {
      allowUnloadRef.current = true;
      bestEffortCleanup();
    };

    // Ask before dropping an active call. This is a courtesy for desktop users
    // only; the heartbeat and the TTL sweep remain the real guarantees.
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowUnloadRef.current) return;
      if (!webrtcRef.current.isPeerConnected) return;

      event.preventDefault();
      event.returnValue = "";
    };

    const handlePageShow = () => {
      allowUnloadRef.current = false;
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pageshow", handlePageShow);
      bestEffortCleanup();
      stopSubscriptions();
    };
  }, [stopSubscriptions]);

  const stranger = useMemo<SignalUser | null>(() => {
    if (!room || !role) return null;
    return role === "creator" ? room.joinedBy : room.createdBy;
  }, [role, room]);

  return {
    status,
    mode,
    roomId,
    role,
    room,
    stranger,
    isSearching: status === "searching",
    isConnected: webrtc.isPeerConnected,
    start,
    leave,
    next,
  };
};
