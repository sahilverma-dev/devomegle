import {
  ArrowRight,
  Camera,
  MessagesSquare,
  Mic,
  ShieldCheck,
  Video,
} from "lucide-react";

import Header from "./header";
import MatchGraphic from "./match-graphic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/status-dot";

interface Props {
  onStart: () => void | Promise<void>;
  onStartText: () => void | Promise<void>;
}

const BRIEF_ROWS = [
  { label: "Transport", value: "WebRTC" },
  { label: "Rooms", value: "Ephemeral" },
  { label: "Recording", value: "None" },
  { label: "Media", value: "On-device" },
];

const STEPS = [
  {
    number: "01",
    title: "Pick a room type",
    body: "Video for a face-to-face session, text when you only want words on a screen.",
  },
  {
    number: "02",
    title: "Get matched live",
    body: "We place you in the next open room. No profiles, no follower counts, no waitlist.",
  },
  {
    number: "03",
    title: "Leave whenever",
    body: "Skip to the next developer or close the room. Nothing is saved after you go.",
  },
];

const Lobby = ({ onStart, onStartText }: Props) => {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <Header />

      <main className="relative flex-1 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-grid mask-fade-b opacity-60"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-56 left-1/2 h-[440px] w-[760px] -translate-x-1/2 rounded-full bg-signal/[0.055] blur-[140px]"
        />

        <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-9 sm:px-6 sm:pt-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_312px] lg:gap-12">
            <div className="animate-fade-up">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="signal">
                  <StatusDot tone="live" pulse />
                  live
                </Badge>
                <span className="eyebrow">peer-to-peer chat</span>
              </div>

              <h1 className="mt-5 text-[38px] font-medium leading-[0.98] tracking-[-0.045em] sm:text-[54px]">
                Say hello to
                <br />
                <span className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
                  the next developer.
                </span>
              </h1>

              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                One tap opens a room. A stranger joins. Talk code, trade ideas,
                or just say hi — then move on whenever you like.
              </p>

              <div className="mt-9">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <h2 className="text-[17px] font-medium tracking-[-0.02em]">
                    Start Chatting
                  </h2>
                  <p className="text-[13px] text-muted-foreground">
                    Choose how you want to connect.
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Card className="group relative overflow-hidden p-5 transition-colors duration-200 hover:border-white/[0.14]">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    />
                    <div className="flex items-start justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.05] shadow-tactile">
                        <Video className="h-[18px] w-[18px]" />
                      </span>
                      <span className="font-mono text-[10px] tracking-[0.16em] text-faint">
                        01
                      </span>
                    </div>

                    <h3 className="mt-4 text-[17px] font-medium tracking-[-0.02em]">
                      Video chat
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                      Face to face with a random developer. Camera and mic stay
                      on your device.
                    </p>

                    <ul className="mt-4 space-y-2.5 border-t border-white/[0.06] pt-4">
                      <li className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                          <Camera className="h-3 w-3" />
                          camera
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          required
                        </span>
                      </li>
                      <li className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                          <Mic className="h-3 w-3" />
                          microphone
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          required
                        </span>
                      </li>
                    </ul>

                    <Button
                      size="lg"
                      className="mt-5 w-full"
                      onClick={() => void onStart()}
                    >
                      Start Video Chat
                      <ArrowRight className="h-4 w-4 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Button>
                  </Card>

                  <Card className="group relative overflow-hidden p-5 transition-colors duration-200 hover:border-white/[0.14]">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    />
                    <div className="flex items-start justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.05] shadow-tactile">
                        <MessagesSquare className="h-[18px] w-[18px]" />
                      </span>
                      <span className="font-mono text-[10px] tracking-[0.16em] text-faint">
                        02
                      </span>
                    </div>

                    <h3 className="mt-4 text-[17px] font-medium tracking-[-0.02em]">
                      Text chat
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                      A quiet room for words. No camera, no microphone, no
                      permission prompts.
                    </p>

                    <ul className="mt-4 space-y-2.5 border-t border-white/[0.06] pt-4">
                      <li className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                          <Camera className="h-3 w-3" />
                          camera
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          off
                        </span>
                      </li>
                      <li className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                          <Mic className="h-3 w-3" />
                          microphone
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          off
                        </span>
                      </li>
                    </ul>

                    <Button
                      size="lg"
                      variant="secondary"
                      className="mt-5 w-full"
                      onClick={() => void onStartText()}
                    >
                      Start Text Chat
                      <ArrowRight className="h-4 w-4 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Button>
                  </Card>
                </div>
              </div>
            </div>

            <aside className="flex flex-col gap-3 lg:pt-1">
              <Card className="corner-ticks hidden overflow-hidden p-4 pb-0 lg:block">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">connection diagram</span>
                  <span className="font-mono text-[10px] tracking-[0.14em] text-faint">
                    fig. 01
                  </span>
                </div>
                <MatchGraphic className="-mx-2 mt-2 h-auto w-[calc(100%+1rem)]" />
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">session brief</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
                    ready
                  </span>
                </div>

                <dl className="mt-4 divide-y divide-white/[0.06] border-y border-white/[0.06]">
                  {BRIEF_ROWS.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <dt className="text-[12px] text-faint">{row.label}</dt>
                      <dd className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-4 flex gap-2.5 rounded-xl border border-white/[0.06] bg-black/30 p-3">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal" />
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    Conversations are peer-to-peer. When either side leaves, the
                    room is deleted.
                  </p>
                </div>
              </Card>
            </aside>
          </div>

          <section className="mt-12 border-t border-white/[0.06] pt-8 sm:mt-16">
            <div className="grid gap-6 sm:grid-cols-3 sm:gap-8">
              {STEPS.map((step) => (
                <div key={step.number} className="flex gap-3">
                  <span className="mt-0.5 font-mono text-[10px] leading-none tracking-[0.14em] text-signal">
                    {step.number}
                  </span>
                  <div>
                    <h2 className="text-[13px] font-medium tracking-[-0.01em]">
                      {step.title}
                    </h2>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/[0.06] bg-black/20">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
            <StatusDot tone="live" />
            peer-to-peer · no recordings
          </div>
          <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
            <span>webrtc</span>
            <span className="h-2.5 w-px bg-white/10" />
            <span>v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Lobby;
