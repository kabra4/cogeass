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
> = (set) => ({
  environments: {},
  activeEnvironmentId: null,

  addEnvironment: (name: string) => {
    const id = generateId();
    const newEnvironment: Environment = {
      id,
      name,
      variables: {},
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

  setVariable: (environmentId: string, key: string, value: string) => {
    set((state) => {
      const environment = state.environments[environmentId];
      if (!environment) return state;

      return {
        environments: {
          ...state.environments,
          [environmentId]: {
            ...environment,
            variables: {
              ...environment.variables,
              [key]: value,
            },
          },
        },
      };
    });
  },

  removeVariable: (environmentId: string, key: string) => {
    set((state) => {
      const environment = state.environments[environmentId];
      if (!environment) return state;

      const newVariables = { ...environment.variables };
      delete newVariables[key];

      return {
        environments: {
          ...state.environments,
          [environmentId]: {
            ...environment,
            variables: newVariables,
          },
        },
      };
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
