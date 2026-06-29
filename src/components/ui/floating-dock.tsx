"use client";

import React from "react";
import { motion, useMotionValue, useSpring, useTransform, MotionValue } from "framer-motion";
import { cn } from "./utils";
import Link from "next/link";

export interface FloatingDockItem {
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
}

interface FloatingDockProps {
  items: FloatingDockItem[];
  desktopClassName?: string;
  mobileClassName?: string;
}

export function FloatingDock({
  items,
  desktopClassName,
  mobileClassName,
}: FloatingDockProps) {
  return (
    <>
      <FloatingDockDesktop
        items={items}
        className={desktopClassName}
      />
      <FloatingDockMobile
        items={items}
        className={mobileClassName}
      />
    </>
  );
}

function FloatingDockDesktop({
  items,
  className,
}: {
  items: FloatingDockItem[];
  className?: string;
}) {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "fixed bottom-8 left-1/2 z-50 h-16 items-end gap-4 rounded-2xl bg-muted/80 backdrop-blur-xl border border-border px-4 pb-3 -translate-x-1/2 hidden md:flex",
        className
      )}
    >
      {items.map((item, i) => (
        <IconContainer mouseX={mouseX} key={i} {...item} />
      ))}
    </motion.div>
  );
}

function FloatingDockMobile({
  items,
  className,
}: {
  items: FloatingDockItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-card border-t border-border rounded-t-2xl px-4 py-2 md:hidden",
        className
      )}
    >
      {items.map((item, i) => {
        const isActive = item.isActive ?? false;
        const content = (
          <div className="flex flex-col items-center justify-center gap-1 min-h-[60px]">
            {/* Icon with active state background blob */}
            <div className={cn(
              "flex items-center justify-center rounded-full transition-colors",
              isActive ? "bg-primary/10 p-2" : "p-2"
            )}>
              <div className={cn(
                "flex items-center justify-center w-6 h-6",
                isActive ? "text-primary" : "text-gray-700"
              )}>
                {item.icon}
              </div>
            </div>
            {/* Text label with active state styling */}
            <span className={cn(
              "text-xs text-center",
              isActive 
                ? "text-primary ring-1 ring-primary/20 rounded px-1.5 py-0.5" 
                : "text-gray-700"
            )}>
              {item.title}
            </span>
          </div>
        );

        if (item.href) {
          return (
            <Link
              key={i}
              href={item.href}
              onClick={(e) => {
                if (item.onClick) {
                  e.preventDefault();
                  item.onClick();
                }
              }}
              className="flex-1"
            >
              {content}
            </Link>
          );
        }

        return (
          <div
            key={i}
            onClick={item.onClick}
            className="flex-1 cursor-pointer"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

function IconContainer({
  mouseX,
  title,
  icon,
  href,
  onClick,
}: {
  mouseX: MotionValue<number>;
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };

    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const scaleTransform = useTransform(distance, [-150, 0, 150], [1, 1.5, 1]);
  const scale = useSpring(scaleTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const opacityTransform = useTransform(distance, [-150, 0, 150], [0.5, 1, 0.5]);
  const opacity = useSpring(opacityTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const content = (
    <motion.div
      ref={ref}
      style={{
        width,
        scale,
        opacity,
      }}
      className="relative flex aspect-square items-center justify-center rounded-xl bg-background/50 hover:bg-accent transition-colors"
    >
      <div className="flex items-center justify-center text-foreground">
        {icon}
      </div>
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
        {title}
      </div>
    </motion.div>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={(e) => {
          if (onClick) {
            e.preventDefault();
            onClick();
          }
        }}
        className="group"
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer"
    >
      {content}
    </div>
  );
}

