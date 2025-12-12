import { motion } from "framer-motion";

export function SplashScreen() {
  // Symbols of Sanatan Dharma
  const symbols = [
    "🔱", // Trishul (Shiva)
    "🪷", // Lotus (Purity/Lakshmi)
    "🐚", // Shankh (Sound/Vishnu)
    "☸️", // Dharma Chakra (Wheel of Law)
    "🏺", // Kalash (Abundance)
    "☀️", // Surya (Sun)
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <motion.div
        className="relative flex flex-col items-center justify-center h-64 w-64"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Orbiting Symbols Ring */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          {symbols.map((symbol, i) => {
            const angle = (i * 360) / symbols.length;
            const radius = 80; // Distance from center
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;

            return (
              <div
                key={i}
                className="absolute text-2xl"
                style={{
                  left: "50%",
                  top: "50%",
                  marginLeft: "-12px", // Half of width approximation
                  marginTop: "-12px", // Half of height approximation
                  transform: `translate(${x}px, ${y}px) rotate(${-angle}deg)`, // rotate(-angle) keeps symbol upright relative to screen if desired, or remove to have them rotate with ring
                }}
              >
                <motion.div
                   animate={{ rotate: -360 }} // Counter-rotate to keep symbols upright
                   transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                >
                  {symbol}
                </motion.div>
              </div>
            );
          })}
        </motion.div>

        {/* Inner Decor Ring */}
        <motion.div
          className="absolute w-32 h-32 rounded-full border border-dashed border-secondary/50"
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />

        {/* Central OM Symbol */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0.5 }}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: 1,
            textShadow: [
              "0 0 0px rgba(144, 202, 249, 0)",
              "0 0 30px rgba(144, 202, 249, 0.6)",
              "0 0 0px rgba(144, 202, 249, 0)"
            ]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-7xl mb-1 text-primary font-serif relative z-10 drop-shadow-lg"
        >
          ॐ
        </motion.div>

        <motion.p 
          className="absolute -bottom-12 text-sm font-medium tracking-[0.3em] text-muted-foreground uppercase"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Loading Harmony
        </motion.p>
      </motion.div>
    </div>
  );
}
