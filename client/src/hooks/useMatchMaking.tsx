import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { toast } from "sonner";
import {
  HEARTBEAT_INTERVAL_MS,
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

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
};

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
  const modeRef = useRef<MediaMode>("video");
  const offerSentRef = useRef(false);
  const answerSentRef = useRef(false);
  const answerAppliedRef = useRef(false);
  const remoteGoneRef = useRef(false);
  const tearingDownRef = useRef(false);
  const mountedRef = useRef(true);
  const seenCandidatesRef = useRef(new Set<string>());
  const avoidRoomIdRef = useRef<string | null>(null);

  const unsubscribeRoomRef = useRef<(() => void) | null>(null);
  const unsubscribeCandidatesRef = useRef<(() => void) | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);

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

  const startHeartbeat = useCallback((activeRoomId: string, activeRole: Role) => {
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
  }, [clearHeartbeat]);

  const stopSubscriptions = useCallback(() => {
    unsubscribeRoomRef.current?.();
    unsubscribeRoomRef.current = null;
    unsubscribeCandidatesRef.current?.();
    unsubscribeCandidatesRef.current = null;
    clearHeartbeat();
    webrtcRef.current.setOnIceCandidate(null);
    seenCandidatesRef.current.clear();
  }, [clearHeartbeat]);

  const resetSignalingFlags = useCallback(() => {
    offerSentRef.current = false;
    answerSentRef.current = false;
    answerAppliedRef.current = false;
    remoteGoneRef.current = false;
  }, []);

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
        (error) => console.error("Candidate listener failed", error)
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
   * returns the UI to the requested state.
   */
  const teardown = useCallback(
    async (options: {
      stopMedia?: boolean;
      status?: ChatStatus;
      removeRoom?: "delete" | "reset" | "none";
    }) => {
      if (tearingDownRef.current) return;
      tearingDownRef.current = true;

      const activeRoomId = roomIdRef.current;
      const activeRole = roleRef.current;

      stopSubscriptions();
      webrtcRef.current.resetPeerConnection({
        stopMedia: options.stopMedia,
      });

      roomIdRef.current = null;
      roleRef.current = null;
      resetSignalingFlags();

      if (mountedRef.current) {
        setRoomId(null);
        setRole(null);
        setRoom(null);
        updateStatus(options.status ?? "lobby");
      }

      if (activeRoomId && activeRole) {
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
      }

      tearingDownRef.current = false;
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
      offerSentRef.current = false;
      answerAppliedRef.current = false;
      remoteGoneRef.current = false;
      updateStatus("waiting");

      // Build the next offerer peer *before* the room becomes claimable again,
      // otherwise a fast joiner could arrive before we are ready to offer.
      createOffererPeer(activeRoomId, uid);
      subscribeToCandidatesFor(activeRoomId, uid);

      try {
        await resetRoomForNextJoiner(activeRoomId);
      } catch (error) {
        console.error("Failed to reset room", error);
      }
    },
    [
      createOffererPeer,
      subscribeToCandidatesFor,
      updateStatus,
    ]
  );

  const handleRemoteGone = useCallback(
    async (activeRoomId: string, activeRole: Role, uid: string) => {
      if (remoteGoneRef.current) return;
      remoteGoneRef.current = true;

      if (activeRole === "creator") {
        toast.info("Stranger disconnected. Waiting for someone new...");
        await returnCreatorToWaiting(activeRoomId, uid);
        return;
      }

      toast.error("Stranger disconnected");
      await teardown({ status: "lobby", removeRoom: "delete", stopMedia: false });
    },
    [returnCreatorToWaiting, teardown]
  );

  const handleRoomSnapshot = useCallback(
    async (room: RoomWithId, activeRole: Role, uid: string) => {
      if (roomIdRef.current !== room.id) return;

      setRoom(room);

      const otherLastSeen =
        activeRole === "creator" ? room.joinerLastSeen : room.creatorLastSeen;
      const strangerPresent =
        activeRole === "creator" ? room.joinedBy !== null : true;

      if (
        strangerPresent &&
        otherLastSeen &&
        Date.now() - otherLastSeen.toMillis() > STALE_AFTER_MS
      ) {
        await handleRemoteGone(room.id, activeRole, uid);
        return;
      }

      if (activeRole === "creator") {
        if (room.joinedBy && !room.offer && !offerSentRef.current) {
          offerSentRef.current = true;
          try {
            const offer = await webrtcRef.current.createOffer();
            if (offer) await publishOffer(room.id, offer);
          } catch (error) {
            console.error("Failed to publish offer", error);
            offerSentRef.current = false;
          }
        }

        // Only apply an answer for a currently paired stranger. A reset room
        // can briefly still contain the previous answer alongside joinedBy:null.
        if (room.joinedBy && room.answer && !answerAppliedRef.current) {
          answerAppliedRef.current = true;
          try {
            await webrtcRef.current.setRemoteAnswer(room.answer);
          } catch (error) {
            console.error("Failed to apply answer", error);
            answerAppliedRef.current = false;
          }
        }

        if (!room.joinedBy && statusRef.current !== "waiting") {
          await returnCreatorToWaiting(room.id, uid);
        }
      }

      if (activeRole === "joiner" && room.offer && !answerSentRef.current) {
        answerSentRef.current = true;
        try {
          const answer = await webrtcRef.current.createAnswer(room.offer);
          if (answer) await publishAnswer(room.id, answer);
        } catch (error) {
          console.error("Failed to publish answer", error);
          answerSentRef.current = false;
        }
      }
    },
    [handleRemoteGone, returnCreatorToWaiting]
  );

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

  const start = useCallback(
    async (nextMode: MediaMode = "video") => {
      if (!authUser) {
        toast.error("You must be logged in to start a chat");
        return;
      }

      if (tearingDownRef.current) return;

      modeRef.current = nextMode;
      setMode(nextMode);
      resetSignalingFlags();
      updateStatus("searching");

      try {
        await webrtcRef.current.prepareMedia(nextMode);
      } catch (error) {
        console.error("Media access failed", error);
        toast.error("Camera and microphone access is required for video chat");
        updateStatus("lobby");
        return;
      }

      try {
        await sweepStaleRooms().catch(() => 0);
        const waitingRooms = (await findWaitingRooms(authUser)).filter(
          (candidate) => candidate.id !== avoidRoomIdRef.current
        );
        avoidRoomIdRef.current = null;

        for (const candidate of shuffle(waitingRooms)) {
          const claimed = await claimRoom(candidate.id, authUser);

          if (!claimed) continue;

          if (roomIdRef.current) {
            await teardown({ status: "lobby" });
          }

          roomIdRef.current = candidate.id;
          roleRef.current = "joiner";
          setRoomId(candidate.id);
          setRole("joiner");
          setRoom(candidate);
          createAnswererPeer(candidate.id, authUser.uid);
          subscribeToRoomFor(candidate.id, "joiner", authUser.uid);
          subscribeToCandidatesFor(candidate.id, authUser.uid);
          startHeartbeat(candidate.id, "joiner");
          updateStatus("connecting");
          return;
        }

        const newRoomId = await createRoom(authUser);
        roomIdRef.current = newRoomId;
        roleRef.current = "creator";
        setRoomId(newRoomId);
        setRole("creator");
        setRoom(null);
        createOffererPeer(newRoomId, authUser.uid);
        subscribeToRoomFor(newRoomId, "creator", authUser.uid);
        subscribeToCandidatesFor(newRoomId, authUser.uid);
        startHeartbeat(newRoomId, "creator");
        updateStatus("waiting");
      } catch (error) {
        console.error("Matchmaking failed", error);
        toast.error("Could not find a stranger. Please try again.");
        await teardown({ status: "lobby" });
      }
    },
    [
      authUser,
      createAnswererPeer,
      createOffererPeer,
      resetSignalingFlags,
      startHeartbeat,
      subscribeToCandidatesFor,
      subscribeToRoomFor,
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
      updateStatus("matched");
    }
  }, [webrtc.isPeerConnected, updateStatus]);

  useEffect(() => {
    if (webrtc.connectionState !== "failed") return;
    if (!roomIdRef.current || !roleRef.current || !authUser) return;

    void handleRemoteGone(roomIdRef.current, roleRef.current, authUser.uid);
  }, [authUser, handleRemoteGone, webrtc.connectionState]);

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

    const handleUnload = () => bestEffortCleanup();

    window.addEventListener("pagehide", handleUnload);
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("pagehide", handleUnload);
      window.removeEventListener("beforeunload", handleUnload);
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
