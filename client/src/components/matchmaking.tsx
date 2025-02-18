"use client";

import { Code2Icon } from "lucide-react";
import AnimatedPage from "./animated/animated-page";

interface Props {
  onCancel?: () => void;
}

const Matchmaking: React.FC<Props> = ({ onCancel = () => {} }) => {
  return (
    <AnimatedPage className="min-h-screen flex flex-col p-4">
      <div className="flex-1 flex flex-col items-center justify-center w-full text-center space-y-8">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-full animate-ping bg-primary/20" />
            <div className="relative glass-panel rounded-full h-20 flex items-center justify-center p-4 aspect-square">
              <Code2Icon className="w-8 h-8 text-primary animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">
            Finding a developer who shares your interests...
          </h2>
          <p className="text-neutral-400">
            This usually takes about 30 seconds
          </p>
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
            onClick={onCancel}
            className="text-neutral-400 hover:text-white transition-colors duration-200 inline-flex items-center"
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
        <div className="pt-8 border-t border-neutral-800">
          <p className="text-neutral-500 text-sm">
            Tip: Make sure your camera and microphone are ready
          </p>
        </div>
      </div>
    </AnimatedPage>
  );
};

export default Matchmaking;
