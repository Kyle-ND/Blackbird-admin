import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSwipeable } from "react-swipeable";

const LandingPage = ({
  images = [],
  hideOverlay = false,
  overlayClass = "",
  imageClass = "object-cover w-full h-full",
  perspective = "1000px",
  autoplay = false,
  direction = "vertical",
  autoplayDelay = 5000,
  children,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState([]);
  const [currentDirection, setCurrentDirection] = useState("up");
  const [isLoading, setIsLoading] = useState(true);
  const autoplayRef = useRef(null);

  useEffect(() => {
    const loadImages = async () => {
      setIsLoading(true);
      const promises = images.map(
        (src) =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve(src);
            img.onerror = () => reject(src);
          })
      );
      try {
        const resolved = await Promise.all(promises);
        setLoadedImages(resolved);
      } finally {
        setIsLoading(false);
      }
    };
    loadImages();
  }, [images]);

  const setDirection = useCallback(
    (dir) => {
      if (direction === "horizontal") {
        setCurrentDirection(dir === "next" ? "left" : "right");
      } else {
        setCurrentDirection(dir === "next" ? "up" : "down");
      }
    },
    [direction]
  );

  const nextIndex = useCallback(() => {
    if (!loadedImages.length) return;
    setDirection("next");
    setCurrentIndex((prev) => (prev + 1) % loadedImages.length);
  }, [loadedImages.length, setDirection]);

  const prevIndex = useCallback(() => {
    if (!loadedImages.length) return;
    setDirection("prev");
    setCurrentIndex((prev) =>
      prev === 0 ? loadedImages.length - 1 : prev - 1
    );
  }, [loadedImages.length, setDirection]);

  useEffect(() => {
    if (!autoplay || !loadedImages.length) return;
    autoplayRef.current = setInterval(nextIndex, autoplayDelay);
    return () => clearInterval(autoplayRef.current);
  }, [autoplay, autoplayDelay, loadedImages.length, nextIndex]);

  useEffect(() => {
    const handleKey = (e) => {
      if (["ArrowUp", "ArrowLeft"].includes(e.key)) prevIndex();
      if (["ArrowDown", "ArrowRight"].includes(e.key)) nextIndex();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [prevIndex, nextIndex]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: direction === "horizontal" ? nextIndex : undefined,
    onSwipedRight: direction === "horizontal" ? prevIndex : undefined,
    onSwipedUp: direction === "vertical" ? nextIndex : undefined,
    onSwipedDown: direction === "vertical" ? prevIndex : undefined,
    preventDefaultTouchmoveEvent: true,
  });

  const variants = {
    enter: (dir) => {
      switch (dir) {
        case "up":
          return { y: "100%", opacity: 0 };
        case "down":
          return { y: "-100%", opacity: 0 };
        case "left":
          return { x: "100%", opacity: 0 };
        case "right":
          return { x: "-100%", opacity: 0 };
        default:
          return { opacity: 0 };
      }
    },
    center: { x: 0, y: 0, opacity: 1 },
    exit: (dir) => {
      switch (dir) {
        case "up":
          return { y: "-100%", opacity: 0 };
        case "down":
          return { y: "100%", opacity: 0 };
        case "left":
          return { x: "-100%", opacity: 0 };
        case "right":
          return { x: "100%", opacity: 0 };
        default:
          return { opacity: 0 };
      }
    },
  };

  return (
    <div
      {...swipeHandlers}
      tabIndex={0}
      className="relative flex items-center justify-center w-full h-full overflow-hidden outline-none focus:ring-1"
      style={{ perspective }}
    >
      <AnimatePresence custom={currentDirection} mode="wait">
        {!isLoading && loadedImages.length > 0 && (
          <motion.div
            key={currentIndex}
            custom={currentDirection}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full"
          >
            <img
              src={loadedImages[currentIndex]}
              alt="" aria-hidden="true"
              className={`${imageClass} w-full h-full`}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {!hideOverlay && (
        <div
          className={`absolute inset-0 flex items-center justify-center ${overlayClass} pointer-events-none`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default LandingPage;






