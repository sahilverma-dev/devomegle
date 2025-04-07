import type { Socket } from "socket.io";
import { redis } from "../redis";

export default async function addUserTODb(socket: Socket) {
  try {
    const result = await redis.rPush(
      "users",
      JSON.stringify({
        socketId: socket.id,
        username: socket.username,
      })
    );
    console.log("added", socket.username, "to redis", result);
  } catch (err) {
    console.log("err adding user to redis", err);
    socket.emit("errSelectingPair");
  }
}
