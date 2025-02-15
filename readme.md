# Devomegle

![Devomegle](/client/public/og.png)

[https://devomegle.vercel.app](https://devomegle.vercel.app/)

Omegle for developers. Sign in, get matched with a random developer, and talk
over peer-to-peer video or text.

## How it works

There is no signaling server. Firestore is the signaling layer:

```
rooms/{roomId}
  status: waiting | connecting | connected
  createdBy / joinedBy
  offer / answer
  createdAt / updatedAt
  creatorLastSeen / joinerLastSeen

rooms/{roomId}/candidates/{candidateId}
  candidate / from / createdAt
```

1. The creator opens a `waiting` room and writes its profile.
2. A joiner finds an open room and claims it inside a Firestore transaction, so
   two strangers can never be paired with the same person.
3. The creator writes an SDP offer; the joiner writes the SDP answer; both write
   ICE candidates to the room subcollection and apply the other side's.
4. Each peer refreshes a heartbeat every 5 seconds. A peer that goes quiet for
   20 seconds is treated as gone and the room is reset or removed.
5. `pagehide`/`beforeunload` best-effort cleanup plus a stale-room sweep on every
   search guarantee that closed tabs cannot leave phantom users behind.
6. Firestore does not cascade-delete subcollections, so room cleanup explicitly
   removes the candidate documents as well.

WebRTC media and the in-call text channel never touch Firestore: the text chat
rides on an `RTCDataChannel`.

## Features

- Random one-to-one matching for video or text chat
- Atomic room claiming (no double matches)
- Microphone and camera toggles, reflected on the other side
- End Chat and Next Person
- In-call text chat over a WebRTC data channel
- Text-only mode from the lobby
- Heartbeat-based disconnect detection and full room/candidate cleanup

## Local development

```bash
cd client
bun install
cp .env.example .env   # fill in the Firebase web app values
bun run dev
```

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
text-only mode, and disconnect cleanup.

## Firestore rules

Security rules live in `firestore.rules` and the emulator config in
`firebase.json`. Deploy them with:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Contact

- **Email:** [sahilverma.webdev@gmail.com](mailto:sahilverma.webdev@gmail.com)
- **Portfolio:** [sahilverma.dev](https://sahilverma.dev/)
- **GitHub:** [@sahilverma-dev](https://github.com/sahilverma-dev)
- **Twitter:** [@sahilverma_dev](https://twitter.com/sahilverma_dev)
- **LinkedIn:** [sahilverma-dev](https://www.linkedin.com/in/sahilverma-dev/)
