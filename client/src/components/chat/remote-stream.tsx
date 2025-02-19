"use client";

import AnimationContainer from "../animated/animated-container";

import { useWebRTC } from "../providers/webrtc-provider";

const RemoteSteam = () => {
  const { remoteVideoEleRef } = useWebRTC();
  return (
    <AnimationContainer
      direction="right"
      customDelay={0.1}
      className="relative flex-1 glass-panel rounded-lg overflow-hidden"
    >
      {/* <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" /> */}
      <video
        ref={remoteVideoEleRef}
        className="w-full h-full object-cover"
        autoPlay
      />
      <div className="absolute bottom-2 left-2 text-xs font-medium bg-black/40 backdrop-blur text-white rounded-full py-1 px-3">
        Remote Developer
      </div>
    </AnimationContainer>
  );
};

export default RemoteSteam;
