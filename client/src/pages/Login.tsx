import { FcGoogle as GoogleIcon } from "react-icons/fc";
import { FaGithub as GithubIcon } from "react-icons/fa";
import { ArrowUpRight, Ghost } from "lucide-react";
import { Navigate } from "react-router-dom";

import Logo from "@/components/logo";
import MatchGraphic from "@/components/match-graphic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { useAuth } from "@/hooks";
import { env } from "@/lib/env";

const Login = () => {
  const { user, loginWithGithub, loginWithGoogle, loginAsGuest } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="relative grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.06] p-10 lg:flex xl:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-grid mask-fade-b opacity-60"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 top-1/3 h-[420px] w-[520px] rounded-full bg-signal/[0.06] blur-[130px]"
        />

        <div className="relative flex items-center justify-between">
          <Logo />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
            v1.0
          </span>
        </div>

        <div className="relative max-w-md animate-fade-up">
          <Badge variant="signal">
            <StatusDot tone="live" pulse />
            live network
          </Badge>

          <h2 className="mt-6 text-[40px] font-medium leading-[1.03] tracking-[-0.045em] xl:text-[46px]">
            Two developers.
            <br />
            <span className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
              One random room.
            </span>
          </h2>

          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-muted-foreground">
            Devomegle drops you into a live conversation with a developer you
            have never met. No feed, no algorithm, no profile to maintain.
          </p>

          <div className="corner-ticks mt-9 rounded-2xl border border-white/[0.07] bg-card/70 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="eyebrow">connection diagram</span>
              <span className="font-mono text-[10px] tracking-[0.14em] text-faint">
                fig. 01
              </span>
            </div>
            <MatchGraphic className="mt-3 h-auto w-full" />
          </div>
        </div>

        <div className="relative flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
          <span className="flex items-center gap-2">
            <StatusDot tone="live" />
            peer-to-peer
          </span>
          <span>no recordings</span>
          <span>ephemeral rooms</span>
        </div>
      </aside>

      <main className="relative flex min-h-dvh flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6 sm:px-8 lg:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-grid mask-fade-b opacity-40 lg:hidden"
        />

        <div className="relative flex items-center justify-between lg:hidden">
          <Logo />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
            v1.0
          </span>
        </div>

        <div className="relative flex flex-1 flex-col justify-center py-10">
          <div className="mx-auto w-full max-w-[380px] animate-fade-up">
            <p className="eyebrow">sign in</p>
            <h1 className="mt-3 text-[30px] font-medium leading-[1.05] tracking-[-0.04em] sm:text-[34px]">
              Welcome back.
            </h1>
            <p className="mt-2.5 text-[14px] leading-relaxed text-muted-foreground">
              Use an account to join the network. It takes a second, and it is
              only used to show your match who they are talking to.
            </p>

            <div className="mt-8 space-y-2.5">
              <Button
                variant="secondary"
                size="lg"
                className="w-full justify-between px-4"
                onClick={() => void loginWithGithub()}
              >
                <span className="flex items-center gap-3">
                  <GithubIcon className="h-[18px] w-[18px]" />
                  Continue with GitHub
                </span>
                <ArrowUpRight className="h-4 w-4 text-faint" />
              </Button>

              <Button
                variant="secondary"
                size="lg"
                className="w-full justify-between px-4"
                onClick={() => void loginWithGoogle()}
              >
                <span className="flex items-center gap-3">
                  <GoogleIcon className="h-[18px] w-[18px]" />
                  Continue with Google
                </span>
                <ArrowUpRight className="h-4 w-4 text-faint" />
              </Button>

              {env.useEmulator && (
                <>
                  <div className="flex items-center gap-3 py-2">
                    <span className="h-px flex-1 bg-white/[0.08]" />
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
                      emulator
                    </span>
                    <span className="h-px flex-1 bg-white/[0.08]" />
                  </div>

                  <Button
                    variant="outline"
                    size="lg"
                    data-testid="login-guest"
                    className="w-full justify-between border-dashed px-4"
                    onClick={() => void loginAsGuest()}
                  >
                    <span className="flex items-center gap-3">
                      <Ghost className="h-4 w-4 text-muted-foreground" />
                      Continue as Guest
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                      local
                    </span>
                  </Button>
                </>
              )}
            </div>

            <p className="mt-6 text-[11.5px] leading-relaxed text-faint">
              Authentication is handled by your provider. Devomegle never posts
              on your behalf.
            </p>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-[380px] items-center justify-between border-t border-white/[0.06] pt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
          <span className="flex items-center gap-2">
            <StatusDot tone="live" />
            network online
          </span>
          <span>firebase auth</span>
        </div>
      </main>
    </div>
  );
};

export default Login;
