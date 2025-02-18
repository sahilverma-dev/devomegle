"use client";

import { useEffect, useState } from "react";
import Lobby from "./lobby";
import Interests from "./interests";
import Matchmaking from "./matchmaking";
import Chat from "./chat";
import NewMatch from "./new-match";
import Loader from "./loader";
import { useSocket } from "./providers/socket-provider";

export type AppStatus =
  | "loading"
  | "lobby"
  | "interests"
  | "matchmaking"
  | "matched"
  | "new-matchmaking";

const App = () => {
  const [status, setStatus] = useState<AppStatus>("loading");

  const { isConnected } = useSocket();

  useEffect(() => {
    if (isConnected) {
      setStatus("matched");
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
            setStatus("matchmaking");
          }}
          onVideoChatStart={() => {
            setStatus("matched");
            // setStatus("matchmaking");
          }}
          onChangeInterest={() => {
            setStatus("interests");
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
            setStatus("lobby");
          }}
        />
      );
    }
    case "matched": {
      return (
        <Chat
          onFindNextMatch={() => {
            setStatus("new-matchmaking");
          }}
        />
      );
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
