import { Server, Socket } from "socket.io";

interface UserInfo {
  uid: string;
  displayName: string;
  photoURL: string;
}

interface UserQueueItem {
  socketId: string;
  userInfo: UserInfo;
  timeout: NodeJS.Timer;
}

const QUEUE_TIMEOUT = 30000;
const io = new Server(4000, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const waitingQueue: UserQueueItem[] = [];
const userSocketMap = new Map<string, string>();

io.on("connection", (socket: Socket) => {
  const removeFromQueue = (socketId: string) => {
    const index = waitingQueue.findIndex((u) => u.socketId === socketId);
    if (index !== -1) {
      clearTimeout(waitingQueue[index].timeout);
      waitingQueue.splice(index, 1);
    }
  };

  const attemptPairing = () => {
    while (waitingQueue.length >= 2) {
      const [user1, user2] = waitingQueue.splice(0, 2);
      clearTimeout(user1.timeout);
      clearTimeout(user2.timeout);

      const socket1 = io.sockets.sockets.get(user1.socketId);
      const socket2 = io.sockets.sockets.get(user2.socketId);

      if (socket1?.connected && socket2?.connected) {
        userSocketMap.set(user1.userInfo.uid, user1.socketId);
        userSocketMap.set(user2.userInfo.uid, user2.socketId);

        socket1.emit("matched", {
          partner: user2.userInfo,
          isInitiator: true,
        });
        socket2.emit("matched", {
          partner: user1.userInfo,
          isInitiator: false,
        });
      }
    }
  };

  socket.on("joinQueue", (userInfo: UserInfo) => {
    removeFromQueue(socket.id);
    const timeout = setTimeout(() => {
      socket.emit("matchFailed");
      removeFromQueue(socket.id);
    }, QUEUE_TIMEOUT);

    waitingQueue.push({ socketId: socket.id, userInfo, timeout });
    attemptPairing();
  });

  socket.on("signal", ({ to, signal }) => {
    const targetSocketId = userSocketMap.get(to);
    if (targetSocketId) {
      socket.to(targetSocketId).emit("signal", signal);
    }
  });

  socket.on("disconnect", () => {
    removeFromQueue(socket.id);
    userSocketMap.forEach((value, key) => {
      if (value === socket.id) userSocketMap.delete(key);
    });
  });
});

console.log("Signaling server running on port 4000");
