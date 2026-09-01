import { useCallback, useEffect, useState } from "react";
import type { DrawingMode } from "@/lib/chart/drawings";

const STORAGE_KEY = "paperedge.pinnedTools";
const DEFAULTS: DrawingMode[] = ["trendline", "hline", "fibretracement", "rectangle", "long", "text"];

export function usePinnedTools() {
  const [pinned, setPinned] = useState<DrawingMode[]>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setPinned(JSON.parse(raw) as DrawingMode[]);
    } catch {
      /* keep defaults */
    }
  }, []);

  const toggle = useCallback((mode: DrawingMode) => {
    setPinned((prev) => {
      const next = prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode].slice(-8);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { pinned, toggle };
}
