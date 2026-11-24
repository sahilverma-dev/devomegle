# Devomegle

![Devomegle](/client/public/og.png)

[https://devomegle.vercel.app](https://devomegle.vercel.app/)

Omegle for developers. Sign in, get matched with a random developer, and talk
over peer-to-peer video or text.

## How it works

There is no signaling server. Firestore is the signaling layer:

```
rooms/{roomId}
  status: waiting | connecting
  mode: video | text
  pairId                     # identifies the current pairing
  createdBy / joinedBy
  offer / answer             # tagged with the pairId they belong to
  createdAt / updatedAt
  creatorLastSeen / joinerLastSeen

rooms/{roomId}/candidates/{candidateId}
  candidate / from / createdAt
```

1. The creator opens a `waiting` room for its mode and writes its profile.
2. A joiner finds an open room of the same mode and claims it inside a
   Firestore transaction, so two strangers can never be paired with the same
   person. The claim starts a new pairing: it writes a fresh `pairId` and drops
   any signaling left by the previous stranger.
3. The creator writes an SDP offer; the joiner writes the SDP answer; both write
   ICE candidates to the room subcollection and apply the other side's. Offers
   and answers carry the `pairId`, so a stale description can never be applied.
4. Each peer refreshes a heartbeat every 5 seconds. A peer whose heartbeat stops
   advancing for 45 seconds is treated as gone and the room is reset or removed.
5. A stranger that opens a room keeps looking for a few seconds: when two people
   start at the same time, the owner of the newer room id gives up its own room
   and joins the older one, so they still match.
6. `pagehide`/`beforeunload` best-effort cleanup plus a stale-room sweep on every
   search guarantee that closed tabs cannot leave phantom users behind.
7. Firestore does not cascade-delete subcollections, so room cleanup explicitly
   removes the candidate documents as well.
8. When a direct path between two peers is impossible, media falls back to a
   TURN relay. The Cloudflare TURN key never reaches the browser: `api/turn.js`
   mints short-lived credentials for it.

WebRTC media and the in-call text channel never touch Firestore: the text chat
rides on an `RTCDataChannel`.

## Features

- Random one-to-one matching for video or text chat, never across modes
- Atomic room claiming (no double matches) that also converges simultaneous searches
- Microphone and camera toggles, reflected on the other side
- End Chat and Next Person
- In-call text chat over a WebRTC data channel
- Text-only mode from the lobby
- Heartbeat-based disconnect detection, negotiation timeouts and full room/candidate cleanup

## Local development

```bash
cd client
bun install
cp .env.example .env   # fill in the Firebase web app values
bun run dev
```

The client validates its environment at startup (`src/lib/env.ts`): a missing
Firebase value stops the app with a clear message instead of booting a client
that cannot reach Firestore. With `VITE_USE_EMULATOR=true` the Firebase values
may stay empty, because the demo project defaults are filled in.

### TURN relay

`client/api/turn.js` exchanges the Cloudflare TURN key for short-lived
credentials. Set these in the host environment (for example the Vercel project
settings) and never behind a `VITE_` prefix:

```
CLOUDFLARE_TURN_KEY_ID=...
CLOUDFLARE_TURN_API_TOKEN=...
```

Without them the endpoint answers `503` and the app quietly uses STUN only,
which is what happens in local development because Vite does not serve `api/`.

### Firebase emulator

The app can run fully offline against the Firebase emulator suite:

```bash
bun install                 # root tooling: firebase-tools, vitest, Playwright
bunx playwright install chromium
cp client/.env.example client/.env
# set VITE_USE_EMULATOR=true in client/.env
bun run emulators
```

With the emulator enabled, the login page also exposes an anonymous
"Continue as Guest" button.

## Tests

```bash
bun run test:rules   # Firestore security rules against the emulator
bun run test:e2e     # two browser tabs matching over Firestore + WebRTC
```

The end-to-end suite covers matching, chat, media toggles, End Chat, Next Person,
text-only mode, mode isolation, simultaneous searches, and disconnect cleanup.

## Firestore rules

Security rules live in `firestore.rules` and the emulator config in
`firebase.json`. They enforce:

- waiting rooms are discoverable; claimed rooms are visible to their two peers only
- only a peer in a room can read, publish or delete its ICE candidates, and only
  as itself (candidates expose IP addresses)
- each write path is restricted to the fields it is allowed to touch, so a
  claimer cannot rewrite the room owner or the signaling
- rooms carry no email addresses

Deploy them with:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

The matching query needs the composite index in `firestore.indexes.json`
(`status` + `mode` + `creatorLastSeen`), so deploy the indexes as well.

## Contact

- **Email:** [sahilverma.webdev@gmail.com](mailto:sahilverma.webdev@gmail.com)
- **Portfolio:** [sahilverma.dev](https://sahilverma.dev/)
- **GitHub:** [@sahilverma-dev](https://github.com/sahilverma-dev)
- **Twitter:** [@sahilverma_dev](https://twitter.com/sahilverma_dev)
- **LinkedIn:** [sahilverma-dev](https://www.linkedin.com/in/sahilverma-dev/)
