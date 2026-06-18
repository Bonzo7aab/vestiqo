"use client";
 
import * as React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  motion,
  MotionValue,
  animate,
  useMotionValue,
  useSpring,
  useTransform,
  HTMLMotionProps,
} from "framer-motion";
import { cn } from "./utils";
 
type MotionDivProps = HTMLMotionProps<"div">;
 
export type HoverStyle =
  | "default"
  | "subtle"
  | "dramatic"
  | "smooth"
  | "bouncy"
  | "elastic"
  | "quick"
  | "lazy"
  | "slide"
  | "magnetic"
  | "float"
  | "ripple"
  | "groove"
  | "wave"
  | "orbit"
  | "pulse";
 
const hoverPresets: Record<
  HoverStyle,
  {
    scale: number;
    distance: number;
    nudge: number;
    spring: { mass: number; stiffness: number; damping: number };
  }
> = {
  default: {
    scale: 2.25,
    distance: 110,
    nudge: 40,
    spring: {
      mass: 0.1,
      stiffness: 170,
      damping: 12,
    },
  },
  subtle: {
    scale: 1.8,
    distance: 150,
    nudge: 15,
    spring: {
      mass: 0.05,
      stiffness: 500,
      damping: 25,
    },
  },
  dramatic: {
    scale: 3.5,
    distance: 180,
    nudge: 80,
    spring: {
      mass: 0.5,
      stiffness: 200,
      damping: 3,
    },
  },
  smooth: {
    scale: 2.5,
    distance: 200,
    nudge: 60,
    spring: {
      mass: 1,
      stiffness: 80,
      damping: 30,
    },
  },
  bouncy: {
    scale: 2.8,
    distance: 140,
    nudge: 55,
    spring: {
      mass: 0.2,
      stiffness: 400,
      damping: 4,
    },
  },
  elastic: {
    scale: 2.6,
    distance: 160,
    nudge: 70,
    spring: {
      mass: 0.05,
      stiffness: 800,
      damping: 2,
    },
  },
  quick: {
    scale: 2.2,
    distance: 120,
    nudge: 45,
    spring: {
      mass: 0.02,
      stiffness: 900,
      damping: 10,
    },
  },
  lazy: {
    scale: 3,
    distance: 250,
    nudge: 100,
    spring: {
      mass: 2,
      stiffness: 50,
      damping: 40,
    },
  },
  slide: {
    scale: 1,
    distance: 200,
    nudge: 80,
    spring: {
      mass: 0.3,
      stiffness: 200,
      damping: 25,
    },
  },
  magnetic: {
    scale: 1,
    distance: 150,
    nudge: 60,
    spring: {
      mass: 0.1,
      stiffness: 500,
      damping: 15,
    },
  },
  float: {
    scale: 1,
    distance: 180,
    nudge: 50,
    spring: {
      mass: 1,
      stiffness: 50,
      damping: 20,
    },
  },
  ripple: {
    scale: 1,
    distance: 120,
    nudge: 50,
    spring: {
      mass: 0.05,
      stiffness: 500,
      damping: 8,
    },
  },
  groove: {
    scale: 1,
    distance: 100,
    nudge: 65,
    spring: {
      mass: 0.8,
      stiffness: 300,
      damping: 30,
    },
  },
  wave: {
    scale: 1,
    distance: 250,
    nudge: 70,
    spring: {
      mass: 0.4,
      stiffness: 150,
      damping: 12,
    },
  },
  orbit: {
    scale: 1,
    distance: 160,
    nudge: 90,
    spring: {
      mass: 0.2,
      stiffness: 400,
      damping: 5,
    },
  },
  pulse: {
    scale: 1,
    distance: 140,
    nudge: 50,
    spring: {
      mass: 0.15,
      stiffness: 600,
      damping: 10,
    },
  },
};
 
export type DockVariant =
  | "modern"
  | "glass"
  | "wooden"
  | "metallic"
  | "neon"
  | "chalk"
  | "paper"
  | "canvas"
  | "frost"
  | "sunset"
  | "ocean"
  | "forest"
  | "desert"
  | "cosmic"
  | "cyber"
  | "app";
 
