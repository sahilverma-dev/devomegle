import { initializeApp } from "firebase/app";

import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const useEmulator = import.meta.env.VITE_USE_EMULATOR === "true";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY || (useEmulator ? "demo-api-key" : ""),
  authDomain:
    import.meta.env.VITE_AUTH_DOMAIN ||
    (useEmulator ? "demo-devomegle.firebaseapp.com" : ""),
  projectId:
    import.meta.env.VITE_PROJECT_ID || (useEmulator ? "demo-devomegle" : ""),
  storageBucket:
    import.meta.env.VITE_STORAGE_BUCKET ||
    (useEmulator ? "demo-devomegle.appspot.com" : ""),
  messagingSenderId:
    import.meta.env.VITE_MESSAGING_SENDER_ID ||
    (useEmulator ? "1234567890" : ""),
  appId:
    import.meta.env.VITE_APP_ID ||
    (useEmulator ? "1:1234567890:web:devomegle" : ""),
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const firestore = getFirestore(app);

// The emulators can be re-visited during hot reload; connecting twice throws.
const emulatorWindow = window as typeof window & {
  __devomegleEmulatorsConnected?: boolean;
};

if (useEmulator && !emulatorWindow.__devomegleEmulatorsConnected) {
  emulatorWindow.__devomegleEmulatorsConnected = true;
  connectAuthEmulator(auth, "http://127.0.0.1:9099", {
    disableWarnings: true,
  });
  connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
}
