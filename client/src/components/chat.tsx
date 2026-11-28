import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import {
  ArrowLeftRight,
  ArrowUpRight,
  Camera,
  CameraOff,
  Github,
  Maximize2,
  MessageCircle,
  Mic,
  MicOff,
  Minimize2,
  PhoneOff,
  Send,
  SkipForward,
  Timer,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";

import Logo from "@/components/logo";
import DeviceMenu from "@/components/device-menu";
import VideoLayoutPicker from "@/components/video-layout-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/status-dot";
import { Tooltip } from "@/components/ui/tooltip";
import { formatDuration, useElapsed } from "@/hooks/useElapsed";
import { useWebRTC } from "@/hooks";
import type { SignalUser } from "@/firebase/rooms";
import type { ChatStatus } from "@/hooks/useMatchMaking";
import type { MediaMode } from "@/providers/WebRTCProvider";
import { safeGithubUrl } from "@/lib/github";
import {
  readFlipped,
  readVideoLayout,
  writeFlipped,
  writeVideoLayout,
  type VideoLayout,
} from "@/lib/video-layout";
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
  (user?.displayName ?? "stranger")
    .split(" ")
    .join("")
    .slice(0, 2)
    .toUpperCase();

const peerName = (user: SignalUser | null) => user?.displayName ?? "Stranger";

const statusCopy = (status: ChatStatus, isPeerConnected: boolean) => {
  if (isPeerConnected || status === "matched") {
    return { label: "connected", tone: "live" as const };
  }
  if (status === "connecting") {
    return { label: "connecting", tone: "pending" as const };
  }
  if (status === "waiting" || status === "searching") {
    return { label: "waiting for peer", tone: "pending" as const };
  }
  return { label: "idle", tone: "offline" as const };
};

const PaneBadge = ({
  name,
  muted,
  cameraOff,
  compact,
  className,
}: {
  name: string;
  muted?: boolean;
  cameraOff?: boolean;
  compact?: boolean;
  className?: string;
}) => {
  if (compact) {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/85 to-transparent px-2 py-1.5">
        <span className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-white/70">
          {name}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {muted && <MicOff className="h-2.5 w-2.5 text-danger" />}
          {cameraOff && <CameraOff className="h-2.5 w-2.5 text-danger" />}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-10 flex items-center gap-1.5 rounded-md border border-white/10 bg-black/50 px-2 py-1 backdrop-blur-md",
        className
      )}
    >
      <span className="max-w-[150px] truncate text-[11px] text-white/85">
        {name}
      </span>
      {muted && <MicOff className="h-3 w-3 text-danger" />}
      {cameraOff && <CameraOff className="h-3 w-3 text-danger" />}
    </div>
  );
};

const WaitingState = ({
  waiting,
  onCancel,
}: {
  waiting: boolean;
  onCancel: () => void;
}) => (
  <div className="flex flex-col items-center px-6 text-center">
    <div className="relative grid h-28 w-28 place-items-center">
      <span className="absolute inset-0 animate-ping-slow rounded-full border border-signal/20" />
      <span className="absolute inset-0 rounded-full border border-white/[0.1]" />
      <span className="absolute inset-4 rounded-full border border-white/[0.12]" />
      <span
        aria-hidden="true"
        className="absolute inset-0 animate-scan rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, hsl(var(--signal) / 0.38) 16deg, transparent 44deg)",
          WebkitMaskImage:
            "radial-gradient(circle, transparent 54%, black 68%, black 71%, transparent 73%)",
          maskImage:
            "radial-gradient(circle, transparent 54%, black 68%, black 71%, transparent 73%)",
        }}
      />
      <span className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/12 bg-white/[0.06]">
        <MessageCircle className="h-4 w-4 text-foreground" />
      </span>
    </div>

    <h2 className="mt-5 max-w-xs text-[16px] font-medium leading-snug tracking-[-0.02em] sm:text-lg">
      {waiting ? "Waiting for a stranger to join..." : "Connecting to your match..."}
    </h2>
    <p className="mt-2 max-w-[17rem] text-[12px] leading-relaxed text-muted-foreground">
      {waiting
        ? "Keep this tab open. Your match will appear here."
        : "Exchanging WebRTC descriptions over Firestore."}
    </p>

    <Button variant="secondary" size="sm" className="mt-5" onClick={onCancel}>
      Cancel
    </Button>
  </div>
);

