import type { GetTypesResult, Room } from "./interface";

export function handelStart(
  roomArr: Array<Room>,
  socket: any,
  cb: Function,
  io: any
): void {
  // check available rooms
  let availableRoom = checkAvailableRoom();
  if (availableRoom.is) {
    socket.join(availableRoom.roomId);
    cb("p2");
    closeRoom(availableRoom.roomId);
    if (availableRoom?.room) {
      io.to(availableRoom.room.p1.id).emit("remote-socket", socket.id);
      socket.emit("remote-socket", availableRoom.room.p1.id);
      socket.emit("roomId", availableRoom.room.roomId);
    }
  }
  // if no available room, create one
  else {
    let roomId = crypto.randomUUID();
    socket.join(roomId);
    roomArr.push({
      roomId,
      isAvailable: true,
      p1: {
        id: socket.id,
      },
      p2: {
        id: null,
      },
    });
    cb("p1");
    socket.emit("roomId", roomId);
  }

  /**
   *
   * @param roomId
   * @desc search though roomArr and
   * make isAvailable false, also se p2.id
   * socket.id
   */
  function closeRoom(roomId: string): void {
    for (let i = 0; i < roomArr.length; i++) {
      if (roomArr[i].roomId == roomId) {
        roomArr[i].isAvailable = false;
        roomArr[i].p2.id = socket.id;
        break;
      }
    }
  }

  /**
   *
   * @returns Object {is, roomid, room}
   * is -> true if foom is available
   * roomid -> id of the room, could be empth
   * room -> the roomArray, could be empty
   */
  function checkAvailableRoom(): {
    is: boolean;
    roomId: string;
    room: Room | null;
  } {
    for (let i = 0; i < roomArr.length; i++) {
      if (roomArr[i].isAvailable) {
        return { is: true, roomId: roomArr[i].roomId, room: roomArr[i] };
      }
      if (roomArr[i].p1.id == socket.id || roomArr[i].p2.id == socket.id) {
        return { is: false, roomId: "", room: null };
      }
    }

    return { is: false, roomId: "", room: null };
  }
}

/**
 * @desc handels disconnceition event
 */
export function handelDisconnect(
  disconnectedId: string,
  roomArr: Array<Room>,
  io: any
) {
  for (let i = 0; i < roomArr.length; i++) {
    if (roomArr[i].p1.id == disconnectedId) {
      io.to(roomArr[i].p2.id).emit("disconnected");
      if (roomArr[i].p2.id) {
        roomArr[i].isAvailable = true;
        roomArr[i].p1.id = roomArr[i].p2.id;
        roomArr[i].p2.id = null;
      } else {
        roomArr.splice(i, 1);
      }
    } else if (roomArr[i].p2.id == disconnectedId) {
      io.to(roomArr[i].p1.id).emit("disconnected");
      if (roomArr[i].p1.id) {
        roomArr[i].isAvailable = true;
        roomArr[i].p2.id = null;
      } else {
        roomArr.splice(i, 1);
      }
    }
  }
}

// get type of person (p1 or p2)
export function getType(id: string, roomArr: Array<Room>): GetTypesResult {
  for (let i = 0; i < roomArr.length; i++) {
    if (roomArr[i].p1.id == id) {
      return { type: "p1", p2id: roomArr[i].p2.id };
    } else if (roomArr[i].p2.id == id) {
      return { type: "p2", p1id: roomArr[i].p1.id };
    }
  }

  return false;
}
