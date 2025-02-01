/* eslint-disable react-refresh/only-export-components */
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export type MediaMode = "video" | "text";

export interface ChatMessage {
  id: string;
  text: string;
  from: "me" | "them";
  timestamp: number;
}

interface WebRTCContextValue {
  peer: React.MutableRefObject<RTCPeerConnection | null>;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  dataChannel: RTCDataChannel | null;
  messages: ChatMessage[];
  mode: MediaMode;
  isPeerConnected: boolean;
  isDataChannelOpen: boolean;
  connectionState: RTCPeerConnectionState | null;
  isLocalMicActive: boolean;
  isLocalVideoActive: boolean;
  isRemoteMicActive: boolean;
  isRemoteVideoActive: boolean;
  prepareMedia: (mode: MediaMode) => Promise<MediaStream | null>;
  stopMedia: () => void;
  createNewPeerConnection: (offerer: boolean) => RTCPeerConnection;
  resetPeerConnection: (options?: { stopMedia?: boolean }) => void;
  createOffer: () => Promise<RTCSessionDescriptionInit | null>;
  createAnswer: (
    offer: RTCSessionDescriptionInit
  ) => Promise<RTCSessionDescriptionInit | null>;
  setRemoteOffer: (offer: RTCSessionDescriptionInit) => Promise<void>;
  setRemoteAnswer: (answer: RTCSessionDescriptionInit) => Promise<void>;
  addRemoteCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  setOnIceCandidate: (
    handler: ((candidate: RTCIceCandidate) => void) | null
  ) => void;
  toggleLocalMic: () => void;
  toggleLocalVideo: () => void;
  sendChatMessage: (text: string) => void;
  clearChat: () => void;
}

export const WebRTCContext = createContext<WebRTCContextValue | null>(null);

const rtcConfiguration: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:global.stun.twilio.com:3478",
      ],
    },
  ],
};

const stopStream = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => {
    track.enabled = false;
    track.stop();
  });
};

