import Chat from "@/components/chat";
import Lobby from "@/components/lobby";
import { Background } from "@/components/ui/background";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/hooks";
import { useMatchmaking } from "@/hooks/useMatchMaking";
import { Radio } from "lucide-react";

const Searching = () => (
  <>
    <Background />
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <Logo />
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-primary/30" />
        <span className="absolute inset-0 animate-pulse-ring rounded-full border border-primary/40" />
        <span className="absolute inset-3 rounded-full border border-primary/20" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] backdrop-blur-xl">
          <Radio className="h-6 w-6 animate-pulse text-primary" />
        </span>
      </div>
      <div className="animate-fade-up">
        <h2 className="text-xl font-semibold tracking-tight">
          Finding a developer for you...
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Scanning the network for an open room.
        </p>
      </div>
      <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
        firestore://rooms --waiting
      </div>
    </div>
  </>
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
    </>
  );
};

export default Home;
