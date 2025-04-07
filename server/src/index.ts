import express from "express";
import cors from "cors";
import { Server } from "socket.io";

import { createServer } from "http";
import type { User } from "./interfaces";
import { redis } from "./redis";
import { handelSocketConnection } from "./routes/socket-route";

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

// io.use((socket, next) => {
//   const username = socket.handshake.auth.username;
//   if (!username) {
//     return next(new Error("invalid username"));
//   }
//   socket.username = username;
//   next();
// })

redis
  .connect()
  .then(() => console.log("Redis database connected"))
  .catch((err) => console.log("Redis Error:", err));

io.on("connection", (socket) => {
  handelSocketConnection(io, socket);
});

server.listen(PORT, () => {
  console.log("server running at http://localhost:4000");
});
