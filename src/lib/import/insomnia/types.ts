/**
 * Insomnia Export v4 Types
 * Based on Insomnia's export format
 */

export interface InsomniaExport {
  _type: "export";
  __export_format: number; // Should be 4
  __export_date: string;
  __export_source: string;
  resources: InsomniaResource[];
}

export type InsomniaResource =
  | InsomniaWorkspace
  | InsomniaRequestGroup
  | InsomniaRequest
  | InsomniaEnvironment;

export interface InsomniaBaseResource {
  _id: string;
  _type: string;
  parentId: string | null;
  name: string;
  created: number;
  modified: number;
}

export interface InsomniaWorkspace extends InsomniaBaseResource {
  _type: "workspace";
  description?: string;
  scope?: "collection" | "design";
}

export interface InsomniaRequestGroup extends InsomniaBaseResource {
  _type: "request_group";
  description?: string;
  environment?: Record<string, unknown>;
  metaSortKey?: number;
}

export interface InsomniaRequest extends InsomniaBaseResource {
  _type: "request";
  url: string;
  method: string;
  body?: InsomniaBody;
  headers?: InsomniaHeader[];
  parameters?: InsomniaParameter[];
  authentication?: InsomniaAuthentication;
  description?: string;
  metaSortKey?: number;
}

export interface InsomniaEnvironment extends InsomniaBaseResource {
  _type: "environment";
  data: Record<string, unknown>;
  dataPropertyOrder?: Record<string, string[]>;
  color?: string;
  isPrivate?: boolean;
  metaSortKey?: number;
}

export interface InsomniaBody {
  mimeType?: string;
  text?: string;
  params?: InsomniaBodyParam[];
  fileName?: string;
}

export interface InsomniaBodyParam {
  name: string;
  value: string;
  description?: string;
  disabled?: boolean;
  type?: "text" | "file";
  fileName?: string;
}

export interface InsomniaHeader {
  name: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface InsomniaParameter {
  name: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface InsomniaAuthentication {
  type: string;
  token?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  addTo?: "header" | "query";
  key?: string;
  disabled?: boolean;
}

/**
 * Check if an object is a valid Insomnia Export.
 */
export function isInsomniaExport(obj: unknown): obj is InsomniaExport {
  if (typeof obj !== "object" || obj === null) return false;
  const exp = obj as InsomniaExport;
  return (
    exp._type === "export" &&
    exp.__export_format === 4 &&
    Array.isArray(exp.resources)
  );
}

/**
 * Type guard for Insomnia request.
 */
export function isInsomniaRequest(
  resource: InsomniaResource
): resource is InsomniaRequest {
  return resource._type === "request";
}

/**
 * Type guard for Insomnia request group.
 */
export function isInsomniaRequestGroup(
  resource: InsomniaResource
): resource is InsomniaRequestGroup {
  return resource._type === "request_group";
}

/**
 * Type guard for Insomnia workspace.
 */
export function isInsomniaWorkspace(
  resource: InsomniaResource
): resource is InsomniaWorkspace {
  return resource._type === "workspace";
}

/**
 * Type guard for Insomnia environment.
 */
export function isInsomniaEnvironment(
  resource: InsomniaResource
): resource is InsomniaEnvironment {
  return resource._type === "environment";
}
