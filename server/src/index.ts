import { Hono } from "hono";
import { Server } from "socket.io";
import { createServer } from "http";

const app = new Hono();
const server = createServer();
const io = new Server(server, {
  cors: { origin: "*" },
});

export type UserMap = Map<string, User>;

export interface User {
  id: string;
  name: string;
  email: string;
  image: string;
}
let onlineCount = 0;
const waitingQueue: string[] = [];

const userMap: UserMap = new Map<string, User>();

// Helper: Remove a socket id from the waiting queue
const removeFromQueue = (id: string) => {
  const index = waitingQueue.indexOf(id);
  if (index !== -1) waitingQueue.splice(index, 1);
};

io.on("connection", (socket) => {
  onlineCount++;
  io.emit("onlineCount", onlineCount);
  console.log(`User connected: ${socket.id} - Online: ${onlineCount}`);

  // Pair users: if someone is waiting, pair them; otherwise, add to the queue.
  if (waitingQueue.length > 0) {
    const partnerId = waitingQueue.shift();
    if (partnerId) {
      // Notify both users that they are paired
      socket.emit("paired", { partnerId });
      io.to(partnerId).emit("paired", { partnerId: socket.id });
    }
  } else {
    waitingQueue.push(socket.id);
  }

  socket.on("join", (user: User) => {
    console.log("user joined", user.name);
    userMap.set(socket.id, user);
    io.emit("join", user);
  });

  // Relay signaling data between peers (for WebRTC offers/answers/ICE)
  socket.on("offer", (offer: any) => {
    console.log("got the offer ");
    io.emit("answer", offer);
  });

  socket.on("disconnect", () => {
    onlineCount--;
    io.emit("onlineCount", onlineCount);
    console.log(`User disconnected: ${socket.id} - Online: ${onlineCount}`);
    removeFromQueue(socket.id);
    const user = userMap.get(socket.id);
    io.emit("leave", user);
  });
});

app.get("/", (c) => c.text("Hono Bun Socket.IO Server"));

server.on("request", app.fetch);
server.listen(4000, () =>
  console.log("Server running on http://localhost:4000")
);
