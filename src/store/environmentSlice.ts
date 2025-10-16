import type { StateCreator } from "zustand";
import type { AppState, EnvironmentSlice, Environment } from "./types";

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
    const newEnvironment: Environment = {
      id,
      name,
      variables: Object.fromEntries(keys.map((k) => [k, ""])),
    };

    set((state) => {
      const nextEnvs = {
        ...state.environments,
        [id]: newEnvironment,
      };
      let updatedWorkspaces = state.workspaces;
      const wsId = state.activeWorkspaceId;
      if (wsId && state.workspaces[wsId]) {
        const ws = state.workspaces[wsId];
        updatedWorkspaces = {
          ...state.workspaces,
          [wsId]: {
            ...ws,
            data: { ...ws.data, environments: nextEnvs },
          },
        };
      }
      return { environments: nextEnvs, workspaces: updatedWorkspaces };
    });

    return id;
  },

  removeEnvironment: (id: string) => {
    set((state) => {
      const newEnvironments = { ...state.environments };
      delete newEnvironments[id];

      const newActive =
        state.activeEnvironmentId === id ? null : state.activeEnvironmentId;

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
            },
          },
        };
      }

      return {
        environments: newEnvironments,
        activeEnvironmentId: newActive,
        workspaces: updatedWorkspaces,
      };
    });
  },

  setActiveEnvironment: (id: string | null) => {
    set((state) => {
      let updatedWorkspaces = state.workspaces;
      const wsId = state.activeWorkspaceId;
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
  },

  addVariableKey: (rawKey: string) => {
    const key = rawKey.trim();
    if (!key) return;
    set((state) => {
      if (state.environmentKeys.includes(key)) return state;
      const updatedEnvs: Record<string, Environment> = {};
      for (const [id, env] of Object.entries(state.environments)) {
        updatedEnvs[id] = {
          ...env,
          variables: { ...env.variables, [key]: "" },
        };
      }
      const nextKeys = [...state.environmentKeys, key];

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
              environmentKeys: nextKeys,
              environments: updatedEnvs,
            },
          },
        };
      }

      return {
        environmentKeys: [...state.environmentKeys, key],
        environments: updatedEnvs,
        workspaces: updatedWorkspaces,
      };
    });
  },

  removeVariableKey: (key: string) => {
    set((state) => {
      if (!state.environmentKeys.includes(key)) return state;
      const updatedEnvs: Record<string, Environment> = {};
      for (const [id, env] of Object.entries(state.environments)) {
        const vars = { ...env.variables };
        delete vars[key];
        updatedEnvs[id] = { ...env, variables: vars };
      }
      const nextKeys = state.environmentKeys.filter((k) => k !== key);

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
    set((state) => {
      if (!state.environmentKeys.includes(oldKey)) return state;
      if (state.environmentKeys.includes(newKey)) return state; // avoid dup
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
      const wsId = state.activeWorkspaceId;
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
    set((state) => {
      const env = state.environments[environmentId];
      if (!env) return state;
      const isNewKey = !state.environmentKeys.includes(key);
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
        const wsId = state.activeWorkspaceId;
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
  },

  updateEnvironmentName: (id: string, name: string) => {
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
  },
});
