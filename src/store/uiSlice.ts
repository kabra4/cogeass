import type { StateCreator } from 'zustand';
import type { AppState, UiSlice } from './types';

export const createUiSlice: StateCreator<AppState, [], [], UiSlice> = (set) => ({
  selected: null,
  setSelected: (op) => set({ selected: op }),
});