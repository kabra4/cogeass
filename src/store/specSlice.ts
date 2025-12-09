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

    const activeId = get().activeWorkspaceId;
    let nextWorkspaces = get().workspaces;

    // Prepare workspace update immediately
    if (activeId && nextWorkspaces[activeId]) {
      const ws = nextWorkspaces[activeId];
      if (ws.specId !== id || ws.specUrl !== url) {
        nextWorkspaces = {
          ...nextWorkspaces,
          [activeId]: { ...ws, specId: id, specUrl: url || null },
        };
      }
    }

    // Update runtime state AND workspace state immediately
    // This prevents race conditions where the UI effect sees a mismatch
    // between specId and workspace.specId
    set({
      spec,
      specId: id,
      specUrl: url || null,
      selected: null,
      operations: [],
      operationState: {},
      workspaces: nextWorkspaces,
    });

    // Persist spec to SQLite
    try {
      const specContent = JSON.stringify(spec);
      await sqlite.saveSpec(id, specContent);
      console.log("Spec saved to database:", id);
    } catch (error) {
      console.error("Failed to save spec to database:", error);
    }

    // Persist workspace update to database
    if (activeId) {
      const ws = get().workspaces[activeId];
      if (ws) {
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

    // Reconstruct history operationRefs from operation keys
    const history = get().history;
    if (history.length > 0) {
      const reconstructedHistory = history.map((item) => {
        if (item.operationRef === null) {
          // Find matching operation by key
          const op = ops.find(
            (o) =>
              `${o.method}:${o.path}`.toLowerCase() === item.key.toLowerCase()
          );
          return op ? { ...item, operationRef: op } : item;
        }
        return item;
      });

      // Only update if we actually reconstructed some items
      const hasChanges = reconstructedHistory.some(
        (item, idx) => item.operationRef !== history[idx].operationRef
      );

      if (hasChanges) {
        set({ history: reconstructedHistory });
        console.log("Reconstructed history operationRefs from operations");
      }
    }
  },
});
