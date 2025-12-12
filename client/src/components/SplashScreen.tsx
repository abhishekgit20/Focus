import { motion } from "framer-motion";

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <motion.div
        className="relative flex flex-col items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Outer rotating ring */}
        <motion.div
          className="absolute w-40 h-40 rounded-full border-4 border-primary/30 border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Inner reverse rotating ring */}
        <motion.div
          className="absolute w-32 h-32 rounded-full border-2 border-secondary/30 border-b-secondary"
          animate={{ rotate: -360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />

        {/* OM Symbol */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0.5 }}
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: 1,
            textShadow: [
              "0 0 0px rgba(144, 202, 249, 0)",
              "0 0 20px rgba(144, 202, 249, 0.5)",
              "0 0 0px rgba(144, 202, 249, 0)"
            ]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-7xl mb-2 text-primary font-serif relative z-10"
        >
          ॐ
        </motion.div>

        <motion.p 
          className="mt-8 text-sm font-medium tracking-[0.2em] text-muted-foreground uppercase"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Loading Harmony
        </motion.p>
      </motion.div>
    </div>
  );
}
