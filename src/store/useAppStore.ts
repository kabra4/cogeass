import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSpecSlice } from "./specSlice";
import { createRequestSlice } from "./requestSlice";
import { createUiSlice } from "./uiSlice";
import { createAuthSlice } from "./authSlice";
import { createEnvironmentSlice } from "./environmentSlice";
import { createWorkspaceSlice } from "./workspaceSlice";
import { createHistorySlice } from "./historySlice";
import type { AppState } from "./types";

export const useAppStore = create<AppState>()(
  persist(
    (set, get, api) => ({
      ...createWorkspaceSlice(set, get, api),
      ...createSpecSlice(set, get, api),
      ...createRequestSlice(set, get, api),
      ...createUiSlice(set, get, api),
      ...createAuthSlice(set, get, api),
      ...createEnvironmentSlice(set, get, api),
      ...createHistorySlice(set, get, api),
    }),
    {
      name: "cogeass-storage",
      // Persist only workspace container; runtime (spec, ops) are derived, not persisted.
      partialize: (state) => {
        // Only persist minimal UI state - all data is now in SQLite
        return {
          workspaceOrder: state.workspaceOrder,
          activeWorkspaceId: state.activeWorkspaceId,
        };
      },
      merge: (persistedState, currentState) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const persisted = persistedState as any;
        const next = { ...currentState } as AppState;

        // Only restore UI state - data will be loaded from SQLite
        next.workspaceOrder = (persisted?.workspaceOrder as string[]) || [];
        next.activeWorkspaceId =
          (persisted?.activeWorkspaceId as string) || null;

        return next;
      },
    }
  )
);
