"use client";

import {
  CameraIcon,
  CameraOffIcon,
  MessageCircleIcon,
  MessageCircleOffIcon,
  MicIcon,
  MicOffIcon,
} from "lucide-react";
import AnimationContainer from "../animated/animated-container";
import { useWebRTC } from "../providers/webrtc-provider";
import { Button } from "../ui/button";

const Controls = () => {
  const {
    isLocalMicActive,
    isLocalVideoActive,
    isSideChatActive,
    dataChannel,
    toggleLocalMic,
    toggleLocalVideo,
    toggleSideChat,
    changeStatus,
  } = useWebRTC();
  return (
    <AnimationContainer
      direction="bottom"
      className="relative flex-1 flex items-center justify-between glass-panel rounded-lg p-4"
    >
      <div className="flex items-center gap-2">
        <Button variant={"secondary"} size={"icon"} onClick={toggleLocalMic}>
          {isLocalMicActive ? <MicIcon /> : <MicOffIcon />}
        </Button>
        <Button variant={"secondary"} size={"icon"} onClick={toggleLocalVideo}>
          {isLocalVideoActive ? <CameraIcon /> : <CameraOffIcon />}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button variant={"secondary"} size={"icon"} onClick={toggleSideChat}>
          {isSideChatActive ? <MessageCircleIcon /> : <MessageCircleOffIcon />}
        </Button>
        <Button
          variant={"secondary"}
          onClick={() => {
            console.log("sending message");
            dataChannel?.send("Hello from the other side");
          }}
        >
          Send Message
        </Button>
        <Button
          variant={"secondary"}
          onClick={() => changeStatus("matchmaking")}
        >
          Next
        </Button>
      </div>
    </AnimationContainer>
  );
};

export default Controls;
