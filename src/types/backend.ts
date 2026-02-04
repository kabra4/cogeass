/**
 * TypeScript types matching the SQLite database schema.
 * These types represent the data structures returned from the database.
 */

/**
 * Table 1: workspaces
 * The central table for user workspaces.
 */
export interface DbWorkspace {
  id: string;
  name: string;
  active_spec_id: string | null;
  active_environment_id: string | null;
  base_url: string | null;
  selected_operation_key: string | null;
  sort_order: number;
  spec_url: string | null;
}

/**
 * Table 2: specs
 * Stores OpenAPI JSON documents.
 */
export interface DbSpec {
  id: string;
  spec_content: string; // JSON string
}

/**
 * Table 3: environments
 * Defines environments within a workspace.
 */
export interface DbEnvironment {
  id: string;
  workspace_id: string;
  name: string;
}

/**
 * Table 4: workspace_variable_keys
 * Master list of variable keys per workspace.
 */
export interface DbVariableKey {
  id: number;
  workspace_id: string;
  key_name: string;
}

/**
 * Table 5: environment_variable_values
 * Junction table storing actual variable values.
 */
export interface DbVariableValue {
  environment_id: string;
  variable_key_id: number;
  value: string;
}

/**
 * Table 6: global_headers
 * Key-value headers for a workspace.
 */
export interface DbGlobalHeader {
  workspace_id: string;
  key: string;
  value: string;
}

/**
 * Table 7: auth_values
 * Authorization credentials (global or per-environment).
 */
export interface DbAuthValue {
  workspace_id: string;
  environment_id: string | null;
  scheme_name: string;
  value_json: string; // JSON string
}

/**
 * Table 8a: operation_states
 * Form data and last response for operations.
 */
export interface DbOperationState {
  workspace_id: string;
  operation_key: string;
  form_data: string; // JSON string
  response: string | null; // JSON string
  last_modified: number;
}

/**
 * Table 8b: history
 * Log of recently used operations.
 */
export interface DbHistoryEntry {
  id: number;
  workspace_id: string;
  operation_key: string;
  timestamp: number;
}

/**
 * Table 9: response_history
 * Stores historical responses for operations.
 */
export interface DbResponseHistoryEntry {
  id: number;
  workspace_id: string;
  operation_key: string;
  response_json: string; // JSON string of the response object
  timestamp: number;
}

/**
 * Composite payload returned by get_full_workspace_data().
 * This is the primary data structure for workspace switching.
 */
export interface FullWorkspaceData {
  workspace: DbWorkspace;
  spec: DbSpec | null;
  environments: DbEnvironment[];
  variableKeys: DbVariableKey[];
  variableValues: DbVariableValue[];
  globalHeaders: DbGlobalHeader[];
  authValues: DbAuthValue[];
  history: DbHistoryEntry[];
}

/**
 * Initial data payload returned on app startup.
 */
export interface InitialData {
  workspaces: DbWorkspace[];
}
