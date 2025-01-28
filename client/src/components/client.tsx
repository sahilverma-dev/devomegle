import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useWebRTC } from "@/hooks/useWebrtc";
import { io } from "socket.io-client";

interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}

const socket = io("http://localhost:4000", {
  reconnection: false,
  // autoConnect: false
});

const Room = () => {
  const { user: authUser } = useAuth();

  const user: User = {
    uid: authUser?.uid as string,
    displayName: authUser?.displayName as string,
    email: authUser?.email as string,
    photoURL: authUser?.photoURL as string,
  };

  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(
    null
  );
  const [remoteMediaStream, setRemoteMediaStream] = useState(new MediaStream());
  const roomId = "TEMP_ROOM";

  const { service } = useWebRTC();

  // handling events
  const handleJoin = useCallback(
    async ({ user: otherUser }: { user: User }) => {
      const offer = await service.createOffer();
      console.log(`offer created for ${otherUser.displayName}`, offer);
      toast.success(`${otherUser.displayName} joined the room`);
      socket?.emit("offer", {
        offer,
        userTo: otherUser,
        userBy: user,
        roomId,
      });
    },
    [service, user]
  );
  const handleLeave = useCallback(async ({ user }: { user: User }) => {
    console.log(`${user.displayName} left the room`);

    // removing the stream
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = new MediaStream();
    }

    toast.error(`${user.displayName} left the room`);
  }, []);
  const handleOffer = useCallback(
    async ({
      userBy: otherUser,
      offer,
    }: {
      userBy: User;
      offer: RTCSessionDescription;
    }) => {
      console.log(`got the offer from ${otherUser.displayName}`, offer);

      const answer = await service.createAnswer(offer);
      console.log(`created answer for ${otherUser.displayName}`, answer);
      socket?.emit("answer", {
        answer,
        userTo: otherUser,
        userBy: user,
        roomId,
      });
    },
    [service, roomId, socket]
  );
  const handleAnswer = useCallback(
    async ({
      answer,
      userBy,
    }: {
      userBy: User;
      answer: RTCSessionDescription;
    }) => {
      console.log(`got the answer from ${userBy.displayName}`, answer);

      service.setRemoteAnswer(answer);
    },
    [service]
  );
  const handleICECandidates = useCallback(
    async ({
      candidate,
      userBy,
    }: {
      userBy: User;
      candidate: RTCIceCandidate;
    }) => {
      console.log(`got the ice candidate from ${userBy.displayName}`);
      service.addIceCandidate(candidate);
    },
    []
  );

  useEffect(() => {
    const getUserLocalMediaStream = async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });

        socket?.emit("join", { roomId, user });
        setLocalMediaStream(media);
        if (localVideoRef.current && media) {
          localVideoRef.current.srcObject = media;
          service.addLocalTrack(media);
        }
      } catch (error) {
        console.log(error);
      }
    };
    getUserLocalMediaStream();
  }, []);

  useEffect(() => {
    // socket events
    socket?.on("join", handleJoin);
    socket?.on("leave", handleLeave);
    socket?.on("offer", handleOffer);
    socket?.on("answer", handleAnswer);
    socket?.on("ice-candidate", handleICECandidates);

    // peer events
    service.peer.ontrack = (event) => {
      console.log("got the track", event.track);

      event.streams[0].getTracks().forEach((track) => {
        setRemoteMediaStream((state) => {
          state.addTrack(track);
          return state;
        });
      });

      if (remoteVideoRef.current) {
        console.log("setting the track to remote video element");
        remoteVideoRef.current.srcObject = remoteMediaStream;
      }
    };

    service.peer.onicecandidate = (event) => {
      if (event.candidate) {
        // Send the ICE candidate to the other peer
        socket?.emit("ice-candidate", {
          userBy: user,
          candidate: event.candidate,
          roomId,
        });
      }
    };
    service.peer.onconnectionstatechange = () => {
      if (service.peer.connectionState === "connected") {
        setIsPeerConnected(true);
        console.log("Peers connected!");
      }
    };

    return () => {
      // remove the events on unmount
      socket?.off("join", handleJoin);
      socket?.off("leave", handleLeave);
      socket?.off("offer", handleOffer);
      socket?.off("answer", handleAnswer);
      socket?.off("ice-candidate", handleICECandidates);
    };
  }, [
    handleAnswer,
    handleICECandidates,
    handleJoin,
    handleLeave,
    handleOffer,
    localMediaStream,
    remoteMediaStream,
    roomId,
    service,
    user,
  ]);

  return (
    <div className="h-dvh ">
      <div className="flex border-b p-4 w-full items-center justify-between">
        <h1 className="font-bold">Room</h1>
        <div className="flex items-center gap-2">
          <b>Hello, {user.displayName}</b>
          <Avatar className="border">
            <AvatarImage src={user.photoURL} />
            <AvatarFallback>
              {user.displayName.split(" ").join("")}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="p-4 h-full space-y-2">
        {/* <Button
          onClick={() => {
            socket?.emit("join", { roomId, user });
          }}
        >
          Join the room
        </Button> */}
        <div
          className="w-full h-full md:h-auto gap-4 flex flex-col md:flex-row "
          // className="w-full grid gap-4 grid-cols-2 lg:grid-cols-3"
        >
          <div className="w-full flex items-center gap-4 flex-col h-full md:h-auto border rounded-xl md:aspect-video overflow-hidden">
            <video
              ref={localVideoRef}
              controls={false}
              autoPlay
              muted
              className=" w-full h-full object-cover"
            />
          </div>

          <div
            className={cn([
              "w-full flex items-center gap-4 flex-col h-full border rounded-xl md:aspect-video overflow-hidden",
              !isPeerConnected && "hidden",
            ])}
          >
            <video
              ref={remoteVideoRef}
              controls={false}
              autoPlay
              className=" w-full h-full object-cover"
            />
          </div>
        </div>
        {/* <div className="flex gap-2">
          <Button
            onClick={() => {
              // dataChannel.send("hello");
              console.log(remoteVideoRef);
            }}
          >
            Send Message
          </Button>
        </div> */}
      </div>
    </div>
  );
};

export default Room;
