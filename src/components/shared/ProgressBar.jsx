import React, { useEffect, useRef, useState } from "react";

/** Slim top-of-page bar that animates while any API request is in flight. */
export default function ProgressBar() {
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    const onLoading = (e) => {
      const busy = e.detail.inflight > 0;
      clearInterval(timer.current);
      if (busy) {
        setActive(true);
        setProgress((p) => (p > 0 && p < 90 ? p : 12));
        timer.current = setInterval(() => setProgress((p) => Math.min(90, p + (90 - p) * 0.12)), 180);
      } else {
        setProgress(100);
        timer.current = setTimeout(() => { setActive(false); setProgress(0); }, 320);
      }
    };
    window.addEventListener("bb:loading", onLoading);
    return () => { window.removeEventListener("bb:loading", onLoading); clearInterval(timer.current); };
  }, []);

  return (
    <div aria-hidden="true" className={`fixed top-0 left-0 right-0 z-[200] h-[3px] pointer-events-none transition-opacity duration-300 ${active ? "opacity-100" : "opacity-0"}`}>
      <div className="h-full bg-gradient-to-r from-plum via-berry to-gold rounded-r-full transition-[width] duration-200 ease-out shadow-[0_0_8px_rgba(152,95,153,.6)]" style={{ width: `${progress}%` }} />
    </div>
  );
}
