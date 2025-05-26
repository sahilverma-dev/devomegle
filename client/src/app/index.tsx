import { useSocket } from "@/components/providers/socket-provider";
import { useEffect, useState } from "react";

const App = () => {
  const socket = useSocket();

  const [onlineUsers, setOnlineUsers] = useState(0);

  useEffect(() => {
    socket.on("user-count", (count) => setOnlineUsers(count));
    return () => {
      socket.off("user-count");
    };
  }, [socket]);

  useEffect(() => {
    const handleUnload = () => {
      socket.emit("user-left");
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [socket]);

  return <div>{onlineUsers}</div>;
};

export default App;
