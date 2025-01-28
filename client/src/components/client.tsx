import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Input } from "./ui/input";

interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}

interface MatchInfo {
  partner: User;
  partnerSocketId: string;
  isInitiator: boolean;
}

interface ChatMessage {
  text: string;
  isLocal: boolean;
  timestamp: Date;
}

const socket = io("http://localhost:4000", {
  reconnectionAttempts: 3,
  autoConnect: false,
});

const iceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export const VideoChat = () => {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] =
    useState<RTCPeerConnection | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);

  useEffect(() => {
    if (!user) return;

    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        toast.error("Failed to access camera/microphone");
      }
    };

    setupMedia();

    socket.connect();
    socket.on("matched", handleMatched);
    socket.on("signal", handleSignal);
    socket.on("partnerDisconnected", handlePartnerDisconnect);
    socket.on("matchFailed", handleMatchFailed);

    return () => {
      cleanupConnection();
      socket.disconnect();
      socket.off("matched");
      socket.off("signal");
      socket.off("partnerDisconnected");
      socket.off("matchFailed");
    };
  }, [user]);

  const handleJoinQueue = () => {
    if (!user) return;
    setIsMatching(true);
    socket.emit("joinQueue", {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
    });
  };

  const handleLeaveQueue = () => {
    setIsMatching(false);
    socket.emit("leaveQueue");
  };

  const handleEndCall = () => {
    if (peerConnection) {
      peerConnection.close();
    }
    if (matchInfo) {
      socket.emit("partnerDisconnected", { to: matchInfo.partnerSocketId });
    }
    cleanupConnection();
  };

  const handleMatched = async (match: MatchInfo) => {
    console.log("[Client] Matched with:", match.partnerSocketId);
    toast.success(`Connected to ${match.partner.displayName}`);
    setIsMatching(false);
    setMatchInfo(match);

    try {
      // In handleMatched function
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ],
        iceCandidatePoolSize: 10,
      });

      // Add this before creating offers/answers
      pc.onnegotiationneeded = async () => {
        console.log("Negotiation needed");
      };

      setPeerConnection(pc);

      // Add local media tracks
      localStream?.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // Setup ICE candidate handler
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("signal", {
            to: match.partnerSocketId,
            signal: {
              type: "candidate",
              candidate: event.candidate.toJSON(),
            },
          });
        }
      };

      // Handle remote media
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      // Setup data channel
      if (match.isInitiator) {
        dataChannel.current = pc.createDataChannel("chat");
        setupDataChannel(dataChannel.current);
        initiateOffer(pc, match.partnerSocketId);
      } else {
        pc.ondatachannel = (event) => {
          dataChannel.current = event.channel;
          setupDataChannel(event.channel);
        };
      }

      // Connection state monitoring
      pc.onconnectionstatechange = () => {
        console.log("[Client] Connection state:", pc.connectionState);
        if (pc.connectionState === "disconnected") {
          handlePartnerDisconnect();
        }
      };
    } catch (error) {
      console.error("[Client] Connection setup failed:", error);
      cleanupConnection();
    }
  };

  // Modified offer creation flow
  const initiateOffer = async (
    pc: RTCPeerConnection,
    partnerSocketId: string
  ) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Allow media setup

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      console.log("Local offer description:", offer);
      await pc.setLocalDescription(offer);

      socket.emit("signal", {
        to: partnerSocketId,
        signal: pc.localDescription,
      });
    } catch (error) {
      console.error("Offer creation failed:", error);
    }
  };

  const handleSignal = async (signal: any) => {
    if (!peerConnection || !matchInfo) {
      console.error("Signal received without active connection");
      return;
    }

    try {
      console.log(`Processing ${signal.type} signal`);

      if (signal.type === "offer") {
        // Validate and set remote description
        if (!(signal.sdp && signal.type === "offer")) {
          throw new Error("Invalid offer received");
        }

        console.log("Setting remote description");
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(signal)
        );

        // Create answer with proper media configuration
        console.log("Creating answer...");
        const answer = await peerConnection.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });

        console.log("Answer created:", answer);
        await peerConnection.setLocalDescription(answer);

        // Send the finalized local description (might differ from initial answer)
        socket.emit("signal", {
          to: matchInfo.partnerSocketId,
          signal: peerConnection.localDescription,
        });
        console.log("Answer sent to peer");
      } else if (signal.type === "answer") {
        // Handle final answer from peer
        console.log("Setting final answer as remote description");
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(signal)
        );
      } else if (signal.type === "candidate" && signal.candidate) {
        // Handle ICE candidates
        console.log("Adding ICE candidate:", signal.candidate);
        await peerConnection.addIceCandidate(
          new RTCIceCandidate(signal.candidate)
        );
      }

      // Log connection progress
      console.log("Current signaling state:", peerConnection.signalingState);
      console.log("ICE connection state:", peerConnection.iceConnectionState);
    } catch (error) {
      console.error("Signal handling failed:", error);
      toast.error("Connection error");
      cleanupConnection();
    }
  };

  const setupDataChannel = (channel: RTCDataChannel) => {
    channel.onopen = () => {
      toast.success("Chat connected");
    };

    channel.onmessage = ({ data }) => {
      setMessages((prev) => [
        ...prev,
        { text: data, isLocal: false, timestamp: new Date() },
      ]);
    };
  };

  const sendMessage = () => {
    if (messageInput.trim() && dataChannel.current?.readyState === "open") {
      dataChannel.current.send(messageInput);
      setMessages((prev) => [
        ...prev,
        { text: messageInput, isLocal: true, timestamp: new Date() },
      ]);
      setMessageInput("");
    }
  };

  const handlePartnerDisconnect = () => {
    toast.info("Partner disconnected");
    cleanupConnection();
  };

  const handleMatchFailed = () => {
    toast.error("Failed to find a match");
    setIsMatching(false);
  };

  const cleanupConnection = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (dataChannel.current) {
      dataChannel.current.close();
      dataChannel.current = null;
    }
    setMatchInfo(null);
  };

  return (
    <div className="flex flex-col h-screen p-4 bg-gray-900 text-white">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
        <div className="bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="mb-4">
        <div className="h-32 overflow-y-auto bg-gray-800 p-2 rounded-lg">
          {messages.map((message, i) => (
            <div
              key={i}
              className={`text-sm ${
                message.isLocal ? "text-blue-300" : "text-green-300"
              }`}
            >
              {message.isLocal
                ? "You: "
                : `${matchInfo?.partner.displayName}: `}
              {message.text}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          />
          <Button onClick={sendMessage}>Send</Button>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        {!matchInfo ? (
          <Button
            onClick={isMatching ? handleLeaveQueue : handleJoinQueue}
            variant={isMatching ? "destructive" : "default"}
            disabled={!user}
          >
            {isMatching ? "Cancel Search" : "Start Video Chat"}
          </Button>
        ) : (
          <Button onClick={handleEndCall} variant="destructive">
            End Call
          </Button>
        )}
      </div>
    </div>
  );
};
