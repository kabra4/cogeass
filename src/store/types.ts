// src/store/types.ts
import type { DerefSpec } from "@/lib/openapi";
import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";

export type OperationRef = {
  method: string;
  path: string;
  op: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;
  tag: string;
};

export type SecurityScheme =
  | OpenAPIV3.SecuritySchemeObject
  | OpenAPIV3_1.SecuritySchemeObject;

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

export type AuthState = {
  schemes: Record<string, SecurityScheme>;
  values: Record<string, Record<string, string>>; // e.g., { "myApiKey": { "apiKey": "12345" } }
};

export interface AuthSlice {
  auth: AuthState;
  setAuthSchemes: (schemes: Record<string, SecurityScheme>) => void;
  setAuthValue: (schemeName: string, value: Record<string, string>) => void;
  clearAuth: () => void;
}

export type Environment = {
  id: string;
  name: string;
  variables: Record<string, string>;
};

export interface EnvironmentSlice {
  environments: Record<string, Environment>;
  activeEnvironmentId: string | null;
  addEnvironment: (name: string) => string;
  removeEnvironment: (id: string) => void;
  setActiveEnvironment: (id: string | null) => void;
  setVariable: (environmentId: string, key: string, value: string) => void;
  removeVariable: (environmentId: string, key: string) => void;
  updateEnvironmentName: (id: string, name: string) => void;
}

export type AppState = SpecSlice &
  RequestSlice &
  UiSlice &
  AuthSlice &
  EnvironmentSlice;
