import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import { firestore } from "./config";

export const ROOMS_COLLECTION = "rooms";
export const CANDIDATES_COLLECTION = "candidates";

/** How often each peer refreshes its presence in the room document. */
export const HEARTBEAT_INTERVAL_MS = 5_000;
/**
 * A peer is considered gone once its last-seen timestamp has not advanced for
 * this long. The check measures *progress*, not wall-clock distance, so a
 * client with a skewed clock cannot produce false disconnects. The window has
 * to survive background-tab timer throttling, which can stretch the 5s
 * heartbeat to a full minute.
 */
export const STALE_AFTER_MS = 45_000;
/** Rooms nobody has touched for this long are swept away. */
export const ROOM_TTL_MS = 2 * 60_000;
/** How often a fresh creator looks for a stranger who was already waiting. */
export const MATCH_POLL_INTERVAL_MS = 1_200;
/** How long a fresh creator keeps looking before settling into the pool. */
export const MATCH_POLL_WINDOW_MS = 8_000;

export type RoomStatus = "waiting" | "connecting";
export type Role = "creator" | "joiner";
export type RoomMode = "video" | "text";

export interface SignalUser {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
}

export interface SignalDescription {
  type: RTCSdpType;
  sdp: string;
}

/**
 * A description tagged with the pairing it belongs to. A joiner writes a fresh
 * `pairId` when it claims a room, so a leftover offer/answer from a previous
 * stranger can never be applied to the new pairing.
 */
export interface TaggedSignal extends SignalDescription {
  pairId: string;
}

export interface RoomDoc {
  status: RoomStatus;
  mode: RoomMode;
  pairId: string | null;
  createdBy: SignalUser;
  joinedBy: SignalUser | null;
  offer: TaggedSignal | null;
  answer: TaggedSignal | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  creatorLastSeen: Timestamp | null;
  joinerLastSeen: Timestamp | null;
}

export type RoomWithId = RoomDoc & { id: string };

export interface CandidateDoc {
  candidate: RTCIceCandidateInit;
  from: string;
  createdAt: Timestamp | null;
}

export interface ClaimResult {
  roomId: string;
  pairId: string;
  room: RoomWithId;
}

export const toSignalUser = (user: User): SignalUser => ({
  uid: user.uid,
  displayName: user.displayName,
  photoURL: user.photoURL,
});

export const roomDocRef = (roomId: string) =>
  doc(firestore, ROOMS_COLLECTION, roomId);

export const roomCandidatesRef = (roomId: string) =>
  collection(firestore, ROOMS_COLLECTION, roomId, CANDIDATES_COLLECTION);

const asRoom = (id: string, data: DocumentData): RoomWithId =>
  ({ id, ...(data as RoomDoc) }) as RoomWithId;

/**
 * Room ids sort in creation order. Two strangers that start searching at the
 * same time both end up holding a room, so they need a deterministic rule for
 * who joins whom: the owner of the newer id always claims the older room. Both
 * sides compare the same two immutable strings, so they can never both claim.
 */
const nextRoomId = () =>
  `${Date.now().toString(36).padStart(10, "0")}-${crypto
    .randomUUID()
    .slice(0, 8)}`;

/**
 * Firestore reports both "index missing" and "index still building" as a
 * failed precondition naming the index.
 */
const isBuildingIndexError = (error: unknown) => {
  if (typeof error !== "object" || error === null) return false;

  const { code, message } = error as { code?: string; message?: string };

  return (
    code === "failed-precondition" &&
    typeof message === "string" &&
    message.toLowerCase().includes("index")
  );
};

const isFreshRoom = (room: RoomWithId, now = Date.now()) => {
  const created = room.createdAt?.toMillis() ?? 0;
  const lastSeen = room.creatorLastSeen?.toMillis() ?? 0;
  return (
    now - created < ROOM_TTL_MS &&
    now - lastSeen < STALE_AFTER_MS &&
    !room.joinedBy
  );
};

