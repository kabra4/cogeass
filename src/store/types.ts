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
  // Runtime for the ACTIVE workspace
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
  // Runtime for the ACTIVE workspace
  baseUrl?: string;
  globalHeaders: Record<string, string>;
  operationState: Record<string, OperationState>;
  setBaseUrl: (url: string) => void;
  setGlobalHeaders: (headers: Record<string, string>) => void;
  setOperationState: (key: string, data: Partial<OperationState>) => void;
}

export interface UiSlice {
  // Runtime for the ACTIVE workspace
  activePage: "workspace" | "auth" | "envs" | "headers";
  selected: OperationRef | null;
  // Helper to remember selection across activations/spec reloads
  selectedKey?: string | null; // "method:path" in lower-case
  setSelected: (op: OperationRef | null) => void;
  setActivePage: (page: "workspace" | "auth" | "envs" | "headers") => void;
}

export type AuthState = {
  schemes: Record<string, SecurityScheme>;
  values: Record<string, Record<string, string>>; // e.g., { "myApiKey": { "apiKey": "12345" } }
};

export interface AuthSlice {
  // Runtime for the ACTIVE workspace
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
  // Runtime for the ACTIVE workspace
  environments: Record<string, Environment>;
  environmentKeys: string[];
  activeEnvironmentId: string | null;
  addEnvironment: (name: string) => string;
  removeEnvironment: (id: string) => void;
  setActiveEnvironment: (id: string | null) => void;
  // Variable key management (global across all environments)
  addVariableKey: (key: string) => void;
  removeVariableKey: (key: string) => void;
  renameVariableKey: (oldKey: string, newKey: string) => void;
  // Per-environment value editing
  setVariableValue: (environmentId: string, key: string, value: string) => void;
  updateEnvironmentName: (id: string, name: string) => void;
}

// Persisted per-workspace data
export type WorkspaceData = {
  baseUrl?: string;
  globalHeaders: Record<string, string>;
  operationState: Record<string, OperationState>;
  selectedKey?: string | null; // "method:path" lowercase
  auth: AuthState;
  environments: Record<string, Environment>;
  environmentKeys: string[];
  activeEnvironmentId: string | null;
};

export type Workspace = {
  id: string;
  name: string;
  specId: string | null;
  data: WorkspaceData;
};

export interface WorkspaceSlice {
  workspaces: Record<string, Workspace>;
  workspaceOrder: string[];
  activeWorkspaceId: string | null;
  createWorkspace: (name?: string) => string;
  renameWorkspace: (id: string, name: string) => void;
  removeWorkspace: (id: string) => void;
  setActiveWorkspace: (id: string | null) => void;
  // Internal helpers
  __applyWorkspaceToRoot: (id: string) => void;
}

export type AppState = SpecSlice &
  RequestSlice &
  UiSlice &
  AuthSlice &
  EnvironmentSlice &
  WorkspaceSlice;
