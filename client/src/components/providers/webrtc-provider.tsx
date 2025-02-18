"use client";

import {
  PropsWithChildren,
  RefObject,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useSocket } from "./socket-provider";
import { faker } from "@faker-js/faker";

export const WebRTCContext = createContext<{
  peer: RefObject<RTCPeerConnection>;
  isLocalStreamLoading: boolean;
  isRemotePeerConnected: boolean;
  localMediaStream: MediaStream | null;
  remoteUser: User | null;
  localVideoEleRef: RefObject<HTMLVideoElement | null>;
  createOffer: () => Promise<RTCSessionDescriptionInit>;
  createAnswer: (
    offer: RTCSessionDescription
  ) => Promise<RTCSessionDescriptionInit>;
  setRemoteAnswer: (offer: RTCSessionDescription) => Promise<void>;
  addLocalTrack: (stream: MediaStream) => void;
  dataChannel: RTCDataChannel;
  resetPeerConnection: () => void;
} | null>(null);

const config: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:global.stun.twilio.com:3478",
      ],
    },
    // {
    //   urls: [TURN_SERVER],
    //   username: TURN_USERNAME,
    //   credential: TURN_PASSWORD,
    // },
  ],
};

interface User {
  id: string;
  name: string;
  avatar: string;
}

const user: User = {
  id: crypto.randomUUID(),
  name: faker.person.fullName(),
  avatar: faker.image.urlPicsumPhotos({ height: 100, width: 100 }),
};

export const WebRTCProvider = (props: PropsWithChildren) => {
  const peer = useRef(new RTCPeerConnection(config));
  const [remoteUser, setRemoteUser] = useState<User | null>(null);

  const [isRemotePeerConnected, setIsRemotePeerConnected] = useState(false);
  const { socket } = useSocket();

  const localVideoEleRef = useRef<HTMLVideoElement>(null);

  const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(
    null
  );
  const [isLocalStreamLoading, setIsLocalStreamLoading] = useState(false);

  const dataChannel = peer.current.createDataChannel("dataChannel", {
    ordered: true,
    maxRetransmits: 3,
  });

  dataChannel.onopen = () => {
    console.log("Data channel opened");
  };

  dataChannel.onmessage = (event) => {
    console.log("Received message:", event.data);
  };

  const addLocalTrack = useCallback((stream: MediaStream) => {
    console.log("Adding local stream to the peer");

    const tracks = stream.getTracks();

    for (const track of tracks) {
      console.log("Checking track:", track);
      const sender = peer.current.getSenders().find((s) => s.track === track);
      if (!sender) {
        console.log("Adding track:", track);
        peer.current.addTrack(track, stream);
      } else {
        console.log("Track already added:", track);
      }
    }
  }, []);

  const createOffer = async () => {
    console.log("creating offer");

    try {
      const offer = await peer.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await peer.current.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error("Error creating offer:", error);
      throw error; // You might want to handle the error accordingly in your application
    }
  };

  const createAnswer = async (offer: RTCSessionDescription) => {
    console.log("got the offer and creating answer");

    try {
      await peer.current.setRemoteDescription(offer);
      const answer = await peer.current.createAnswer();
      if (!peer.current.currentRemoteDescription)
        await peer.current.setLocalDescription(answer);
      console.log("answer created");

      return answer;
    } catch (error) {
      console.error("Error creating answer:", error);
      throw error; // Handle the error appropriately
    }
  };

  const setRemoteAnswer = async (ans: RTCSessionDescription) => {
    console.log("got the answer and setting the answer as remote SDP");
    await peer.current.setRemoteDescription(ans);
  };

  const resetPeerConnection = () => {
    // Reset existing sender state
    peer.current.getSenders().forEach((sender) => {
      peer.current.removeTrack(sender);
    });

    // Add new tracks or perform other initialization
  };

  useEffect(() => {
    const getUserMediaStream = async () => {
      console.log("getting media");

      try {
        setIsLocalStreamLoading(true);
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });

        setLocalMediaStream(stream);
        socket?.emit("join", user);
        if (localVideoEleRef.current) {
          console.log("yo");
          localVideoEleRef.current.srcObject = stream;
          addLocalTrack(stream);
        }
      } catch (error) {
        console.log(error);
        toast.error("Failed to get user media devices");
      } finally {
        setIsLocalStreamLoading(false);
      }
    };

    getUserMediaStream();
  }, [addLocalTrack, socket]);

  //   handing socket events
  const handleJoin = useCallback(
    async (user: User) => {
      console.log(user);
      setRemoteUser(user);
      toast.success(`${user.name} joined`);

      const offer = await createOffer();

      socket?.emit("offer", offer);
    },
    [socket]
  );

  const handleLeave = (user: User) => {
    console.log(user);
    setRemoteUser(user);
    toast.error(`${user.name} left`);
  };

  const handleOffer = (answer) => {
    console.log(answer);
  };

  useEffect(() => {
    socket?.on("join", handleJoin);
    socket?.on("leave", handleLeave);
    socket?.on("offer", handleLeave);

    return () => {
      socket?.off("join", handleJoin);
      socket?.off("leave", handleLeave);
    };
  }, [handleJoin, socket]);

  return (
    <WebRTCContext.Provider
      value={{
        remoteUser,
        peer,
        dataChannel,
        isLocalStreamLoading,
        localVideoEleRef,
        localMediaStream,
        isRemotePeerConnected,
        createOffer,
        createAnswer,
        setRemoteAnswer,
        addLocalTrack,
        resetPeerConnection,
      }}
    >
      {props.children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);

  if (context) {
    return context;
  } else {
    throw Error("Failed ");
  }
};
