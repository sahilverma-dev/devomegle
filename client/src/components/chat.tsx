import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CameraIcon,
  CameraOffIcon,
  MessageCircleIcon,
  MicIcon,
  MicOffIcon,
  SkipForwardIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWebRTC } from "@/hooks";
import type { SignalUser } from "@/firebase/rooms";
import type { ChatStatus } from "@/hooks/useMatchMaking";
import { cn } from "@/lib/utils";

interface Props {
  roomId: string;
  status: ChatStatus;
  stranger: SignalUser | null;
  onEnd: () => void;
  onNext: () => Promise<void> | void;
}

const initials = (user: SignalUser | null) =>
  user?.displayName?.split(" ").join("").slice(0, 2) || "??";

const Chat = ({ status, stranger }: Props) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const {
    localStream,
    remoteStream,
    isPeerConnected,
    isLocalMicActive,
    isLocalVideoActive,
    isRemoteMicActive,
    isRemoteVideoActive,
    toggleLocalMic,
    toggleLocalVideo,
  } = useWebRTC();

  const isWaiting = status === "waiting" || status === "searching";
  const isConnecting = status === "connecting" && !isPeerConnected;

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100">
      <div className="max-w-6xl w-full mx-auto min-h-screen flex flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-neutral-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-blue-500">Devomegle</span>
            <span className="rounded-full border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-400">
              Video chat
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isPeerConnected ? "bg-green-500" : "bg-amber-400"
              )}
            />
            <span className="text-sm text-neutral-400">
              {stranger?.displayName ?? "Stranger"}
            </span>
            <Avatar className="h-8 w-8 border border-neutral-700">
              <AvatarImage src={stranger?.photoURL ?? undefined} />
              <AvatarFallback>{initials(stranger)}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="relative flex flex-1 flex-col gap-4 md:flex-row">
            <div className="relative flex-1 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
              <video
                ref={localVideoRef}
                data-testid="local-video"
                autoPlay
                muted
                playsInline
                className="h-full min-h-[220px] w-full object-cover"
              />
              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-neutral-950/80 px-3 py-1 text-xs">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                You
                {!isLocalMicActive && <MicOffIcon className="h-3 w-3" />}
                {!isLocalVideoActive && <CameraOffIcon className="h-3 w-3" />}
              </div>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
              <video
                ref={remoteVideoRef}
                data-testid="remote-video"
                autoPlay
                playsInline
                className={cn(
                  "h-full min-h-[220px] w-full object-cover",
                  !isPeerConnected && "opacity-20"
                )}
              />
              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-neutral-950/80 px-3 py-1 text-xs">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    isPeerConnected ? "bg-green-500" : "bg-amber-400"
                  )}
                />
                {stranger?.displayName ?? "Stranger"}
                {isPeerConnected && !isRemoteMicActive && (
                  <MicOffIcon className="h-3 w-3" />
                )}
                {isPeerConnected && !isRemoteVideoActive && (
                  <CameraOffIcon className="h-3 w-3" />
                )}
              </div>
            </div>

            <AnimatePresence>
              {(isWaiting || isConnecting) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-neutral-950/70 backdrop-blur-sm"
                >
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/30" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900">
                      <MessageCircleIcon className="h-7 w-7 animate-pulse text-blue-400" />
                    </div>
                  </div>
                  <h2 className="text-lg font-semibold">
                    {isWaiting
                      ? "Waiting for a stranger to join..."
                      : "Connecting to your match..."}
                  </h2>
                  <p className="text-sm text-neutral-400">
                    {isWaiting
                      ? "Keep this tab open. Your match will appear here."
                      : "Exchanging WebRTC descriptions over Firestore."}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-3">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleLocalMic}
                className={cn(
                  "rounded-lg p-3 transition-colors",
                  isLocalMicActive
                    ? "bg-neutral-700 hover:bg-neutral-600"
                    : "bg-red-600 hover:bg-red-700"
                )}
                aria-label="Toggle microphone"
                data-testid="toggle-mic"
                data-active={isLocalMicActive}
              >
                {isLocalMicActive ? <MicIcon /> : <MicOffIcon />}
              </button>
              <button
                onClick={toggleLocalVideo}
                className={cn(
                  "rounded-lg p-3 transition-colors",
                  isLocalVideoActive
                    ? "bg-neutral-700 hover:bg-neutral-600"
                    : "bg-red-600 hover:bg-red-700"
                )}
                aria-label="Toggle camera"
                data-testid="toggle-camera"
                data-active={isLocalVideoActive}
              >
                {isLocalVideoActive ? <CameraIcon /> : <CameraOffIcon />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toast.info("To be implemeted 😢")}
                className="rounded-lg bg-red-600 px-5 py-3 font-medium transition-colors hover:bg-red-700"
              >
                End Chat
              </button>
              <button
                onClick={() => toast.info("To be implemeted 😢")}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium transition-colors hover:bg-blue-700"
              >
                <SkipForwardIcon className="h-4 w-4" />
                Next Person
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