const variantStyles: Record<DockVariant, string> = {
  modern:
    "bg-zinc-900/80 dark:bg-zinc-950/80 backdrop-blur-md border border-zinc-800/50 dark:border-zinc-700/50 shadow-lg",
  glass:
    "bg-white/20 dark:bg-black/20 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl shadow-white/10 dark:shadow-black/10",
  wooden:
    "bg-linear-to-t from-amber-900/30 to-amber-800/20 dark:from-amber-950/30 dark:to-amber-900/20 backdrop-blur-xs border border-amber-800/30 dark:border-amber-700/30 shadow-md",
  metallic:
    "bg-linear-to-t from-slate-400/30 to-slate-300/20 dark:from-slate-600/30 dark:to-slate-500/20 backdrop-blur-lg border border-slate-300/50 dark:border-slate-400/30 shadow-lg",
  neon: "bg-black/40 backdrop-blur-xl border-2 border-fuchsia-500/50 dark:border-fuchsia-600/50 shadow-lg shadow-fuchsia-500/20 dark:shadow-fuchsia-600/20",
  chalk:
    "bg-slate-50/90 dark:bg-slate-900/90 border-2 border-dashed border-slate-300 dark:border-slate-700 shadow-xs",
  paper:
    "bg-linear-to-t from-stone-100/90 to-white/80 dark:from-stone-900/90 dark:to-stone-950/80 border border-stone-200/50 dark:border-stone-800/50",
  canvas:
    "bg-linear-to-t from-neutral-100/95 to-neutral-50/90 dark:from-neutral-900/95 dark:to-neutral-950/90 border-2 border-neutral-200/50 dark:border-neutral-800/50",
  frost:
    "bg-linear-to-t from-blue-100/30 to-blue-50/20 dark:from-blue-900/30 dark:to-blue-950/20 backdrop-blur-xl border border-blue-200/50 dark:border-primary/30 shadow-lg shadow-blue-500/10",
  sunset:
    "bg-linear-to-t from-orange-500/20 via-pink-500/20 to-purple-500/20 dark:from-orange-600/20 dark:via-pink-600/20 dark:to-purple-600/20 backdrop-blur-xs border border-orange-500/30 dark:border-orange-400/30",
  ocean:
    "bg-linear-to-t from-cyan-500/20 to-blue-500/20 dark:from-cyan-600/20 dark:to-blue-600/20 backdrop-blur-xs border border-cyan-500/30 dark:border-cyan-400/30",
  forest:
    "bg-linear-to-t from-green-800/20 to-emerald-600/20 dark:from-green-900/20 dark:to-emerald-800/20 backdrop-blur-xs border border-green-600/30 dark:border-green-500/30",
  desert:
    "bg-linear-to-t from-yellow-700/20 to-orange-600/20 dark:from-yellow-800/20 dark:to-orange-700/20 backdrop-blur-xs border border-yellow-600/30 dark:border-yellow-500/30",
  cosmic:
    "bg-linear-to-t from-violet-900/30 via-purple-800/20 to-fuchsia-900/20 dark:from-violet-950/30 dark:via-purple-900/20 dark:to-fuchsia-950/20 backdrop-blur-xl border border-violet-500/30 dark:border-violet-400/30 shadow-lg shadow-violet-500/20",
  cyber:
    "bg-linear-to-t from-emerald-500/20 via-cyan-500/20 to-blue-500/20 dark:from-emerald-600/20 dark:via-cyan-600/20 dark:to-blue-600/20 backdrop-blur-lg border-2 border-emerald-400/50 dark:border-emerald-500/50 shadow-lg shadow-emerald-500/30",
  app:
    "bg-muted/95 dark:bg-muted/95 backdrop-blur-md border border-border shadow-lg",
};
 
