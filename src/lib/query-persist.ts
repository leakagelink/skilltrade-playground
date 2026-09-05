import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

const CACHE_KEY = "tradevirt-query-cache-v1";
const MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * Restores the last known screen data from device storage so screens paint
 * instantly on app open, then refreshes in the background.
 */
export function useQueryCachePersistence(queryClient: QueryClient) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let unsubscribe: (() => void) | undefined;
    try {
      const persister = createSyncStoragePersister({
        storage: window.localStorage,
        key: CACHE_KEY,
        throttleTime: 1500,
      });
      const [unsub] = persistQueryClient({
        queryClient,
        persister,
        maxAge: MAX_AGE,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === "success" && query.state.data !== undefined,
        },
      });
      unsubscribe = unsub;
    } catch {
      /* storage unavailable — run without persistence */
    }
    return () => unsubscribe?.();
  }, [queryClient]);
}
