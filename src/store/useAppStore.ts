import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DerefSpec } from "@/lib/openapi";
import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";

type OperationRef = {
  method: string;
  path: string;
  op: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;
  tag: string;
};

// Structure to hold the state for a single operation's forms
type OperationState = {
  pathData?: Record<string, unknown>;
  queryData?: Record<string, unknown>;
  headerData?: Record<string, unknown>;
  bodyData?: Record<string, unknown>;
};

type State = {
  spec: DerefSpec | null;
  specId: string | null;
  operations: OperationRef[];
  selected: OperationRef | null;
  baseUrl?: string;
  operationState: Record<string, OperationState>;
  setSpec: (s: DerefSpec, id: string) => void;
  setOperations: (ops: OperationRef[]) => void;
  setSelected: (op: OperationRef | null) => void;
  setBaseUrl: (url: string) => void;
  setOperationState: (key: string, data: OperationState) => void;
};

export const useAppStore = create<State>()(
  persist(
    (set, get) => ({
      spec: null,
      specId: null,
      operations: [],
      selected: null,
      baseUrl: "",
      operationState: {},

      setSpec: (spec, id) => {
        // If the new spec is different from the old one, clear related state
        if (get().specId !== id) {
          set({
            spec,
            specId: id,
            selected: null,
            operationState: {}, // Clear all saved form data for the old spec
          });
        } else {
          set({ spec, specId: id });
        }
      },

      setOperations: (operations) => set({ operations }),
      setSelected: (selected) => set({ selected }),
      setBaseUrl: (baseUrl) => set({ baseUrl }),

      setOperationState: (key, data) => {
        const currentData = get().operationState[key] || {};
        set({
          operationState: {
            ...get().operationState,
            [key]: { ...currentData, ...data },
          },
        });
      },
    }),
    {
      name: "plyt-storage", // Name for the local storage item
      // Persist only the necessary fields
      partialize: (state) => ({
        specId: state.specId,
        selected: state.selected,
        baseUrl: state.baseUrl,
        operationState: state.operationState,
      }),
    }
  )
);
