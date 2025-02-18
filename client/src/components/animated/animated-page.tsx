"use client";

import { cn } from "@/lib/utils";
import { motion, Variants } from "motion/react";

export const pageVariants: Variants = {
  initial: {
    x: 100,
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
  },
  exit: {
    x: 100,
    opacity: 0,
  },
};

const AnimatedPage = ({
  className,
  children,
}: React.PropsWithChildren & {
  className?: string;
}) => {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit={"exit"}
      transition={{
        duration: 0.2,
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedPage;
