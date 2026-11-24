/**
 * Issues short-lived Cloudflare TURN credentials for the browser.
 *
 * The TURN key is a long-lived secret that can mint unlimited credentials, so
 * it must never reach the client bundle. This function is the only place the
 * API token is used, and it returns credentials that expire on their own.
 *
 * Required environment variables (set them in Vercel, not in the repo):
 *   CLOUDFLARE_TURN_KEY_ID
 *   CLOUDFLARE_TURN_API_TOKEN
 */

const CLOUDFLARE_TURN_API = "https://rtc.live.cloudflare.com/v1/turn/keys";

/** Long enough for any single call, short enough that a leak ages out. */
const CREDENTIAL_TTL_SECONDS = 6 * 60 * 60;
/** Never hand out credentials that are about to expire. */
const SAFETY_SECONDS = 5 * 60;

let cache = { iceServers: null, expiresAt: 0, ttl: 0 };

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
  const apiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;

  if (!keyId || !apiToken) {
    response.status(503).json({ error: "turn_not_configured" });
    return;
  }

  const now = Date.now();

  if (cache.iceServers && cache.expiresAt - SAFETY_SECONDS * 1000 > now) {
    respond(response, cache.iceServers, cache.ttl, cache.expiresAt, now);
    return;
  }

  try {
    const upstream = await fetch(
      `${CLOUDFLARE_TURN_API}/${keyId}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: CREDENTIAL_TTL_SECONDS }),
      }
    );

    if (!upstream.ok) {
      response.status(502).json({ error: "turn_provider_error" });
      return;
    }

    const payload = await upstream.json();
    const iceServers = normalizeIceServers(payload?.iceServers);

    if (iceServers.length === 0) {
      response.status(502).json({ error: "turn_provider_empty" });
      return;
    }

    cache = {
      iceServers,
      ttl: CREDENTIAL_TTL_SECONDS,
      expiresAt: now + CREDENTIAL_TTL_SECONDS * 1000,
    };

    respond(response, iceServers, cache.ttl, cache.expiresAt, now);
  } catch {
    response.status(502).json({ error: "turn_provider_unreachable" });
  }
}

function respond(response, iceServers, ttl, expiresAt, now) {
  const maxAge = Math.max(60, Math.floor((expiresAt - now) / 1000) - SAFETY_SECONDS);

  // Credentials are time-limited, not per-user, so the CDN may share them.
  response.setHeader(
    "Cache-Control",
    `public, max-age=${maxAge}, s-maxage=${maxAge}`
  );
  response.status(200).json({ iceServers, ttl });
}

/**
 * Cloudflare returns a list that mixes a credential-free STUN entry with the
 * TURN entry. Port 53 is filtered out: browsers block it, and without trickle
 * ICE it only adds a timeout.
 */
function normalizeIceServers(raw) {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];

  return list
    .filter((server) => server && Array.isArray(server.urls))
    .map((server) => {
      const urls = server.urls.filter(
        (url) => typeof url === "string" && !url.includes(":53")
      );

      if (urls.length === 0) return null;

      const normalized = { urls };

      if (
        typeof server.username === "string" &&
        typeof server.credential === "string"
      ) {
        normalized.username = server.username;
        normalized.credential = server.credential;
      }

      return normalized;
    })
    .filter(Boolean);
}
