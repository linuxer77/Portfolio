"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ToastyPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ToastyPopup({ isOpen, onClose }: ToastyPopupProps) {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, 1400);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none">
          {/* Subtle Orange Heat Edge Flash */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{ duration: 1.2 }}
            className="absolute inset-y-0 right-0 w-48 bg-gradient-to-l from-orange-600/30 to-transparent"
          />

          {/* Dan Forden Pop-Out in Bottom-Right */}
          <motion.div
            initial={{ x: 140, y: 120, rotate: 12 }}
            animate={{ x: 0, y: 0, rotate: -3 }}
            exit={{ x: 160, y: 140, rotate: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 22 }}
            className="absolute bottom-2 right-4 flex items-end gap-2"
          >
            {/* Retro 8-bit Speech Bubble */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 400 }}
              className="mb-14 px-3.5 py-1.5 bg-white text-black border-2 border-black font-mono font-black text-sm tracking-wider shadow-[4px_4px_0px_#ea580c] relative"
            >
              <span>TOASTY!</span>
              {/* Little triangle tail */}
              <div className="absolute -bottom-2 right-4 w-0 h-0 border-l-[6px] border-l-transparent border-t-[8px] border-t-white border-r-[6px] border-r-transparent" />
            </motion.div>

            {/* Dan Forden Pixel / Arcade Face Graphic */}
            <div className="w-24 h-28 sm:w-28 sm:h-32 relative bg-zinc-900 border-2 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.6)] rounded-t-xl overflow-hidden flex flex-col items-center justify-end p-1">
              <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-lg">
                {/* Hair */}
                <path d="M 25 40 Q 50 15 75 40 Q 85 60 78 70 Q 75 35 50 30 Q 25 35 22 70 Z" fill="#4a2810" />
                {/* Face Contour */}
                <ellipse cx="50" cy="62" rx="26" ry="32" fill="#ffd1a4" />
                {/* Hair bang */}
                <path d="M 28 36 Q 48 30 70 42 Q 60 32 45 28 Z" fill="#381e0c" />
                {/* Eyebrows */}
                <path d="M 33 50 Q 42 46 47 50" stroke="#261408" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M 53 50 Q 58 46 67 50" stroke="#261408" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                {/* Eyes (Smiling crinkles) */}
                <ellipse cx="40" cy="56" rx="4" ry="2" fill="#1f2937" />
                <ellipse cx="60" cy="56" rx="4" ry="2" fill="#1f2937" />
                {/* Smile / Mouth wide open shouting TOASTY */}
                <path d="M 36 72 Q 50 90 64 72 Q 50 78 36 72 Z" fill="#881337" stroke="#4c0519" strokeWidth="1.5" />
                <ellipse cx="50" cy="76" rx="7" ry="3" fill="#ffffff" />
                {/* Cheek flush */}
                <circle cx="33" cy="66" r="4" fill="#fb7185" opacity="0.6" />
                <circle cx="67" cy="66" r="4" fill="#fb7185" opacity="0.6" />
                {/* Shirt Collar */}
                <path d="M 28 94 Q 50 102 72 94 L 85 120 L 15 120 Z" fill="#1e293b" />
                <path d="M 42 97 L 50 110 L 58 97" stroke="#e2e8f0" strokeWidth="2" fill="none" />
              </svg>
              <div className="absolute bottom-0 inset-x-0 bg-orange-600 text-[9px] font-black text-center text-white tracking-widest uppercase">
                DAN // TOASTY
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
