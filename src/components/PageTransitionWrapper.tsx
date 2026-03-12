import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionWrapperProps {
  children: ReactNode;
}

const PageTransitionWrapper = ({ children }: PageTransitionWrapperProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransitionWrapper;
