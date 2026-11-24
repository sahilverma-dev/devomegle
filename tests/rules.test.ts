import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

const PROJECT_ID = "demo-devomegle";

let environment: RulesTestEnvironment;

const creatorProfile = {
  uid: "creator",
  displayName: "Creator",
  photoURL: null,
};

const joinerProfile = {
  uid: "joiner",
  displayName: "Joiner",
  photoURL: null,
};

const roomPayload = (overrides: Record<string, unknown> = {}) => ({
  status: "waiting",
  mode: "video",
  pairId: null,
  createdBy: creatorProfile,
  joinedBy: null,
  offer: null,
  answer: null,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  creatorLastSeen: serverTimestamp(),
  joinerLastSeen: null,
  ...overrides,
});

const claimPayload = (overrides: Record<string, unknown> = {}) => ({
  status: "connecting",
  joinedBy: joinerProfile,
  joinerLastSeen: serverTimestamp(),
  pairId: "pair-1",
  offer: null,
  answer: null,
  updatedAt: serverTimestamp(),
  ...overrides,
});

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
}, 60_000);

afterAll(async () => {
  await environment.cleanup();
}, 60_000);

beforeEach(async () => {
  await environment.clearFirestore();
});

describe("room signaling rules", () => {
  it("rejects unauthenticated reads", async () => {
    const database = environment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(database, "rooms", "room-1")));
  });

  it("lets a creator open a waiting room and a stranger claim it", async () => {
    const creator = environment.authenticatedContext("creator").firestore();
    const joiner = environment.authenticatedContext("joiner").firestore();

    await assertSucceeds(
      setDoc(doc(creator, "rooms", "room-1"), roomPayload())
    );

    await assertSucceeds(
      updateDoc(doc(joiner, "rooms", "room-1"), claimPayload())
    );

    const outsider = environment.authenticatedContext("outsider").firestore();
    await assertFails(
      updateDoc(doc(outsider, "rooms", "room-1"), {
        status: "waiting",
        joinedBy: null,
      })
    );
  });

  it("requires a fresh pair id when claiming", async () => {
    const creator = environment.authenticatedContext("creator").firestore();
    const joiner = environment.authenticatedContext("joiner").firestore();

    await assertSucceeds(
      setDoc(doc(creator, "rooms", "room-1"), roomPayload())
    );

    await assertFails(
      updateDoc(
        doc(joiner, "rooms", "room-1"),
        claimPayload({ pairId: null })
      )
    );
  });

  it("does not let a claim rewrite the room owner", async () => {
    const creator = environment.authenticatedContext("creator").firestore();
    const joiner = environment.authenticatedContext("joiner").firestore();

    await assertSucceeds(
      setDoc(doc(creator, "rooms", "room-1"), roomPayload())
    );

    await assertFails(
      updateDoc(
        doc(joiner, "rooms", "room-1"),
        claimPayload({ createdBy: joinerProfile })
      )
    );
  });

  it("does not let a user create a room for somebody else", async () => {
    const joiner = environment.authenticatedContext("joiner").firestore();

    await assertFails(
      setDoc(doc(joiner, "rooms", "room-2"), roomPayload())
    );
  });

  it("rejects a room with an unknown mode", async () => {
    const creator = environment.authenticatedContext("creator").firestore();

    await assertFails(
      setDoc(
        doc(creator, "rooms", "room-mode"),
        roomPayload({ mode: "audio" })
      )
    );
  });

  it("keeps waiting rooms discoverable but hides claimed rooms", async () => {
    const creator = environment.authenticatedContext("creator").firestore();
    const joiner = environment.authenticatedContext("joiner").firestore();
    const outsider = environment.authenticatedContext("outsider").firestore();

    await assertSucceeds(
      setDoc(doc(creator, "rooms", "room-1"), roomPayload())
    );

    await assertSucceeds(getDoc(doc(outsider, "rooms", "room-1")));
    await assertSucceeds(
      getDocs(
        query(collection(outsider, "rooms"), where("status", "==", "waiting"))
      )
    );

    await assertSucceeds(
      updateDoc(doc(joiner, "rooms", "room-1"), claimPayload())
    );

    await assertFails(getDoc(doc(outsider, "rooms", "room-1")));
    await assertSucceeds(getDoc(doc(joiner, "rooms", "room-1")));
  });

  it("does not let a joiner rewrite the offer", async () => {
    const creator = environment.authenticatedContext("creator").firestore();
    const joiner = environment.authenticatedContext("joiner").firestore();

    await assertSucceeds(
      setDoc(doc(creator, "rooms", "room-1"), roomPayload())
    );
    await assertSucceeds(
      updateDoc(doc(joiner, "rooms", "room-1"), claimPayload())
    );

    await assertFails(
      updateDoc(doc(joiner, "rooms", "room-1"), {
        offer: { type: "offer", sdp: "forged", pairId: "pair-1" },
      })
    );

    await assertSucceeds(
      updateDoc(doc(joiner, "rooms", "room-1"), {
        answer: { type: "answer", sdp: "real", pairId: "pair-1" },
        updatedAt: serverTimestamp(),
      })
    );
  });

  it("lets anyone delete a room that has been abandoned for two minutes", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const admin = context.firestore();
      await setDoc(
        doc(admin, "rooms", "room-stale"),
        roomPayload({
          status: "connecting",
          joinedBy: {
            uid: "gone",
            displayName: "Gone",
            photoURL: null,
          },
          updatedAt: Timestamp.fromMillis(Date.now() - 3 * 60 * 1000),
        })
      );
    });

    const sweeper = environment.authenticatedContext("sweeper").firestore();
    await assertSucceeds(deleteDoc(doc(sweeper, "rooms", "room-stale")));
  });

  it("allows the two peers to exchange candidates", async () => {
    const creator = environment.authenticatedContext("creator").firestore();
    const joiner = environment.authenticatedContext("joiner").firestore();

    await assertSucceeds(
      setDoc(doc(creator, "rooms", "room-3"), roomPayload())
    );
    await assertSucceeds(
      updateDoc(doc(joiner, "rooms", "room-3"), claimPayload())
    );

    await assertSucceeds(
      addDoc(collection(creator, "rooms", "room-3", "candidates"), {
        candidate: { candidate: "candidate:1 1 udp 1 127.0.0.1 1 typ host" },
        from: "creator",
        createdAt: serverTimestamp(),
      })
    );

    await assertSucceeds(
      addDoc(collection(joiner, "rooms", "room-3", "candidates"), {
        candidate: { candidate: "candidate:2 1 udp 1 127.0.0.1 2 typ host" },
        from: "joiner",
        createdAt: serverTimestamp(),
      })
    );

    await assertSucceeds(
      getDocs(collection(creator, "rooms", "room-3", "candidates"))
    );
  });

  it("keeps ICE candidates private to the room's peers", async () => {
    const creator = environment.authenticatedContext("creator").firestore();
    const joiner = environment.authenticatedContext("joiner").firestore();
    const outsider = environment.authenticatedContext("outsider").firestore();

    await assertSucceeds(
      setDoc(doc(creator, "rooms", "room-4"), roomPayload())
    );
    await assertSucceeds(
      updateDoc(doc(joiner, "rooms", "room-4"), claimPayload())
    );
    await assertSucceeds(
      addDoc(collection(creator, "rooms", "room-4", "candidates"), {
        candidate: { candidate: "candidate:1 1 udp 1 10.0.0.1 1 typ host" },
        from: "creator",
        createdAt: serverTimestamp(),
      })
    );

    await assertFails(
      getDocs(collection(outsider, "rooms", "room-4", "candidates"))
    );

    await assertFails(
      addDoc(collection(outsider, "rooms", "room-4", "candidates"), {
        candidate: { candidate: "candidate:9 1 udp 1 6.6.6.6 9 typ host" },
        from: "outsider",
        createdAt: serverTimestamp(),
      })
    );
  });

  it("does not let a peer publish candidates as somebody else", async () => {
    const creator = environment.authenticatedContext("creator").firestore();
    const joiner = environment.authenticatedContext("joiner").firestore();

    await assertSucceeds(
      setDoc(doc(creator, "rooms", "room-5"), roomPayload())
    );
    await assertSucceeds(
      updateDoc(doc(joiner, "rooms", "room-5"), claimPayload())
    );

    await assertFails(
      addDoc(collection(creator, "rooms", "room-5", "candidates"), {
        candidate: { candidate: "candidate:1 1 udp 1 10.0.0.1 1 typ host" },
        from: "joiner",
        createdAt: serverTimestamp(),
      })
    );
  });

  it("lets a participant hand the room back to the pool", async () => {
    const creator = environment.authenticatedContext("creator").firestore();
    const joiner = environment.authenticatedContext("joiner").firestore();

    await assertSucceeds(
      setDoc(doc(creator, "rooms", "room-6"), roomPayload())
    );
    await assertSucceeds(
      updateDoc(doc(joiner, "rooms", "room-6"), claimPayload())
    );

    await assertSucceeds(
      updateDoc(doc(joiner, "rooms", "room-6"), {
        status: "waiting",
        pairId: null,
        joinedBy: null,
        offer: null,
        answer: null,
        joinerLastSeen: null,
        updatedAt: serverTimestamp(),
      })
    );
  });

  it("keeps the room owner fields out of a joiner's reach", async () => {
    const creator = environment.authenticatedContext("creator").firestore();
    const joiner = environment.authenticatedContext("joiner").firestore();

    await assertSucceeds(
      setDoc(doc(creator, "rooms", "room-7"), roomPayload())
    );
    await assertSucceeds(
      updateDoc(doc(joiner, "rooms", "room-7"), claimPayload())
    );

    await assertFails(
      updateDoc(doc(joiner, "rooms", "room-7"), {
        creatorLastSeen: Timestamp.now(),
      })
    );
  });
});
