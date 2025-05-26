import { SocketProvider } from "./socket-provider";

const Providers = ({ children }: React.PropsWithChildren) => {
  return <SocketProvider>{children}</SocketProvider>;
};

export default Providers;
