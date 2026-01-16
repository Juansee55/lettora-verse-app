import { ReactNode } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";

type AnimationType = 'slide' | 'fade' | 'flip' | 'none';

interface PageTransitionProps {
  children: ReactNode;
  pageKey: string;
  animation: AnimationType;
  direction: 'next' | 'prev';
}

const slideVariants: Variants = {
  enter: (direction: string) => ({
    x: direction === 'next' ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: (direction: string) => ({
    x: direction === 'next' ? '-100%' : '100%',
    opacity: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  }),
};

const fadeVariants: Variants = {
  enter: {
    opacity: 0,
    scale: 0.98,
  },
  center: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    scale: 1.02,
    transition: {
      duration: 0.3,
      ease: 'easeIn',
    },
  },
};

const flipVariants: Variants = {
  enter: (direction: string) => ({
    rotateY: direction === 'next' ? 90 : -90,
    opacity: 0,
    transformOrigin: direction === 'next' ? 'left center' : 'right center',
  }),
  center: {
    rotateY: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 25,
    },
  },
  exit: (direction: string) => ({
    rotateY: direction === 'next' ? -90 : 90,
    opacity: 0,
    transformOrigin: direction === 'next' ? 'right center' : 'left center',
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 25,
    },
  }),
};

const noneVariants: Variants = {
  enter: { opacity: 1 },
  center: { opacity: 1 },
  exit: { opacity: 1 },
};

const getVariants = (animation: AnimationType): Variants => {
  switch (animation) {
    case 'slide':
      return slideVariants;
    case 'fade':
      return fadeVariants;
    case 'flip':
      return flipVariants;
    case 'none':
    default:
      return noneVariants;
  }
};

export const PageTransition = ({
  children,
  pageKey,
  animation,
  direction,
}: PageTransitionProps) => {
  const variants = getVariants(animation);

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={pageKey}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        style={{ perspective: animation === 'flip' ? 1000 : undefined }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
