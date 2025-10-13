import type { StateCreator } from 'zustand';
import type { AppState, SpecSlice } from './types';

export const createSpecSlice: StateCreator<AppState, [], [], SpecSlice> = (set) => ({
  spec: null,
  specId: null,
  operations: [],
  setSpec: (spec, id) => set({ spec, specId: id, selected: null, operationState: {} }),
  setOperations: (ops) => set({ operations: ops }),
});