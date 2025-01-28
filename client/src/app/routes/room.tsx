// // import Chats from "@/components/chat";
// import { useAuth } from "@/hooks/useAuth";

// import { useParams } from "react-router";

// const Room = () => {
//   const { id } = useParams<{ id: string }>();
//   const { user } = useAuth();

//   return (
//     <div>
//       <div className="flex items-center justify-between p-4 border-b">
//         <p>Chat</p>
//         <div className="flex">
//           <img
//             src={user?.photoURL as string}
//             className="h-8 w-8 rounded-full object-cover"
//           />
//         </div>
//       </div>

//       {/* <Chats roomId={id as string} /> */}
//     </div>
//   );
// };
// export default Room;


import React from 'react'

const RoomRoute = () => {
  return (
    <div>RoomRoute</div>
  )
}

export default RoomRoute