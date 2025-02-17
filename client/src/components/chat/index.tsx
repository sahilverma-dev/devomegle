"use client";

import { useState } from "react";
import { SideChat } from "./side-chat";

const ChatScreen = () => {
  const [isChatVisible, setIsChatVisible] = useState(false);
  return (
    <div className="h-dvh space-y-4 gap-4 w-full p-4">
      <div className="flex gap-4 h-[calc(100vh-100px)] flex-1">
        <div className="flex gap-4 flex-1 w-full">
          <div className="relative flex-1 glass-panel rounded-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-4 text-sm font-medium">
              You
            </div>
          </div>
          <div className="relative flex-1 glass-panel rounded-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-4 text-sm font-medium">
              Remote Dev
            </div>
          </div>
        </div>
        {isChatVisible && <SideChat />}
      </div>
      {/* controls */}
      <div className="relative flex-1 glass-panel rounded-lg p-4">
        <button onClick={() => setIsChatVisible((state) => !state)}>
          Next
        </button>
      </div>
    </div>
  );
};

export default ChatScreen;
