import type { Socket } from "socket.io";
import type { SocketUser } from "../interfaces";
import { redis } from "../redis";
import addUserTODb from "./add-user-to-db";

function createUserPair(socket: Socket, randomUserData: SocketUser) {
  const user1 = {
    socketId: socket.id,
    username: socket.username,
    polite: true,
    pairedUserId: randomUserData.socketId,
    strangerUsername: randomUserData.username,
  };
  const user2 = {
    socketId: randomUserData.socketId,
    username: randomUserData.username,
    polite: false,
    pairedUserId: socket.id,
    strangerUsername: socket.username,
  };
  return [user1, user2];
}

export default async function makePair(len: number, socket: Socket) {
  const getRandomIndex = () => Math.floor(Math.random() * len);
  const strangerIndex = getRandomIndex();

  try {
    const randomUserData = await redis.lIndex("users", strangerIndex);
    if (!randomUserData) {
      socket.emit("errMakingPair", "No user found");
      return null;
    }

    const removedCount = await redis.lRem("users", 1, randomUserData);
    if (removedCount === 0) {
      socket.emit("errMakingPair", "User no longer available");
      return null;
    }

    const parsedUserData = JSON.parse(randomUserData);
    const users = createUserPair(socket, parsedUserData);
    console.log(`Selected pair ${users[0].username} with ${users[1].username}`);

    if (users[0].socketId === users[1].socketId) {
      console.log("same user", userPair[0].socketId, userPair[1].socketId);
      socket.emit("waiting", "Waiting for another user to join");
      addUserTODb(socket);
      return;
    }
    return users;
  } catch (err) {
    console.error("Error making pair:", err);
    socket.emit("errMakingPair", "Internal server error");
    return null;
  }
}
