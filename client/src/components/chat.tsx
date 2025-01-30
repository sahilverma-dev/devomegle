

import { useAuth, useSocket, useWebRTC } from "@/hooks";
import { AnimatePresence, motion } from 'framer-motion'

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";
import { User } from "firebase/auth";
import { CameraIcon, MicIcon } from "lucide-react";

interface Props {
    roomId: string,
    stranger?: User,
    isConnected?: boolean,
    isSearching?: boolean,
    onLeave?: () => void,
    onLeft?: () => void,

    onNext?: () => void
    onConnet?: () => void
}



const Chat: React.FC<Props> = ({ roomId, onConnet, onLeft, isSearching, stranger }) => {


    const { user: authUser } = useAuth()


    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(
        null
    );
    const [remoteMediaStream, setRemoteMediaStream] = useState(new MediaStream());

    const { socket } = useSocket();
    const { peer, createOffer, createAnswer, setRemoteAnswer, addLocalTrack } =
        useWebRTC();

    const user = useMemo(() => ({
        uid: authUser?.uid,
        email: authUser?.email,
        displayName: authUser?.displayName,
        photoURL: authUser?.photoURL,
    }), [authUser])

    // handling events
    const handleJoin = useCallback(
        async ({ user: otherUser }: { user: User }) => {
            const offer = await createOffer();
            console.log(`offer created for ${otherUser.displayName}`, offer);
            toast.success(`${otherUser.displayName} joined the room`);

            socket?.emit("offer", {
                offer,
                userTo: otherUser,
                userBy: user,
                roomId,
            });
        },
        [createOffer, roomId, socket, user]
    );
    const handleLeave = useCallback(async ({ user }: { user: User }) => {
        console.log(`${user.displayName} left the room`);

        // removing the stream
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = new MediaStream();
        }
        if (onLeft) {
            onLeft()
        }

        toast.error(`${user.displayName} left the room`);
    }, [onLeft]);
    const handleOffer = useCallback(
        async ({
            userBy: otherUser,
            offer,
        }: {
            userBy: User;
            offer: RTCSessionDescription;
        }) => {
            console.log(`got the offer from ${otherUser.displayName}`, offer);

            const answer = await createAnswer(offer);
            console.log(`created answer for ${otherUser.displayName}`, answer);
            socket?.emit("answer", {
                answer,
                userTo: otherUser,
                userBy: user,
                roomId,
            });
        },
        [createAnswer, roomId, socket, user]
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
            console.log(`got the ice candidate from ${userBy.displayName}`);
            peer.addIceCandidate(candidate);
        },
        [peer]
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
                    addLocalTrack(media);
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
        peer.ontrack = (event) => {
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

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                // Send the ICE candidate to the other peer
                socket?.emit("ice-candidate", {
                    userBy: user,
                    candidate: event.candidate,
                    roomId,
                });
            }
        };
        peer.onconnectionstatechange = () => {
            if (peer.connectionState === "connected") {

                if (onConnet) { onConnet() }
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
    }, [handleAnswer, handleICECandidates, handleJoin, handleLeave, handleOffer, localMediaStream, onConnet, peer, remoteMediaStream, roomId, socket, user]);

    return (
        <div className=" min-h-screen overflow-hidden w-full bg-neutral-900">

            <div className="max-w-6xl w-full mx-auto h-screen flex flex-col">
                {/* Video Chat Container */}
                <div className="flex-1 p-4 w-full flex flex-col md:flex-row items-center justify-center gap-4">
                    {/* Local Video */}
                    <AnimatePresence>
                        <>
                            {isSearching && <motion.div
                                initial={{
                                    opacity: 0
                                }}
                                animate={{
                                    opacity: 1
                                }}
                                exit={{
                                    opacity: 0
                                }}
                                className="fixed top-4 left-1/2 -translate-x-1/2 bg-white p-4 rounded-full z-20"
                            >
                                Looking for stranger
                            </motion.div>}
                            <motion.div
                                initial={{
                                    opacity: 0
                                }}
                                animate={{
                                    opacity: 1
                                }}
                                exit={{
                                    opacity: 0
                                }}
                                layout
                                className="relative bg-neutral-800 rounded-xl overflow-hidden w-full aspect-square md:aspect-video">

                                <video
                                    id="localVideo"
                                    ref={localVideoRef}
                                    className="w-full h-full object-cover"
                                    autoPlay
                                    muted
                                    playsInline
                                />
                                <div className="absolute bottom-4 left-4 bg-neutral-900/80 px-3 py-1 rounded-lg text-white text-sm flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                                    You
                                </div>

                            </motion.div>
                            {/* Remote Video */}

                            <motion.div
                                initial={{
                                    opacity: 0
                                }}
                                animate={{
                                    opacity: 1
                                }}
                                exit={{
                                    opacity: 0
                                }}
                                layout className="relative bg-neutral-800 rounded-xl overflow-hidden w-full aspect-square md:aspect-video">
                                <video
                                    id="remoteVideo"
                                    ref={remoteVideoRef}
                                    className="w-full h-full object-cover"
                                    autoPlay
                                    playsInline
                                />
                                <div className="absolute bottom-4 left-4 bg-neutral-900/80 px-3 py-1 rounded-lg text-white text-sm flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                                    {stranger?.displayName ? stranger.displayName : 'Stranger'}
                                </div>

                            </motion.div>
                        </>

                    </AnimatePresence>
                </div>
                {/* Controls */}
                <div className="mt-4 p-4 w-full bg-neutral-800 rounded-xl">
                    <div className="flex flex-row items-center justify-between gap-4">
                        {/* Left Controls */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    toast.info("To be implemeted 😢")
                                }}
                                className="p-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white transition-colors">
                                <MicIcon />
                            </button>
                            <button
                                onClick={() => {
                                    toast.info("To be implemeted 😢")
                                }} className="p-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white transition-colors">

                                <CameraIcon />
                            </button>
                        </div>
                        {/* Center Controls */}
                        <div className="flex items-center gap-4">
                            <button

                                onClick={() => {
                                    toast.info("To be implemeted 😢")
                                }}

                                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors">
                                End Chat
                            </button>
                            <button
                                onClick={() => {
                                    toast.info("To be implemeted 😢")
                                }}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors">
                                Next Person
                            </button>
                        </div>

                    </div>
                </div>
            </div>

        </div>

    );
};

export default Chat;
