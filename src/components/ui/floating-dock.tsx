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
  /** Highlights item as a primary action (e.g. create contest). */
  emphasis?: boolean;
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
        "fixed bottom-8 left-1/2 z-50 h-16 items-end gap-4 rounded-2xl bg-muted/80 backdrop-blur-xl border border-border px-4 pb-3 -translate-x-1/2 hidden lg:flex",
        className
      )}
    >
      {items.map((item, i) => (
        <IconContainer mouseX={mouseX} key={i} {...item} />
      ))}
    </motion.div>
  );
}

function MobileDockTab({
  item,
}: {
  item: FloatingDockItem;
}) {
  const { title, icon, href, onClick, isActive, emphasis } = item;

  const content = (
    <>
      <span
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
          isActive
            ? "bg-primary/12 text-primary"
            : emphasis
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
              : "text-muted-foreground",
        )}
      >
        {icon}
        {isActive ? (
          <span
            className="absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-primary"
            aria-hidden
          />
        ) : null}
      </span>
      <span
        className={cn(
          "max-w-full truncate text-[10px] font-medium leading-none tracking-wide",
          isActive
            ? "text-primary"
            : emphasis
              ? "text-primary"
              : "text-muted-foreground",
        )}
      >
        {title}
      </span>
    </>
  );

  const className = cn(
    "flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition-colors duration-200",
    "outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
    isActive && "bg-primary/[0.04]",
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
        className={className}
        aria-current={isActive ? "page" : undefined}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(className, "cursor-pointer border-0 bg-transparent")}
      aria-pressed={isActive}
    >
      {content}
    </button>
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
    <nav
      aria-label="Nawigacja mobilna"
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-50 lg:hidden",
        className
      )}
    >
      <div
        className="pointer-events-auto border-t border-border/70 bg-card/95 shadow-[0_-6px_28px_hsl(var(--brand-navy)/0.07)] backdrop-blur-xl supports-[backdrop-filter]:bg-card/88"
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around gap-0.5 px-2 pt-1.5">
          {items.map((item, i) => (
            <MobileDockTab key={`${item.title}-${i}`} item={item} />
          ))}
        </div>
      </div>
    </nav>
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
