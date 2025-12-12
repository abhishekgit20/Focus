import { AlertTriangle, Phone, X } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function CrisisBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-red-600 text-white relative z-[100]"
      >
        <div className="container mx-auto px-4 py-2 flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2 flex-1 justify-center md:justify-start">
            <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
            <span>
              In crisis? Call <a href="tel:988" className="underline hover:text-red-100">Kiran (Mental Health Rehab): 1800-599-0019</a> or <a href="tel:112" className="underline hover:text-red-100">Emergency: 112</a>
            </span>
          </div>
          <button 
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-red-700 rounded-full transition-colors ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
