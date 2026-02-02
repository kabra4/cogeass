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
    // If spec is null, we are unloading. Skip extraction.
    if (spec) {
      // Extract security schemes and update the auth store (active workspace)
      const schemes = spec.components?.securitySchemes || {};
      get().setAuthSchemes(schemes as Record<string, SecurityScheme>);

      // NEW: Handle Base URL auto-population
      const servers =
        ((spec as Record<string, unknown>).servers as {
          url?: string;
          description?: string;
        }[]) || [];
      if (Array.isArray(servers) && servers.length > 0 && servers[0].url) {
        // We perform this update immediately to reflect in the UI
        get().setBaseUrl(servers[0].url);
      } else if (
        url &&
        (url.startsWith("http://") || url.startsWith("https://"))
      ) {
        try {
          const urlObject = new URL(url);
          const newBaseUrl = `${urlObject.protocol}//${urlObject.host}`;
          get().setBaseUrl(newBaseUrl);
        } catch (e) {
          console.warn("Could not construct base URL from spec URL", e);
        }
      }
    }

    const activeId = get().activeWorkspaceId;
    let nextWorkspaces = get().workspaces;

    // Prepare workspace update immediately
    // We update even if spec is null (to clear specId from workspace)
    if (activeId && nextWorkspaces[activeId]) {
      const ws = nextWorkspaces[activeId];
      // If spec is null, id should be null (or ignored)
      const nextSpecId = spec ? id : null;
      const nextSpecUrl = spec ? url || null : null;

      if (ws.specId !== nextSpecId || ws.specUrl !== nextSpecUrl) {
        nextWorkspaces = {
          ...nextWorkspaces,
          [activeId]: { ...ws, specId: nextSpecId, specUrl: nextSpecUrl },
        };
      }
    }

    // Update runtime state AND workspace state immediately
    set({
      spec,
      specId: spec ? id : null,
      specUrl: spec ? url || null : null,
      selected: null,
      operations: [],
      operationState: {},
      workspaces: nextWorkspaces,
    });

    // Persist spec to SQLite (only if valid)
    if (spec && id) {
      try {
        const specContent = JSON.stringify(spec);
        await sqlite.saveSpec(id, specContent);
        console.log("Spec saved to database:", id);
      } catch (error) {
        console.error("Failed to save spec to database:", error);
      }
    }

    // Persist workspace update to database
    if (activeId) {
      const ws = get().workspaces[activeId];
      if (ws) {
        const dbWorkspace: DbWorkspace = {
          id: ws.id,
          name: ws.name,
          active_spec_id: spec ? id : null,
          active_environment_id: ws.data.activeEnvironmentId,
          base_url: ws.data.baseUrl || null,
          selected_operation_key: ws.data.selectedKey || null,
          sort_order: get().workspaceOrder.indexOf(activeId),
          spec_url: spec ? url || null : null,
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
