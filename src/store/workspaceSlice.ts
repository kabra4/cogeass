import type { StateCreator } from "zustand";
import type {
  AppState,
  WorkspaceSlice,
  Workspace,
  WorkspaceData,
  AuthState,
  SecurityScheme,
  HistoryItem,
  OperationRef,
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
      console.log("Loading initial data from SQLite...");
      const data = await sqlite.loadInitialData();
      console.log("Initial data loaded:", {
        workspaceCount: data.workspaces.length,
      });

      if (data.workspaces.length === 0) {
        console.log("No workspaces found. Waiting for user creation.");
        set({
          workspaces: {},
          workspaceOrder: [],
          activeWorkspaceId: null,
        });
        return;
      }

      const workspaces: Record<string, Workspace> = {};
      const workspaceOrder: string[] = [];

      for (const dbWs of data.workspaces) {
        workspaces[dbWs.id] = {
          id: dbWs.id,
          name: dbWs.name,
          specId: dbWs.active_spec_id,
          specUrl: dbWs.spec_url,
          data: emptyWorkspaceData(),
        };
        workspaceOrder.push(dbWs.id);
      }

      // Set the first workspace as active by default
      const activeWorkspaceId = workspaceOrder[0] || null;
      set({ workspaces, workspaceOrder, activeWorkspaceId });

      if (activeWorkspaceId) {
        await get().setActiveWorkspace(activeWorkspaceId);
      }
    } catch (error) {
      console.error("Failed to initialize app state from database:", error);
      // Even on error, do not auto-create a workspace. Let the UI handle empty state.
      set({ workspaces: {}, workspaceOrder: [], activeWorkspaceId: null });
    }
  },

  createWorkspace: (name?: string) => {
    const ws = makeWorkspace(
      name?.trim() || `Workspace ${Object.keys(get().workspaces).length + 1}`
    );

    const sortOrder = get().workspaceOrder.length;
    sqlite
      .createWorkspace(ws.id, ws.name, sortOrder)
      .then(() => console.log("Workspace created in database:", ws.id))
      .catch((error) =>
        console.error("Failed to create workspace in database:", error)
      );

    set((state) => ({
      workspaces: { ...state.workspaces, [ws.id]: ws },
      workspaceOrder: [...state.workspaceOrder, ws.id],
      activeWorkspaceId: ws.id,
      // Clear runtime state
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

    get().__applyWorkspaceToRoot(ws.id);
    return ws.id;
  },

  renameWorkspace: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const ws = get().workspaces[id];
    if (!ws) return;

    const dbWorkspace: DbWorkspace = {
      id: ws.id,
      name: trimmed,
      active_spec_id: ws.specId,
      active_environment_id: ws.data.activeEnvironmentId,
      base_url: ws.data.baseUrl || null,
      selected_operation_key: ws.data.selectedKey || null,
      sort_order: get().workspaceOrder.indexOf(id),
      spec_url: ws.specUrl || null,
    };

    sqlite.updateWorkspace(dbWorkspace).catch((error) => {
      console.error("Failed to rename workspace in database:", error);
    });

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
    try {
      await sqlite.deleteWorkspace(id);
    } catch (error) {
      console.error("Failed to delete workspace from database:", error);
    }

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
    if (id === null) {
      set({ activeWorkspaceId: null });
      return;
    }

    set({ activeWorkspaceId: id });

    try {
      const data = await sqlite.getFullWorkspaceData(id);
      if (!data) return;

      const environments: Record<string, any> = {};
      for (const env of data.environments) {
        environments[env.id] = {
          id: env.id,
          name: env.name,
          variables: {},
        };
      }

      const environmentKeys = data.variableKeys.map((k) => k.key_name);

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

      for (const env of Object.values(environments)) {
        for (const key of environmentKeys) {
          if (!(key in env.variables)) {
            env.variables[key] = "";
          }
        }
      }

      const globalHeaders: Record<string, string> = {};
      for (const header of data.globalHeaders) {
        globalHeaders[header.key] = header.value;
      }

      const authSchemes: Record<string, SecurityScheme> = {};
      const authValues: Record<string, any> = {};
      const authEnvironmentValues: Record<string, any> = {};

      for (const authValue of data.authValues) {
        try {
          const parsed = JSON.parse(authValue.value_json);
          if (authValue.environment_id === null) {
            authValues[authValue.scheme_name] = parsed;
          } else {
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

      const history: HistoryItem[] = [];
      const limitedHistory = data.history.slice(0, 5);
      for (const historyEntry of limitedHistory) {
        history.push({
          operationRef: null as unknown as OperationRef,
          timestamp: historyEntry.timestamp,
          key: historyEntry.operation_key,
        });
      }

      console.log("setActiveWorkspace: loaded workspace data", {
        id: data.workspace.id,
        spec_url: data.workspace.spec_url,
        active_spec_id: data.workspace.active_spec_id,
      });

      const workspace: Workspace = {
        id: data.workspace.id,
        name: data.workspace.name,
        specId: data.workspace.active_spec_id,
        specUrl: data.workspace.spec_url,
        data: {
          baseUrl: data.workspace.base_url || "",
          globalHeaders,
          operationState: {},
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

      set((state) => ({
        workspaces: { ...state.workspaces, [id]: workspace },
        activeWorkspaceId: id,
      }));

      get().__applyWorkspaceToRoot(id);
    } catch (error) {
      console.error("Failed to load workspace from database:", error);
    }
  },

  __applyWorkspaceToRoot: (id) => {
    const ws = get().workspaces[id];
    if (!ws) return;

    console.log("__applyWorkspaceToRoot: applying workspace", {
      id: ws.id,
      specId: ws.specId,
      specUrl: ws.specUrl,
    });

    const migratedAuth = {
      ...ws.data.auth,
      environmentValues: ws.data.auth.environmentValues || {},
    };

    set({
      spec: null,
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
  },
});
