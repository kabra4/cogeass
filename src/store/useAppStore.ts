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
        environmentKeys: state.environmentKeys,
        activeEnvironmentId: state.activeEnvironmentId,
      }),
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<AppState>;
        const envs = state.environments || {};

        // If environmentKeys are missing (old persisted data), compute union.
        let keys = state.environmentKeys;
        if (!keys) {
          const set = new Set<string>();
          Object.values(envs).forEach((env) => {
            Object.keys(env.variables || {}).forEach((k) => set.add(k));
          });
          keys = Array.from(set);
        }

        // Normalize all environments to have exactly keys[].
        const normalizedEnvs: typeof envs = {};
        for (const [id, env] of Object.entries(envs)) {
          const normalizedVars: Record<string, string> = {};
          for (const k of keys) {
            normalizedVars[k] = env.variables?.[k] ?? "";
          }
          normalizedEnvs[id] = { ...env, variables: normalizedVars };
        }

        return {
          ...currentState,
          ...state,
          environmentKeys: keys,
          environments: normalizedEnvs,
        };
      },
    }
  )
);
