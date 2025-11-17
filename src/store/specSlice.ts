import type { StateCreator } from "zustand";
import type { AppState, SpecSlice, SecurityScheme } from "./types";
import * as sqlite from "@/lib/storage/sqliteRepository";
import type { DbWorkspace } from "@/types/backend";

export const createSpecSlice: StateCreator<AppState, [], [], SpecSlice> = (
  set,
  get
) => ({
  spec: null,
  specId: null,
  specUrl: null,
  operations: [],

  setSpec: async (spec, id, url) => {
    // Extract security schemes and update the auth store (active workspace)
    const schemes = spec.components?.securitySchemes || {};
    get().setAuthSchemes(schemes as Record<string, SecurityScheme>);

    // Update runtime state immediately
    set({
      spec,
      specId: id,
      specUrl: url || null,
      selected: null,
      operations: [],
      operationState: {},
    });

    // Persist spec to SQLite
    try {
      const specContent = JSON.stringify(spec);
      await sqlite.saveSpec(id, specContent);
      console.log("Spec saved to database:", id);
    } catch (error) {
      console.error("Failed to save spec to database:", error);
    }

    // Update workspace to reference this spec
    const activeId = get().activeWorkspaceId;
    if (activeId) {
      const ws = get().workspaces[activeId];
      if (ws) {
        // Update in-memory workspace
        if (ws.specId !== id || ws.specUrl !== url) {
          set((state) => ({
            workspaces: {
              ...state.workspaces,
              [activeId]: { ...ws, specId: id, specUrl: url || null },
            },
          }));
        }

        // Persist workspace update to database
        const dbWorkspace: DbWorkspace = {
          id: ws.id,
          name: ws.name,
          active_spec_id: id,
          active_environment_id: ws.data.activeEnvironmentId,
          base_url: ws.data.baseUrl || null,
          selected_operation_key: ws.data.selectedKey || null,
          sort_order: get().workspaceOrder.indexOf(activeId),
        };

        sqlite.updateWorkspace(dbWorkspace).catch((error) => {
          console.error(
            "Failed to update workspace with spec in database:",
            error
          );
        });
      }
    }
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
