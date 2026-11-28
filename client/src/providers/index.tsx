import { FC, ReactNode } from "react";
import { WebRTCProvider } from "./WebRTCProvider";
import { Toaster } from "sonner";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./AuthProvider";

interface Props {
  children: ReactNode;
}

const Providers: FC<Props> = ({ children }) => {
  return (
    <WebRTCProvider>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
      <Toaster
        theme="dark"
        position="top-center"
        offset={16}
        toastOptions={{
          style: {
            background: "#141518",
            border: "1px solid hsl(0 0% 100% / 0.1)",
            color: "#f5f5f7",
            borderRadius: "12px",
            boxShadow: "0 24px 64px -24px rgba(0, 0, 0, 0.9)",
            fontSize: "13px",
            padding: "10px 14px",
          },
        }}
      />
    </WebRTCProvider>
  );
};

export default Providers;