/**
 * Creates an open room owned by `user`. Only one offerer (creator) per room.
 */
export const createRoom = async (
  user: User,
  mode: RoomMode
): Promise<string> => {
  const roomId = nextRoomId();

  await setDoc(roomDocRef(roomId), {
    status: "waiting",
    mode,
    pairId: null,
    createdBy: toSignalUser(user),
    joinedBy: null,
    offer: null,
    answer: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    creatorLastSeen: serverTimestamp(),
    joinerLastSeen: null,
  });

  return roomId;
};

/**
 * Returns open rooms for the given mode, freshest heartbeat first, excluding
 * rooms owned by the caller. Freshness is filtered by the server so a backlog
 * of abandoned rooms can never crowd real matches out of the result window.
 */
export const findWaitingRooms = async (
  user: User,
  mode: RoomMode
): Promise<RoomWithId[]> => {
  const cutoff = Timestamp.fromMillis(Date.now() - STALE_AFTER_MS);
  const snapshot = await getDocs(
    query(
      collection(firestore, ROOMS_COLLECTION),
      where("status", "==", "waiting"),
      where("mode", "==", mode),
      where("creatorLastSeen", ">", cutoff),
      orderBy("creatorLastSeen", "desc"),
      limit(50)
    )
  ).catch((error: unknown) => {
    if (!isBuildingIndexError(error)) throw error;

    // A freshly deployed composite index takes a few minutes to build. Until
    // then the pool is unreadable, but opening a room still works, so degrade
    // to that instead of failing the whole search.
    console.warn(
      "Room pool is unavailable until the Firestore index finishes building",
      error
    );
    return null;
  });

  if (!snapshot) return [];

  const now = Date.now();
  return snapshot.docs
    .map((item) => asRoom(item.id, item.data()))
    .filter((room) => room.createdBy.uid !== user.uid && isFreshRoom(room, now))
    .sort((left, right) => (left.id < right.id ? -1 : 1));
};

/**
 * Atomically claims an open room. The transaction makes sure two strangers can
 * never end up in the same room at once, and it starts a brand new pairing by
 * writing a fresh `pairId` and dropping any signaling left from a previous
 * stranger.
 */
export const claimRoom = async (
  roomId: string,
  user: User,
  mode: RoomMode
): Promise<ClaimResult | null> => {
  const ref = roomDocRef(roomId);
  const pairId = crypto.randomUUID();

  try {
    const claimed = await runTransaction(firestore, async (transaction) => {
      const snapshot = await transaction.get(ref);

      if (!snapshot.exists()) return null;

      const room = asRoom(snapshot.id, snapshot.data());
      const now = Date.now();
      const created = room.createdAt?.toMillis() ?? 0;
      const lastSeen = room.creatorLastSeen?.toMillis() ?? 0;

      if (
        room.status !== "waiting" ||
        room.mode !== mode ||
        room.joinedBy !== null ||
        now - created >= ROOM_TTL_MS ||
        now - lastSeen >= STALE_AFTER_MS
      ) {
        return null;
      }

      transaction.update(ref, {
        joinedBy: toSignalUser(user),
        joinerLastSeen: serverTimestamp(),
        pairId,
        offer: null,
        answer: null,
        status: "connecting",
        updatedAt: serverTimestamp(),
      });

      // The post-claim document is known exactly, so there is no need to read
      // it back before the realtime listener delivers it.
      return {
        ...room,
        joinedBy: toSignalUser(user),
        pairId,
        offer: null,
        answer: null,
        status: "connecting" as const,
      };
    });

    return claimed ? { roomId, pairId, room: claimed } : null;
  } catch (error) {
    // A permission or network failure looks the same as a lost race here, but
    // it should never be silent: log it so a broken deployment is visible.
    console.warn("Could not claim room", roomId, error);
    return null;
  }
};

