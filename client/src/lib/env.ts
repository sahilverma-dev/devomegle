import { z } from "zod/v4";

/**
 * Every value the Firebase client needs. They are validated once at startup so
 * a half-configured deployment fails loudly instead of booting a client that
 * silently cannot reach Firestore.
 */
const FIREBASE_KEYS = [
  "VITE_API_KEY",
  "VITE_AUTH_DOMAIN",
  "VITE_PROJECT_ID",
  "VITE_STORAGE_BUCKET",
  "VITE_MESSAGING_SENDER_ID",
  "VITE_APP_ID",
] as const;

type FirebaseKey = (typeof FIREBASE_KEYS)[number];

/** Values the Firebase emulator suite accepts without a real project. */
const DEMO_VALUES: Record<FirebaseKey, string> = {
  VITE_API_KEY: "demo-api-key",
  VITE_AUTH_DOMAIN: "demo-devomegle.firebaseapp.com",
  VITE_PROJECT_ID: "demo-devomegle",
  VITE_STORAGE_BUCKET: "demo-devomegle.appspot.com",
  VITE_MESSAGING_SENDER_ID: "1234567890",
  VITE_APP_ID: "1:1234567890:web:devomegle",
};

const rawEnvSchema = z.object({
  VITE_USE_EMULATOR: z.enum(["true", "false"]).default("false"),
  VITE_API_KEY: z.string().trim().default(""),
  VITE_AUTH_DOMAIN: z.string().trim().default(""),
  VITE_PROJECT_ID: z.string().trim().default(""),
  VITE_STORAGE_BUCKET: z.string().trim().default(""),
  VITE_MESSAGING_SENDER_ID: z.string().trim().default(""),
  VITE_APP_ID: z.string().trim().default(""),
});

const envSchema = rawEnvSchema.transform((raw, ctx) => {
  const useEmulator = raw.VITE_USE_EMULATOR === "true";

  const values = Object.fromEntries(
    FIREBASE_KEYS.map((key) => [
      key,
      raw[key] || (useEmulator ? DEMO_VALUES[key] : ""),
    ])
  ) as Record<FirebaseKey, string>;

  const missing = FIREBASE_KEYS.filter((key) => values[key].length === 0);

  if (missing.length > 0) {
    ctx.addIssue({
      code: "custom",
      message: `Missing Firebase configuration: ${missing.join(
        ", "
      )}. Copy client/.env.example to client/.env and fill it in, or set VITE_USE_EMULATOR=true to use the emulator defaults.`,
    });
    return z.NEVER;
  }

  return {
    apiKey: values.VITE_API_KEY,
    authDomain: values.VITE_AUTH_DOMAIN,
    projectId: values.VITE_PROJECT_ID,
    storageBucket: values.VITE_STORAGE_BUCKET,
    messagingSenderId: values.VITE_MESSAGING_SENDER_ID,
    appId: values.VITE_APP_ID,
    useEmulator,
  };
});

const getEnv = () => {
  const { data, success, error } = envSchema.safeParse(import.meta.env);

  if (!success) {
    console.error("Invalid environment variables");
    throw new Error(z.prettifyError(error));
  }

  return data;
};

export const env = getEnv();
