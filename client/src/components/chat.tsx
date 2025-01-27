import { useEffect, useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { io } from "socket.io-client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "./ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";

interface ChatUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

interface Message {
  id: string;
  message: string;
  user: ChatUser;
  timestamp: Date;
}

interface ChatProps {
  roomId: string;
}

const socket = io("http://localhost:4000", {
  autoConnect: false,
});

const Chat: React.FC<ChatProps> = ({ roomId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleUserJoined = useCallback((joinedUser: ChatUser) => {
    toast.info(`${joinedUser.displayName} joined the chat`);
  }, []);

  const handleUserLeft = useCallback((leftUser: ChatUser) => {
    toast.warning(`${leftUser.displayName} left the chat`);
  }, []);

  const handleNewMessage = useCallback((message: Message) => {
    console.log({ message });
    setMessages((prev) => [...prev, message]);
  }, []);

  const handleError = useCallback((error: string) => {
    toast.error(error);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) return;

    socket.connect();
    setIsConnected(true);

    socket.emit("join", {
      user: {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      },
      roomId,
    });

    return () => {
      socket.emit("leave", { roomId });
      socket.disconnect();
      setIsConnected(false);
    };
  }, [user, roomId]);

  useEffect(() => {
    if (!isConnected) return;

    socket.on("userJoined", handleUserJoined);
    socket.on("userLeft", handleUserLeft);
    socket.on("message", handleNewMessage);
    socket.on("error", handleError);

    return () => {
      socket.off("userJoined", handleUserJoined);
      socket.off("userLeft", handleUserLeft);
      socket.off("message", handleNewMessage);
      socket.off("error", handleError);
    };
  }, [
    isConnected,
    handleUserJoined,
    handleUserLeft,
    handleNewMessage,
    handleError,
  ]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !user) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      message: inputMessage.trim(),
      user: {
        uid: user.uid,
        displayName: user?.displayName as string,
        email: user?.email as string,
        photoURL: user?.photoURL as string,
      },
      timestamp: new Date(),
    };

    const messagePayload = {
      message: newMessage.message,
      user: newMessage.user,
      roomId,
    };

    socket.emit("message", messagePayload);

    setInputMessage("");
  };

  if (!user) return <div>Please login to join the chat</div>;

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, i) => (
            <div
              key={i}
              className={`flex gap-2 ${
                message.user.uid === user.uid ? "justify-end" : ""
              }`}
            >
              {message.user.uid !== user.uid && (
                <Avatar>
                  <AvatarImage src={message.user.photoURL} />
                  <AvatarFallback>
                    {message.user.displayName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.user.uid === user.uid
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.user.uid !== user.uid && (
                  <p className="text-sm font-semibold">
                    {message.user.displayName}
                  </p>
                )}
                <p>{message.message}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form onSubmit={sendMessage} className="flex gap-2 p-4 border-t">
        <Input
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={!isConnected}
        />
        <Button type="submit" disabled={!inputMessage.trim() || !isConnected}>
          Send
        </Button>
      </form>
    </div>
  );
};

export default Chat;
