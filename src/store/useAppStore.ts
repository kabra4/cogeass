import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSpecSlice } from "./specSlice";
import { createRequestSlice } from "./requestSlice";
import { createUiSlice } from "./uiSlice";
import { createAuthSlice } from "./authSlice";
import { createEnvironmentSlice } from "./environmentSlice";
import type { AppState } from "./types";

export const useAppStore = create<AppState>()(
  persist(
    (set, get, api) => ({
      ...createSpecSlice(set, get, api),
      ...createRequestSlice(set, get, api),
      ...createUiSlice(set, get, api),
      ...createAuthSlice(set, get, api),
      ...createEnvironmentSlice(set, get, api),
    }),
    {
      name: "cogeass-storage",
      // Persist only lightweight, user-generated data.
      // The full 'spec' and 'operations' are derived, not persisted.
      partialize: (state) => ({
        specId: state.specId,
        selected: state.selected,
        baseUrl: state.baseUrl,
        operationState: state.operationState,
        auth: state.auth,
        environments: state.environments,
        activeEnvironmentId: state.activeEnvironmentId,
      }),
      // Custom merge logic for handling spec/base URL initialization
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<AppState>;
        // If baseUrl is empty after hydration, try to derive it from spec
        // (This logic needs to be triggered after the spec is auto-loaded in App.tsx)
        // For now, a direct merge is fine.
        return { ...currentState, ...state };
      },
    }
  )
);
