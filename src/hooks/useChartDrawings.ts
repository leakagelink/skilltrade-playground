import { useCallback, useEffect, useRef, useState } from "react";
import type { Drawing } from "@/lib/chart/drawings";

const key = (symbol: string) => `paperedge.drawings.${symbol}`;

/** Per-symbol drawing storage with debounced persistence to localStorage. */
export function useChartDrawings(symbol: string) {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const past = useRef<Drawing[][]>([]);
  const future = useRef<Drawing[][]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    past.current = [];
    future.current = [];
    try {
      const raw = window.localStorage.getItem(key(symbol));
      setDrawings(raw ? (JSON.parse(raw) as Drawing[]) : []);
    } catch {
      setDrawings([]);
    }
    setHydrated(true);
  }, [symbol]);

  useEffect(() => {
    if (!hydrated) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(key(symbol), JSON.stringify(drawings));
      } catch {
        /* storage full or unavailable — drawings stay in memory */
      }
    }, 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [drawings, symbol, hydrated]);

  const commit = useCallback((next: Drawing[] | ((prev: Drawing[]) => Drawing[])) => {
    setDrawings((prev) => {
      past.current = [...past.current.slice(-49), prev];
      future.current = [];
      return typeof next === "function" ? next(prev) : next;
    });
  }, []);

  const undo = useCallback(() => {
    setDrawings((prev) => {
      const last = past.current.pop();
      if (!last) return prev;
      future.current = [...future.current, prev];
      return last;
    });
  }, []);

  const redo = useCallback(() => {
    setDrawings((prev) => {
      const next = future.current.pop();
      if (!next) return prev;
      past.current = [...past.current, prev];
      return next;
    });
  }, []);

  return { drawings, setDrawings, commit, undo, redo, hydrated };
}
