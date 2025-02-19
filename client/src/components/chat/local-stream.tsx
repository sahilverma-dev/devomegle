"use client";

import AnimationContainer from "../animated/animated-container";

import { Loader2Icon, MicOffIcon } from "lucide-react";
import { useWebRTC } from "../providers/webrtc-provider";

import { AnimatePresence, motion } from "motion/react";

const LocalSteam = () => {
  const {
    localVideoEleRef,
    isLocalStreamLoading,
    isLocalVideoActive,
    isLocalMicActive,
  } = useWebRTC();

  return (
    <AnimationContainer
      direction="left"
      customDelay={0.1}
      className="relative flex-1 glass-panel rounded-lg overflow-hidden"
    >
      <AnimatePresence>
        {isLocalStreamLoading ? (
          <div
            key={"loader"}
            className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent h-full w-full flex flex-col gap-3 items-center justify-center"
          >
            <Loader2Icon className="animate-spin size-10" />
            <p className="text-sm text-white/30">Loading Camera</p>
          </div>
        ) : (
          <>
            {isLocalVideoActive ? (
              <p>Camera is off</p>
            ) : (
              <video
                ref={localVideoEleRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
              />
            )}
          </>
        )}
        <div
          key={"you"}
          className="absolute bottom-2 left-2 text-xs font-medium bg-black/40 backdrop-blur text-white rounded-full py-1 px-3"
        >
          You
        </div>
        {!isLocalMicActive && (
          <motion.div
            key={"mic"}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute bottom-2 right-2 border bg-black/30 backdrop-blur text-red-500 rounded-full size-8 flex items-center justify-center"
          >
            <MicOffIcon size={12} />
          </motion.div>
        )}
      </AnimatePresence>
    </AnimationContainer>
  );
};

export default LocalSteam;
