import { Server, Socket } from "socket.io";

interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}

export type UserMap = Map<string, User>;

interface UserQueueItem {
  socketId: string;
  user: User;
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


const roomId = "TEMP_ROOM";


const users: UserMap = new Map();
const socketIdToRoom: Map<string, string> = new Map();

io.on("connection", (socket) => {
  console.log("a user connected");

  // Handle join and leave
  socket.on("join", ({ roomId, user }) => {
    socket.join(roomId);
    socket.to(roomId).emit("join", { roomId, user });
    socketIdToRoom.set(socket.id, roomId);
    users.set(socket.id, user);
    console.log(`${user?.name} joined room: ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
    const roomId = socketIdToRoom.get(socket.id);
    const user = users.get(socket.id);
    if (roomId && user) {
      socket.to(roomId).emit("leave", { user });
      socket.leave(roomId);
      users.delete(socket.id);
      socketIdToRoom.delete(socket.id);
      socket.disconnect();
    }
  });

  // Handle WebRTC signaling
  socket.on("offer", ({ offer, roomId, userBy, userTo }) => {
    console.log(
      `got offer from ${userBy.name} to ${userTo.name} and room ${roomId}`
    );
    socket.to(roomId).emit("offer", { offer, userBy });
  });

  socket.on("answer", ({ answer, roomId, userBy, userTo }) => {
    console.log(
      `got answer from ${userBy.name} to ${userTo.name} and room ${roomId}`
    );
    socket.to(roomId).emit("answer", { answer, userBy });
  });

  socket.on("ice-candidate", ({ candidate, roomId, userBy }) => {
    socket.to(roomId).emit("ice-candidate", { candidate, userBy });
  });
});

console.clear()

console.log("Signaling server running on port 4000");
