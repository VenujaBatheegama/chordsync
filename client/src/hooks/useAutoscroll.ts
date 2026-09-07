import { useEffect, useRef, useCallback } from 'react';

interface UseAutoscrollReturn {
  startScroll: () => void;
  stopScroll: () => void;
}

/**
 * RAF-based autoscroll hook. Returns start/stop controls.
 * @param speed - pixels per second (default 30)
 * @param containerRef - optional ref to a scrollable container (defaults to window)
 */
export function useAutoscroll(
  speed: number,
  containerRef?: React.RefObject<HTMLElement>
): UseAutoscrollReturn {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  const tick = useCallback(
    (timestamp: number) => {
      if (!activeRef.current) return;

      if (lastTimeRef.current !== null) {
        const elapsed = timestamp - lastTimeRef.current;
        const delta = (speed / 1000) * elapsed;

        if (containerRef?.current) {
          containerRef.current.scrollTop += delta;
        } else {
          window.scrollBy(0, delta);
        }
      }

      lastTimeRef.current = timestamp;
      rafRef.current = requestAnimationFrame(tick);
    },
    [speed, containerRef]
  );

  const startScroll = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    lastTimeRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stopScroll = useCallback(() => {
    activeRef.current = false;
    lastTimeRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { startScroll, stopScroll };
}
