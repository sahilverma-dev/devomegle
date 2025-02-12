import Chat from "@/components/chat";
import Lobby from "@/components/lobby";
import MafiModal from "@/components/modals/mafi-modal";
import { useAuth } from "@/hooks";
import { useMatchmaking } from "@/hooks/useMatchMaking";

const Searching = () => (
  <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center gap-4">
    <div className="relative">
      <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/30" />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
      </div>
    </div>
    <h2 className="text-lg font-semibold">Finding a developer for you...</h2>
    <p className="text-sm text-neutral-400">
      Looking for an open room on Firestore.
    </p>
  </div>
);

const Home = () => {
  const { user } = useAuth();
  const { status, roomId, mode, stranger, start, leave, next } =
    useMatchmaking(user);

  return (
    <>
      {status === "lobby" && (
        <Lobby
          onStart={() => start("video")}
          onStartText={() => start("text")}
        />
      )}

      {status !== "lobby" && !roomId && <Searching />}

      {status !== "lobby" && roomId && (
        <Chat
          roomId={roomId}
          status={status}
          mode={mode}
          stranger={stranger}
          onEnd={leave}
          onNext={next}
        />
      )}

      <MafiModal />
    </>
  );
};

export default Home;
