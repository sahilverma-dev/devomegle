import {
  ArrowUpRight,
  Camera,
  CircleDot,
  Code2,
  MessagesSquare,
  Mic,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import Header from "./header";
import { Background } from "@/components/ui/background";

interface Props {
  onStart: () => void | Promise<void>;
  onStartText: () => void | Promise<void>;
}

const modes = [
  {
    id: "video",
    title: "Video Chat",
    description:
      "Face-to-face with a random developer. Share a screen, talk stack, and read the room.",
    icon: Camera,
    bullets: ["Camera + mic", "Screen-ready", "Instant skip"],
    accent: "from-primary/20 via-primary/5 to-transparent",
    iconClass: "text-primary",
    buttonClass:
      "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_12px_40px_-16px_hsl(var(--primary)/0.9)]",
  },
  {
    id: "text",
    title: "Text Chat",
    description:
      "Prefer typing? Pair anonymously and trade links, snippets, and ideas in plain text.",
    icon: MessagesSquare,
    bullets: ["No camera needed", "Low bandwidth", "Copy-paste friendly"],
    accent: "from-sky-400/20 via-sky-400/5 to-transparent",
    iconClass: "text-sky-300",
    buttonClass:
      "bg-white/[0.06] text-foreground border border-white/15 hover:bg-white/[0.1]",
  },
] as const;

const steps = [
  {
    icon: Sparkles,
    title: "Pick a mode",
    copy: "Start a video call or keep it text-only. You can switch after matching.",
  },
  {
    icon: Users,
    title: "Get paired",
    copy: "We match you with another developer who is online right now.",
  },
  {
    icon: ArrowUpRight,
    title: "Talk, then skip",
    copy: "Stay as long as it is useful. Hit next person for a fresh match.",
  },
];

const Lobby: React.FC<Props> = ({ onStart, onStartText }) => {
  return (
    <>
      <Background />
      <Header />

      <main className="min-h-screen px-5 pb-16 pt-28 sm:px-8">
        <div className="mx-auto w-full max-w-6xl">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-7 sm:p-10">
            <div className="halo -right-20 -top-24 h-64 w-64" />
            <div className="halo -bottom-28 left-10 h-52 w-52 bg-sky-500/15" />

            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl animate-fade-up">
                <span className="eyebrow">
                  <Radio className="h-3 w-3 text-success" />
                  Live network
                </span>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                  <span className="text-gradient">Start Chatting</span>
                </h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                  Meet a developer you have never met. No profiles, no
                  follow-ups — just a live room, a shared stack, and a
                  conversation worth having.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="code-chip">
                    <CircleDot className="h-3 w-3 text-success" />
                    {`~${Math.max(1, new Date().getMinutes() % 9 + 3)} devs online`}
                  </span>
                  <span className="code-chip">
                    <ShieldCheck className="h-3 w-3 text-primary" />
                    P2P media
                  </span>
                  <span className="code-chip">
                    <Code2 className="h-3 w-3 text-primary" />
                    code-friendly
                  </span>
                </div>
              </div>

              <div className="grid w-full max-w-xs shrink-0 grid-cols-2 gap-2 self-stretch lg:w-auto">
                <Stat label="Session" value="~5 min" />
                <Stat label="Sign-up" value="1 click" />
                <Stat label="Matches" value="random" />
                <Stat label="Data" value="P2P" />
              </div>
            </div>
          </section>

          {/* Mode cards */}
          <section className="mt-6 grid gap-4 md:grid-cols-2">
            {modes.map(
              (
                {
                  id,
                  title,
                  description,
                  icon: Icon,
                  bullets,
                  accent,
                  iconClass,
                  buttonClass,
                },
                index
              ) => (
                <article
                  key={id}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-300 animate-fade-up hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.05] hover:shadow-[0_30px_80px_-40px_rgba(0,0,0,1)]"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-60 transition-opacity duration-300 group-hover:opacity-100`}
                  />

                  <div className="relative flex items-start justify-between gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/30">
                      <Icon className={`h-5 w-5 ${iconClass}`} />
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {id === "video" ? "01" : "02"}
                    </span>
                  </div>

                  <h2 className="relative mt-5 text-xl font-semibold tracking-tight">
                    {title}
                  </h2>
                  <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>

                  <div className="relative mt-5 flex flex-wrap gap-2">
                    {bullets.map((bullet) => (
                      <span
                        key={bullet}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-muted-foreground"
                      >
                        {bullet === "Camera + mic" && <Mic className="h-3 w-3" />}
                        {bullet}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() =>
                      void (id === "video" ? onStart() : onStartText())
                    }
                    className={`relative mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${buttonClass}`}
                  >
                    Start {title}
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </button>
                </article>
              )
            )}
          </section>

          {/* How it works */}
          <section className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  How it works
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Three steps, zero setup
                </h2>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:block">
                End a call any time
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {steps.map(({ icon: Icon, title, copy }, index) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                      <Icon className="h-4 w-4 text-primary" />
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {copy}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Matchmaking runs on Firestore. Audio and video stay peer-to-peer.
          </p>
        </div>
      </main>
    </>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
      {label}
    </p>
    <p className="mt-1 text-sm font-semibold">{value}</p>
  </div>
);

export default Lobby;
