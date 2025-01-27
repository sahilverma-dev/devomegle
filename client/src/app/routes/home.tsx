// import { Avatar, AvatarImage } from "@/components/ui/avatar";
// import { Button } from "@/components/ui/button";

// import { useAuth } from "@/hooks/useAuth";
// import { cn } from "@/lib/utils";
// import { AvatarFallback } from "@radix-ui/react-avatar";
// import { User } from "firebase/auth";
// import { useEffect, useRef } from "react";
// import { io } from "socket.io-client";
// import { toast } from "sonner";

// const socket = io("http://localhost:4000", {
//   reconnection: false,
// });

// const peer = new RTCPeerConnection({
//   iceServers: [
//     {
//       urls: [
//         "stun:stun.l.google.com:19302",
//         "stun:global.stun.twilio.com:3478",
//       ],
//     },
//   ],
// });

// const createOffer = async () => {
//   try {
//     const offer = await peer.createOffer({
//       offerToReceiveAudio: true,
//       offerToReceiveVideo: true,
//     });

//     await peer.setLocalDescription(offer);
//     return offer;
//   } catch (error) {
//     console.log(error);
//     toast.error("eror");
//   }
// };

// const Home = () => {
//   const { user } = useAuth();

//   const localVideoRef = useRef<HTMLVideoElement>(null);
//   const remoteVideoRef = useRef<HTMLVideoElement>(null);

//   const handleMessage = (message: string) => {
//     console.log(message);
//   };

//   const handleJoin = async (user: User) => {
//     const offer = await createOffer();
//     console.log("Offer created", {
//       offer,
//     });
//     socket.emit("offer", offer);
//     toast.success(`${user?.displayName} Joined`);
//   };

//   const handleOffer = async (offer: RTCSessionDescription) => {};

//   useEffect(() => {
//     const getUserLocalMediaStream = async () => {
//       try {
//         const media = await navigator.mediaDevices.getUserMedia({
//           audio: true,
//           video: true,
//         });

//         if (localVideoRef.current && media) {
//           localVideoRef.current.srcObject = media;
//           // addLocalTrack(media);
//         }
//       } catch (error) {
//         console.log(error);
//         toast.error("Camera chahiye");
//       }
//     };
//     getUserLocalMediaStream();
//   }, []);

//   useEffect(() => {
//     socket.on("message", handleMessage);
//     socket.on("join", handleJoin);

//     return () => {
//       socket.off("message", handleMessage);
//       socket.off("join", handleJoin);
//     };
//   }, []);
//   return (
//     <div className="h-dvh ">
//       <div className="flex border-b p-4 w-full items-center justify-between">
//         <h1 className="font-bold">Room</h1>
//         <div className="flex items-center gap-2">
//           <b>Hello, {user?.displayName}</b>
//           <Avatar className="border">
//             <AvatarImage src={user?.photoURL as string} />
//             <AvatarFallback>
//               {user?.displayName?.split(" ").join("")}
//             </AvatarFallback>
//           </Avatar>
//         </div>
//       </div>

//       <div className="p-4 h-full space-y-2">
//         {/* <Button
//           onClick={() => {
//             socket?.emit("join", { roomId, user });
//           }}
//         >
//           Join the room
//         </Button> */}
//         <div
//           className="w-full h-full md:h-auto gap-4 flex  md:flex-row "
//           // className="w-full grid gap-4 grid-cols-2 lg:grid-cols-3"
//         >
//           <div className="w-full flex items-center gap-4 flex-col h-full md:h-auto border rounded-xl aspect-video overflow-hidden">
//             <video
//               ref={localVideoRef}
//               controls={false}
//               autoPlay
//               muted
//               className=" w-full h-full object-cover"
//             />
//           </div>

//           <div
//             className={cn([
//               "w-full flex items-center gap-4 flex-col h-full border rounded-xl aspect-video overflow-hidden",
//               // !isPeerConnected && "hidden",
//             ])}
//           >
//             <video
//               ref={remoteVideoRef}
//               controls={false}
//               autoPlay
//               className=" w-full h-full object-cover"
//             />
//           </div>
//         </div>
//         <div className="flex gap-2">
//           <Button
//             onClick={() => {
//               socket.emit("join", user);
//             }}
//           >
//             Join
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// };
// export default Home;

const HomeRoute = () => {
  return <div></div>;
};

export default HomeRoute;
