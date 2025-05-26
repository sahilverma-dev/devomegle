import { useSocket } from "@/components/providers/socket-provider";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const App = () => {
  const socket = useSocket();

  const [onlineUsers, setOnlineUsers] = useState(0);

  useEffect(() => {
    socket.on("user-count", (count) => setOnlineUsers(count));

    socket.on("match-found", ({ peerId }) => {
      // Start WebRTC offer/answer exchange
      console.log({ peerId });
    });

    return () => {
      socket.off("user-count");
      socket.off("match-found");
    };
  }, [socket]);

  useEffect(() => {
    const handleUnload = () => {
      socket.emit("user-left");
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [socket]);

  return (
    <div>
      {onlineUsers}
      <Button
        onClick={() => {
          console.log("emit");
          socket.emit("find-match", { interests: ["gaming", "music"] });
        }}
      >
        click
      </Button>
    </div>
  );
};

export default App;
