import type { StateCreator } from "zustand";
import type { AppState, AuthSlice, AuthState } from "./types";
import * as sqlite from "@/lib/storage/sqliteRepository";

const initialAuthState: AuthState = {
  schemes: {},
  values: {},
  environmentValues: {},
};

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (
  set,
  get
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
   * Auth data is persisted to SQLite database.
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
   * Updates the auth value for a specific security scheme (global/no environment).
   *
   * This is called when the user enters credentials in the Auth page with no environment.
   * Changes are persisted to SQLite.
   */
  setAuthValue: (schemeName, value) => {
    const wsId = get().activeWorkspaceId;

    // 1. Update in-memory state immediately
    set((state) => {
      const nextAuth = {
        ...state.auth,
        values: {
          ...state.auth.values,
          [schemeName]: value,
        },
      };

      // Sync to active workspace
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

    // 2. Persist to SQLite (global auth, environment_id = null)
    if (wsId) {
      sqlite
        .setAuthValue(wsId, null, schemeName, JSON.stringify(value))
        .then(() => {
          console.log("Global auth value saved to database:", schemeName);
        })
        .catch((error) => {
          console.error("Failed to save global auth value to database:", error);
        });
    }
  },

  /**
   * Updates the auth value for a specific security scheme in a specific environment.
   *
   * This is called when the user enters credentials in the Auth page for a specific environment.
   * Changes are persisted to SQLite.
   */
  setAuthValueForEnvironment: (environmentId, schemeName, value) => {
    const wsId = get().activeWorkspaceId;

    // 1. Update in-memory state immediately
    set((state) => {
      // Ensure environmentValues exists
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

      // Sync to active workspace
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

    // 2. Persist to SQLite (per-environment auth)
    if (wsId) {
      sqlite
        .setAuthValue(wsId, environmentId, schemeName, JSON.stringify(value))
        .then(() => {
          console.log(
            "Environment auth value saved to database:",
            schemeName,
            "for env:",
            environmentId
          );
        })
        .catch((error) => {
          console.error(
            "Failed to save environment auth value to database:",
            error
          );
        });
    }
  },

  /**
   * Clears all auth schemes and values.
   *
   * This completely resets the auth state and syncs to the workspace.
   */
  clearAuth: () => {
    const wsId = get().activeWorkspaceId;

    set((state) => {
      let updatedWorkspaces = state.workspaces;
      if (wsId && state.workspaces[wsId]) {
        const ws = state.workspaces[wsId];
        updatedWorkspaces = {
          ...state.workspaces,
          [wsId]: { ...ws, data: { ...ws.data, auth: initialAuthState } },
        };
      }
      return { auth: initialAuthState, workspaces: updatedWorkspaces };
    });

    // Note: Clearing auth from database would require deleting all auth_values for the workspace
    // This is not implemented as auth values are typically overridden, not cleared
    // If needed, could call a new repository function like clearAllAuthValues(wsId)
  },
});
