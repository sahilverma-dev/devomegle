import { useMemo } from "react";

import Chat from "@/components/chat";
import Lobby from "@/components/lobby";
import Searching from "@/components/searching";
import { useAuth } from "@/hooks";
import { useMatchmaking } from "@/hooks/useMatchMaking";
import type { SignalUser } from "@/firebase/rooms";

const Home = () => {
  const { user, githubUrl } = useAuth();

  const profile = useMemo<SignalUser | null>(
    () =>
      user
        ? {
            uid: user.uid,
            displayName: user.displayName,
            photoURL: user.photoURL,
            githubUrl,
          }
        : null,
    [user, githubUrl]
  );

  const { status, roomId, mode, stranger, start, leave, next } =
    useMatchmaking(profile);

  if (status === "lobby") {
    return (
      <Lobby
        onStart={() => start("video")}
        onStartText={() => start("text")}
      />
    );
  }

  if (!roomId) {
    return <Searching mode={mode} onCancel={leave} />;
  }

  return (
    <Chat
      roomId={roomId}
      status={status}
      mode={mode}
      stranger={stranger}
      onEnd={leave}
      onNext={next}
    />
  );
};

export default Home;
