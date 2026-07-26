import { motion } from "framer-motion";

/**
 * A single breathing focus-ring animation - simulates a lens racking into
 * focus, in the site's actual brand color (text-primary, same as every
 * other "Focus" wordmark across the app), landing on the real wordmark
 * treatment (font-serif, bold) instead of a separate all-caps caption.
 */
export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
      {/* Background Overlay */}
      <motion.div
        className="absolute inset-0 bg-background/95 backdrop-blur-md"
        transition={{ duration: 1.5 }}
      />

      <div className="relative z-10 flex items-center justify-center w-56 h-56 text-primary">
        {/* Faint outer ring for depth */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <circle
            cx="50" cy="50" r="46"
            fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.15"
          />
        </svg>

        {/* Breathing focus ring - contracts from wide/faint to tight/crisp, on a loop */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <motion.circle
            cx="50" cy="50"
            fill="none" stroke="currentColor" strokeLinecap="round"
            animate={{
              r: [38, 26, 38],
              strokeWidth: [0.75, 2.5, 0.75],
              opacity: [0.35, 1, 0.35],
            }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>

        {/* Wordmark - same treatment as the Navbar/Footer logo */}
        <motion.span
          className="relative font-serif font-bold text-3xl text-primary"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Focus
        </motion.span>
      </div>
    </div>
  );
}
