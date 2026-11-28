import Logo from "@/components/logo";
import { Spinner } from "@/components/ui/spinner";

const Loader = () => (
  <div className="flex min-h-dvh w-full flex-col items-center justify-center gap-5 bg-background">
    <Logo showWordmark={false} markClassName="h-10 w-10 rounded-xl" />
    <div className="flex items-center gap-2.5">
      <Spinner className="h-3 w-3" label="Signing in" />
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        establishing session
      </span>
    </div>
  </div>
);

export default Loader;
