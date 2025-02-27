"use client";

import LocalSteam from "./local-stream";
import RemoteSteam from "./remote-stream";
import { cn } from "@/lib/utils";
import SideChat from "./side-chat";
import Controls from "./controls";
import { useWebRTC } from "../providers/webrtc-provider";

// const SideChat = dynamic(() => import('./side-chat'))

const ChatScreen = () => {
  const { isSideChatActive, isRemotePeerConnected } = useWebRTC();

  // TODO ADD DRAG AND DROP and resize
  return (
    <div className="h-dvh space-y-4 gap-4 w-full p-4">
      <div className="flex gap-4 h-[calc(100vh-100px)] flex-1">
        <div
          className={cn(
            "flex gap-4 items-center",
            isSideChatActive ? "flex-col flex-grow" : "flex-row  w-full"
          )}
        >
          <LocalSteam />
          {/* TODO add animation */}
          <RemoteSteam />
        </div>

        {isSideChatActive && <SideChat />}
      </div>
      <Controls />
    </div>
  );
};

export default ChatScreen;

// import React, { useState, useRef, useEffect, FormEvent } from "react";
// import { io, Socket } from "socket.io-client";

// const VideoChat: React.FC = () => {
//   // Refs for video elements
//   const myVideoRef = useRef<HTMLVideoElement>(null);
//   const strangerVideoRef = useRef<HTMLVideoElement>(null);

//   // Refs for mutable socket and peer connection instances
//   const socketRef = useRef<Socket | null>(null);
//   const peerRef = useRef<RTCPeerConnection | null>(null);

//   // A ref to always have the latest "type" value
//   const typeRef = useRef<string>("");

//   // Component state
//   const [type, setType] = useState<string>(""); // Either 'p1' or 'p2'
//   const [roomId, setRoomId] = useState<string>("");
//   const [remoteSocket, setRemoteSocket] = useState<string | null>(null);
//   const [messages, setMessages] = useState<{ sender: string; text: string }[]>(
//     []
//   );
//   const [inputMessage, setInputMessage] = useState<string>("");
//   const [loading, setLoading] = useState<boolean>(true);

//   // Keep typeRef in sync with type state
//   useEffect(() => {
//     typeRef.current = type;
//   }, [type]);

//   useEffect(() => {
//     // Connect to the socket server
//     const socket = io("http://localhost:4000");
//     socketRef.current = socket;

//     // When disconnected, redirect
//     socket.on("disconnected", () => {
//       window.location.href = "/?disconnect";
//     });

//     // Start event tells us if we are p1 or p2
//     socket.emit("start", (person: string) => {
//       setType(person);
//     });

//     // When a remote socket is available, set up the peer connection
//     socket.on("remote-socket", (id: string) => {
//       setRemoteSocket(id);
//       setLoading(false);

//       // Create a new peer connection
//       const peer = new RTCPeerConnection();
//       peerRef.current = peer;

//       // When negotiation is needed, create an offer if we are p1
//       peer.onnegotiationneeded = async () => {
//         if (typeRef.current === "p1" && peerRef.current) {
//           try {
//             const offer = await peerRef.current.createOffer();
//             await peerRef.current.setLocalDescription(offer);
//             socket.emit("sdp:send", { sdp: peerRef.current.localDescription });
//           } catch (error) {
//             console.error("Negotiation error:", error);
//           }
//         }
//       };

//       // When an ICE candidate is generated, send it to the remote socket
//       peer.onicecandidate = (e) => {
//         if (e.candidate) {
//           socket.emit("ice:send", { candidate: e.candidate, to: id });
//         }
//       };

//       // When receiving a track, set it as the stranger's video source
//       peer.ontrack = (e) => {
//         if (strangerVideoRef.current) {
//           strangerVideoRef.current.srcObject = e.streams[0];
//           strangerVideoRef.current.play();
//         }
//       };

//       // Start media capture and add tracks to the peer connection
//       navigator.mediaDevices
//         .getUserMedia({ audio: true, video: true })
//         .then((stream) => {
//           if (myVideoRef.current) {
//             myVideoRef.current.srcObject = stream;
//           }
//           stream.getTracks().forEach((track) => {
//             peer.addTrack(track, stream);
//           });
//         })
//         .catch((ex) => {
//           console.error("Media capture error:", ex);
//         });
//     });

//     // Handle SDP reply from the remote peer
//     socket.on(
//       "sdp:reply",
//       async ({ sdp }: { sdp: RTCSessionDescriptionInit; from: string }) => {
//         if (peerRef.current) {
//           try {
//             await peerRef.current.setRemoteDescription(
//               new RTCSessionDescription(sdp)
//             );
//             if (typeRef.current === "p2") {
//               const answer = await peerRef.current.createAnswer();
//               await peerRef.current.setLocalDescription(answer);
//               socket.emit("sdp:send", {
//                 sdp: peerRef.current.localDescription,
//               });
//             }
//           } catch (error) {
//             console.error("SDP reply error:", error);
//           }
//         }
//       }
//     );

//     // Handle ICE candidate reply from the remote peer
//     socket.on(
//       "ice:reply",
//       async ({
//         candidate,
//       }: {
//         candidate: RTCIceCandidateInit;
//         from: string;
//       }) => {
//         if (peerRef.current) {
//           try {
//             await peerRef.current.addIceCandidate(candidate);
//           } catch (error) {
//             console.error("ICE candidate error:", error);
//           }
//         }
//       }
//     );

//     // Receive room id from server
//     socket.on("roomId", (id: string) => {
//       setRoomId(id);
//     });

//     // Listen for incoming chat messages
//     socket.on("get-message", (input: string, senderType: string) => {
//       setMessages((prev) => [...prev, { sender: "Stranger", text: input }]);
//     });

//     // Cleanup on unmount
//     return () => {
//       socket.disconnect();
//       if (peerRef.current) {
//         peerRef.current.close();
//       }
//     };
//   }, []);

//   // Handle sending a chat message
//   const handleSendMessage = (e: FormEvent) => {
//     e.preventDefault();
//     if (!socketRef.current) return;
//     socketRef.current.emit("send-message", inputMessage, type, roomId);
//     setMessages((prev) => [...prev, { sender: "You", text: inputMessage }]);
//     setInputMessage("");
//   };

//   return (
//     <div>
//       {loading && (
//         <div className="modal">
//           <p>Loading...</p>
//         </div>
//       )}
//       <div style={{ display: "flex", gap: "1rem" }}>
//         <video
//           ref={myVideoRef}
//           autoPlay
//           muted
//           style={{ width: "300px", height: "200px" }}
//         />
//         <video
//           ref={strangerVideoRef}
//           autoPlay
//           style={{ width: "300px", height: "200px" }}
//         />
//       </div>
//       <div className="chat-holder">
//         <div className="wrapper">
//           {messages.map((msg, idx) => (
//             <div key={idx} className="msg">
//               <b>{msg.sender}: </b>
//               <span>{msg.text}</span>
//             </div>
//           ))}
//         </div>
//         <form onSubmit={handleSendMessage}>
//           <input
//             type="text"
//             value={inputMessage}
//             onChange={(e) => setInputMessage(e.target.value)}
//           />
//           <button type="submit">Send</button>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default VideoChat;
