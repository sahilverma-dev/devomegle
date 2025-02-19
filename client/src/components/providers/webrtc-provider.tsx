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

export type AppStatus =
  | "loading"
  | "lobby"
  | "interests"
  | "matchmaking"
  | "matched"
  | "new-matchmaking";

export const WebRTCContext = createContext<{
  status: AppStatus;
  peer: RefObject<RTCPeerConnection | null>;
  dataChannel: RTCDataChannel | null;
  isLocalStreamLoading: boolean;
  isRemotePeerConnected: boolean;
  localMediaStream: MediaStream | null;
  removeMediaStream: MediaStream | null;
  remoteUser: User | null;
  localVideoEleRef: RefObject<HTMLVideoElement | null>;
  remoteVideoEleRef: RefObject<HTMLVideoElement | null>;
  isLocalVideoActive: boolean;
  isLocalMicActive: boolean;
  isRemoteVideoActive: boolean;
  isRemoteMicActive: boolean;
  isSideChatActive: boolean;
  changeStatus: (status: AppStatus) => void;
  toggleLocalVideo: () => void;
  toggleLocalMic: () => void;
  toggleSideChat: () => void;
  createOffer: () => Promise<RTCSessionDescriptionInit | undefined>;
  createAnswer: (
    offer: RTCSessionDescription
  ) => Promise<RTCSessionDescriptionInit | undefined>;
  setRemoteAnswer: (offer: RTCSessionDescription) => Promise<void>;
  addLocalTrack: (stream: MediaStream) => void;
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
  const [status, setStatus] = useState<AppStatus>("loading");

  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);

  const [roomId, setRoomId] = useState<string | null>("null");

  const [isLocalVideoActive, setIsLocalVideoActive] = useState(false);
  const [isLocalMicActive, setIsLocalMicActive] = useState(false);
  const [isRemoteVideoActive, setIsRemoteVideoActive] = useState(false);
  const [isRemoteMicActive, setIsRemoteMicActive] = useState(false);

  const [isSideChatActive, setIsSideChatActive] = useState(false);

  const peer = useRef<RTCPeerConnection | null>(null);
  const [remoteUser, setRemoteUser] = useState<User | null>(null);

  const [isRemotePeerConnected, setIsRemotePeerConnected] = useState(false);
  const { socket } = useSocket();

  const localVideoEleRef = useRef<HTMLVideoElement>(null);
  const remoteVideoEleRef = useRef<HTMLVideoElement>(null);

  const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(
    null
  );
  const [removeMediaStream, setRemoveMediaStream] =
    useState<MediaStream | null>(null);
  const [isLocalStreamLoading, setIsLocalStreamLoading] = useState(false);

  const addLocalTrack = useCallback((stream: MediaStream) => {
    if (peer.current) {
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
    }
  }, []);

  const changeStatus = (newStatus: AppStatus) => {
    setStatus(newStatus);
  };

  const toggleLocalVideo = () => {
    setIsLocalVideoActive((state) => !state);
  };

  const toggleLocalMic = () => {
    setIsLocalMicActive((state) => !state);
  };

  const toggleSideChat = () => {
    setIsSideChatActive((state) => !state);
  };

  const createOffer = useCallback(async () => {
    if (peer.current) {
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
    }
  }, []);

  const createAnswer = useCallback(async (offer: RTCSessionDescription) => {
    if (peer.current) {
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
    }
  }, []);

  const setRemoteAnswer = useCallback(async (ans: RTCSessionDescription) => {
    if (peer.current) {
      console.log("got the answer and setting the answer as remote SDP");
      await peer.current.setRemoteDescription(ans);
    }
  }, []);

  const resetPeerConnection = () => {
    if (peer.current) {
      // Reset existing sender state
      peer.current.getSenders().forEach((sender) => {
        if (peer.current) {
          peer?.current.removeTrack(sender);
        }
      });
    }
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
        socket?.emit("join", { roomId, user });
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

  // handling events
  const handleJoin = useCallback(
    async ({ user: otherUser }: { user: User }) => {
      const offer = await createOffer();
      console.log(`offer created for ${otherUser.name}`, offer);
      toast.success(`${otherUser.name} joined the room`);
      socket?.emit("offer", {
        offer,
        userTo: otherUser,
        userBy: user,
        roomId,
      });
    },
    [createOffer, roomId, socket]
  );
  const handleLeave = useCallback(async ({ user }: { user: User }) => {
    console.log(`${user.name} left the room`);

    // removing the stream
    if (remoteVideoEleRef.current) {
      remoteVideoEleRef.current.srcObject = new MediaStream();
    }

    toast.error(`${user.name} left the room`);
  }, []);
  const handleOffer = useCallback(
    async ({
      userBy: otherUser,
      offer,
    }: {
      userBy: User;
      offer: RTCSessionDescription;
    }) => {
      console.log(`got the offer from ${otherUser.name}`, offer);

      setRemoteUser(otherUser);

      const answer = await createAnswer(offer);
      console.log(`created answer for ${otherUser.name}`, answer);
      socket?.emit("answer", {
        answer,
        userTo: otherUser,
        userBy: user,
        roomId,
      });
    },
    [createAnswer, roomId, socket]
  );
  const handleAnswer = useCallback(
    async ({
      answer,
      userBy,
    }: {
      userBy: User;
      answer: RTCSessionDescription;
    }) => {
      console.log(`got the answer from ${userBy.name}`, answer);

      setRemoteAnswer(answer);
    },
    [setRemoteAnswer]
  );
  const handleICECandidates = useCallback(
    async ({
      candidate,
      userBy,
    }: {
      userBy: User;
      candidate: RTCIceCandidate;
    }) => {
      if (peer.current) {
        console.log(`got the ice candidate from ${userBy.name}`);
        peer.current.addIceCandidate(candidate);
      }
    },
    [peer]
  );

  useEffect(() => {
    const getUserLocalMediaStream = async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });

        socket?.emit("join", { roomId, user });
        setLocalMediaStream(media);
        if (localVideoEleRef.current && media) {
          localVideoEleRef.current.srcObject = media;
          addLocalTrack(media);
        }
      } catch (error) {
        console.log(error);
      }
    };
    getUserLocalMediaStream();
  }, [addLocalTrack, roomId, socket]);

  useEffect(() => {
    // socket events
    socket?.on("join", handleJoin);
    socket?.on("leave", handleLeave);
    socket?.on("offer", handleOffer);
    socket?.on("answer", handleAnswer);
    socket?.on("ice-candidate", handleICECandidates);

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
    socket,
  ]);

  // handle peer connection

  useEffect(() => {
    const peerConnection = new RTCPeerConnection(config);

    // data channel
    const dataChannel = peerConnection.createDataChannel("dataChannel", {
      ordered: true,
      maxRetransmits: 3,
    });

    dataChannel.onopen = () => {
      console.log("Data channel opened");
    };

    dataChannel.onmessage = (event) => {
      console.log("Received message:", event.data);
    };

    setDataChannel(dataChannel);

    // peerConnection.ontrack = (event) => {
    //   console.log("Got remote track:", event.track);
    //   setRemoveMediaStream(event.streams[0]);
    //   if (remoteVideoEleRef.current) {
    //     remoteVideoEleRef.current.srcObject = event.streams[0];
    //   }
    // };

    peerConnection.ondatachannel = (event) => {
      console.log("Data channel received:", event.channel);
    };

    peerConnection.onconnectionstatechange = (event) => {
      setIsRemotePeerConnected(peerConnection.connectionState === "connected");
      console.log("Connection state changed:", peerConnection.connectionState, {
        event,
      });
    };

    peerConnection.oniceconnectionstatechange = (event) => {
      console.log(
        "ICE connection state changed:",
        peerConnection.iceConnectionState,
        { event }
      );
    };

    peerConnection.onnegotiationneeded = async () => {
      console.log("Negotiation needed");
      const offer = await createOffer();

      socket?.emit("offer", {
        offer,
        userTo: remoteUser,
        userBy: user,
        roomId,
      });
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate to the remote peer");
        socket?.emit("ice-candidate", event.candidate);
      }
    };

    peer.current = peerConnection;
  }, [createOffer, socket]);

  useEffect(() => {
    if (peer.current) {
      peer.current.ontrack = (event) => {
        console.log("Got remote track:", event.track);
        setRemoveMediaStream(event.streams[0]);
        if (remoteVideoEleRef.current) {
          remoteVideoEleRef.current.srcObject = event.streams[0];
        }
      };
    }
  }, [isRemotePeerConnected]);

  return (
    <WebRTCContext.Provider
      value={{
        remoteUser,
        peer,
        dataChannel,
        isLocalStreamLoading,
        localVideoEleRef,
        remoteVideoEleRef,
        localMediaStream,
        removeMediaStream,
        isRemotePeerConnected,

        isLocalVideoActive,
        isLocalMicActive,
        isRemoteVideoActive,
        isRemoteMicActive,
        isSideChatActive,
        status,

        changeStatus,
        toggleLocalVideo,

        toggleLocalMic,
        toggleSideChat,
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
