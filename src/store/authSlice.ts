import type { StateCreator } from "zustand";
import type { AppState, AuthSlice, AuthState } from "./types";

const initialAuthState: AuthState = {
  schemes: {},
  values: {},
  environmentValues: {},
};

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (
  set
) => ({
  auth: initialAuthState,
  /**
   * Updates the security schemes and preserves existing auth values.
   *
   * This is called when a spec is loaded/reloaded. It:
   * 1. Preserves auth values for schemes that still exist in the new spec
   * 2. Removes auth values for schemes no longer in the spec
   * 3. Syncs the changes to the active workspace for persistence
   *
   * Auth data is persisted to localStorage via the workspace container,
   * ensuring credentials survive page refreshes and spec reloads.
   */
  setAuthSchemes: (schemes) => {
    set((state) => {
      // Preserve existing values for schemes that still exist in the new spec
      const preservedValues: Record<string, Record<string, string>> = {};
      const newSchemeNames = Object.keys(schemes);

      for (const [schemeName, schemeValue] of Object.entries(
        state.auth.values
      )) {
        if (newSchemeNames.includes(schemeName)) {
          preservedValues[schemeName] = schemeValue;
        }
      }

      // Preserve environment-specific auth values for schemes that still exist
      const preservedEnvValues: Record<
        string,
        Record<string, Record<string, string>>
      > = {};
      // Handle legacy workspaces that don't have environmentValues
      if (state.auth.environmentValues) {
        for (const [envId, envAuthValues] of Object.entries(
          state.auth.environmentValues
        )) {
          preservedEnvValues[envId] = {};
          for (const [schemeName, schemeValue] of Object.entries(
            envAuthValues
          )) {
            if (newSchemeNames.includes(schemeName)) {
              preservedEnvValues[envId][schemeName] = schemeValue;
            }
          }
        }
      }

      const nextAuth = {
        ...state.auth,
        schemes,
        values: preservedValues,
        environmentValues: preservedEnvValues,
      };

      // Sync to active workspace for persistence (via zustand persist middleware)
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
  /**
   * Updates the auth value for a specific security scheme (global/no environment).
   *
   * This is called when the user enters credentials in the Auth page with no environment.
   * Changes are immediately synced to the workspace for persistence.
   */
  setAuthValue: (schemeName, value) => {
    set((state) => {
      const nextAuth = {
        ...state.auth,
        values: {
          ...state.auth.values,
          [schemeName]: value,
        },
      };

      // Sync to active workspace for persistence
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
  /**
   * Updates the auth value for a specific security scheme in a specific environment.
   *
   * This is called when the user enters credentials in the Auth page for a specific environment.
   * Changes are immediately synced to the workspace for persistence.
   */
  setAuthValueForEnvironment: (environmentId, schemeName, value) => {
    set((state) => {
      // Ensure environmentValues exists (for legacy workspaces)
      const currentEnvValues = state.auth.environmentValues || {};

      const nextAuth = {
        ...state.auth,
        environmentValues: {
          ...currentEnvValues,
          [environmentId]: {
            ...(currentEnvValues[environmentId] || {}),
            [schemeName]: value,
          },
        },
      };

      // Sync to active workspace for persistence
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
  /**
   * Clears all auth schemes and values.
   *
   * This completely resets the auth state and syncs to the workspace.
   */
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
