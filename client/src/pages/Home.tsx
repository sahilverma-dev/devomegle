
import Chat from "@/components/chat";
import Lobby from "@/components/lobby";
import MafiModal from "@/components/modals/mafi-modal";


import { useAuth } from "@/hooks";




import { useMatchmaking } from "@/hooks/useMatchMaking";
import { User } from "firebase/auth";




const Home = () => {
  const { user, } = useAuth()
  // const [roomId, setRoomId] = useState<string | null>(null)

  const {
    isConnected,
    isSearching,
    roomState,
    roomId,
    start,
    leaveRoom
  } = useMatchmaking(user)

  return (
    <>

      {
        !roomId &&

        <Lobby onStart={start} />
      }



      {
        roomId && <Chat roomId={roomId}
          onNext={start}
          isConnected={isConnected}
          isSearching={isSearching}
          stranger={roomState?.stranger as User}
          onLeave={() => {
            leaveRoom()
          }}
          onLeft={() => {
            leaveRoom()
          }}
        />
      }

      <MafiModal />

    </>
  );
};

export default Home;
