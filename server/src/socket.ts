import { Server, Socket } from "socket.io";
import { redisClient } from "./config/redis";
import { createAdapter } from "@socket.io/redis-adapter";

export async function setupSocketIO(io: Server) {
  const pubClient = redisClient;
  const subClient = pubClient.duplicate();

  await pubClient.connect();
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));

  const ONLINE_COUNT_KEY = "online_users";

  io.on("connection", async (socket) => {
    await pubClient.incr(ONLINE_COUNT_KEY);
    const count = await pubClient.get(ONLINE_COUNT_KEY);
    io.emit("user-count", Number(count));

    socket.on("disconnect", async () => {
      await pubClient.decr(ONLINE_COUNT_KEY);
      const count = await pubClient.get(ONLINE_COUNT_KEY);
      io.emit("user-count", Number(count));
    });
  });
}
