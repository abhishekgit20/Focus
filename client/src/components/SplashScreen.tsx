import { motion } from "framer-motion";

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md">
      <div className="relative flex flex-col items-center justify-center">
        
        {/* Main Container */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          
          {/* Layer 1: Rotating Mandala / Chakra (SVG) */}
          <motion.svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full text-primary/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            {/* Simple geometric mandala pattern */}
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <path d="M50 2 A48 48 0 0 1 50 98 A48 48 0 0 1 50 2 Z" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <motion.path
                key={deg}
                d="M50 50 L50 10"
                stroke="currentColor"
                strokeWidth="0.5"
                transform={`rotate(${deg} 50 50)`}
              />
            ))}
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <circle
                key={deg}
                cx="50"
                cy="25"
                r="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                transform={`rotate(${deg} 50 50)`}
              />
            ))}
          </motion.svg>

          {/* Layer 2: Pulse Rings */}
          <motion.div
            className="absolute w-40 h-40 rounded-full border border-primary/30"
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
           <motion.div
            className="absolute w-32 h-32 rounded-full border border-secondary/30"
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Layer 3: The Golden Lotus (SVG) */}
          <motion.svg
            viewBox="0 0 200 200"
            className="absolute w-32 h-32 text-orange-400 drop-shadow-lg"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
          >
            {/* Stylized Lotus Petals */}
            <motion.path
              d="M100 40 C100 40 130 80 100 100 C70 80 100 40 100 40"
              fill="currentColor"
              opacity="0.8"
              animate={{ d: ["M100 40 C100 40 130 80 100 100 C70 80 100 40 100 40", "M100 35 C100 35 135 80 100 100 C65 80 100 35 100 35"] }}
              transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            />
             <motion.path
              d="M100 160 C100 160 130 120 100 100 C70 120 100 160 100 160"
              fill="currentColor"
              opacity="0.8"
              animate={{ d: ["M100 160 C100 160 130 120 100 100 C70 120 100 160 100 160", "M100 165 C100 165 135 120 100 100 C65 120 100 165 100 165"] }}
              transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            />
            <motion.path
              d="M40 100 C40 100 80 70 100 100 C80 130 40 100 40 100"
              fill="currentColor"
              opacity="0.8"
              animate={{ d: ["M40 100 C40 100 80 70 100 100 C80 130 40 100 40 100", "M35 100 C35 100 80 65 100 100 C80 135 35 100 35 100"] }}
              transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            />
            <motion.path
              d="M160 100 C160 100 120 70 100 100 C120 130 160 100 160 100"
              fill="currentColor"
              opacity="0.8"
              animate={{ d: ["M160 100 C160 100 120 70 100 100 C120 130 160 100 160 100", "M165 100 C165 100 120 65 100 100 C120 135 165 100 165 100"] }}
              transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            />
            
            {/* Center Glow */}
            <circle cx="100" cy="100" r="15" fill="white" className="blur-md opacity-50" />
          </motion.svg>

          {/* Layer 4: The Divine OM */}
          <motion.div
            className="absolute z-20 text-4xl text-foreground font-serif font-bold"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            ॐ
          </motion.div>
        </div>

        {/* Text */}
        <motion.div
          className="mt-8 flex flex-col items-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <p className="text-sm font-medium tracking-[0.3em] text-muted-foreground uppercase">
            Focus
          </p>
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-primary to-transparent" />
        </motion.div>

      </div>
    </div>
  );
}
