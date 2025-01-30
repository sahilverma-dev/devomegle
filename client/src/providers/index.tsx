import { FC, ReactNode } from "react";
import { WebRTCProvider } from "./WebRTCProvider";
import { SocketProvider } from "./SocketProvider";
import { Toaster } from "sonner";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./AuthProvider";

interface Props {
  children: ReactNode;
}

const Providers: FC<Props> = ({ children }) => {
  return (
    <WebRTCProvider>
      <SocketProvider>
        <BrowserRouter>
          <AuthProvider>
            {children}
          </AuthProvider>
        </BrowserRouter>
        <Toaster richColors />
      </SocketProvider>
    </WebRTCProvider>
  );
};

export default Providers;