export const WebRTCProvider = ({ children }: PropsWithChildren) => {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescriptionSetRef = useRef(false);
  const onIceCandidateRef = useRef<
    ((candidate: RTCIceCandidate) => void) | null
  >(null);
  const micActiveRef = useRef(true);
  const videoActiveRef = useRef(true);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<MediaMode>("video");
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [isDataChannelOpen, setIsDataChannelOpen] = useState(false);
  const [connectionState, setConnectionState] =
    useState<RTCPeerConnectionState | null>(null);
  const [isLocalMicActive, setIsLocalMicActive] = useState(true);
  const [isLocalVideoActive, setIsLocalVideoActive] = useState(true);
  const [isRemoteMicActive, setIsRemoteMicActive] = useState(true);
  const [isRemoteVideoActive, setIsRemoteVideoActive] = useState(true);

  const sendControlState = useCallback(() => {
    const channel = dataChannelRef.current;
    if (channel?.readyState !== "open") return;

    channel.send(
      JSON.stringify({
        type: "control",
        mic: micActiveRef.current,
        video: videoActiveRef.current,
      })
    );
  }, []);

  const handleChannelMessage = useCallback((event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data) as {
        type?: string;
        id?: string;
        text?: string;
        mic?: boolean;
        video?: boolean;
      };

      if (payload.type === "chat" && typeof payload.text === "string") {
        const text = payload.text;
        const id = payload.id ?? crypto.randomUUID();

        setMessages((current) => [
          ...current,
          { id, text, from: "them", timestamp: Date.now() },
        ]);
      }

      if (payload.type === "control") {
        if (typeof payload.mic === "boolean") setIsRemoteMicActive(payload.mic);
        if (typeof payload.video === "boolean")
          setIsRemoteVideoActive(payload.video);
      }
    } catch {
      // Ignore malformed data channel messages.
    }
  }, []);

  const setupDataChannel = useCallback(
    (channel: RTCDataChannel) => {
      channel.onopen = () => {
        setIsDataChannelOpen(true);
        sendControlState();
      };
      channel.onclose = () => setIsDataChannelOpen(false);
      channel.onmessage = handleChannelMessage;

      dataChannelRef.current = channel;
      setDataChannel(channel);
    },
    [handleChannelMessage, sendControlState]
  );

  const prepareMedia = useCallback(async (nextMode: MediaMode) => {
    if (nextMode === "text") {
      stopStream(localStreamRef.current);
      localStreamRef.current = null;
      setLocalStream(null);
      setMode("text");
      return null;
    }

    const current = localStreamRef.current;
    const hasLiveTracks =
      current?.getTracks().some((track) => track.readyState === "live") ?? false;

    if (current && hasLiveTracks) {
      setMode("video");
      setLocalStream(current);
      return current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    localStreamRef.current = stream;
    micActiveRef.current = stream.getAudioTracks().every((track) => track.enabled);
    videoActiveRef.current = stream
      .getVideoTracks()
      .every((track) => track.enabled);
    setIsLocalMicActive(micActiveRef.current);
    setIsLocalVideoActive(videoActiveRef.current);
    setLocalStream(stream);
    setMode("video");

    return stream;
  }, []);

  const stopMedia = useCallback(() => {
    stopStream(localStreamRef.current);
    localStreamRef.current = null;
    setLocalStream(null);
  }, []);

  const clearChat = useCallback(() => setMessages([]), []);

  const resetPeerConnection = useCallback(
    (options?: { stopMedia?: boolean }) => {
      const peer = peerRef.current;
      if (peer) {
        peer.onicecandidate = null;
        peer.ontrack = null;
        peer.ondatachannel = null;
        peer.onconnectionstatechange = null;
        try {
          peer.getSenders().forEach((sender) => {
            try {
              peer.removeTrack(sender);
            } catch {
              // Sender already detached.
            }
          });
          peer.close();
        } catch {
          // Peer was already closed.
        }
      }

      try {
        dataChannelRef.current?.close();
      } catch {
        // Channel was already closed.
      }

      peerRef.current = null;
      dataChannelRef.current = null;
      pendingCandidatesRef.current = [];
      remoteDescriptionSetRef.current = false;

      setDataChannel(null);
      setIsDataChannelOpen(false);
      setRemoteStream(null);
      setMessages([]);
      setIsPeerConnected(false);
      setConnectionState(null);
      setIsRemoteMicActive(true);
      setIsRemoteVideoActive(true);

      if (options?.stopMedia) {
        stopMedia();
      }
    },
    [stopMedia]
  );

  const flushPendingCandidates = useCallback(async () => {
    const peer = peerRef.current;
    if (!peer) return;

    const queued = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];

    for (const candidate of queued) {
      try {
        await peer.addIceCandidate(candidate);
      } catch (error) {
        console.error("Failed to add queued ICE candidate", error);
      }
    }
  }, []);

  const createNewPeerConnection = useCallback(
    (offerer: boolean) => {
      resetPeerConnection();

      const peer = new RTCPeerConnection(rtcConfiguration);
      peerRef.current = peer;

      const stream = localStreamRef.current;
      stream?.getTracks().forEach((track) => peer.addTrack(track, stream));

      if (offerer) {
        setupDataChannel(
          peer.createDataChannel("chat", {
            ordered: true,
            maxRetransmits: 3,
          })
        );
      } else {
        peer.ondatachannel = (event) => setupDataChannel(event.channel);
      }

      peer.ontrack = (event) => {
        const [stream] = event.streams;
        setRemoteStream(stream ?? new MediaStream([event.track]));
      };

      peer.onconnectionstatechange = () => {
        setConnectionState(peer.connectionState);
        setIsPeerConnected(peer.connectionState === "connected");
      };

      peer.onicecandidate = (event) => {
        if (event.candidate) onIceCandidateRef.current?.(event.candidate);
      };

      return peer;
    },
    [resetPeerConnection, setupDataChannel]
  );

  const createOffer = useCallback(async () => {
    const peer = peerRef.current;
    if (!peer) return null;

    const offer = await peer.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await peer.setLocalDescription(offer);
    return offer;
  }, []);

  const setRemoteOffer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      const peer = peerRef.current;
      if (!peer) return;

      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      remoteDescriptionSetRef.current = true;
      await flushPendingCandidates();
    },
    [flushPendingCandidates]
  );

  const createAnswer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      const peer = peerRef.current;
      if (!peer) return null;

      await setRemoteOffer(offer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      return answer;
    },
    [setRemoteOffer]
  );

  const setRemoteAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit) => {
      const peer = peerRef.current;
      if (!peer) return;

      await peer.setRemoteDescription(new RTCSessionDescription(answer));
      remoteDescriptionSetRef.current = true;
      await flushPendingCandidates();
    },
    [flushPendingCandidates]
  );

  const addRemoteCandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      const peer = peerRef.current;
      if (!peer) return;

      if (!remoteDescriptionSetRef.current) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }

      try {
        await peer.addIceCandidate(candidate);
      } catch (error) {
        console.error("Failed to add ICE candidate", error);
      }
    },
    []
  );

  const setOnIceCandidate = useCallback(
    (handler: ((candidate: RTCIceCandidate) => void) | null) => {
      onIceCandidateRef.current = handler;
    },
    []
  );

  const toggleLocalMic = useCallback(() => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? [];
    if (tracks.length === 0) return;

    const enabled = !micActiveRef.current;
    tracks.forEach((track) => {
      track.enabled = enabled;
    });
    micActiveRef.current = enabled;
    setIsLocalMicActive(enabled);
    sendControlState();
  }, [sendControlState]);

  const toggleLocalVideo = useCallback(() => {
    const tracks = localStreamRef.current?.getVideoTracks() ?? [];
    if (tracks.length === 0) return;

    const enabled = !videoActiveRef.current;
    tracks.forEach((track) => {
      track.enabled = enabled;
    });
    videoActiveRef.current = enabled;
    setIsLocalVideoActive(enabled);
    sendControlState();
  }, [sendControlState]);

  const sendChatMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const id = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id, text: trimmed, from: "me", timestamp: Date.now() },
    ]);

    const channel = dataChannelRef.current;
    if (channel?.readyState === "open") {
      channel.send(JSON.stringify({ type: "chat", id, text: trimmed }));
    }
  }, []);

  useEffect(
    () => () => {
      resetPeerConnection({ stopMedia: true });
    },
    [resetPeerConnection]
  );

  return (
    <WebRTCContext.Provider
      value={{
        peer: peerRef,
        localStream,
        remoteStream,
        dataChannel,
        messages,
        mode,
        isPeerConnected,
        isDataChannelOpen,
        connectionState,
        isLocalMicActive,
        isLocalVideoActive,
        isRemoteMicActive,
        isRemoteVideoActive,
        prepareMedia,
        stopMedia,
        createNewPeerConnection,
        resetPeerConnection,
        createOffer,
        createAnswer,
        setRemoteOffer,
        setRemoteAnswer,
        addRemoteCandidate,
        setOnIceCandidate,
        toggleLocalMic,
        toggleLocalVideo,
        sendChatMessage,
        clearChat,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
};
