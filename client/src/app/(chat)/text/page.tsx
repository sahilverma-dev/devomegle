"use client";

import { Button } from "@/components/ui/button";

import { useEffect } from "react";
import { faker } from "@faker-js/faker";
import { io } from "socket.io-client";

const socket = io("http://localhost:4000");

const user = {
  id: crypto.randomUUID(),
  name: faker.person.fullName(),
};

const TextChatPage = () => {
  const joinUser = () => {
    socket.emit("join", user);
  };

  // listers
  const handleJoin = (user: any) => {
    console.log(user);
  };

  useEffect(() => {
    socket.connect();

    socket.on("join", handleJoin);

    return () => {
      socket.disconnect();
      socket.off("join", handleJoin);
    };
  }, []);

  return (
    <div>
      {user.name}

      <Button onClick={joinUser} className="cursor-pointer">
        join
      </Button>
    </div>
  );
};

export default TextChatPage;
