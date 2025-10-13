import type { StateCreator } from 'zustand';
import type { AppState, RequestSlice } from './types';

export const createRequestSlice: StateCreator<AppState, [], [], RequestSlice> = (set, get) => ({
  baseUrl: "",
  operationState: {},
  setBaseUrl: (url) => set({ baseUrl: url }),
  setOperationState: (key, data) => {
    const currentData = get().operationState[key] || {};
    set({
      operationState: {
        ...get().operationState,
        [key]: { ...currentData, ...data },
      },
    });
  },
});