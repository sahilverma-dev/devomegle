"use client";

import OnlineUsers from "./online-user-couner";
import AnimatedPage from "./animated/animated-page";
import AnimationContainer from "./animated/animated-container";

import { motion } from "motion/react";

interface Props {
  onVideoChatStart?: () => void;
  onTextChatStart?: () => void;
  onChangeInterest?: () => void;
  onFindNextMatch?: () => void;
}

const Lobby: React.FC<Props> = ({
  onTextChatStart = () => {},
  onVideoChatStart = () => {},
  onChangeInterest = () => {},
}) => {
  return (
    <AnimatedPage className="min-h-screen flex items-center justify-center">
      <div className="max-w-6xl mx-auto">
        <AnimationContainer customDelay={0.2} className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">DevOmegle</h2>
          <OnlineUsers />
        </AnimationContainer>
        <AnimationContainer
          customDelay={0.4}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
        >
          {/* Video Chat Option */}
          <div className="glass-panel border border-neutral-700 rounded-xl p-6 hover:border-blue-500 transition-all duration-300">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Video Chat</h3>
              <p className="text-neutral-400">
                Face-to-face coding discussions with screen sharing
              </p>
              <button
                onClick={onVideoChatStart}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Start Video Chat
              </button>
            </div>
          </div>
          {/* Text Chat Option */}
          <div className="glass-panel border border-neutral-700 rounded-xl p-6 hover:border-blue-500 transition-all duration-300">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Text Chat</h3>
              <p className="text-neutral-400">
                Quick code discussions and problem-solving
              </p>
              <button
                onClick={onTextChatStart}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Start Text Chat
              </button>
            </div>
          </div>
        </AnimationContainer>
        <AnimationContainer customDelay={0.6} className="mt-12 text-center">
          <p className="text-neutral-400 mb-6">Your selected interests</p>
          <motion.div
            transition={{
              transition: {
                staggerChildren: 0.3,
              },
            }}
            className="inline-flex flex-wrap justify-center gap-2 mb-4"
          >
            {["Javascript", "Python", "React", "+3 more"].map((item, index) => (
              <motion.span
                key={index}
                initial={{ x: 10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 10, opacity: 0 }}
                className="px-3 py-1 bg-neutral-800 rounded-full text-sm text-neutral-400"
              >
                {item}
              </motion.span>
            ))}
          </motion.div>
          <button
            onClick={onChangeInterest}
            className="block text-blue-400 hover:text-blue-200 mx-auto"
          >
            Change Interests
          </button>
        </AnimationContainer>
      </div>
    </AnimatedPage>
  );
};

export default Lobby;
