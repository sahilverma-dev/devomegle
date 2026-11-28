import { MessagesSquare, Video, X } from "lucide-react";

import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { formatDuration, useElapsed } from "@/hooks/useElapsed";
import type { MediaMode } from "@/providers/WebRTCProvider";

interface Props {
  mode: MediaMode;
  onCancel: () => void | Promise<void>;
}

const Searching = ({ mode, onCancel }: Props) => {
  const seconds = useElapsed(true);
  const ModeIcon = mode === "video" ? Video : MessagesSquare;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-grid opacity-40"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal/[0.05] blur-[120px]"
      />

      <header className="relative z-10 flex h-14 shrink-0 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="hidden h-4 w-px bg-white/10 sm:block" />
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-faint sm:block">
            matchmaking
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => void onCancel()}
          className="text-muted-foreground"
        >
          Cancel
          <X className="h-3.5 w-3.5" />
        </Button>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-16 pt-6">
        <div className="relative grid h-36 w-36 place-items-center sm:h-44 sm:w-44">
          <div className="absolute inset-0 rounded-full border border-white/[0.05]" />
          <div className="absolute inset-[14%] rounded-full border border-white/[0.07]" />
          <div className="absolute inset-[28%] rounded-full border border-white/[0.09]" />
          <div className="absolute inset-0 animate-ping-slow rounded-full border border-signal/20" />
          <div
            aria-hidden="true"
            className="absolute inset-0 animate-scan rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, hsl(var(--signal) / 0.34) 14deg, transparent 42deg)",
              WebkitMaskImage:
                "radial-gradient(circle, transparent 56%, black 68%, black 72%, transparent 74%)",
              maskImage:
                "radial-gradient(circle, transparent 56%, black 68%, black 72%, transparent 74%)",
            }}
          />
          <span className="absolute inset-[42%] rounded-full ring-1 ring-signal/10" />
          <div className="relative grid h-14 w-14 place-items-center rounded-2xl border border-white/12 bg-gradient-to-b from-white/[0.12] to-white/[0.02] shadow-float sm:h-16 sm:w-16">
            <ModeIcon className="h-5 w-5 text-foreground" />
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-background bg-signal" />
          </div>
        </div>

        <p className="eyebrow mt-10 flex items-center gap-2">
          <StatusDot tone="pending" pulse />
          matching · {mode}
        </p>

        <h1 className="mt-3 max-w-md text-center text-[22px] font-medium leading-tight tracking-[-0.025em] sm:text-2xl">
          Finding a developer for you...
        </h1>
        <p className="mt-2.5 max-w-sm text-center text-[13px] leading-relaxed text-muted-foreground">
          Keep this tab open. The moment someone opens a room in {mode} mode,
          you will be connected.
        </p>

        <div className="readout mt-7 flex items-stretch divide-x divide-white/[0.07] overflow-hidden">
          <div className="px-3.5 py-2.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              mode
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-foreground">
              {mode}
            </p>
          </div>
          <div className="px-3.5 py-2.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              elapsed
            </p>
            <p className="mt-1 font-mono text-[11px] tabular-nums tracking-[0.08em] text-foreground">
              {formatDuration(seconds)}
            </p>
          </div>
          <div className="hidden px-3.5 py-2.5 sm:block">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              transport
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-foreground">
              webrtc
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          className="mt-8"
          onClick={() => void onCancel()}
        >
          Cancel search
        </Button>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
            scanning open rooms
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-1 animate-pulse rounded-full bg-signal" />
            <span className="h-1 w-1 animate-pulse rounded-full bg-signal [animation-delay:150ms]" />
            <span className="h-1 w-1 animate-pulse rounded-full bg-signal [animation-delay:300ms]" />
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Searching;
