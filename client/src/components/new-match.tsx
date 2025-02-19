import { Code2Icon } from "lucide-react";
import AnimatedPage from "./animated/animated-page";
import { useWebRTC } from "./providers/webrtc-provider";

const NewMatch = () => {
  const { changeStatus } = useWebRTC();
  return (
    <AnimatedPage className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full flex flex-col items-center text-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-full animate-ping bg-primary/20" />
          <div className="relative glass-panel rounded-full h-20 flex items-center justify-center p-4 aspect-square">
            <Code2Icon className="w-8 h-8 text-primary animate-pulse" />
          </div>
        </div>

        <div className="animate-pulse space-y-6">
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white">
              Your match has left
            </h2>
            <p className="text-xl text-neutral-400">
              Finding a new developer...
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 pt-8">
          <span className="px-3 py-1 bg-neutral-800 text-neutral-300 rounded-full border border-neutral-700/20">
            React
          </span>
          <span className="px-3 py-1 bg-neutral-800 text-neutral-300 rounded-full border border-neutral-700/20">
            TypeScript
          </span>
          <span className="px-3 py-1 bg-neutral-800 text-neutral-300 rounded-full border border-neutral-700/20">
            Node.js
          </span>
        </div>

        <div className="pt-12">
          <button
            onClick={() => changeStatus("lobby")}
            className="text-neutral-400 hover:text-white transition-colors inline-flex items-center"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Cancel matching
          </button>
        </div>

        <div className="w-full mx-auto bg-primary/5 rounded-full h-1">
          <div className="bg-indigo-500 h-1 rounded-full w-1/2 transition-all duration-1000 animate-pulse" />
        </div>

        {/* <div className="pt-8 border-t border-neutral-800 w-full">
          <p className="text-neutral-500 text-sm">Session duration: 15:23</p>
        </div> */}
      </div>
    </AnimatedPage>
  );
};

export default NewMatch;
