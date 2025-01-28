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
const socketPairMap = new Map<string, string>();

io.on("connection", (socket: Socket) => {
  console.log(`[Server] New connection: ${socket.id}`);

  const removeFromQueue = (socketId: string) => {
    const index = waitingQueue.findIndex((u) => u.socketId === socketId);
    if (index !== -1) {
      console.log(`[Server] Removing from queue: ${socketId}`);
      clearTimeout(waitingQueue[index].timeout);
      waitingQueue.splice(index, 1);
    }
  };

  const attemptPairing = () => {
    while (waitingQueue.length >= 2) {
      const [user1, user2] = waitingQueue.splice(0, 2);
      clearTimeout(user1.timeout);
      clearTimeout(user2.timeout);

      console.log(`[Server] Paired ${user1.socketId} <> ${user2.socketId}`);
      socketPairMap.set(user1.socketId, user2.socketId);
      socketPairMap.set(user2.socketId, user1.socketId);

      io.to(user1.socketId).emit("matched", {
        partner: user2.userInfo,
        partnerSocketId: user2.socketId,
        isInitiator: true,
      });

      io.to(user2.socketId).emit("matched", {
        partner: user1.userInfo,
        partnerSocketId: user1.socketId,
        isInitiator: false,
      });
    }
  };

  socket.on("joinQueue", (userInfo: UserInfo) => {
    console.log(`[Server] ${socket.id} joined queue`);
    removeFromQueue(socket.id);
    const timeout = setTimeout(() => {
      socket.emit("matchFailed");
      removeFromQueue(socket.id);
    }, QUEUE_TIMEOUT);

    waitingQueue.push({ socketId: socket.id, userInfo, timeout });
    attemptPairing();
  });

  socket.on("signal", ({ to, signal }) => {
    console.log(`[Server] ${socket.id} → ${to} [${signal.type}]`);
    socket.to(to).emit("signal", signal);
  });

  socket.on("disconnect", () => {
    console.log(`[Server] ${socket.id} disconnected`);
    const partnerId = socketPairMap.get(socket.id);
    if (partnerId) {
      socket.to(partnerId).emit("partnerDisconnected");
      socketPairMap.delete(partnerId);
    }
    socketPairMap.delete(socket.id);
    removeFromQueue(socket.id);
  });
});

console.log("Signaling server running on port 4000");
