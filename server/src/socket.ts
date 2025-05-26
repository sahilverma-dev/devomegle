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

    socket.on("user-left", async () => {
      const count = Math.max(0, Number(await pubClient.decr(ONLINE_COUNT_KEY)));
      await pubClient.set(ONLINE_COUNT_KEY, count);
      io.emit("user-count", count);
    });

    // find match
    socket.on("find-match", async ({ interests }) => {
      const userId = socket.id;

      console.log("Find match with", userId, interests);

      if (interests && interests.length > 0) {
        for (const interest of interests) {
          const peerId = await pubClient.lPop(`queue:interest:${interest}`);

          if (peerId) {
            // Found a peer with same interest
            io.to(peerId).emit("match-found", { peerId: userId });
            socket.emit("match-found", { peerId });
            return;
          }
        }

        // No match found, enqueue user by all their interests
        for (const interest of interests) {
          await pubClient.rPush(`queue:interest:${interest}`, userId);
        }
      } else {
        const peerId = await pubClient.lPop("queue:random");
        if (peerId) {
          io.to(peerId as string).emit("match-found", { peerId: userId });
          socket.emit("match-found", { peerId });
        } else {
          await pubClient.rPush("queue:random", userId);
        }
      }
    });

    socket.on("disconnect", async () => {
      // Remove from all interest queues
      const interests = await pubClient.sMembers(`interests:${socket.id}`);
      for (const interest of interests as string[]) {
        await pubClient.lRem(`queue:interest:${interest}`, 0, socket.id);
      }

      // Remove from random queue
      await pubClient.lRem("queue:random", 0, socket.id);

      await pubClient.del(`interests:${socket.id}`);
    });

    socket.on("disconnect", async () => {
      const count = Math.max(0, Number(await pubClient.decr(ONLINE_COUNT_KEY)));
      await pubClient.set(ONLINE_COUNT_KEY, count); // sanitize
      io.emit("user-count", count);
    });
  });
}
