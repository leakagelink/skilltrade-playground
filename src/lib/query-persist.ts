import { useEffect } from "react";
import { dehydrate, hydrate, type QueryClient } from "@tanstack/react-query";

const CACHE_KEY = "tradevirt-query-cache-v1";
const MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * Restores the last known screen data from device storage so screens paint
 * instantly on app open, then refreshes quietly in the background.
 */
export function useQueryCachePersistence(queryClient: QueryClient) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Restore
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { at: number; state: unknown };
        if (parsed && Date.now() - parsed.at < MAX_AGE) {
          hydrate(queryClient, parsed.state);
        } else {
          window.localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch {
      /* corrupted or unavailable storage — continue without restore */
    }

    // 2. Persist (throttled)
    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        try {
          const state = dehydrate(queryClient, {
            shouldDehydrateQuery: (query) =>
              query.state.status === "success" && query.state.data !== undefined,
          });
          window.localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), state }));
        } catch {
          /* quota exceeded — skip this write */
        }
      }, 2000);
    };

    const unsubscribe = queryClient.getQueryCache().subscribe(save);
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [queryClient]);
}
