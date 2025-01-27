import { createServer } from "http";
import express from "express";
import { Server, Socket } from "socket.io";
import cors from "cors";

interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}

const userMap: Map<string, User> = new Map();

const app = express();
const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.ORIGIN || `*`;

const server = createServer(app);

app.use(cors());

const io = new Server(server, {
  cors: {
    origin: ORIGIN,
  },
});

interface User {
  uid: string;
  displayName: string;
  email: string;
}

interface ConnectedUser {
  user: User;
  roomId: string;
  socketId: string;
}

interface JoinPayload {
  roomId: string;
  user: User;
}

interface MessagePayload {
  roomId: string;
  user: User;
  message: string;
}

class RoomService {
  private connectedUsers: Map<string, ConnectedUser> = new Map();

  addUser(socketId: string, user: User, roomId: string): void {
    this.connectedUsers.set(socketId, { user, roomId, socketId });
  }

  removeUser(socketId: string): ConnectedUser | undefined {
    const user = this.connectedUsers.get(socketId);
    if (user) this.connectedUsers.delete(socketId);
    return user;
  }

  getUsersInRoom(roomId: string): ConnectedUser[] {
    return Array.from(this.connectedUsers.values()).filter(
      (user) => user.roomId === roomId
    );
  }

  getUser(socketId: string): ConnectedUser | undefined {
    return this.connectedUsers.get(socketId);
  }
}

// Server setup
const roomService = new RoomService();

io.on("connection", (socket: Socket) => {
  console.log("User connected:", socket.id);

  // Heartbeat monitoring
  let heartbeatInterval: NodeJS.Timer;

  const heartbeat = () => {
    clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      socket.emit("ping");
    }, 15000);
  };

  socket.on("pong", heartbeat);
  heartbeat();

  // Join room handler
  socket.on("join", ({ roomId, user }: JoinPayload) => {
    try {
      if (!roomId || !user?.uid) {
        throw new Error("Invalid join payload");
      }

      // Leave previous room if any
      const currentUser = roomService.getUser(socket.id);
      if (currentUser) {
        socket.leave(currentUser.roomId);
        socket.to(currentUser.roomId).emit("userLeft", currentUser.user);
      }

      // Join new room
      socket.join(roomId);
      roomService.addUser(socket.id, user, roomId);

      // Notify room members
      socket.to(roomId).emit("userJoined", user);

      // Send current room users to the new member
      const usersInRoom = roomService
        .getUsersInRoom(roomId)
        .map((u) => u.user)
        .filter((u) => u.uid !== user.uid);

      socket.emit("currentUsers", usersInRoom);
    } catch (error) {
      socket.emit(
        "error",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  });

  // Message handler
  socket.on("message", ({ message, user, roomId }: MessagePayload) => {
    try {
      if (!message?.trim() || !user?.uid || !roomId) {
        throw new Error("Invalid message payload");
      }

      const connectedUser = roomService.getUser(socket.id);
      if (!connectedUser || connectedUser.roomId !== roomId) {
        throw new Error("User not in room");
      }

      io.to(roomId).emit("message", {
        user,
        message: message.trim(),
        timestamp: new Date(),
      });
    } catch (error) {
      socket.emit(
        "error",
        error instanceof Error ? error.message : "Message delivery failed"
      );
    }
  });

  // Disconnection handler
  socket.on("disconnect", () => {
    clearInterval(heartbeatInterval);
    const disconnectedUser = roomService.removeUser(socket.id);
    if (disconnectedUser) {
      socket
        .to(disconnectedUser.roomId)
        .emit("userLeft", disconnectedUser.user);
      console.log(`User ${disconnectedUser.user.displayName} disconnected`);
    }
  });

  // Voluntary leave handler
  socket.on("leave", () => {
    const user = roomService.removeUser(socket.id);
    if (user) {
      socket.leave(user.roomId);
      socket.to(user.roomId).emit("userLeft", user.user);
    }
  });
});

console.clear();

server.listen(PORT, () => {
  console.log("Server is running on port", PORT);
});

app.get("/", (req, res) => {
  res.send("Server is running");
});
