import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export function SplashScreen() {
  // Dynamic Vedic Color Palettes
  const palettes = [
    {
      name: "Agni (Fire)",
      primary: "#FF9933", // Saffron
      secondary: "#FFC107", // Gold
      accent: "#D32F2F", // Kumkum Red
      text: "#BF360C", // Deep Brown
    },
    {
      name: "Akasha (Sky/Krishna)",
      primary: "#039BE5", // Sky Blue
      secondary: "#4FC3F7", // Light Blue
      accent: "#FFD700", // Gold (Peacock feather)
      text: "#01579B", // Deep Blue
    },
    {
      name: "Prakriti (Nature)",
      primary: "#43A047", // Leaf Green
      secondary: "#81C784", // Light Green
      accent: "#FFEB3B", // Flower Yellow
      text: "#1B5E20", // Deep Green
    },
    {
      name: "Shakti (Power)",
      primary: "#C2185B", // Pink/Red
      secondary: "#F48FB1", // Light Pink
      accent: "#FFC107", // Gold
      text: "#880E4F", // Deep Maroon
    }
  ];

  const [currentPaletteIndex, setCurrentPaletteIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPaletteIndex((prev) => (prev + 1) % palettes.length);
    }, 3000); // Change palette every 3 seconds
    return () => clearInterval(timer);
  }, []);

  const colors = palettes[currentPaletteIndex];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md transition-colors duration-1000">
      <div className="relative flex flex-col items-center justify-center">
        
        {/* Main Container */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          
          {/* Layer 1: Rotating Mandala / Chakra (SVG) */}
          <motion.svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          >
            {/* Outer Ring */}
            <motion.circle 
              cx="50" cy="50" r="48" fill="none" strokeWidth="0.5" opacity="0.8"
              animate={{ stroke: colors.primary }}
              transition={{ duration: 1 }}
            />
            <motion.path 
              d="M50 2 A48 48 0 0 1 50 98 A48 48 0 0 1 50 2 Z" fill="none" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.6"
              animate={{ stroke: colors.primary }}
              transition={{ duration: 1 }}
            />
            
            {/* Radiating Lines */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <motion.path
                key={deg}
                d="M50 50 L50 15"
                strokeWidth="0.3"
                transform={`rotate(${deg} 50 50)`}
                opacity="0.7"
                animate={{ stroke: colors.secondary }}
                transition={{ duration: 1 }}
              />
            ))}

            {/* Swasti Symbols (卐) */}
            {[0, 90, 180, 270].map((deg) => (
              <g key={deg} transform={`rotate(${deg} 50 50)`}>
                <motion.text 
                  x="50" 
                  y="10" 
                  fontSize="8" 
                  fontWeight="bold"
                  textAnchor="middle" 
                  dominantBaseline="middle"
                  style={{ filter: "drop-shadow(0px 0px 2px rgba(0,0,0,0.1))" }}
                  animate={{ fill: colors.accent }}
                  transition={{ duration: 1 }}
                >
                  卐
                </motion.text>
              </g>
            ))}

            {/* Decorative Dots */}
            {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((deg) => (
              <motion.circle
                key={deg}
                cx="50"
                cy="25"
                r="1.5"
                transform={`rotate(${deg} 50 50)`}
                opacity="0.8"
                animate={{ fill: colors.primary }}
                transition={{ duration: 1 }}
              />
            ))}
          </motion.svg>

          {/* Layer 2: Pulse Rings */}
          <motion.div
            className="absolute w-44 h-44 rounded-full border"
            animate={{ 
              scale: [1, 1.05, 1], 
              opacity: [0.2, 0.5, 0.2],
              borderColor: colors.primary 
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
           <motion.div
            className="absolute w-36 h-36 rounded-full border"
            animate={{ 
              scale: [1.05, 1, 1.05], 
              opacity: [0.2, 0.5, 0.2],
              borderColor: colors.secondary
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Layer 3: The Golden Lotus (SVG) */}
          <motion.svg
            viewBox="0 0 200 200"
            className="absolute w-32 h-32 drop-shadow-lg"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
          >
            <defs>
              <linearGradient id={`lotusGradient-${currentPaletteIndex}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.secondary} />
                <stop offset="100%" stopColor={colors.primary} />
              </linearGradient>
            </defs>

            {/* Stylized Lotus Petals */}
            {[0, 90, 180, 270].map((rotation, i) => (
               <motion.path
                key={i}
                d="M100 40 C100 40 130 80 100 100 C70 80 100 40 100 40"
                fill={`url(#lotusGradient-${currentPaletteIndex})`}
                opacity="0.9"
                transform={`rotate(${rotation} 100 100)`}
                animate={{ 
                  d: [
                    "M100 40 C100 40 130 80 100 100 C70 80 100 40 100 40", 
                    "M100 35 C100 35 135 80 100 100 C65 80 100 35 100 35"
                  ],
                  fill: `url(#lotusGradient-${currentPaletteIndex})` // Ensure fill updates
                }}
                transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              />
            ))}
            
            {/* Center Glow */}
            <circle cx="100" cy="100" r="20" fill="#FFFFFF" className="blur-xl opacity-60" />
          </motion.svg>

          {/* Layer 4: The Divine OM */}
          <motion.div
            className="absolute z-20 text-5xl font-serif font-bold"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              color: colors.text,
              textShadow: `0 0 20px ${colors.secondary}80`
            }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            ॐ
          </motion.div>
        </div>

        {/* Text */}
        <motion.div
          className="mt-10 flex flex-col items-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div 
            className="h-px w-24"
            animate={{ 
              background: `linear-gradient(90deg, transparent, ${colors.primary}, transparent)` 
            }}
          />
          <motion.p 
            className="text-sm font-medium tracking-[0.4em] uppercase"
            animate={{ color: colors.text }}
          >
            Focus
          </motion.p>
          <motion.div 
            className="h-px w-24"
            animate={{ 
              background: `linear-gradient(90deg, transparent, ${colors.primary}, transparent)` 
            }}
          />
        </motion.div>

      </div>
    </div>
  );
}
