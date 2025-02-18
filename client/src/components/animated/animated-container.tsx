"use client";

import { motion } from "framer-motion"; // Corrected import statement

interface AnimationContainerProps {
  children: React.ReactNode;
  className?: string;
  customDelay?: number;
  direction?: "left" | "right" | "top" | "bottom"; // Added direction prop
  distance?: number; // Added distance prop to control how far the element moves
  once?: boolean; // Added once prop to control if the animation happens only once
}

const AnimationContainer: React.FC<AnimationContainerProps> = ({
  children,
  className,
  customDelay = 0.2,
  direction = "bottom", // Default direction is bottom
  distance = 20, // Default distance is 20px
  once = false, // Default is false, meaning the animation can trigger multiple times
}) => {
  // Determine the initial position based on the direction
  const getInitialPosition = () => {
    switch (direction) {
      case "left":
        return { opacity: 0, x: -distance };
      case "right":
        return { opacity: 0, x: distance };
      case "top":
        return { opacity: 0, y: -distance };
      case "bottom":
      default:
        return { opacity: 0, y: distance };
    }
  };

  return (
    <motion.div
      className={className}
      layout
      initial={getInitialPosition()} // Set initial position based on direction
      whileInView={{ opacity: 1, x: 0, y: 0 }} // Animate to the center
      viewport={{ once }} // Control if the animation happens only once
      transition={{
        delay: customDelay,
        duration: 0.2, // Slightly longer duration for smoother animation
        ease: "easeInOut",
        type: "spring",
        stiffness: 100, // Adjusted stiffness for a softer spring
        damping: 20,
      }}
    >
      {children}
    </motion.div>
  );
};

export default AnimationContainer;
