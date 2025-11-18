import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

/**
 * A custom hook that returns `true` once the Zustand store has been rehydrated
 * from localStorage, and `false` otherwise.
 *
 * This is essential for preventing UI flicker or hydration mismatches in client-rendered
 * applications where persisted state is loaded asynchronously.
 *
 * Includes a timeout mechanism to prevent black screen if hydration hangs.
 */
export function useHasHydrated() {
  const [hydrated, setHydrated] = useState(useAppStore.persist.hasHydrated);

  useEffect(() => {
    // If already hydrated, set state immediately
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }

    // Create a listener to update the state once hydration is complete.
    const unsubFinish = useAppStore.persist.onFinishHydration(() => {
      console.log("Zustand store hydrated successfully");
      setHydrated(true);
    });

    // Timeout fallback: if hydration doesn't complete in 3 seconds, proceed anyway
    // This prevents black screen on reload if there's an issue with persistence
    const timeout = setTimeout(() => {
      console.warn("Hydration timeout - proceeding without persisted state");
      setHydrated(true);
    }, 3000);

    return () => {
      // Cleanup the listener and timeout when the component unmounts.
      unsubFinish();
      clearTimeout(timeout);
    };
  }, []);

  return hydrated;
}
