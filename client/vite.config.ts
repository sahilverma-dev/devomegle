import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

/**
 * Firebase's OAuth helper normally lives on `<project>.firebaseapp.com`, which
 * is a third-party origin from the app. Browsers that block third-party storage
 * (headless Chrome, Safari) then drop the result of a redirect sign-in.
 *
 * Serving `/__/auth/*` from our own origin makes it first-party. In production
 * `vercel.json` proxies it; in development this proxy does, so both behave the
 * same when `VITE_AUTH_DOMAIN` points at the app's own host.
 */
const authProxyTarget = (projectId: string | undefined) =>
  projectId ? `https://${projectId}.firebaseapp.com` : null;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const projectId = env.VITE_PROJECT_ID?.replace(/^"|"$/g, "").trim();
  const authDomain = env.VITE_AUTH_DOMAIN?.replace(/^"|"$/g, "").trim() ?? "";
  // Only proxy when the app really is serving auth from its own origin.
  const target =
    authDomain && !authDomain.endsWith(".firebaseapp.com")
      ? authProxyTarget(projectId)
      : null;

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: target
        ? {
            "/__/auth": { target, changeOrigin: true, secure: true },
            "/__/firebase": { target, changeOrigin: true, secure: true },
          }
        : undefined,
    },
    preview: { port: 3000 },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
