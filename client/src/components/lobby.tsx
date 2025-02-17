"use client";

import { FaCamera } from "react-icons/fa";

interface Props {
  onStart?: () => void;
}

const Lobby: React.FC<Props> = ({ onStart = () => {} }) => {
  return (
    <div className="min-h-screen flex items-center justify-between p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Start Chatting</h2>
          <p className="text-gray-600">Choose your preferred way to connect</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Video Chat Option */}
          <div className="relative border bg-white/5 rounded-xl p-6 hover:border-blue-500 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold ">Video Chat</h3>
              <FaCamera className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-gray-600 mb-4">
              Connect face-to-face with random developers worldwide
            </p>
            <button
              onClick={onStart}
              className="w-full py-2 px-4 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Video Chat
            </button>
          </div>
          {/* Text Chat Option */}
          <div className=" border bg-white/5 rounded-xl p-6  transition-all ">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold ">Text Chat</h3>
              <div className="bg-yellow-500/70 text-white  top-2 right-2 rounded-full py-1 px-2.5 text-xs">
                Under development
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Have text conversations with stranger developers
            </p>
            <button
              disabled
              className="w-full py-2 px-4 bg-blue-600/50 cursor-not-allowed rounded-lg  transition-colors"
            >
              Start Text Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