const itemVariantStyles: Record<DockVariant, string> = {
  modern: "bg-zinc-800/50 dark:bg-zinc-900/50 hover:bg-zinc-700/50 dark:hover:bg-zinc-800/50",
  glass: "bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10",
  wooden: "bg-amber-800/20 dark:bg-amber-900/20 hover:bg-amber-700/30 dark:hover:bg-amber-800/30",
  metallic: "bg-slate-300/30 dark:bg-slate-500/30 hover:bg-slate-200/40 dark:hover:bg-slate-400/40",
  neon: "bg-fuchsia-500/20 dark:bg-fuchsia-600/20 hover:bg-fuchsia-500/30 dark:hover:bg-fuchsia-600/30",
  chalk: "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700",
  paper: "bg-stone-50/50 dark:bg-stone-900/50 hover:bg-stone-100/70 dark:hover:bg-stone-800/70",
  canvas: "bg-neutral-50/50 dark:bg-neutral-900/50 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/70",
  frost: "bg-blue-100/30 dark:bg-blue-900/30 hover:bg-blue-200/40 dark:hover:bg-primary/40",
  sunset: "bg-orange-500/20 dark:bg-orange-600/20 hover:bg-orange-500/30 dark:hover:bg-orange-600/30",
  ocean: "bg-cyan-500/20 dark:bg-cyan-600/20 hover:bg-cyan-500/30 dark:hover:bg-cyan-600/30",
  forest: "bg-green-800/20 dark:bg-green-900/20 hover:bg-green-700/30 dark:hover:bg-green-800/30",
  desert: "bg-yellow-700/20 dark:bg-yellow-800/20 hover:bg-yellow-600/30 dark:hover:bg-yellow-700/30",
  cosmic: "bg-violet-900/30 dark:bg-violet-950/30 hover:bg-violet-800/40 dark:hover:bg-violet-900/40",
  cyber: "bg-emerald-500/20 dark:bg-emerald-600/20 hover:bg-emerald-500/30 dark:hover:bg-emerald-600/30",
  app: "bg-background/80 dark:bg-background/80 hover:bg-accent/50 dark:hover:bg-accent/50",
};
 
const tooltipVariantStyles: Record<DockVariant, string> = {
  modern: "bg-zinc-900 dark:bg-zinc-800 border border-zinc-800 dark:border-zinc-700",
  glass: "bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-white/20 dark:border-white/10",
  wooden: "bg-amber-900/90 dark:bg-amber-950/90 border border-amber-800 dark:border-amber-700",
  metallic: "bg-slate-400/90 dark:bg-slate-600/90 border border-slate-300 dark:border-slate-500",
  neon: "bg-black border-2 border-fuchsia-500/50 dark:border-fuchsia-600/50",
  chalk: "bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700",
  paper: "bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800",
  canvas: "bg-neutral-100 dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800",
  frost: "bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-primary",
  sunset: "bg-orange-500/90 dark:bg-orange-600/90 border border-orange-400 dark:border-orange-500",
  ocean: "bg-cyan-500/90 dark:bg-cyan-600/90 border border-cyan-400 dark:border-cyan-500",
  forest: "bg-green-800/90 dark:bg-green-900/90 border border-green-600 dark:border-green-500",
  desert: "bg-yellow-700/90 dark:bg-yellow-800/90 border border-yellow-600 dark:border-yellow-500",
  cosmic: "bg-violet-900/90 dark:bg-violet-950/90 border border-violet-500 dark:border-violet-400",
  cyber: "bg-emerald-500/90 dark:bg-emerald-600/90 border-2 border-emerald-400 dark:border-emerald-500",
  app: "bg-popover dark:bg-popover border border-border",
};
 
const tooltipTextStyles: Record<DockVariant, string> = {
  modern: "text-zinc-100 dark:text-zinc-200",
  glass: "text-zinc-900 dark:text-zinc-100",
  wooden: "text-amber-100 dark:text-amber-200",
  metallic: "text-slate-900 dark:text-slate-100",
  neon: "text-fuchsia-100 dark:text-fuchsia-200",
  chalk: "text-slate-900 dark:text-slate-100",
  paper: "text-stone-900 dark:text-stone-100",
  canvas: "text-neutral-900 dark:text-neutral-100",
  frost: "text-blue-900 dark:text-blue-100",
  sunset: "text-orange-100 dark:text-orange-200",
  ocean: "text-cyan-100 dark:text-cyan-200",
  forest: "text-green-100 dark:text-green-200",
  desert: "text-yellow-100 dark:text-yellow-200",
  cosmic: "text-violet-100 dark:text-violet-200",
  cyber: "text-emerald-100 dark:text-emerald-200",
  app: "text-popover-foreground dark:text-popover-foreground",
};
 
export interface DockItemProps {
  icon: React.ReactNode;
  label?: string;
  onClick?: () => void;
}
 
export interface SmartDockProps extends MotionDivProps {
  items: DockItemProps[];
  variant?: DockVariant;
  hoverStyle?: HoverStyle;
}
 
