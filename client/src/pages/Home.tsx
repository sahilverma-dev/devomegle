import Chat from "@/components/chat";
import Lobby from "@/components/lobby";
import Searching from "@/components/searching";
import { useAuth } from "@/hooks";
import { useMatchmaking } from "@/hooks/useMatchMaking";

const Home = () => {
  const { user } = useAuth();
  const { status, roomId, mode, stranger, start, leave, next } =
    useMatchmaking(user);

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
