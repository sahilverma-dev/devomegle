"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

import { useSocket } from "./providers/socket-provider";

const OnlineUsers = () => {
  const [onlineUsers, setOnlineUsers] = useState(0);

  const { socket } = useSocket();

  const handleUserCount = (count: number) => {
    console.log(count);
    setOnlineUsers(count);
  };

  useEffect(() => {
    // socket?.emit('')
    socket?.on("user-count", handleUserCount);

    return () => {
      socket?.off("user-count", handleUserCount);
    };
  }, [socket]);

  if (onlineUsers > 0)
    return (
      <motion.div
        layout
        className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur rounded-full"
      >
        <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
        <span className="text-neutral-400">
          <span className="text-white font-semibold">{onlineUsers}</span>{" "}
          developers online
        </span>
      </motion.div>
    );
};

export default OnlineUsers;
