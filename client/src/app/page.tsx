import App from "@/components/app";
import { SocketProvider } from "@/components/providers/socket-provider";
import { WebRTCProvider } from "@/components/providers/webrtc-provider";
import { AnimatePresence } from "motion/react";

const Home = () => {
  return (
    <SocketProvider>
      <WebRTCProvider>
        <AnimatePresence>
          <App />
        </AnimatePresence>
      </WebRTCProvider>
    </SocketProvider>
  );
};

export default Home;
