"use client";

// import dynamic from "next/dynamic";
import { faker } from "@faker-js/faker";

import { useState } from "react";
import AnimationContainer from "../animated/animated-container";
import LocalSteam from "./local-stream";
import RemoteSteam from "./remote-stream";
import { cn } from "@/lib/utils";
import SideChat from "./side-chat";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// const SideChat = dynamic(() => import('./side-chat'))

interface Props {
  onFindNextMatch?: () => void;
}

const user = {
  id: crypto.randomUUID(),
  name: faker.person.fullName(),
  avatar: faker.image.urlPicsumPhotos({ height: 100, width: 100 }),
};

const ChatScreen: React.FC<Props> = ({ onFindNextMatch = () => {} }) => {
  const [isChatVisible, setIsChatVisible] = useState(false);

  const [isRemoteUserConnected, setIsRemoteUserConnected] = useState(true);

  // TODO ADD DRAG AND DROP and resize
  return (
    <div className="h-dvh space-y-4 gap-4 w-full p-4">
      <div className="flex gap-4 h-[calc(100vh-100px)] flex-1">
        <div
          className={cn(
            "flex gap-4 items-center",
            isChatVisible ? "flex-col" : "flex-row  w-full"
          )}
        >
          <LocalSteam />
          {isRemoteUserConnected && <RemoteSteam />}
        </div>

        {isChatVisible && <SideChat />}
      </div>
      {/* controls */}
      <AnimationContainer
        direction="bottom"
        className="relative flex-1 glass-panel rounded-lg p-4"
      >
        <button onClick={() => setIsChatVisible((state) => !state)}>
          Next
        </button>
        <button onClick={() => setIsRemoteUserConnected((state) => !state)}>
          Remote
        </button>

        <button onClick={onFindNextMatch}>Next Person</button>

        <Avatar className="border">
          <AvatarImage src={user?.avatar as string} />
          {user?.name && (
            <AvatarFallback>{user.name.split(" ").join("")}</AvatarFallback>
          )}
        </Avatar>
      </AnimationContainer>
    </div>
  );
};

export default ChatScreen;
