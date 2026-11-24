/**
 * Resolves the ICE servers used for a peer connection.
 *
 * TURN credentials are minted by `/api/turn`, which keeps the long-lived
 * Cloudflare key on the server. They are cached for their lifetime and the app
 * silently falls back to STUN-only when the endpoint is unavailable, which is
 * the normal case in local development.
 */

export const STUN_ONLY_ICE_SERVERS: RTCIceServer[] = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:global.stun.twilio.com:3478",
    ],
  },
];

const CACHE_KEY = "devomegle.ice-servers.v1";
const FETCH_TIMEOUT_MS = 4_000;
/** Do not retry a failing endpoint on every match. */
const FAILURE_BACKOFF_MS = 60_000;
/** Refresh before the credentials actually expire. */
const CACHE_MARGIN_MS = 5 * 60_000;

interface IceServersCache {
  iceServers: RTCIceServer[];
  expiresAt: number;
}

let memory: IceServersCache | null = null;
let inFlight: Promise<RTCIceServer[]> | null = null;
let failedAt = 0;

const isUsable = (cache: IceServersCache | null): cache is IceServersCache =>
  Boolean(cache?.iceServers?.length) && (cache?.expiresAt ?? 0) > Date.now();

const readCache = (): IceServersCache | null => {
  if (isUsable(memory)) return memory;

  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as IceServersCache;
    if (!isUsable(parsed)) return null;

    memory = parsed;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (iceServers: RTCIceServer[], ttlSeconds: number) => {
  const entry: IceServersCache = {
    iceServers,
    expiresAt: Date.now() + Math.max(ttlSeconds * 1000 - CACHE_MARGIN_MS, 60_000),
  };

  memory = entry;

  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Private mode or a full quota: the in-memory copy is enough.
  }
};

const fetchIceServers = async (): Promise<RTCIceServer[]> => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch("/api/turn", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return STUN_ONLY_ICE_SERVERS;

    const payload = (await response.json()) as {
      iceServers?: RTCIceServer[];
      ttl?: number;
    };

    const iceServers = Array.isArray(payload?.iceServers)
      ? payload.iceServers
      : [];

    if (iceServers.length === 0) return STUN_ONLY_ICE_SERVERS;

    writeCache(
      iceServers,
      typeof payload.ttl === "number" && payload.ttl > 0 ? payload.ttl : 3_600
    );

    return iceServers;
  } finally {
    window.clearTimeout(timer);
  }
};

export const loadIceServers = async (): Promise<RTCIceServer[]> => {
  const cached = readCache();
  if (cached) return cached.iceServers;

  if (Date.now() - failedAt < FAILURE_BACKOFF_MS) {
    return STUN_ONLY_ICE_SERVERS;
  }

  if (!inFlight) {
    inFlight = fetchIceServers()
      .catch(() => {
        failedAt = Date.now();
        return STUN_ONLY_ICE_SERVERS;
      })
      .then((iceServers) => {
        inFlight = null;
        return iceServers;
      });
  }

  return inFlight;
};
