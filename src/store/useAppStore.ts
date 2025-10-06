import { create } from "zustand";
import type { DerefSpec } from "@/lib/openapi";
import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";

type OperationRef = {
  method: string;
  path: string;
  op: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;
  tag: string;
};

type State = {
  spec: DerefSpec | null;
  operations: OperationRef[];
  selected: OperationRef | null;
  baseUrl?: string;
  setSpec: (s: DerefSpec) => void;
  setOperations: (ops: OperationRef[]) => void;
  setSelected: (op: OperationRef | null) => void;
  setBaseUrl: (url: string) => void;
};

export const useAppStore = create<State>((set) => ({
  spec: null,
  operations: [],
  selected: null,
  baseUrl: "",
  setSpec: (spec) => set({ spec }),
  setOperations: (operations) => set({ operations }),
  setSelected: (selected) => set({ selected }),
  setBaseUrl: (baseUrl) => set({ baseUrl }),
}));