interface ControlButtonProps {
  testId: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  dataActive?: boolean;
}

/** Round on phones, squared on desktop: the same control at two densities. */
const ControlButton = ({
  testId,
  label,
  icon,
  onClick,
  active,
  danger,
  disabled,
  dataActive,
}: ControlButtonProps) => (
  <Tooltip label={label} side="top">
    <button
      type="button"
      data-testid={testId}
      data-active={dataActive}
      aria-label={label}
      aria-pressed={dataActive}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full border transition-[background-color,border-color,color,transform] duration-150 active:translate-y-[0.5px] active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-40",
        "md:h-11 md:w-11 md:rounded-[11px]",
        danger
          ? "border-danger/30 bg-danger/15 text-danger hover:bg-danger/25"
          : active
            ? "border-white/[0.12] bg-white/[0.08] text-foreground hover:bg-white/[0.12]"
            : "border-white/[0.09] bg-white/[0.03] text-muted-foreground hover:bg-white/[0.07] hover:text-foreground"
      )}
    >
      {icon}
    </button>
  </Tooltip>
);

interface WideControlProps {
  testId: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

const WideControl = ({
  testId,
  label,
  icon,
  onClick,
  disabled,
  danger,
}: WideControlProps) => (
  <button
    type="button"
    data-testid={testId}
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex h-12 w-12 items-center justify-center rounded-full border transition-[background-color,border-color,color,transform] duration-150 active:translate-y-[0.5px] active:scale-[0.97]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:pointer-events-none disabled:opacity-40",
      "md:h-10 md:w-auto md:flex-row md:gap-2 md:rounded-[10px] md:px-4",
      danger
        ? "border-danger/40 bg-danger text-danger-foreground shadow-tactile hover:brightness-110"
        : "border-white/10 bg-white/[0.04] text-foreground hover:bg-white/[0.08] md:bg-gradient-to-b md:from-white/[0.09] md:to-white/[0.03] md:shadow-tactile md:hover:border-white/20 md:hover:from-white/[0.14]"
    )}
  >
    {icon}
    <span className="hidden text-[13px] font-medium md:inline">{label}</span>
  </button>
);

