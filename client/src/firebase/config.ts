import { initializeApp } from "firebase/app";

import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { env } from "@/lib/env";

const firebaseConfig = {
  apiKey: env.apiKey,
  authDomain: env.authDomain,
  projectId: env.projectId,
  storageBucket: env.storageBucket,
  messagingSenderId: env.messagingSenderId,
  appId: env.appId,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const firestore = getFirestore(app);

// The emulators can be re-visited during hot reload; connecting twice throws.
const emulatorWindow = window as typeof window & {
  __devomegleEmulatorsConnected?: boolean;
};

if (env.useEmulator && !emulatorWindow.__devomegleEmulatorsConnected) {
  emulatorWindow.__devomegleEmulatorsConnected = true;
  connectAuthEmulator(auth, "http://127.0.0.1:9099", {
    disableWarnings: true,
  });
  connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
}