function SmartDockItem({
  icon,
  label,
  onClick,
  mouseLeft: _mouseLeft,
  mouseRight: _mouseRight,
  variant = "modern",
  hoverConfig,
}: DockItemProps & {
  mouseLeft: MotionValue<number>;
  mouseRight: MotionValue<number>;
  variant: DockVariant;
  hoverConfig: (typeof hoverPresets)[HoverStyle];
}) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const distance = useMotionValue(0);
  useMotionValue(1); // scale - kept for potential future use
 
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const distanceX = Math.abs(e.clientX - centerX);
      const distanceY = Math.abs(e.clientY - rect.top);
      const d = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
      distance.set(d);
    };
 
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [distance]);
 
  const scaleSpring = useSpring(
    useTransform(
      distance,
      [0, hoverConfig.distance],
      [hoverConfig.scale, 1],
    ),
    hoverConfig.spring,
  );
 
  const x = useTransform(
    distance,
    [0, hoverConfig.distance],
    [0, hoverConfig.nudge],
  );
  const xSpring = useSpring(x, hoverConfig.spring);
  const y = useMotionValue(0);
 
  return (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <motion.button
            ref={ref}
            style={{ x: xSpring, scale: scaleSpring, y }}
            onClick={() => {
              animate(y, [0, -40, 0], {
                repeat: 2,
                ease: [
                  [0, 0, 0.2, 1],
                  [0.8, 0, 1, 1],
                ],
                duration: 0.7,
              });
              onClick?.();
            }}
            className={cn(
              "block aspect-square w-12 origin-bottom rounded-xl shadow-sm backdrop-blur-xs transition-colors relative z-10",
              itemVariantStyles[variant],
            )}
          >
            <div className="flex size-full items-center justify-center text-foreground">
              {icon}
            </div>
          </motion.button>
        </Tooltip.Trigger>
        {label && (
          <Tooltip.Portal>
            <Tooltip.Content
              sideOffset={10}
              className={cn(
                "z-50 rounded-lg px-3.5 py-2 text-sm transition-all",
                "animate-in fade-in-0 zoom-in-95",
                "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                tooltipVariantStyles[variant],
                tooltipTextStyles[variant],
              )}
            >
              {label}
            </Tooltip.Content>
          </Tooltip.Portal>
        )}
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
 
const SmartDock = React.forwardRef<HTMLDivElement, SmartDockProps>(
  (
    { className, items, variant = "modern", hoverStyle = "default", ...props },
    ref,
  ) => {
    const mouseLeft = useMotionValue(-Infinity);
    const mouseRight = useMotionValue(-Infinity);
    const hoverConfig = hoverPresets[hoverStyle];
    const left = useTransform(mouseLeft, [0, 40], [0, -40]);
    const right = useTransform(mouseRight, [0, 40], [0, -40]);
    const leftSpring = useSpring(left, hoverConfig.spring);
    const rightSpring = useSpring(right, hoverConfig.spring);
 
    return (
      <>
        <motion.div
          ref={ref}
          onMouseMove={(e) => {
            const { left, right } = e.currentTarget.getBoundingClientRect();
            const offsetLeft = e.clientX - left;
            const offsetRight = right - e.clientX;
            mouseLeft.set(offsetLeft);
            mouseRight.set(offsetRight);
          }}
          onMouseLeave={() => {
            mouseLeft.set(-Infinity);
            mouseRight.set(-Infinity);
          }}
          className={cn(
            "relative mx-auto hidden h-20 items-end gap-3 px-4 pb-3 sm:flex overflow-visible",
            className,
          )}
          {...props}
        >
          <motion.div
            className={cn(
              "absolute inset-y-0 -z-10 rounded-2xl",
              variantStyles[variant],
            )}
            style={{ left: leftSpring, right: rightSpring }}
          />

          {items.map((item, i) => (
            <SmartDockItem
              key={i}
              mouseLeft={mouseLeft}
              mouseRight={mouseRight}
              variant={variant}
              hoverConfig={hoverConfig}
              {...item}
            />
          ))}
        </motion.div>
 
        <div className="sm:hidden">
          <div
            className={cn(
              "mx-auto flex h-20 max-w-full items-end gap-4 overflow-x-scroll rounded-2xl px-4 pb-3",
              variantStyles[variant],
            )}
          >
            {items.map((item, i) => (
              <button
                key={i}
                onClick={item.onClick}
                className={cn(
                  "flex aspect-square w-12 shrink-0 items-center justify-center rounded-xl cursor-pointer transition-all hover:scale-110 active:scale-95 text-foreground",
                  itemVariantStyles[variant],
                )}
              >
                {item.icon}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  },
);
 
SmartDock.displayName = "SmartDock";
 
export { SmartDock };