const Chat = ({ status, mode, stranger, onEnd, onNext }: Props) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layout, setLayout] = useState<VideoLayout>(() => readVideoLayout());
  const [flipped, setFlipped] = useState(() => readFlipped());
  const dragControls = useDragControls();

  const isTextMode = mode === "text";
  const isChatVisible = isTextMode || chatOpen;
  const isWaiting = status === "waiting" || status === "searching";
  const isConnecting = status === "connecting" && !isPeerConnected;
  const showWaiting = isWaiting || isConnecting;
  const elapsed = useElapsed(isPeerConnected);
  const connection = statusCopy(status, isPeerConnected);
  const isPip = layout === "pip";
  const displayName = stranger
    ? peerName(stranger)
    : isWaiting
      ? "Waiting room"
      : "Matching you...";
  const githubProfile = safeGithubUrl(stranger?.githubUrl);

  useEffect(() => {
    writeVideoLayout(layout);
  }, [layout]);

  useEffect(() => {
    writeFlipped(flipped);
  }, [flipped]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = localStream;
    }
  }, [localStream, showWaiting]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isChatVisible]);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(Boolean(document.fullscreenElement));

    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenEnabled) return;

    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    stageRef.current?.requestFullscreen().catch(() => {
      toast.error("Fullscreen is not available");
    });
  };

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
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
      <header className="relative z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-background/85 px-3 backdrop-blur-xl sm:h-16 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <Logo showWordmark={false} markClassName="h-7 w-7 rounded-lg" />
          <span className="hidden h-4 w-px bg-white/10 md:block" />
          <Badge variant="outline" className="hidden sm:inline-flex">
            {mode === "video" ? (
              <Video className="h-3 w-3" />
            ) : (
              <MessageCircle className="h-3 w-3" />
            )}
            {mode}
          </Badge>

          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium leading-tight tracking-[-0.01em]">
              {displayName}
            </p>
            <p className="mt-1 flex items-center gap-1.5 font-mono text-[9px] uppercase leading-none tracking-[0.14em] text-faint">
              <StatusDot
                tone={connection.tone}
                pulse={showWaiting}
                className="h-1 w-1"
              />
              {connection.label}
            </p>
          </div>

          {githubProfile && (
            <a
              href={githubProfile}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`Open ${displayName}'s GitHub profile`}
              title="GitHub profile"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Github className="h-4 w-4" />
            </a>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {!isTextMode && (
            <>
              <VideoLayoutPicker value={layout} onChange={setLayout} />
              <button
                type="button"
                onClick={() => setFlipped((current) => !current)}
                aria-label="Swap videos"
                aria-pressed={flipped}
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </button>
              <DeviceMenu />
            </>
          )}
          <div className="readout hidden items-center gap-1.5 px-2 py-1.5 sm:flex">
            <Timer className="h-3 w-3 text-faint" />
            <span className="font-mono text-[11px] tabular-nums leading-none text-muted-foreground">
              {formatDuration(elapsed)}
            </span>
          </div>
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage src={stranger?.photoURL ?? undefined} />
            <AvatarFallback className="text-[10px]">
              {stranger ? initials(stranger) : "—"}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 overflow-hidden md:gap-3 md:p-3">
        {isTextMode && (
          <aside className="hidden shrink-0 flex-col gap-3 md:flex md:w-[296px]">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="eyebrow">peer</span>
                <StatusDot tone={connection.tone} pulse={showWaiting} />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Avatar className="h-12 w-12 rounded-xl">
                  <AvatarImage src={stranger?.photoURL ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {initials(stranger)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium tracking-[-0.015em]">
                    {displayName}
                  </p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                    anonymous developer
                  </p>
                </div>
              </div>

              {githubProfile && (
                <a
                  href={githubProfile}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-4 flex h-9 items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-[12px] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60"
                >
                  <span className="flex items-center gap-2">
                    <Github className="h-3.5 w-3.5" />
                    GitHub profile
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-faint" />
                </a>
              )}

              <dl className="mt-5 divide-y divide-white/[0.06] border-y border-white/[0.06]">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-[12px] text-faint">Session</dt>
                  <dd className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    {formatDuration(elapsed)}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-[12px] text-faint">Mode</dt>
                  <dd className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    text
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-[12px] text-faint">Messages</dt>
                  <dd className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    {messages.length}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 flex gap-2 text-[11px] leading-relaxed text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-signal" />
                This conversation is peer-to-peer and disappears when the room
                closes.
              </p>
            </Card>

            <Card className="p-4">
              <span className="eyebrow">house rules</span>
              <ul className="mt-3 space-y-2.5 text-[12px] leading-relaxed text-muted-foreground">
                <li>Be decent — skip instead of arguing.</li>
                <li>No malware, scams, or spam links.</li>
                <li>Share code, not personal data.</li>
              </ul>
            </Card>
          </aside>
        )}

        {!isTextMode && (
          <section
            ref={stageRef}
            data-layout={layout}
            data-flipped={flipped}
            className="relative flex-1 overflow-hidden bg-[#050506] md:rounded-2xl md:border md:border-white/[0.07]"
          >
            {isPip && showWaiting && localStream && (
              <video
                ref={previewVideoRef}
                autoPlay
                muted
                playsInline
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover opacity-25 blur-[3px]"
              />
            )}

            <div
              className={cn(
                "relative h-full w-full min-h-0",
                isPip ? "block" : "grid gap-2 p-2 md:gap-3 md:p-3",
                layout === "split" &&
                  "grid-rows-2 md:grid-cols-2 md:grid-rows-1",
                layout === "call" &&
                  "grid-rows-[minmax(0,1fr)_32%] md:grid-cols-[minmax(0,1fr)_minmax(200px,26%)] md:grid-rows-1"
              )}
            >
              <div
                data-testid="remote-pane"
                className={cn(
                  "relative min-h-0 min-w-0 overflow-hidden bg-black",
                  isPip
                    ? !flipped
                      ? cn("absolute inset-0", showWaiting && "bg-transparent")
                      : cn(
                          "absolute right-3 top-3 z-10 aspect-[3/4] w-[88px] rounded-xl border border-white/15 shadow-float md:bottom-4 md:left-auto md:right-4 md:top-auto md:aspect-video md:w-52",
                          showWaiting && "hidden"
                        )
                    : cn(
                        "rounded-xl border border-white/[0.08]",
                        flipped && "order-2"
                      )
                )}
              >
                <video
                  ref={remoteVideoRef}
                  data-testid="remote-video"
                  autoPlay
                  playsInline
                  className={cn(
                    "h-full w-full object-cover transition-opacity duration-500",
                    isPeerConnected ? "opacity-100" : "opacity-0"
                  )}
                />

                {isPeerConnected && !isRemoteVideoActive && (
                  <div className="absolute inset-0 grid place-items-center bg-[#08090a]">
                    {isPip && flipped ? (
                      <CameraOff className="h-4 w-4 text-white/40" />
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <Avatar className="h-16 w-16 rounded-2xl">
                          <AvatarImage src={stranger?.photoURL ?? undefined} />
                          <AvatarFallback className="text-base">
                            {initials(stranger)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
                          camera off
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <PaneBadge
                  name={peerName(stranger)}
                  muted={isPeerConnected && !isRemoteMicActive}
                  cameraOff={isPeerConnected && !isRemoteVideoActive}
                  compact={isPip && flipped}
                  className={
                    isPip
                      ? "bottom-3 left-3 md:bottom-4 md:left-4"
                      : "left-2 top-2"
                  }
                />
              </div>

              <div
                data-testid="local-pane"
                className={cn(
                  "relative min-h-0 min-w-0 overflow-hidden bg-black",
                  isPip
                    ? flipped
                      ? "absolute inset-0"
                      : cn(
                          "absolute right-3 top-3 z-10 aspect-[3/4] w-[88px] rounded-xl border border-white/15 shadow-float md:bottom-4 md:left-auto md:right-4 md:top-auto md:aspect-video md:w-52",
                          showWaiting && "hidden"
                        )
                    : cn(
                        "rounded-xl border border-white/[0.08]",
                        flipped && "order-1"
                      )
                )}
              >
                <video
                  ref={localVideoRef}
                  data-testid="local-video"
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full -scale-x-100 object-cover"
                />

                {!isLocalVideoActive && (
                  <div className="absolute inset-0 grid place-items-center bg-[#08090a]">
                    {isPip && !flipped ? (
                      <CameraOff className="h-4 w-4 text-white/40" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <CameraOff className="h-5 w-5 text-white/40" />
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
                          camera off
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <PaneBadge
                  name="You"
                  muted={!isLocalMicActive}
                  cameraOff={!isLocalVideoActive}
                  compact={isPip && !flipped}
                  className={
                    isPip
                      ? "bottom-3 left-3 md:bottom-4 md:left-4"
                      : "left-2 top-2"
                  }
                />
              </div>
            </div>

            {!showWaiting && (
              <>
                {isPip && (
                  <div className="absolute left-3 top-3 flex items-center gap-2 sm:left-4 sm:top-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] backdrop-blur-md",
                        isPeerConnected
                          ? "border-white/10 bg-black/45 text-white/85"
                          : "border-warn/25 bg-black/45 text-warn"
                      )}
                    >
                      <StatusDot
                        tone={isPeerConnected ? "live" : "pending"}
                        pulse={!isPeerConnected}
                        className="h-1 w-1"
                      />
                      {isPeerConnected ? "live" : "standby"}
                    </span>
                    <span className="hidden items-center rounded-md border border-white/10 bg-black/45 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-white/60 backdrop-blur-md sm:inline-flex">
                      {mode}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label="Toggle fullscreen"
                  className="absolute right-3 top-3 z-10 hidden h-9 w-9 place-items-center rounded-lg border border-white/10 bg-black/45 text-white/70 backdrop-blur-md transition-colors hover:bg-black/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 md:right-4 md:top-4 md:grid"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </button>
              </>
            )}

            <AnimatePresence>
              {showWaiting && (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 z-20 flex items-center justify-center"
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-[#060607]/65 backdrop-blur-sm"
                  />
                  <div className="relative">
                    <WaitingState
                      waiting={isWaiting}
                      onCancel={() => void handleEnd()}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {isChatVisible && (
          <>
            {!isTextMode && (
              <div
                aria-hidden="true"
                onClick={() => setChatOpen(false)}
                className="absolute inset-0 top-0 z-20 animate-in fade-in bg-black/30 md:hidden"
              />
            )}

            <motion.div
              data-testid="chat-panel"
              data-open={isDataChannelOpen}
              drag={isTextMode ? false : "y"}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 96 || info.velocity.y > 700) {
                  setChatOpen(false);
                }
              }}
              className={cn(
                "z-30 flex min-h-0 flex-col overflow-hidden border-white/10 bg-[#0d0e10]",
                "absolute inset-x-0 bottom-0 top-[16%] animate-sheet-in rounded-t-2xl border-t shadow-float",
                "md:static md:z-auto md:animate-none md:rounded-2xl md:border md:shadow-panel",
                isTextMode
                  ? "top-0 rounded-none border-t-0 md:flex-1"
                  : "md:w-[352px] md:shrink-0"
              )}
            >
              <div
                onPointerDown={(event) => dragControls.start(event)}
                className={cn(
                  "flex shrink-0 cursor-grab touch-none items-center justify-center py-2 md:hidden",
                  isTextMode && "hidden"
                )}
              >
                <span className="h-1 w-9 rounded-full bg-white/15" />
              </div>

              <div
                className={cn(
                  "flex h-11 shrink-0 items-center justify-between gap-2 px-3",
                  isTextMode && "hidden md:flex"
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.04]">
                    <MessageCircle className="h-3 w-3 text-muted-foreground" />
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    chat
                  </span>
                  <span className="h-3 w-px bg-white/10" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
                    {isDataChannelOpen ? "open" : "standby"}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="hidden font-mono text-[9px] uppercase tracking-[0.12em] text-faint sm:block">
                    {messages.length} msg
                  </span>
                  {!isTextMode && (
                    <button
                      type="button"
                      onClick={() => setChatOpen(false)}
                      aria-label="Close chat"
                      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div
                className={cn(
                  "scrollbar-thin flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 pb-3 pt-3",
                  isTextMode && "pt-4 md:pt-1"
                )}
              >
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                    <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
                      <MessageCircle className="h-4 w-4 text-faint" />
                    </span>
                    <p className="text-[13px] font-medium tracking-[-0.01em]">
                      {isDataChannelOpen
                        ? "Say hi to your match"
                        : "Chat opens when your match connects"}
                    </p>
                    <p className="max-w-[220px] text-[12px] leading-relaxed text-muted-foreground">
                      {isDataChannelOpen
                        ? "Messages stay in this room and disappear when you leave."
                        : "Keep this tab open. You will be connected automatically."}
                    </p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const mine = message.from === "me";
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.18,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className={cn(
                          "flex",
                          mine ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[86%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-[13px] leading-relaxed",
                            mine
                              ? "rounded-br-md bg-primary text-primary-foreground"
                              : "rounded-bl-md border border-white/[0.06] bg-white/[0.055] text-foreground"
                          )}
                        >
                          {message.text}
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messageEndRef} />
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSend();
                }}
                className="shrink-0 border-t border-white/[0.06] p-2.5 md:p-3"
              >
                <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-black/40 p-1 shadow-recessed transition-colors focus-within:border-signal/40">
                  <input
                    value={draft}
                    data-testid="chat-input"
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={
                      isDataChannelOpen
                        ? "Type a message..."
                        : "Waiting for connection..."
                    }
                    autoComplete="off"
                    enterKeyHint="send"
                    aria-label="Message"
                    className="h-10 min-w-0 flex-1 bg-transparent px-2.5 text-base text-foreground outline-none placeholder:text-faint md:h-9 md:text-[13px]"
                  />
                  <button
                    type="submit"
                    data-testid="send-message"
                    aria-label="Send message"
                    disabled={!draft.trim()}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition-[opacity,transform] duration-150 hover:bg-primary/90 active:translate-y-[0.5px] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 md:h-9 md:w-9"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 hidden px-1 font-mono text-[9px] uppercase tracking-[0.14em] text-faint md:block">
                  enter to send · messages disappear on leave
                </p>
              </form>
            </motion.div>
          </>
        )}

        {isTextMode && (
          <AnimatePresence>
            {showWaiting && (
              <motion.div
                key="text-waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-40 flex items-center justify-center bg-background/85 backdrop-blur-md md:rounded-2xl"
              >
                <WaitingState
                  waiting={isWaiting}
                  onCancel={() => void handleEnd()}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      <div className="relative z-20 shrink-0 border-t border-white/[0.06] bg-background/90 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:px-3 md:pb-3 md:pt-3">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
            {isTextMode && (
              <span className="flex items-center gap-2 truncate pl-1 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                <StatusDot
                  tone={connection.tone}
                  pulse={showWaiting}
                  className="h-1 w-1"
                />
                {messages.length} msg · p2p
              </span>
            )}
            {!isTextMode && (
              <>
                <ControlButton
                  testId="toggle-mic"
                  label="mic"
                  dataActive={isLocalMicActive}
                  active={isLocalMicActive}
                  danger={!isLocalMicActive}
                  onClick={toggleLocalMic}
                  icon={
                    isLocalMicActive ? (
                      <Mic className="h-5 w-5 md:h-4 md:w-4" />
                    ) : (
                      <MicOff className="h-5 w-5 md:h-4 md:w-4" />
                    )
                  }
                />
                <ControlButton
                  testId="toggle-camera"
                  label="cam"
                  dataActive={isLocalVideoActive}
                  active={isLocalVideoActive}
                  danger={!isLocalVideoActive}
                  onClick={toggleLocalVideo}
                  icon={
                    isLocalVideoActive ? (
                      <Camera className="h-5 w-5 md:h-4 md:w-4" />
                    ) : (
                      <CameraOff className="h-5 w-5 md:h-4 md:w-4" />
                    )
                  }
                />
                <ControlButton
                  testId="toggle-chat"
                  label="chat"
                  active={chatOpen}
                  onClick={() => setChatOpen((current) => !current)}
                  icon={<MessageCircle className="h-5 w-5 md:h-4 md:w-4" />}
                />
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            <WideControl
              testId="next-person"
              label="Next person"
              disabled={isLeaving}
              onClick={() => void handleNext()}
              icon={<SkipForward className="h-5 w-5 md:h-4 md:w-4" />}
            />
            <WideControl
              testId="end-chat"
              label="End chat"
              danger
              disabled={isLeaving}
              onClick={() => void handleEnd()}
              icon={<PhoneOff className="h-5 w-5 md:h-4 md:w-4" />}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
