'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useSyncExternalStore, type ReactNode } from 'react';

const emptySubscribe = () => () => {};
const EASE = [0.22, 1, 0.36, 1] as const;

interface MarketingRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function MarketingReveal({
  children,
  className,
  delay = 0,
}: MarketingRevealProps) {
  const reduceMotion = useReducedMotion();
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (!isClient || reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

interface MarketingStaggerProps {
  children: ReactNode;
  className?: string;
}

export function MarketingStagger({ children, className }: MarketingStaggerProps) {
  const reduceMotion = useReducedMotion();
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (!isClient || reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.08 } },
      }}
    >
      {children}
    </motion.div>
  );
}

interface MarketingStaggerItemProps {
  children: ReactNode;
  className?: string;
  hoverLift?: boolean;
}

export function MarketingStaggerItem({
  children,
  className,
  hoverLift = false,
}: MarketingStaggerItemProps) {
  const reduceMotion = useReducedMotion();
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (!isClient || reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.45, ease: EASE },
        },
      }}
      whileHover={
        hoverLift ? { y: -4, transition: { duration: 0.2 } } : undefined
      }
    >
      {children}
    </motion.div>
  );
}
