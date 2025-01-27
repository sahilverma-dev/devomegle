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
    // Add TURN servers here if needed
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
          toast.success("Camera");
        }
      } catch (error) {
        console.log(error);

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

  // const cleanupConnection = () => {
  //   if (peerConnection) {
  //     peerConnection.close();
  //     setPeerConnection(null);
  //   }
  //   if (localStream) {
  //     localStream.getTracks().forEach((track) => track.stop());
  //   }
  //   setMatchInfo(null);
  //   dataChannel.current = null;
  // };

  const handleMatched = async (match: MatchInfo) => {
    toast.success(`Connected to ${match.partner.displayName}`);
    setIsMatching(false);
    setMatchInfo(match);

    try {
      const pc = new RTCPeerConnection(iceServers);
      setPeerConnection(pc);

      // Add local stream tracks
      localStream?.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // ICE Candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("signal", {
            to: match.partner.uid,
            signal: {
              type: "candidate",
              candidate: event.candidate,
            },
          });
        }
      };

      // Data channel setup
      if (match.isInitiator) {
        dataChannel.current = pc.createDataChannel("chat");
        setupDataChannel(dataChannel.current);
      } else {
        pc.ondatachannel = (event) => {
          dataChannel.current = event.channel;
          setupDataChannel(event.channel);
        };
      }

      if (match.isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("signal", {
          to: match.partner.uid,
          signal: offer,
        });
      }
    } catch (error) {
      console.log(error);

      toast.error("Failed to establish connection");
      cleanupConnection();
    }
  };

  const setupDataChannel = (channel: RTCDataChannel) => {
    channel.onopen = () => {
      toast.success("Chat connection established");
    };

    channel.onmessage = ({ data }) => {
      setMessages((prev) => [
        ...prev,
        { text: data, isLocal: false, timestamp: new Date() },
      ]);
    };
  };

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
      socket.emit("partnerDisconnected", { to: matchInfo.partner.uid });
    }
    cleanupConnection();
  };

  const handlePartnerDisconnect = () => {
    toast.info("Partner disconnected");
    cleanupConnection();
  };

  const handleMatchFailed = () => {
    toast.error("Failed to find a match");
    setIsMatching(false);
  };

  const handleSignal = async (signal: any) => {
    if (!peerConnection || !matchInfo) return;

    try {
      if (signal.type === "offer") {
        await peerConnection.setRemoteDescription(signal);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit("signal", {
          to: matchInfo.partner.uid,
          signal: answer,
        });
      } else if (signal.type === "answer") {
        await peerConnection.setRemoteDescription(signal);
      } else if (signal.type === "candidate" && signal.candidate) {
        try {
          await peerConnection.addIceCandidate(
            new RTCIceCandidate(signal.candidate)
          );
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      }
    } catch (error) {
      toast.error("Connection error");
      console.error("Signal handling error:", error);
    }
  };

  // const handleSignal = async (signal: any) => {
  //   if (!peerConnection || !matchInfo) return;

  //   try {
  //     if (signal.type === "offer") {
  //       await peerConnection.setRemoteDescription(signal);
  //       const answer = await peerConnection.createAnswer();
  //       await peerConnection.setLocalDescription(answer);
  //       socket.emit("signal", {
  //         to: matchInfo.partner.uid,
  //         signal: answer,
  //       });
  //     } else if (signal.type === "answer") {
  //       await peerConnection.setRemoteDescription(signal);
  //     } else if (signal.type === "candidate") {
  //       await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
  //     }

  //     else if (signal.type === "candidate" && signal.candidate) {
  //       try {
  //         await peerConnection.addIceCandidate(
  //           new RTCIceCandidate(signal.candidate)
  //         );
  //       } catch (error) {
  //         console.error("Error adding ICE candidate:", error);
  //       }
  //     }
  //   } catch (error) {
  //           console.log(error)

  //     toast.error("Connection error");
  //     console.error("Signal handling error:", error);
  //   }
  // };

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

  // ... (keep other handler functions same as before)

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
        <Button
          onClick={isMatching ? handleLeaveQueue : handleJoinQueue}
          variant={isMatching ? "destructive" : "default"}
          disabled={!user}
        >
          {isMatching ? "Cancel Search" : "Start Video Chat"}
        </Button>

        {/* Update the End Call button */}
        {matchInfo && (
          <Button onClick={handleEndCall} variant="destructive">
            End Call
          </Button>
        )}
      </div>
    </div>
  );
};
