import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSpecSlice } from "./specSlice";
import { createRequestSlice } from "./requestSlice";
import { createUiSlice } from "./uiSlice";
import { createAuthSlice } from "./authSlice";
import type { AppState } from "./types";
import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";

// Utility to resolve server variables in a server URL
function resolveServerVariables(
  url: string,
  variables?: Record<
    string,
    OpenAPIV3.ServerVariableObject | OpenAPIV3_1.ServerVariableObject
  >
): string {
  if (!variables) return url;

  let resolvedUrl = url;
  for (const [name, variable] of Object.entries(variables)) {
    const value = variable.default || variable.enum?.[0] || "";
    resolvedUrl = resolvedUrl.replace(`{${name}}`, String(value));
  }
  return resolvedUrl;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get, api) => ({
      ...createSpecSlice(set, get, api),
      ...createRequestSlice(set, get, api),
      ...createUiSlice(set, get, api),
      ...createAuthSlice(set, get, api),
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
