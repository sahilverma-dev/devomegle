"use client";

import AnimationContainer from "../animated/animated-container";

import { Loader2Icon } from "lucide-react";
import { useWebRTC } from "../providers/webrtc-provider";

const LocalSteam = () => {
  const { localVideoEleRef, isLocalStreamLoading } = useWebRTC();

  return (
    <AnimationContainer
      direction="left"
      customDelay={0.1}
      className="relative aspect-square flex-1 glass-panel rounded-lg overflow-hidden"
    >
      {isLocalStreamLoading ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent h-full w-full flex flex-col gap-3 items-center justify-center">
            <Loader2Icon className="animate-spin size-10" />
            <p className="text-sm text-white/30">Loading Camera</p>
          </div>
        </>
      ) : (
        <video
          ref={localVideoEleRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
        />
      )}
      <div className="absolute bottom-2 left-2 text-xs font-medium bg-black/40 backdrop-blur text-white rounded-full py-1 px-3">
        You
      </div>
    </AnimationContainer>
  );
};

export default LocalSteam;
