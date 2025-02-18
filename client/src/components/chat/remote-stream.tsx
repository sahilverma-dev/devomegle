"use client";

import { useEffect, useRef } from "react";
import AnimationContainer from "../animated/animated-container";
import { toast } from "sonner";

const RemoteSteam = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const getUserStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.log("", error);
        toast.error("Failed to get user devices");
      }
    };

    // getUserStream();
  }, []);
  return (
    <AnimationContainer
      direction="right"
      customDelay={0.1}
      className="relative aspect-square flex-1 glass-panel rounded-lg overflow-hidden"
    >
      {/* <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" /> */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        muted
      />
      <div className="absolute bottom-2 left-2 text-xs font-medium bg-black/40 backdrop-blur text-white rounded-full py-1 px-3">
        Remote Developer
      </div>
    </AnimationContainer>
  );
};

export default RemoteSteam;
