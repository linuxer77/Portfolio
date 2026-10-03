"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playCachedAudio } from "./ArcadePreload";

interface ToastyPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ToastyPopup({ isOpen, onClose }: ToastyPopupProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    // Play authentic Dan Forden TOASTY! voice clip instantly from cache
    playCachedAudio("/arcade/toasty.mp3", 1.0);

    const timer = setTimeout(() => {
      onCloseRef.current();
    }, 1500);

    return () => clearTimeout(timer);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 pointer-events-none z-[100] overflow-hidden select-none"
        >
          {/* Authentic Dan Forden Pop-Out in Bottom-Right */}
          <motion.div
            initial={{ x: 160, y: 140, rotate: 15 }}
            animate={{ x: 0, y: 0, rotate: -4 }}
            exit={{ x: 180, y: 160, rotate: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 20 }}
            className="absolute bottom-2 right-4 flex items-end gap-2"
          >
            {/* Retro 8-bit Speech Bubble */}

            {/* Real Photographic Digitized Dan Forden from UMK3 */}
            <div className="w-28 sm:w-36 h-36 sm:h-44 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/arcade/toasty.png"
                alt="Dan Forden Toasty"
                loading="eager"
                decoding="sync"
                className="w-full h-full object-contain"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
