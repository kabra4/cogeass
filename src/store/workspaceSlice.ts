import type { StateCreator } from "zustand";
import type {
  AppState,
  WorkspaceSlice,
  Workspace,
  WorkspaceData,
  AuthState,
} from "./types";
import { operationRepository } from "@/lib/storage/OperationRepository";

const newAuthState = (): AuthState => ({
  schemes: {},
  values: {},
});

const emptyWorkspaceData = (): WorkspaceData => ({
  baseUrl: "",
  operationState: {},
  globalHeaders: {},
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

  createWorkspace: (name?: string) => {
    const ws = makeWorkspace(
      name?.trim() || `Workspace ${Object.keys(get().workspaces).length + 1}`
    );
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
    // Clean up IndexedDB for this workspace
    try {
      await operationRepository.deleteWorkspaceOperations(id);
    } catch (error) {
      console.error(
        "Failed to clean up workspace operations from IndexedDB:",
        error
      );
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

  setActiveWorkspace: (id) => {
    if (id === null) return;
    const ws = get().workspaces[id];
    if (!ws) return;

    // Clear current operation states before switching
    set({
      activeWorkspaceId: id,
      operationState: {},
    });

    get().__applyWorkspaceToRoot(id);

    // If there's a selected operation, load its data from IndexedDB
    if (ws.data.selectedKey) {
      get().loadOperationFromDB(ws.data.selectedKey);
    }
  },

  __applyWorkspaceToRoot: (id) => {
    const ws = get().workspaces[id];
    if (!ws) return;
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
      auth: ws.data.auth,
      environments: ws.data.environments,
      environmentKeys: ws.data.environmentKeys,
      activeEnvironmentId: ws.data.activeEnvironmentId,
      history: ws.data.history || [],
    });
  },
});
