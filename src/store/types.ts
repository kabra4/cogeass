// src/store/types.ts
import type { DerefSpec } from "@/lib/openapi";
import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";

export type OperationRef = {
  method: string;
  path: string;
  op: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;
  tag: string;
};

export interface SpecSlice {
  spec: DerefSpec | null;
  specId: string | null;
  operations: OperationRef[];
  setSpec: (spec: DerefSpec, id: string) => void;
  setOperations: (ops: OperationRef[]) => void;
}

export type OperationState = {
  pathData?: Record<string, unknown>;
  queryData?: Record<string, unknown>;
  headerData?: Record<string, unknown>;
  customHeaderData?: Record<string, string>;
  bodyData?: Record<string, unknown>;
};

export interface RequestSlice {
  baseUrl?: string;
  operationState: Record<string, OperationState>;
  setBaseUrl: (url: string) => void;
  setOperationState: (key: string, data: Partial<OperationState>) => void;
}

export interface UiSlice {
  selected: OperationRef | null;
  setSelected: (op: OperationRef | null) => void;
}

export type AppState = SpecSlice & RequestSlice & UiSlice;
