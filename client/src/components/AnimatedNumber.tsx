import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  format?: (n: number) => string;
  duration?: number;
}

/**
 * Smoothly counts up/down to `value` instead of snapping - framer-motion updates
 * the rendered text directly via the motion value, without re-rendering React.
 */
export function AnimatedNumber({ value, className, format, duration = 0.8 }: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const rendered = useTransform(motionValue, (latest) =>
    format ? format(latest) : Math.round(latest).toLocaleString("en-IN")
  );

  useEffect(() => {
    const controls = animate(motionValue, value, { duration, ease: "easeOut" });
    return controls.stop;
  }, [value, duration, motionValue]);

  return <motion.span className={className}>{rendered}</motion.span>;
}
