import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CameraIcon,
  CameraOffIcon,
  Loader2,
  MessageCircleIcon,
  MicIcon,
  MicOffIcon,
  PhoneOffIcon,
  SendIcon,
  ShieldCheck,
  SkipForwardIcon,
  Sparkles,
  VideoIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Background } from "@/components/ui/background";
import { Logo } from "@/components/ui/logo";
import { useWebRTC } from "@/hooks";
import type { SignalUser } from "@/firebase/rooms";
import type { ChatStatus } from "@/hooks/useMatchMaking";
import type { MediaMode } from "@/providers/WebRTCProvider";
import { cn } from "@/lib/utils";

interface Props {
  roomId: string;
  status: ChatStatus;
  mode: MediaMode;
  stranger: SignalUser | null;
  onEnd: () => void;
  onNext: () => Promise<void> | void;
}

const initials = (user: SignalUser | null) =>
  user?.displayName?.split(" ").join("").slice(0, 2).toUpperCase() || "??";

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const Chat = ({ status, mode, stranger, onEnd, onNext }: Props) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const {
    localStream,
    remoteStream,
    messages,
    isPeerConnected,
    isDataChannelOpen,
    isLocalMicActive,
    isLocalVideoActive,
    isRemoteMicActive,
    isRemoteVideoActive,
    toggleLocalMic,
    toggleLocalVideo,
    sendChatMessage,
  } = useWebRTC();

  const [chatOpen, setChatOpen] = useState(mode === "text");
  const [draft, setDraft] = useState("");
  const [isLeaving, setIsLeaving] = useState(false);

  const isTextMode = mode === "text";
  const isChatVisible = isTextMode || chatOpen;
  const isWaiting = status === "waiting" || status === "searching";
  const isConnecting = status === "connecting" && !isPeerConnected;
  const presenceLabel = isPeerConnected
    ? "Connected"
    : isWaiting
      ? "Waiting"
      : "Connecting";

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!isTextMode) setChatOpen(false);
  }, [isTextMode]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleEnd = async () => {
    if (isLeaving) return;
    setIsLeaving(true);
    try {
      await onEnd();
    } finally {
      setIsLeaving(false);
    }
  };

  const handleNext = async () => {
    if (isLeaving) return;
    setIsLeaving(true);
    try {
      await onNext();
    } finally {
      setIsLeaving(false);
    }
  };

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    if (!isDataChannelOpen) {
      toast.info("Waiting for the stranger to connect...");
      return;
    }
    sendChatMessage(text);
    setDraft("");
  };

  return (
    <>
      <Background />
      <div className="flex min-h-screen w-full flex-col">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-4 pt-4 sm:px-6">
          {/* Top bar */}
          <header className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-xl">
            <div className="flex min-w-0 items-center gap-3">
              <Logo markOnly className="sm:hidden" />
              <div className="hidden sm:block">
                <Logo />
              </div>
              <span className="hidden h-5 w-px bg-white/10 sm:block" />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-muted-foreground">
                {isTextMode ? (
                  <MessageCircleIcon className="h-3 w-3 text-primary" />
                ) : (
                  <VideoIcon className="h-3 w-3 text-primary" />
                )}
                {isTextMode ? "Text room" : "Video room"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] sm:inline-flex",
                  isPeerConnected
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isPeerConnected ? "bg-success" : "animate-pulse bg-amber-300"
                  )}
                />
                {presenceLabel}
              </span>

              <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-black/20 py-1 pl-1 pr-3">
                <Avatar className="h-7 w-7 border border-white/10">
                  <AvatarImage src={stranger?.photoURL ?? undefined} />
                  <AvatarFallback className="bg-primary/15 font-mono text-[10px] font-semibold text-primary">
                    {initials(stranger)}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[7rem] truncate text-xs font-medium">
                  {stranger?.displayName ?? "Stranger"}
                </span>
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isPeerConnected ? "bg-success" : "bg-amber-300"
                  )}
                />
              </div>
            </div>
          </header>

          {/* Stage */}
          <div className="relative mt-4 flex flex-1 flex-col gap-4 lg:flex-row">
            {!isTextMode && (
              <div className="grid flex-1 gap-4 md:grid-cols-2">
                {/* Local pane */}
                <section className="group relative min-h-[240px] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-black/40">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                      <CameraIcon className="h-8 w-8" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                        no camera feed
                      </span>
                    </div>
                  </div>
                  <video
                    ref={localVideoRef}
                    data-testid="local-video"
                    autoPlay
                    muted
                    playsInline
                    className="relative h-full min-h-[240px] w-full -scale-x-100 object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                  <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground backdrop-blur-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Preview
                  </div>

                  <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs backdrop-blur-md">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    <span className="font-medium">You</span>
                    {!isLocalMicActive && (
                      <MicOffIcon className="h-3 w-3 text-destructive" />
                    )}
                    {!isLocalVideoActive && (
                      <CameraOffIcon className="h-3 w-3 text-destructive" />
                    )}
                  </div>

                  <div className="absolute bottom-3 right-3 rounded-md border border-white/10 bg-black/40 px-2 py-1 font-mono text-[10px] text-muted-foreground backdrop-blur-md">
                    self
                  </div>
                </section>

                {/* Remote pane */}
                <section
                  className={cn(
                    "group relative min-h-[240px] overflow-hidden rounded-2xl border bg-gradient-to-br from-white/[0.06] to-black/40 transition-colors",
                    isPeerConnected ? "border-primary/30" : "border-white/10"
                  )}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground/40">
                      <Avatar className="h-16 w-16 border border-white/10">
                        <AvatarImage src={stranger?.photoURL ?? undefined} />
                        <AvatarFallback className="bg-primary/10 font-mono text-lg text-primary">
                          {initials(stranger)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                        {isPeerConnected ? "peer connected" : "waiting for peer"}
                      </span>
                    </div>
                  </div>

                  <video
                    ref={remoteVideoRef}
                    data-testid="remote-video"
                    autoPlay
                    playsInline
                    className={cn(
                      "relative h-full min-h-[240px] w-full object-cover transition-opacity duration-500",
                      !isPeerConnected && "opacity-0"
                    )}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                  <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground backdrop-blur-md">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isPeerConnected ? "bg-success" : "bg-amber-300"
                      )}
                    />
                    {isPeerConnected ? "Live" : "Offline"}
                  </div>

                  <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs backdrop-blur-md">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        isPeerConnected ? "bg-success" : "bg-amber-300"
                      )}
                    />
                    <span className="max-w-[10rem] truncate font-medium">
                      {stranger?.displayName ?? "Stranger"}
                    </span>
                    {isPeerConnected && !isRemoteMicActive && (
                      <MicOffIcon className="h-3 w-3 text-destructive" />
                    )}
                    {isPeerConnected && !isRemoteVideoActive && (
                      <CameraOffIcon className="h-3 w-3 text-destructive" />
                    )}
                  </div>

                  <div className="absolute bottom-3 right-3 rounded-md border border-white/10 bg-black/40 px-2 py-1 font-mono text-[10px] text-muted-foreground backdrop-blur-md">
                    p2p
                  </div>
                </section>
              </div>
            )}

            {/* Chat panel */}
            {isChatVisible && (
              <div
                data-testid="chat-panel"
                data-open={isDataChannelOpen}
                className={cn(
                  "relative flex min-h-[320px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl",
                  isTextMode
                    ? "mx-auto w-full max-w-3xl flex-1"
                    : "lg:w-[21rem] lg:shrink-0"
                )}
              >
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-primary/10">
                      <MessageCircleIcon className="h-3.5 w-3.5 text-primary" />
                    </span>
                    Session chat
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]",
                        isDataChannelOpen
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-white/10 bg-white/[0.04] text-muted-foreground"
                      )}
                    >
                      {isDataChannelOpen ? "open" : "closed"}
                    </span>
                    {!isTextMode && (
                      <button
                        onClick={() => setChatOpen(false)}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                        aria-label="Close chat"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {isTextMode && (
                  <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                    <Avatar className="h-9 w-9 border border-white/10">
                      <AvatarImage src={stranger?.photoURL ?? undefined} />
                      <AvatarFallback className="bg-primary/15 font-mono text-[11px] text-primary">
                        {initials(stranger)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {stranger?.displayName ?? "Stranger"}
                      </p>
                      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            isPeerConnected ? "bg-success" : "bg-amber-300"
                          )}
                        />
                        {isPeerConnected
                          ? "Connected over WebRTC"
                          : "Waiting for connection"}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
                  {messages.length === 0 && (
                    <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </span>
                      <p className="text-xs">
                        {isDataChannelOpen
                          ? "Say hi to your match"
                          : "Chat opens when your match connects"}
                      </p>
                    </div>
                  )}

                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex flex-col gap-1",
                        message.from === "me" ? "items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed break-words",
                          message.from === "me"
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md border border-white/10 bg-white/[0.06] text-foreground"
                        )}
                      >
                        {message.text}
                      </div>
                      <span className="px-1 font-mono text-[10px] text-muted-foreground/70">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  ))}
                  <div ref={messageEndRef} />
                </div>

                <div className="border-t border-white/10 p-3">
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-1.5 focus-within:border-primary/40">
                    <input
                      value={draft}
                      data-testid="chat-input"
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleSend();
                      }}
                      placeholder="Type a message..."
                      className="min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground/70"
                    />
                    <button
                      onClick={handleSend}
                      data-testid="send-message"
                      className="rounded-lg bg-primary p-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                      aria-label="Send message"
                    >
                      <SendIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground/70">
                    <ShieldCheck className="h-3 w-3" />
                    Messages travel directly between peers
                  </p>
                </div>
              </div>
            )}

            {/* Waiting / connecting overlay */}
            <AnimatePresence>
              {(isWaiting || isConnecting) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-background/75 px-6 text-center backdrop-blur-md"
                >
                  <div className="relative flex h-24 w-24 items-center justify-center">
                    <span className="absolute inset-0 rounded-full border border-primary/30" />
                    <span className="absolute inset-0 animate-pulse-ring rounded-full border border-primary/40" />
                    <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] backdrop-blur-xl">
                      {isWaiting ? (
                        <MessageCircleIcon className="h-7 w-7 animate-pulse text-primary" />
                      ) : (
                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                      )}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">
                      {isWaiting
                        ? "Waiting for a stranger to join..."
                        : "Connecting to your match..."}
                    </h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {isWaiting
                        ? "Keep this tab open. Your match will appear here."
                        : "Exchanging WebRTC descriptions over Firestore."}
                    </p>
                  </div>
                  <span className="code-chip">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                    {isTextMode ? "text room queued" : "media room queued"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              {!isTextMode && (
                <>
                  <ControlButton
                    active={isLocalMicActive}
                    onClick={toggleLocalMic}
                    label={isLocalMicActive ? "Mute microphone" : "Unmute microphone"}
                    data-testid="toggle-mic"
                    data-active={isLocalMicActive}
                  >
                    {isLocalMicActive ? (
                      <MicIcon className="h-4 w-4" />
                    ) : (
                      <MicOffIcon className="h-4 w-4" />
                    )}
                  </ControlButton>

                  <ControlButton
                    active={isLocalVideoActive}
                    onClick={toggleLocalVideo}
                    label={isLocalVideoActive ? "Turn camera off" : "Turn camera on"}
                    data-testid="toggle-camera"
                    data-active={isLocalVideoActive}
                  >
                    {isLocalVideoActive ? (
                      <CameraIcon className="h-4 w-4" />
                    ) : (
                      <CameraOffIcon className="h-4 w-4" />
                    )}
                  </ControlButton>

                  <ControlButton
                    active={chatOpen}
                    onClick={() => setChatOpen((current) => !current)}
                    label="Toggle text chat"
                    data-testid="toggle-chat"
                    data-active={chatOpen}
                  >
                    <MessageCircleIcon className="h-4 w-4" />
                  </ControlButton>

                  <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />
                </>
              )}

              <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isPeerConnected ? "bg-success" : "bg-amber-300"
                  )}
                />
                {isPeerConnected
                  ? "Peer-to-peer"
                  : isWaiting
                    ? "Waiting for match"
                    : "Negotiating"}
              </div>
            </div>

            <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
              <button
                onClick={handleEnd}
                disabled={isLeaving}
                data-testid="end-chat"
                className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-60"
              >
                <PhoneOffIcon className="h-4 w-4" />
                End Chat
              </button>
              <button
                onClick={handleNext}
                disabled={isLeaving}
                data-testid="next-person"
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_40px_-16px_hsl(var(--primary)/0.9)] transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                <SkipForwardIcon className="h-4 w-4" />
                Next Person
              </button>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
};

interface ControlButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  label: string;
}

const ControlButton = ({
  active,
  label,
  className,
  children,
  ...props
}: ControlButtonProps) => (
  <button
    {...props}
    aria-label={label}
    aria-pressed={active}
    title={label}
    className={cn(
      "rounded-xl border p-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      active
        ? "border-white/10 bg-white/[0.06] text-foreground hover:bg-white/[0.1]"
        : "border-destructive/30 bg-destructive/15 text-destructive hover:bg-destructive/25",
      className
    )}
  >
    {children}
  </button>
);

export default Chat;
