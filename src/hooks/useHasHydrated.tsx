import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

/**
 * A custom hook that returns `true` once the Zustand store has been rehydrated
 * from localStorage, and `false` otherwise.
 *
 * This is essential for preventing UI flicker or hydration mismatches in client-rendered
 * applications where persisted state is loaded asynchronously.
 */
export function useHasHydrated() {
  const [hydrated, setHydrated] = useState(useAppStore.persist.hasHydrated);

  useEffect(() => {
    // Create a listener to update the state once hydration is complete.
    const unsubFinish = useAppStore.persist.onFinishHydration(() =>
      setHydrated(true)
    );

    return () => {
      // Cleanup the listener when the component unmounts.
      unsubFinish();
    };
  }, []);

  return hydrated;
}
