import { useAuth } from "@/hooks";
import { Background } from "@/components/ui/background";
import { Logo } from "@/components/ui/logo";
import { FcGoogle as GoogleIcon } from "react-icons/fc";
import { FaGithub as GithubIcon, FaUserSecret as GuestIcon } from "react-icons/fa";
import { ArrowRight, Code2, Sparkles, Terminal, Video } from "lucide-react";
import { Navigate } from "react-router-dom";

const useEmulator = import.meta.env.VITE_USE_EMULATOR === "true";

const perks = [
  { icon: Video, label: "Face-to-face pairing" },
  { icon: Code2, label: "Text & code friendly" },
  { icon: Sparkles, label: "No profiles, no noise" },
];

const Login = () => {
  const { user, loginWithGithub, loginWithGoogle, loginAsGuest } = useAuth();

  if (user) {
    return <Navigate to={"/"} replace />;
  }

  return (
    <>
      <Background />
      <div className="relative min-h-screen w-full px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Brand story */}
          <div className="animate-fade-up">
            <Logo />

            <div className="mt-10 max-w-xl">
              <span className="eyebrow">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Random pairing for developers
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
                <span className="text-gradient">Skip the small talk.</span>
                <br />
                Pair with a developer.
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
                DevOmegle drops you into a live call with another engineer.
                Talk stack, trade feedback, or debug out loud — then move on
                whenever you like.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {perks.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-muted-foreground"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {label}
                </span>
              ))}
            </div>

            {/* Terminal card */}
            <div className="mt-10 hidden max-w-md rounded-2xl border border-white/10 bg-black/40 p-1.5 shadow-[0_30px_80px_-40px_rgba(0,0,0,1)] backdrop-blur-sm sm:block">
              <div className="flex items-center gap-1.5 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                  devomegle — zsh
                </span>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/50 p-4 font-mono text-xs leading-relaxed">
                <p className="text-muted-foreground">
                  <span className="text-primary">➜</span> devomegle connect
                </p>
                <p className="mt-2 text-emerald-400">✓ matching by interest</p>
                <p className="text-emerald-400">✓ peer-to-peer media</p>
                <p className="text-emerald-400">✓ passwordless sign-in</p>
                <p className="mt-2 text-muted-foreground">
                  ready to pair<span className="animate-pulse">▊</span>
                </p>
              </div>
            </div>
          </div>

          {/* Auth card */}
          <div className="animate-fade-up anim-delay-150">
            <div className="glass-card mx-auto w-full max-w-md p-7 sm:p-9">
              <div className="mb-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                  <Terminal className="h-5 w-5 text-primary" />
                </span>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight">
                  Welcome to DevOmegle
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Sign in to get matched. One click, no forms.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => void loginWithGithub()}
                  className="group flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm font-medium transition-all hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex items-center gap-3">
                    <GithubIcon className="h-5 w-5" />
                    Continue with GitHub
                  </span>
                  <ArrowRight className="h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </button>

                <button
                  onClick={() => void loginWithGoogle()}
                  className="group flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm font-medium transition-all hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex items-center gap-3">
                    <GoogleIcon className="h-5 w-5" />
                    Continue with Google
                  </span>
                  <ArrowRight className="h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </button>

                {useEmulator && (
                  <button
                    onClick={() => void loginAsGuest()}
                    data-testid="login-guest"
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 bg-transparent px-4 py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <GuestIcon className="h-4 w-4" />
                    Continue as Guest (emulator)
                  </button>
                )}
              </div>

              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  anonymous by default
                </span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                We only use your account to give matches a name and avatar.
                <br />
                Conversations stay peer-to-peer.
              </p>
            </div>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Terminal className="h-3 w-3" />
              Built by developers, for developers
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
