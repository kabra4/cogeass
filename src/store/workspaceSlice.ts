import type { StateCreator } from "zustand";
import type { AppState, WorkspaceSlice, Workspace, WorkspaceData, AuthState } from "./types";

const newAuthState = (): AuthState => ({
  schemes: {},
  values: {},
});

const emptyWorkspaceData = (): WorkspaceData => ({
  baseUrl: "",
  operationState: {},
  selectedKey: null,
  auth: newAuthState(),
  environments: {},
  environmentKeys: [],
  activeEnvironmentId: null,
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

export const createWorkspaceSlice: StateCreator<AppState, [], [], WorkspaceSlice> = (
  set,
  get
) => ({
  workspaces: {},
  workspaceOrder: [],
  activeWorkspaceId: null,

  createWorkspace: (name?: string) => {
    const ws = makeWorkspace(name?.trim() || `Workspace ${Object.keys(get().workspaces).length + 1}`);
    set((state) => ({
      workspaces: { ...state.workspaces, [ws.id]: ws },
      workspaceOrder: [...state.workspaceOrder, ws.id],
      activeWorkspaceId: ws.id,
      // Clear runtime to be applied by __applyWorkspaceToRoot
      spec: null,
      specId: null,
      operations: [],
      selected: null,
      selectedKey: null,
      baseUrl: ws.data.baseUrl,
      operationState: ws.data.operationState,
      auth: ws.data.auth,
      environments: ws.data.environments,
      environmentKeys: ws.data.environmentKeys,
      activeEnvironmentId: ws.data.activeEnvironmentId,
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

  removeWorkspace: (id) => {
    set((state) => {
      if (!state.workspaces[id]) return state;
      const newWorkspaces = { ...state.workspaces };
      delete newWorkspaces[id];
      const newOrder = state.workspaceOrder.filter((x) => x !== id);
      const newActive = state.activeWorkspaceId === id ? newOrder[0] ?? null : state.activeWorkspaceId;
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
        operations: [],
        selected: null,
        selectedKey: null,
        baseUrl: "",
        operationState: {},
        auth: newAuthState(),
        environments: {},
        environmentKeys: [],
        activeEnvironmentId: null,
      });
    }
  },

  setActiveWorkspace: (id) => {
    if (id === null) return;
    const ws = get().workspaces[id];
    if (!ws) return;
    set({ activeWorkspaceId: id });
    get().__applyWorkspaceToRoot(id);
  },

  __applyWorkspaceToRoot: (id) => {
    const ws = get().workspaces[id];
    if (!ws) return;
    set({
      spec: null, // will be loaded separately
      specId: ws.specId,
      operations: [],
      selected: null,
      selectedKey: ws.data.selectedKey ?? null,
      baseUrl: ws.data.baseUrl,
      operationState: ws.data.operationState,
      auth: ws.data.auth,
      environments: ws.data.environments,
      environmentKeys: ws.data.environmentKeys,
      activeEnvironmentId: ws.data.activeEnvironmentId,
    });
  },
});
