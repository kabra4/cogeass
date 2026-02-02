import type { StateCreator } from "zustand";
import type { AppState, EnvironmentSlice, Environment } from "./types";
import * as sqlite from "@/lib/storage/sqliteRepository";
import type { DbWorkspace } from "@/types/backend";

// Generate a unique ID for environments
const generateId = () =>
  `env_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const createEnvironmentSlice: StateCreator<
  AppState,
  [],
  [],
  EnvironmentSlice
> = (set, get) => ({
  environments: {},
  environmentKeys: [],
  activeEnvironmentId: null,

  addEnvironment: (name: string) => {
    const id = generateId();
    const keys = get().environmentKeys || [];
    const wsId = get().activeWorkspaceId;

    const newEnvironment: Environment = {
      id,
      name,
      variables: Object.fromEntries(keys.map((k) => [k, ""])),
    };

    // 1. Update in-memory state immediately
    set((state) => {
      const nextEnvs = {
        ...state.environments,
        [id]: newEnvironment,
      };

      // Initialize empty auth values for this environment
      const nextAuth = {
        ...state.auth,
        environmentValues: {
          ...(state.auth.environmentValues || {}),
          [id]: {},
        },
      };

      let updatedWorkspaces = state.workspaces;
      if (wsId && state.workspaces[wsId]) {
        const ws = state.workspaces[wsId];
        updatedWorkspaces = {
          ...state.workspaces,
          [wsId]: {
            ...ws,
            data: {
              ...ws.data,
              environments: nextEnvs,
              auth: nextAuth,
            },
          },
        };
      }
      return {
        environments: nextEnvs,
        auth: nextAuth,
        workspaces: updatedWorkspaces,
      };
    });

    // 2. Persist to SQLite
    if (wsId) {
      sqlite
        .createEnvironment(id, wsId, name)
        .then(() => {
          console.log("Environment created in database:", id);
        })
        .catch((error) => {
          console.error("Failed to create environment in database:", error);
        });
    }

    return id;
  },

  removeEnvironment: (id: string) => {
    // 1. Delete from database first (CASCADE will remove variable values)
    sqlite
      .deleteEnvironment(id)
      .then(() => {
        console.log("Environment deleted from database:", id);
      })
      .catch((error) => {
        console.error("Failed to delete environment from database:", error);
      });

    // 2. Update in-memory state
    set((state) => {
      const newEnvironments = { ...state.environments };
      delete newEnvironments[id];

      const newActive =
        state.activeEnvironmentId === id ? null : state.activeEnvironmentId;

      // Remove auth values for this environment
      const newEnvAuthValues = { ...(state.auth.environmentValues || {}) };
      delete newEnvAuthValues[id];

      const nextAuth = {
        ...state.auth,
        environmentValues: newEnvAuthValues,
      };

      let updatedWorkspaces = state.workspaces;
      const wsId = state.activeWorkspaceId;
      if (wsId && state.workspaces[wsId]) {
        const ws = state.workspaces[wsId];
        updatedWorkspaces = {
          ...state.workspaces,
          [wsId]: {
            ...ws,
            data: {
              ...ws.data,
              environments: newEnvironments,
              activeEnvironmentId: newActive,
              auth: nextAuth,
            },
          },
        };
      }

      return {
        environments: newEnvironments,
        activeEnvironmentId: newActive,
        auth: nextAuth,
        workspaces: updatedWorkspaces,
      };
    });
  },

  setActiveEnvironment: (id: string | null) => {
    const wsId = get().activeWorkspaceId;

    // 1. Update in-memory state immediately
    set((state) => {
      let updatedWorkspaces = state.workspaces;
      if (wsId && state.workspaces[wsId]) {
        const ws = state.workspaces[wsId];
        updatedWorkspaces = {
          ...state.workspaces,
          [wsId]: {
            ...ws,
            data: { ...ws.data, activeEnvironmentId: id },
          },
        };
      }
      return { activeEnvironmentId: id, workspaces: updatedWorkspaces };
    });

    // 2. Persist to database
    if (wsId) {
      const ws = get().workspaces[wsId];
      if (ws) {
        const dbWorkspace: DbWorkspace = {
          id: ws.id,
          name: ws.name,
          active_spec_id: ws.specId,
          active_environment_id: id,
          base_url: ws.data.baseUrl || null,
          selected_operation_key: ws.data.selectedKey || null,
          sort_order: get().workspaceOrder.indexOf(wsId),
          spec_url: ws.specUrl || null,
        };

        sqlite.updateWorkspace(dbWorkspace).catch((error) => {
          console.error(
            "Failed to update active environment in database:",
            error
          );
        });
      }
    }
  },

  addVariableKey: (rawKey: string) => {
    const key = rawKey.trim();
    if (!key) return;

    const wsId = get().activeWorkspaceId;
    if (!wsId) return;

    // Check if key already exists
    if (get().environmentKeys.includes(key)) return;

    // 1. Update in-memory state immediately
    set((state) => {
      const updatedEnvs: Record<string, Environment> = {};
      for (const [id, env] of Object.entries(state.environments)) {
        updatedEnvs[id] = {
          ...env,
          variables: { ...env.variables, [key]: "" },
        };
      }
      const nextKeys = [...state.environmentKeys, key];

      let updatedWorkspaces = state.workspaces;
      if (wsId && state.workspaces[wsId]) {
        const ws = state.workspaces[wsId];
        updatedWorkspaces = {
          ...state.workspaces,
          [wsId]: {
            ...ws,
            data: {
              ...ws.data,
              environmentKeys: nextKeys,
              environments: updatedEnvs,
            },
          },
        };
      }

      return {
        environmentKeys: nextKeys,
        environments: updatedEnvs,
        workspaces: updatedWorkspaces,
      };
    });

    // 2. Persist to database
    sqlite
      .addVariableKey(wsId, key)
      .then((keyId) => {
        console.log("Variable key added to database:", key, "ID:", keyId);
      })
      .catch((error) => {
        console.error("Failed to add variable key to database:", error);
      });
  },

  removeVariableKey: (key: string) => {
    const wsId = get().activeWorkspaceId;
    if (!wsId) return;

    if (!get().environmentKeys.includes(key)) return;

    // Find the key ID from the loaded workspace data
    // Note: This requires that we maintain a mapping or query the database
    // For now, we'll query all variable keys to find the ID
    const performDelete = async () => {
      try {
        const data = await sqlite.getFullWorkspaceData(wsId);
        if (data) {
          const keyRecord = data.variableKeys.find((k) => k.key_name === key);
          if (keyRecord) {
            await sqlite.removeVariableKey(keyRecord.id);
            console.log("Variable key deleted from database:", key);
          }
        }
      } catch (error) {
        console.error("Failed to delete variable key from database:", error);
      }
    };

    performDelete();

    // 1. Update in-memory state immediately
    set((state) => {
      const updatedEnvs: Record<string, Environment> = {};
      for (const [id, env] of Object.entries(state.environments)) {
        const vars = { ...env.variables };
        delete vars[key];
        updatedEnvs[id] = { ...env, variables: vars };
      }
      const nextKeys = state.environmentKeys.filter((k) => k !== key);

      let updatedWorkspaces = state.workspaces;
      if (wsId && state.workspaces[wsId]) {
        const ws = state.workspaces[wsId];
        updatedWorkspaces = {
          ...state.workspaces,
          [wsId]: {
            ...ws,
            data: {
              ...ws.data,
              environmentKeys: nextKeys,
              environments: updatedEnvs,
            },
          },
        };
      }
      return {
        environmentKeys: nextKeys,
        environments: updatedEnvs,
        workspaces: updatedWorkspaces,
      };
    });
  },

  renameVariableKey: (oldKey: string, rawNewKey: string) => {
    const newKey = rawNewKey.trim();
    if (!newKey || newKey === oldKey) return;

    const wsId = get().activeWorkspaceId;
    if (!wsId) return;

    if (!get().environmentKeys.includes(oldKey)) return;
    if (get().environmentKeys.includes(newKey)) return; // avoid dup

    // Find the key ID and rename in database
    const performRename = async () => {
      try {
        const data = await sqlite.getFullWorkspaceData(wsId);
        if (data) {
          const keyRecord = data.variableKeys.find(
            (k) => k.key_name === oldKey
          );
          if (keyRecord) {
            await sqlite.renameVariableKey(keyRecord.id, newKey);
            console.log(
              "Variable key renamed in database:",
              oldKey,
              "→",
              newKey
            );
          }
        }
      } catch (error) {
        console.error("Failed to rename variable key in database:", error);
      }
    };

    performRename();

    // 1. Update in-memory state immediately
    set((state) => {
      const newKeys = state.environmentKeys.map((k) =>
        k === oldKey ? newKey : k
      );
      const updatedEnvs: Record<string, Environment> = {};
      for (const [id, env] of Object.entries(state.environments)) {
        const vars = { ...env.variables };
        if (oldKey in vars) {
          vars[newKey] = vars[oldKey];
          delete vars[oldKey];
        }
        updatedEnvs[id] = { ...env, variables: vars };
      }
      let updatedWorkspaces = state.workspaces;
      if (wsId && state.workspaces[wsId]) {
        const ws = state.workspaces[wsId];
        updatedWorkspaces = {
          ...state.workspaces,
          [wsId]: {
            ...ws,
            data: {
              ...ws.data,
              environmentKeys: newKeys,
              environments: updatedEnvs,
            },
          },
        };
      }
      return {
        environmentKeys: newKeys,
        environments: updatedEnvs,
        workspaces: updatedWorkspaces,
      };
    });
  },

  setVariableValue: (environmentId: string, key: string, value: string) => {
    const wsId = get().activeWorkspaceId;
    if (!wsId) return;

    const env = get().environments[environmentId];
    if (!env) return;

    const isNewKey = !get().environmentKeys.includes(key);

    // Find the key ID and set value in database
    const performSet = async () => {
      try {
        const data = await sqlite.getFullWorkspaceData(wsId);
        if (data) {
          let keyId: number;

          if (isNewKey) {
            // Add the key first
            keyId = await sqlite.addVariableKey(wsId, key);
          } else {
            // Find existing key ID
            const keyRecord = data.variableKeys.find((k) => k.key_name === key);
            if (!keyRecord) {
              console.error("Variable key not found:", key);
              return;
            }
            keyId = keyRecord.id;
          }

          // Set the value
          await sqlite.setVariableValue(environmentId, keyId, value);
          console.log("Variable value set in database:", key, "=", value);
        }
      } catch (error) {
        console.error("Failed to set variable value in database:", error);
      }
    };

    performSet();

    // 1. Update in-memory state immediately
    set((state) => {
      const nextEnvs: Record<string, Environment> = {
        ...state.environments,
      };
      // If new key, add it across all envs (empty for others)
      if (isNewKey) {
        for (const [id, e] of Object.entries(state.environments)) {
          nextEnvs[id] = {
            ...e,
            variables: {
              ...e.variables,
              [key]: id === environmentId ? value : "",
            },
          };
        }
        const nextKeys = [...state.environmentKeys, key];
        let updatedWorkspaces = state.workspaces;
        if (wsId && state.workspaces[wsId]) {
          const ws = state.workspaces[wsId];
          updatedWorkspaces = {
            ...state.workspaces,
            [wsId]: {
              ...ws,
              data: {
                ...ws.data,
                environments: nextEnvs,
                environmentKeys: nextKeys,
              },
            },
          };
        }
        return {
          environments: nextEnvs,
          environmentKeys: nextKeys,
          workspaces: updatedWorkspaces,
        };
      }
      // Otherwise, just update this env
      nextEnvs[environmentId] = {
        ...env,
        variables: { ...env.variables, [key]: value },
      };
      let updatedWorkspaces = state.workspaces;
      if (wsId && state.workspaces[wsId]) {
        const ws = state.workspaces[wsId];
        updatedWorkspaces = {
          ...state.workspaces,
          [wsId]: { ...ws, data: { ...ws.data, environments: nextEnvs } },
        };
      }
      return { environments: nextEnvs, workspaces: updatedWorkspaces };
    });
  },

  updateEnvironmentName: (id: string, name: string) => {
    // 1. Update in-memory state immediately
    set((state) => {
      const environment = state.environments[id];
      if (!environment) return state;

      const nextEnvs = {
        ...state.environments,
        [id]: { ...environment, name },
      };
      let updatedWorkspaces = state.workspaces;
      const wsId = state.activeWorkspaceId;
      if (wsId && state.workspaces[wsId]) {
        const ws = state.workspaces[wsId];
        updatedWorkspaces = {
          ...state.workspaces,
          [wsId]: { ...ws, data: { ...ws.data, environments: nextEnvs } },
        };
      }
      return { environments: nextEnvs, workspaces: updatedWorkspaces };
    });

    // 2. Persist to database
    sqlite
      .updateEnvironment(id, name)
      .then(() => {
        console.log("Environment name updated in database:", id, name);
      })
      .catch((error) => {
        console.error("Failed to update environment name in database:", error);
      });
  },
});
