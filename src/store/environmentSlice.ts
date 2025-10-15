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

    set((state) => ({
      environments: {
        ...state.environments,
        [id]: newEnvironment,
      },
    }));

    return id;
  },

  removeEnvironment: (id: string) => {
    set((state) => {
      const newEnvironments = { ...state.environments };
      delete newEnvironments[id];

      return {
        environments: newEnvironments,
        activeEnvironmentId:
          state.activeEnvironmentId === id ? null : state.activeEnvironmentId,
      };
    });
  },

  setActiveEnvironment: (id: string | null) => {
    set({ activeEnvironmentId: id });
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
      return {
        environmentKeys: [...state.environmentKeys, key],
        environments: updatedEnvs,
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
      return {
        environmentKeys: state.environmentKeys.filter((k) => k !== key),
        environments: updatedEnvs,
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
      return { environmentKeys: newKeys, environments: updatedEnvs };
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
        return {
          environments: nextEnvs,
          environmentKeys: [...state.environmentKeys, key],
        };
      }
      // Otherwise, just update this env
      nextEnvs[environmentId] = {
        ...env,
        variables: { ...env.variables, [key]: value },
      };
      return { environments: nextEnvs };
    });
  },

  updateEnvironmentName: (id: string, name: string) => {
    set((state) => {
      const environment = state.environments[id];
      if (!environment) return state;

      return {
        environments: {
          ...state.environments,
          [id]: {
            ...environment,
            name,
          },
        },
      };
    });
  },
});
