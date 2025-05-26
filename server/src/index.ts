import http from "http";
import { Server } from "socket.io";
import { setupSocketIO } from "./socket";
import app from "./app";
import { env } from "./env";

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.FRONTEND_URL,
  },
});

// Setup Socket.IO
setupSocketIO(io);

// REST API endpoint
app.get("/", (_req, res) => {
  res.send("Socket.IO + Express server running!");
});

// Start server
const PORT = env.PORT;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
