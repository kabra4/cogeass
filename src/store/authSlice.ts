import type { StateCreator } from 'zustand';
import type { AppState, AuthSlice, AuthState } from './types';

const initialAuthState: AuthState = {
  schemes: {},
  values: {},
};

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, get) => ({
  auth: initialAuthState,
  setAuthSchemes: (schemes) => {
    set((state) => ({
      auth: {
        ...state.auth,
        schemes,
        // Reset values to avoid stale data from a previous spec
        values: {},
      },
    }));
  },
  setAuthValue: (schemeName, value) => {
    set((state) => ({
      auth: {
        ...state.auth,
        values: {
          ...state.auth.values,
          [schemeName]: value,
        },
      },
    }));
  },
  clearAuth: () => set({ auth: initialAuthState }),
});
