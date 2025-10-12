import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DerefSpec } from "@/lib/openapi";
import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";

// Utility to resolve server variables in a server URL
function resolveServerVariables(
  url: string,
  variables?: Record<
    string,
    OpenAPIV3.ServerVariableObject | OpenAPIV3_1.ServerVariableObject
  >
): string {
  if (!variables) return url;

  let resolvedUrl = url;
  for (const [name, variable] of Object.entries(variables)) {
    const value = variable.default || variable.enum?.[0] || "";
    resolvedUrl = resolvedUrl.replace(`{${name}}`, String(value));
  }
  return resolvedUrl;
}

type OperationRef = {
  method: string;
  path: string;
  op: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;
  tag: string;
};

type OperationState = {
  pathData?: Record<string, unknown>;
  queryData?: Record<string, unknown>;
  headerData?: Record<string, unknown>;
  customHeaderData?: Record<string, string>; // User-defined headers
  bodyData?: Record<string, unknown>;
};

type State = {
  spec: DerefSpec | null;
  specId: string | null;
  operations: OperationRef[];
  selected: OperationRef | null;
  baseUrl?: string;
  operationState: Record<string, OperationState>;
  setSpec: (spec: DerefSpec, id: string) => void;
  setOperations: (ops: OperationRef[]) => void;
  setSelected: (op: OperationRef | null) => void;
  setBaseUrl: (url: string) => void;
  setOperationState: (key: string, data: Partial<OperationState>) => void; // data is partial
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
        const currentState = get();

        // Set default baseUrl from spec.servers if not already set
        let newBaseUrl = currentState.baseUrl;
        if (!newBaseUrl && spec.servers?.[0]?.url) {
          const defaultServer = spec.servers[0];
          newBaseUrl = resolveServerVariables(
            defaultServer.url,
            defaultServer.variables
          );
        }

        if (currentState.specId !== id) {
          set({
            spec,
            specId: id,
            selected: null,
            operationState: {},
            baseUrl: newBaseUrl,
          });
        } else {
          set({
            spec,
            specId: id,
            baseUrl: newBaseUrl,
          });
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
      name: "cogeass-storage",
      partialize: (state) => ({
        specId: state.specId,
        selected: state.selected,
        baseUrl: state.baseUrl,
        operationState: state.operationState,
      }),
    }
  )
);
