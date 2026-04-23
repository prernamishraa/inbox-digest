"use client";

import { useEffect, useRef, useState } from "react";

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function CountingNumber({
  value,
  duration = 1400,
  suffix = "",
}: {
  value: number;
  duration?: number;
  suffix?: string;
}) {
  const [displayed, setDisplayed] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      const current = Math.round(start + (end - start) * eased);
      setDisplayed(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = end;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return (
    <span>
      {displayed.toLocaleString()}
      {suffix}
    </span>
  );
}
