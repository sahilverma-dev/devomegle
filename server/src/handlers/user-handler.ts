import type { Server, Socket } from "socket.io";
import { redis } from "../redis";

export async function processUserPairing(io: Server, socket: Socket) {
  try {
    const userLen = await redis.lLen("users");
    if (userLen <= 0) {
      const check = await soloUserLeftTheChat(socket);
      if (check > 0) throw new Error("duplicate user found");

      await addUserTODb(socket);
      io.to(socket.id).emit("waiting", "Waiting for another user to join");
    } else {
      //select one user from db and make list of current users and paired user.
      const userPair = await makePair(userLen, socket);
      if (!userPair) throw new Error("error selecting pair", socket.username);

      userPair.forEach((key) =>
        io.to(key.socketId).emit("getStragerData", key)
      );
    }
  } catch (err) {
    socket.emit("errSelectingPair");
    console.log(err);
  }
}

export async function soloUserLeftTheChat(socket) {
  try {
    const check = await redis.lRem(
      "users",
      1,
      JSON.stringify({
        socketId: socket.id,
        username: socket.username,
      })
    );
    console.log(socket.username, "left the chat", check);
    return check;
  } catch (err) {
    console.log(err);
  }
}
