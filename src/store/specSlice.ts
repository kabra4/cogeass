import type { StateCreator } from "zustand";
import type { AppState, SpecSlice } from "./types";

export const createSpecSlice: StateCreator<AppState, [], [], SpecSlice> = (
  set,
  get
) => ({
  spec: null,
  specId: null,
  operations: [],
  setSpec: (spec, id) => {
    // Extract security schemes and update the auth store
    const schemes = spec.components?.securitySchemes || {};
    get().setAuthSchemes(schemes as any);

    // Reset workspace state
    set({ spec, specId: id, selected: null, operationState: {} });
  },
  setOperations: (ops) => set({ operations: ops }),
});
