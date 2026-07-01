'use client';

import React, {
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
} from 'react';
import { AnimatePresence, motion, type MotionProps } from 'framer-motion';
import { cn } from './utils';

const LIST_ITEM_TRANSITION = {
  duration: 0.14,
  ease: [0.25, 0.1, 0.25, 1] as const,
};

export function AnimatedListItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const animations: MotionProps = {
    initial: { opacity: 0, y: -6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
    transition: LIST_ITEM_TRANSITION,
  };

  return (
    <motion.div {...animations} layout className={cn('w-full max-w-full', className)}>
      {children}
    </motion.div>
  );
}

export interface AnimatedListProps extends ComponentPropsWithoutRef<'div'> {
  children: React.ReactNode;
  /** Delay between revealing each item (ms). */
  delay?: number;
}

function AnimatedListReveal({
  children,
  className,
  delay,
  ...props
}: AnimatedListProps): React.ReactElement {
  const [index, setIndex] = useState(0);
  const childrenArray = useMemo(() => React.Children.toArray(children), [children]);

  useEffect(() => {
    if (childrenArray.length === 0 || index >= childrenArray.length - 1) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIndex((prevIndex) => prevIndex + 1);
    }, delay);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [index, delay, childrenArray.length]);

  const itemsToShow = useMemo(
    () => childrenArray.slice(0, index + 1),
    [index, childrenArray],
  );

  return (
    <div className={cn('flex w-full max-w-full flex-col gap-2', className)} {...props}>
      <AnimatePresence initial={false}>
        {itemsToShow.map((item) => (
          <AnimatedListItem key={(item as React.ReactElement).key}>
            {item}
          </AnimatedListItem>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Magic UI progressive reveal — items appear one by one from the top. */
export const AnimatedList = React.memo(
  ({ children, className, delay = 50, ...props }: AnimatedListProps) => (
    <AnimatedListReveal className={className} delay={delay} {...props}>
      {children}
    </AnimatedListReveal>
  ),
);

AnimatedList.displayName = 'AnimatedList';
