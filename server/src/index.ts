import express from "express";
import cors from "cors";
import { Server } from "socket.io";

import { createServer } from "http";
import type { User } from "./interfaces";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const PORT = 4000;

interface SocketUser extends User {
  socketId: string;
}

const waitingQueue: SocketUser[] = [];

app.use(cors());

app.get("/", (req, res) => {
  res.send("<h1>Hello world</h1>");
});

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  //   handle user join
  socket.on("join", (user: User) => {
    const socketUser: SocketUser = {
      ...user,
      socketId: socket.id,
    };

    waitingQueue.push(socketUser);

    console.log(`${user.name} joined the queue`);
  });

  io.on("disconnect", () => {
    console.log("user left");
  });
});

server.listen(PORT, () => {
  console.log("server running at http://localhost:4000");
});
