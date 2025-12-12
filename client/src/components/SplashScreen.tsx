import { motion } from "framer-motion";

export function SplashScreen() {
  // Vedic Color Palette
  const colors = {
    saffron: "#FF9933", // Agni, Purity, Renunciation
    kumkum: "#D32F2F",  // Auspiciousness, Shakti
    turmeric: "#FFC107", // Knowledge, Prosperity
    white: "#FFFFFF",   // Peace, Truth
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md">
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
            {/* Outer Ring - Saffron */}
            <circle cx="50" cy="50" r="48" fill="none" stroke={colors.saffron} strokeWidth="0.5" opacity="0.8" />
            <path d="M50 2 A48 48 0 0 1 50 98 A48 48 0 0 1 50 2 Z" fill="none" stroke={colors.saffron} strokeWidth="0.5" strokeDasharray="2 4" opacity="0.6" />
            
            {/* Radiating Lines - Turmeric/Gold */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <motion.path
                key={deg}
                d="M50 50 L50 15"
                stroke={colors.turmeric}
                strokeWidth="0.3"
                transform={`rotate(${deg} 50 50)`}
                opacity="0.7"
              />
            ))}

            {/* Swasti Symbols (卐) - Kumkum Red */}
            {[0, 90, 180, 270].map((deg) => (
              <g key={deg} transform={`rotate(${deg} 50 50)`}>
                <text 
                  x="50" 
                  y="10" 
                  fontSize="8" 
                  fill={colors.kumkum} 
                  fontWeight="bold"
                  textAnchor="middle" 
                  dominantBaseline="middle"
                  style={{ filter: "drop-shadow(0px 0px 2px rgba(211, 47, 47, 0.3))" }}
                >
                  卐
                </text>
              </g>
            ))}

            {/* Decorative Dots - Saffron */}
            {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((deg) => (
              <circle
                key={deg}
                cx="50"
                cy="25"
                r="1.5"
                fill={colors.saffron}
                transform={`rotate(${deg} 50 50)`}
                opacity="0.8"
              />
            ))}
          </motion.svg>

          {/* Layer 2: Pulse Rings */}
          <motion.div
            className="absolute w-44 h-44 rounded-full border border-orange-500/20"
            animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
           <motion.div
            className="absolute w-36 h-36 rounded-full border border-yellow-500/20"
            animate={{ scale: [1.05, 1, 1.05], opacity: [0.2, 0.5, 0.2] }}
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
              <linearGradient id="lotusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFC107" />
                <stop offset="100%" stopColor="#FF9800" />
              </linearGradient>
            </defs>

            {/* Stylized Lotus Petals */}
            {[0, 90, 180, 270].map((rotation, i) => (
               <motion.path
                key={i}
                d="M100 40 C100 40 130 80 100 100 C70 80 100 40 100 40"
                fill="url(#lotusGradient)"
                opacity="0.9"
                transform={`rotate(${rotation} 100 100)`}
                animate={{ 
                  d: [
                    "M100 40 C100 40 130 80 100 100 C70 80 100 40 100 40", 
                    "M100 35 C100 35 135 80 100 100 C65 80 100 35 100 35"
                  ] 
                }}
                transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              />
            ))}
            
            {/* Center Glow */}
            <circle cx="100" cy="100" r="20" fill="#FFF8E1" className="blur-xl opacity-60" />
          </motion.svg>

          {/* Layer 4: The Divine OM */}
          <motion.div
            className="absolute z-20 text-5xl font-serif font-bold"
            style={{ color: "#BF360C" }} // Deep Red/Brown for OM
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              textShadow: "0 0 20px rgba(255, 152, 0, 0.5)"
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
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-orange-400 to-transparent" />
          <p className="text-sm font-medium tracking-[0.4em] text-orange-800/80 uppercase">
            Focus
          </p>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-orange-400 to-transparent" />
        </motion.div>

      </div>
    </div>
  );
}
