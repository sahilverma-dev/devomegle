import { Loader2Icon } from "lucide-react";
import AnimatedPage from "./animated/animated-page";

const Loader = () => {
  return (
    <AnimatedPage className="min-h-dvh w-full flex items-center justify-center">
      <Loader2Icon className="animate-spin h-10 w-10" />
    </AnimatedPage>
  );
};

export default Loader;
