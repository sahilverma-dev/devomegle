import { WebRTCContext } from "@/app/providers/webrtc-provider";
import { useContext } from "react";

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error("useWebRTC must be used within a WebRTCProvider");
  }
  return context;
};