export const publishOffer = (
  roomId: string,
  offer: RTCSessionDescriptionInit,
  pairId: string
) => {
  if (!offer.type || !offer.sdp) {
    throw new Error("Offer is missing its type or SDP");
  }

  return updateDoc(roomDocRef(roomId), {
    offer: {
      type: offer.type,
      sdp: offer.sdp,
      pairId,
    } satisfies TaggedSignal,
    status: "connecting",
    updatedAt: serverTimestamp(),
  });
};

export const publishAnswer = (
  roomId: string,
  answer: RTCSessionDescriptionInit,
  pairId: string
) => {
  if (!answer.type || !answer.sdp) {
    throw new Error("Answer is missing its type or SDP");
  }

  return updateDoc(roomDocRef(roomId), {
    answer: {
      type: answer.type,
      sdp: answer.sdp,
      pairId,
    } satisfies TaggedSignal,
    updatedAt: serverTimestamp(),
  });
};

/** Refreshes the caller's presence so the stranger knows we are alive. */
export const sendHeartbeat = (roomId: string, role: Role) =>
  updateDoc(roomDocRef(roomId), {
    [role === "creator" ? "creatorLastSeen" : "joinerLastSeen"]:
      serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

export const addCandidate = (
  roomId: string,
  candidate: RTCIceCandidateInit,
  from: string
) =>
  addDoc(roomCandidatesRef(roomId), {
    candidate,
    from,
    createdAt: serverTimestamp(),
  });

export const subscribeToRoom = (
  roomId: string,
  onNext: (room: RoomWithId) => void,
  onMissing: () => void,
  onError: (error: Error) => void
) =>
  onSnapshot(
    roomDocRef(roomId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onMissing();
        return;
      }
      onNext(asRoom(snapshot.id, snapshot.data()));
    },
    onError
  );

export const subscribeToCandidates = (
  roomId: string,
  onNext: (snapshot: QuerySnapshot<DocumentData>) => void,
  onError: (error: Error) => void
) => onSnapshot(roomCandidatesRef(roomId), onNext, onError);

const deleteCandidates = async (roomId: string) => {
  const snapshot = await getDocs(roomCandidatesRef(roomId));

  for (let index = 0; index < snapshot.docs.length; index += 400) {
    const batch = writeBatch(firestore);
    snapshot.docs
      .slice(index, index + 400)
      .forEach((candidate) => batch.delete(candidate.ref));
    await batch.commit();
  }
};

/**
 * Firestore does not cascade-delete subcollections, so candidates are removed
 * explicitly before the room itself.
 */
export const deleteRoomTree = async (roomId: string) => {
  try {
    await deleteCandidates(roomId);
  } catch {
    // The room might already be gone; deleting it below is still safe.
  }

  try {
    await deleteDoc(roomDocRef(roomId));
  } catch {
    // Already deleted by the other peer.
  }
};

/**
 * Puts the room back into the matching pool and drops everything that belonged
 * to the previous pairing.
 */
export const resetRoomForNextJoiner = async (roomId: string) => {
  await deleteCandidates(roomId);
  await updateDoc(roomDocRef(roomId), {
    status: "waiting",
    pairId: null,
    joinedBy: null,
    offer: null,
    answer: null,
    joinerLastSeen: null,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Removes rooms that nobody has touched for a while. This is what prevents a
 * closed tab from leaving a phantom "stranger" behind forever.
 */
export const sweepStaleRooms = async (): Promise<number> => {
  const threshold = Timestamp.fromMillis(Date.now() - ROOM_TTL_MS);
  const snapshot = await getDocs(
    query(
      collection(firestore, ROOMS_COLLECTION),
      where("updatedAt", "<", threshold),
      limit(50)
    )
  );

  await Promise.allSettled(
    snapshot.docs.map((room) => deleteRoomTree(room.id))
  );

  return snapshot.size;
};
