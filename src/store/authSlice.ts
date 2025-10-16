import type { StateCreator } from "zustand";
import type { AppState, AuthSlice, AuthState } from "./types";

const initialAuthState: AuthState = {
  schemes: {},
  values: {},
};

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (
  set
) => ({
  auth: initialAuthState,
  setAuthSchemes: (schemes) => {
    set((state) => {
      const nextAuth = {
        ...state.auth,
        schemes,
        // Reset values to avoid stale data from a previous spec
        values: {},
      };
      // Also copy to active workspace
      const wsId = state.activeWorkspaceId;
      let updatedWorkspaces = state.workspaces;
      if (wsId && state.workspaces[wsId]) {
        const ws = state.workspaces[wsId];
        updatedWorkspaces = {
          ...state.workspaces,
          [wsId]: { ...ws, data: { ...ws.data, auth: nextAuth } },
        };
      }
      return { auth: nextAuth, workspaces: updatedWorkspaces };
    });
  },
  setAuthValue: (schemeName, value) => {
    set((state) => {
      const nextAuth = {
        ...state.auth,
        values: {
          ...state.auth.values,
          [schemeName]: value,
        },
      };
      const wsId = state.activeWorkspaceId;
      let updatedWorkspaces = state.workspaces;
      if (wsId && state.workspaces[wsId]) {
        const ws = state.workspaces[wsId];
        updatedWorkspaces = {
          ...state.workspaces,
          [wsId]: { ...ws, data: { ...ws.data, auth: nextAuth } },
        };
      }
      return { auth: nextAuth, workspaces: updatedWorkspaces };
    });
  },
  clearAuth: () =>
    set((state) => {
      const wsId = state.activeWorkspaceId;
      let updatedWorkspaces = state.workspaces;
      if (wsId && state.workspaces[wsId]) {
        const ws = state.workspaces[wsId];
        updatedWorkspaces = {
          ...state.workspaces,
          [wsId]: { ...ws, data: { ...ws.data, auth: initialAuthState } },
        };
      }
      return { auth: initialAuthState, workspaces: updatedWorkspaces };
    }),
});
