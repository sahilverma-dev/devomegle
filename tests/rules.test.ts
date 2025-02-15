import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
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
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

const PROJECT_ID = "demo-devomegle";

let environment: RulesTestEnvironment;

const creatorProfile = {
  uid: "creator",
  displayName: "Creator",
  email: "creator@example.com",
  photoURL: null,
};

const joinerProfile = {
  uid: "joiner",
  displayName: "Joiner",
  email: "joiner@example.com",
  photoURL: null,
};

const roomPayload = (overrides: Record<string, unknown> = {}) => ({
  status: "waiting",
  createdBy: creatorProfile,
  joinedBy: null,
  offer: null,
  answer: null,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  creatorLastSeen: Timestamp.now(),
  joinerLastSeen: null,
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
});

afterAll(async () => {
  await environment.cleanup();
});

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
      updateDoc(doc(joiner, "rooms", "room-1"), {
        status: "connecting",
        joinedBy: joinerProfile,
        joinerLastSeen: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    );

    const outsider = environment.authenticatedContext("outsider").firestore();
    await assertFails(
      updateDoc(doc(outsider, "rooms", "room-1"), {
        status: "waiting",
        joinedBy: null,
      })
    );
  });

  it("does not let a user create a room for somebody else", async () => {
    const joiner = environment.authenticatedContext("joiner").firestore();

    await assertFails(
      setDoc(doc(joiner, "rooms", "room-2"), roomPayload())
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
            email: null,
            photoURL: null,
          },
          updatedAt: Timestamp.fromMillis(Date.now() - 3 * 60 * 1000),
        })
      );
    });

    const sweeper = environment.authenticatedContext("sweeper").firestore();
    await assertSucceeds(deleteDoc(doc(sweeper, "rooms", "room-stale")));
  });

  it("allows authenticated peers to exchange candidates", async () => {
    const creator = environment.authenticatedContext("creator").firestore();
    const joiner = environment.authenticatedContext("joiner").firestore();

    await assertSucceeds(
      setDoc(doc(creator, "rooms", "room-3"), roomPayload())
    );

    await assertSucceeds(
      addDoc(collection(creator, "rooms", "room-3", "candidates"), {
        candidate: { candidate: "candidate:1 1 udp 1 127.0.0.1 1 typ host" },
        from: "creator",
        createdAt: Timestamp.now(),
      })
    );

    await assertSucceeds(
      addDoc(collection(joiner, "rooms", "room-3", "candidates"), {
        candidate: { candidate: "candidate:2 1 udp 1 127.0.0.1 2 typ host" },
        from: "joiner",
        createdAt: Timestamp.now(),
      })
    );
  });
});
