import type { StateCreator } from "zustand";
import type {
  AppState,
  WorkspaceSlice,
  Workspace,
  WorkspaceData,
  AuthState,
} from "./types";
import * as sqlite from "@/lib/storage/sqliteRepository";
import type { DbWorkspace } from "@/types/backend";

const newAuthState = (): AuthState => ({
  schemes: {},
  values: {},
  environmentValues: {},
});

const emptyWorkspaceData = (): WorkspaceData => ({
  baseUrl: "",
  operationState: {},
  globalHeaders: {
    "User-Agent": "Plyt/1.0",
    Accept: "*/*",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
  },
  selectedKey: null,
  auth: newAuthState(),
  environments: {},
  environmentKeys: [],
  activeEnvironmentId: null,
  history: [],
});

const makeWorkspace = (name: string): Workspace => {
  const id = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name,
    specId: null,
    data: emptyWorkspaceData(),
  };
};

export const createWorkspaceSlice: StateCreator<
  AppState,
  [],
  [],
  WorkspaceSlice
> = (set, get) => ({
  workspaces: {},
  workspaceOrder: [],
  activeWorkspaceId: null,

  initializeAppState: async () => {
    try {
      // Load initial data from SQLite
      const data = await sqlite.loadInitialData();

      if (data.workspaces.length === 0) {
        // No workspaces exist, create a default one
        console.log("No workspaces found, creating default workspace");
        get().createWorkspace("Workspace 1");
        return;
      }

      // Build in-memory workspace structure from database rows
      const workspaces: Record<string, Workspace> = {};
      const workspaceOrder: string[] = [];

      for (const dbWs of data.workspaces) {
        workspaces[dbWs.id] = {
          id: dbWs.id,
          name: dbWs.name,
          specId: dbWs.active_spec_id,
          specUrl: null,
          data: emptyWorkspaceData(), // Will be populated when workspace is activated
        };
        workspaceOrder.push(dbWs.id);
      }

      // Set the first workspace as active by default
      const activeWorkspaceId = workspaceOrder[0] || null;

      set({
        workspaces,
        workspaceOrder,
        activeWorkspaceId,
      });

      // Load the active workspace data
      if (activeWorkspaceId) {
        await get().setActiveWorkspace(activeWorkspaceId);
      }

      console.log("App state initialized from SQLite", {
        workspaceCount: workspaceOrder.length,
        activeWorkspaceId,
      });
    } catch (error) {
      console.error("Failed to initialize app state from database:", error);
      // Fallback: create a default workspace
      get().createWorkspace("Workspace 1");
    }
  },

  createWorkspace: (name?: string) => {
    const ws = makeWorkspace(
      name?.trim() || `Workspace ${Object.keys(get().workspaces).length + 1}`
    );

    // Persist to SQLite
    const sortOrder = get().workspaceOrder.length;
    sqlite
      .createWorkspace(ws.id, ws.name, sortOrder)
      .then(() => {
        console.log("Workspace created in database:", ws.id);
      })
      .catch((error) => {
        console.error("Failed to create workspace in database:", error);
      });

    // Update in-memory state immediately for UI responsiveness
    set((state) => ({
      workspaces: { ...state.workspaces, [ws.id]: ws },
      workspaceOrder: [...state.workspaceOrder, ws.id],
      activeWorkspaceId: ws.id,
      // Clear runtime to be applied by __applyWorkspaceToRoot
      spec: null,
      specId: null,
      specUrl: null,
      operations: [],
      selected: null,
      selectedKey: null,
      globalHeaders: ws.data.globalHeaders || {},
      baseUrl: ws.data.baseUrl,
      operationState: ws.data.operationState,
      auth: ws.data.auth,
      environments: ws.data.environments,
      environmentKeys: ws.data.environmentKeys,
      activeEnvironmentId: ws.data.activeEnvironmentId,
      history: ws.data.history || [],
    }));

    // Ensure root reflects workspace fields
    get().__applyWorkspaceToRoot(ws.id);
    return ws.id;
  },

  renameWorkspace: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const ws = get().workspaces[id];
    if (!ws) return;

    // Update in database
    const dbWorkspace: DbWorkspace = {
      id: ws.id,
      name: trimmed,
      active_spec_id: ws.specId,
      active_environment_id: ws.data.activeEnvironmentId,
      base_url: ws.data.baseUrl || null,
      selected_operation_key: ws.data.selectedKey || null,
      sort_order: get().workspaceOrder.indexOf(id),
    };

    sqlite
      .updateWorkspace(dbWorkspace)
      .then(() => {
        console.log("Workspace renamed in database:", id);
      })
      .catch((error) => {
        console.error("Failed to rename workspace in database:", error);
      });

    // Update in-memory state
    set((state) => {
      const ws = state.workspaces[id];
      if (!ws) return state;
      return {
        workspaces: {
          ...state.workspaces,
          [id]: { ...ws, name: trimmed },
        },
      };
    });
  },

  removeWorkspace: async (id) => {
    // Delete from database (CASCADE will delete all related data)
    try {
      await sqlite.deleteWorkspace(id);
      console.log("Workspace deleted from database:", id);
    } catch (error) {
      console.error("Failed to delete workspace from database:", error);
    }

    // Update in-memory state
    set((state) => {
      if (!state.workspaces[id]) return state;
      const newWorkspaces = { ...state.workspaces };
      delete newWorkspaces[id];
      const newOrder = state.workspaceOrder.filter((x) => x !== id);
      const newActive =
        state.activeWorkspaceId === id
          ? newOrder[0] ?? null
          : state.activeWorkspaceId;
      return {
        workspaces: newWorkspaces,
        workspaceOrder: newOrder,
        activeWorkspaceId: newActive,
      };
    });

    const nextId = get().activeWorkspaceId;
    if (nextId) {
      get().__applyWorkspaceToRoot(nextId);
    } else {
      // No workspace left; clear runtime fields
      set({
        spec: null,
        specId: null,
        specUrl: null,
        operations: [],
        selected: null,
        selectedKey: null,
        globalHeaders: {},
        baseUrl: "",
        operationState: {},
        auth: newAuthState(),
        environments: {},
        environmentKeys: [],
        activeEnvironmentId: null,
        history: [],
      });
    }
  },

  setActiveWorkspace: async (id) => {
    if (id === null) return;

    // Update activeWorkspaceId immediately for UI
    set({ activeWorkspaceId: id });

    try {
      // Fetch full workspace data from SQLite
      const data = await sqlite.getFullWorkspaceData(id);
      if (!data) {
        console.error("Workspace not found:", id);
        return;
      }

      // Note: Spec parsing is handled separately when operations are loaded

      // Build environments map from database rows
      const environments: Record<
        string,
        { id: string; name: string; variables: Record<string, string> }
      > = {};
      for (const env of data.environments) {
        environments[env.id] = {
          id: env.id,
          name: env.name,
          variables: {},
        };
      }

      // Build variable keys array
      const environmentKeys = data.variableKeys.map((k) => k.key_name);

      // Populate variable values
      for (const varValue of data.variableValues) {
        const env = environments[varValue.environment_id];
        if (env) {
          const key = data.variableKeys.find(
            (k) => k.id === varValue.variable_key_id
          );
          if (key) {
            env.variables[key.key_name] = varValue.value;
          }
        }
      }

      // Ensure all environments have all keys
      for (const env of Object.values(environments)) {
        for (const key of environmentKeys) {
          if (!(key in env.variables)) {
            env.variables[key] = "";
          }
        }
      }

      // Build global headers map
      const globalHeaders: Record<string, string> = {};
      for (const header of data.globalHeaders) {
        globalHeaders[header.key] = header.value;
      }

      // Build auth state
      const authSchemes: Record<string, any> = {};
      const authValues: Record<string, Record<string, string>> = {};
      const authEnvironmentValues: Record<
        string,
        Record<string, Record<string, string>>
      > = {};

      for (const authValue of data.authValues) {
        try {
          const parsed = JSON.parse(authValue.value_json);
          if (authValue.environment_id === null) {
            // Global auth value
            authValues[authValue.scheme_name] = parsed;
          } else {
            // Per-environment auth value
            if (!authEnvironmentValues[authValue.environment_id]) {
              authEnvironmentValues[authValue.environment_id] = {};
            }
            authEnvironmentValues[authValue.environment_id][
              authValue.scheme_name
            ] = parsed;
          }
        } catch (error) {
          console.error("Failed to parse auth value:", error);
        }
      }

      // Build history
      const history: Array<{
        operationRef: any;
        timestamp: number;
        key: string;
      }> = [];
      // Note: We'll need to reconstruct operationRef from operation_key
      // For now, keep history minimal until we load operations
      for (const historyEntry of data.history) {
        history.push({
          operationRef: null as any, // Will be reconstructed when operations are loaded
          timestamp: historyEntry.timestamp,
          key: historyEntry.operation_key,
        });
      }

      // Build operation state map
      const operationState: Record<string, any> = {};
      // Operation states are loaded on-demand, not during workspace switch

      // Update the workspace in the store
      const workspace: Workspace = {
        id: data.workspace.id,
        name: data.workspace.name,
        specId: data.workspace.active_spec_id,
        specUrl: null, // TODO: Store spec URL in database if needed
        data: {
          baseUrl: data.workspace.base_url || "",
          globalHeaders,
          operationState,
          selectedKey: data.workspace.selected_operation_key,
          auth: {
            schemes: authSchemes,
            values: authValues,
            environmentValues: authEnvironmentValues,
          },
          environments,
          environmentKeys,
          activeEnvironmentId: data.workspace.active_environment_id,
          history,
        },
      };

      // Update in-memory state
      set((state) => ({
        workspaces: {
          ...state.workspaces,
          [id]: workspace,
        },
        activeWorkspaceId: id,
      }));

      // Apply workspace data to root state
      get().__applyWorkspaceToRoot(id);

      console.log("Workspace loaded from database:", id);
    } catch (error) {
      console.error("Failed to load workspace from database:", error);
    }
  },

  __applyWorkspaceToRoot: (id) => {
    const ws = get().workspaces[id];
    if (!ws) return;

    // Migrate legacy workspaces: ensure auth has environmentValues field
    const migratedAuth = {
      ...ws.data.auth,
      environmentValues: ws.data.auth.environmentValues || {},
    };

    set({
      spec: null, // will be loaded separately
      specId: ws.specId,
      specUrl: ws.specUrl || null,
      operations: [],
      selected: null,
      selectedKey: ws.data.selectedKey ?? null,
      globalHeaders: ws.data.globalHeaders || {},
      baseUrl: ws.data.baseUrl,
      operationState: ws.data.operationState,
      auth: migratedAuth,
      environments: ws.data.environments,
      environmentKeys: ws.data.environmentKeys,
      activeEnvironmentId: ws.data.activeEnvironmentId,
      history: ws.data.history || [],
    });

    // Persist the migration back to the workspace
    if (!ws.data.auth.environmentValues) {
      set((state) => ({
        workspaces: {
          ...state.workspaces,
          [id]: {
            ...ws,
            data: {
              ...ws.data,
              auth: migratedAuth,
            },
          },
        },
      }));
    }
  },
});
