import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export function SplashScreen() {
  // Symbols of Sanatan Dharma for the dynamic center
  const symbols = [
    "ॐ",  // Om
    "🔱", // Trishul
    "🪷", // Lotus
    "☸️", // Dharma Chakra
    "🐚", // Shankh
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % symbols.length);
    }, 800); // Change symbol every 800ms
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <motion.div
        className="relative flex flex-col items-center justify-center h-64 w-64"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Outer Rotating Ring */}
        <motion.div
          className="absolute w-48 h-48 rounded-full border border-dashed border-primary/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Inner Reverse Ring */}
        <motion.div
          className="absolute w-36 h-36 rounded-full border border-dotted border-secondary/40"
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />

        {/* Dynamic Central Symbol */}
        <div className="relative h-24 w-24 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 1.5, opacity: 0, rotate: 45 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="text-7xl absolute text-primary font-serif drop-shadow-lg"
            >
              {symbols[currentIndex]}
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.p 
          className="absolute -bottom-8 text-sm font-medium tracking-[0.3em] text-muted-foreground uppercase"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Loading Harmony
        </motion.p>
      </motion.div>
    </div>
  );
}
