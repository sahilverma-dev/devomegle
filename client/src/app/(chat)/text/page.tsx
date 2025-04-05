"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { useEffect } from "react";

import { io } from "socket.io-client";

const socket = io("http://localhost:4000");

const TextChatPage = () => {
  const { data } = useSession();

  const handleJoin = () => {
    if (data?.user) {
      socket.emit("join", data?.user);
    }
  };

  useEffect(() => {
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div>
      {data?.user.name}

      <Button onClick={handleJoin}>join</Button>
    </div>
  );
};

export default TextChatPage;
