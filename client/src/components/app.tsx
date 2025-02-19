"use client";

import { useEffect, useState } from "react";
import Lobby from "./lobby";
import Interests from "./interests";
import Matchmaking from "./matchmaking";
import Chat from "./chat";
import NewMatch from "./new-match";
import Loader from "./loader";
import { useSocket } from "./providers/socket-provider";
import { useWebRTC } from "./providers/webrtc-provider";

const App = () => {
  const { status, changeStatus } = useWebRTC();

  const { isConnected } = useSocket();

  useEffect(() => {
    if (isConnected) {
      changeStatus("matched");
    }
  }, [isConnected]);

  switch (status) {
    case "loading": {
      return <Loader />;
    }

    case "lobby": {
      return (
        <Lobby
          onTextChatStart={() => {
            changeStatus("matchmaking");
          }}
          onVideoChatStart={() => {
            changeStatus("matched");
            // changeStatus("matchmaking");
          }}
          onChangeInterest={() => {
            changeStatus("interests");
          }}
        />
      );
    }
    case "interests": {
      return <Interests />;
    }
    case "matchmaking": {
      return (
        <Matchmaking
          onCancel={() => {
            changeStatus("lobby");
          }}
        />
      );
    }
    case "matched": {
      return <Chat />;
    }
    case "new-matchmaking": {
      return <NewMatch />;
    }
    default: {
      return <p>Error</p>;
    }
  }
};

export default App;
