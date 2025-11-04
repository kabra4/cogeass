import type { StateCreator } from "zustand";
import type { AppState, SpecSlice, SecurityScheme } from "./types";

export const createSpecSlice: StateCreator<AppState, [], [], SpecSlice> = (
  set,
  get
) => ({
  spec: null,
  specId: null,
  specUrl: null,
  operations: [],
  setSpec: (spec, id, url) => {
    // Extract security schemes and update the auth store (active workspace)
    const schemes = spec.components?.securitySchemes || {};
    get().setAuthSchemes(schemes as Record<string, SecurityScheme>);

    // Update runtime and persist specId and specUrl into the active workspace
    const activeId = get().activeWorkspaceId;
    if (activeId) {
      const ws = get().workspaces[activeId];
      if (ws && (ws.specId !== id || ws.specUrl !== url)) {
        set((state) => ({
          workspaces: {
            ...state.workspaces,
            [activeId]: { ...ws, specId: id, specUrl: url || null },
          },
        }));
      }
    }
    set({
      spec,
      specId: id,
      specUrl: url || null,
      selected: null,
      operations: [],
      operationState: {},
    });
  },
  setOperations: (ops) => {
    set({ operations: ops });
    // Attempt to restore selected from selectedKey for active workspace
    const selectedKey = get().selectedKey;
    if (selectedKey) {
      const found = ops.find(
        (o) =>
          `${o.method}:${o.path}`.toLowerCase() === selectedKey.toLowerCase()
      );
      if (found) {
        set({ selected: found });
      }
    }
  },
});
