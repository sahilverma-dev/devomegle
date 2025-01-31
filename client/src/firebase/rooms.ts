import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
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
/** A peer is considered gone after missing this many heartbeats. */
export const STALE_AFTER_MS = 20_000;
/** Rooms nobody has touched for this long are swept away. */
export const ROOM_TTL_MS = 2 * 60_000;

export type RoomStatus = "waiting" | "connecting" | "connected";
export type Role = "creator" | "joiner";

export interface SignalUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface SignalDescription {
  type: RTCSdpType;
  sdp: string;
}

export interface RoomDoc {
  status: RoomStatus;
  createdBy: SignalUser;
  joinedBy: SignalUser | null;
  offer: SignalDescription | null;
  answer: SignalDescription | null;
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

export const toSignalUser = (user: User): SignalUser => ({
  uid: user.uid,
  displayName: user.displayName,
  email: user.email,
  photoURL: user.photoURL,
});

export const roomDocRef = (roomId: string) =>
  doc(firestore, ROOMS_COLLECTION, roomId);

export const roomCandidatesRef = (roomId: string) =>
  collection(firestore, ROOMS_COLLECTION, roomId, CANDIDATES_COLLECTION);

const asRoom = (id: string, data: DocumentData): RoomWithId =>
  ({ id, ...(data as RoomDoc) }) as RoomWithId;

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
export const createRoom = async (user: User): Promise<string> => {
  const ref = doc(collection(firestore, ROOMS_COLLECTION));

  await setDoc(ref, {
    status: "waiting",
    createdBy: toSignalUser(user),
    joinedBy: null,
    offer: null,
    answer: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    creatorLastSeen: serverTimestamp(),
    joinerLastSeen: null,
  });

  return ref.id;
};

/**
 * Returns open rooms created by somebody else, newest first is not required.
 * Rooms whose owner stopped sending heartbeats are ignored.
 */
export const findWaitingRooms = async (user: User): Promise<RoomWithId[]> => {
  const snapshot = await getDocs(
    query(
      collection(firestore, ROOMS_COLLECTION),
      where("status", "==", "waiting"),
      limit(50)
    )
  );

  const now = Date.now();
  return snapshot.docs
    .map((item) => asRoom(item.id, item.data()))
    .filter((room) => room.createdBy.uid !== user.uid && isFreshRoom(room, now));
};

/**
 * Atomically claims an open room. The transaction makes sure two strangers
 * can never end up in the same room at once.
 */
export const claimRoom = async (
  roomId: string,
  user: User
): Promise<boolean> => {
  const ref = roomDocRef(roomId);

  try {
    return await runTransaction(firestore, async (transaction) => {
      const snapshot = await transaction.get(ref);

      if (!snapshot.exists()) return false;

      const room = asRoom(snapshot.id, snapshot.data());
      const now = Date.now();
      const created = room.createdAt?.toMillis() ?? 0;
      const lastSeen = room.creatorLastSeen?.toMillis() ?? 0;

      if (
        room.status !== "waiting" ||
        room.joinedBy !== null ||
        now - created >= ROOM_TTL_MS ||
        now - lastSeen >= STALE_AFTER_MS
      ) {
        return false;
      }

      transaction.update(ref, {
        joinedBy: toSignalUser(user),
        joinerLastSeen: serverTimestamp(),
        status: "connecting",
        updatedAt: serverTimestamp(),
      });

      return true;
    });
  } catch {
    // Lost the race or a rule rejected the claim: just try the next room.
    return false;
  }
};

export const publishOffer = (roomId: string, offer: RTCSessionDescriptionInit) => {
  if (!offer.type || !offer.sdp) {
    throw new Error("Offer is missing its type or SDP");
  }

  return updateDoc(roomDocRef(roomId), {
    offer: { type: offer.type, sdp: offer.sdp } satisfies SignalDescription,
    status: "connecting",
    updatedAt: serverTimestamp(),
  });
};

export const publishAnswer = (
  roomId: string,
  answer: RTCSessionDescriptionInit
) => {
  if (!answer.type || !answer.sdp) {
    throw new Error("Answer is missing its type or SDP");
  }

  return updateDoc(roomDocRef(roomId), {
    answer: { type: answer.type, sdp: answer.sdp } satisfies SignalDescription,
    status: "connected",
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
 * Puts the room back into the matching pool after the joiner leaves.
 */
export const resetRoomForNextJoiner = async (roomId: string) => {
  await deleteCandidates(roomId);
  await updateDoc(roomDocRef(roomId), {
    status: "waiting",
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
      limit(25)
    )
  );

  await Promise.allSettled(
    snapshot.docs.map((room) => deleteRoomTree(room.id))
  );

  return snapshot.size;
};
