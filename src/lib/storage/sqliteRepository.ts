/**
 * SQLite Repository
 *
 * Central interface for all database operations using the Tauri SQL plugin.
 * This module provides type-safe wrappers around SQL queries for all 8 tables.
 */

import Database from "@tauri-apps/plugin-sql";
import type {
  DbWorkspace,
  DbSpec,
  DbEnvironment,
  DbVariableKey,
  DbVariableValue,
  DbGlobalHeader,
  DbAuthValue,
  DbOperationState,
  DbHistoryEntry,
  DbResponseHistoryEntry,
  InitialData,
  FullWorkspaceData,
} from "@/types/backend";

let db: Database | null = null;

/**
 * Initialize the database connection.
 * Must be called before any other database operations.
 */
export async function initDatabase(): Promise<void> {
  if (!db) {
    try {
      console.log("Loading SQLite database: sqlite:cogeass.db");
      db = await Database.load("sqlite:cogeass.db");
      console.log("SQLite database loaded successfully");

      // Test the connection by running a simple query
      await db.execute("SELECT 1");
      console.log("Database connection verified");
    } catch (error) {
      console.error("Failed to initialize SQLite database:", error);
      console.error(
        "Error details:",
        error instanceof Error ? error.message : String(error)
      );
      throw new Error(
        `Database initialization failed: ${error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

/**
 * Get the database instance.
 * Throws if database is not initialized.
 */
function getDb(): Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

// ============================================================================
// INITIAL LOAD
// ============================================================================

/**
 * Load initial data on app startup.
 * Returns the list of all workspaces for the workspace selector.
 */
export async function loadInitialData(): Promise<InitialData> {
  try {
    console.log("Querying workspaces table...");
    const workspaces = await getDb().select<DbWorkspace[]>(
      "SELECT * FROM workspaces ORDER BY sort_order ASC"
    );
    console.log(`Found ${workspaces.length} workspaces`);
    return { workspaces };
  } catch (error) {
    console.error("Failed to load initial data:", error);
    console.error(
      "This might indicate the database tables haven't been created yet"
    );
    throw error;
  }
}

// ============================================================================
// WORKSPACE MANAGEMENT
// ============================================================================

/**
 * Create a new workspace.
 */
export async function createWorkspace(
  id: string,
  name: string,
  sortOrder: number
): Promise<void> {
  await getDb().execute(
    "INSERT INTO workspaces (id, name, sort_order) VALUES (?, ?, ?)",
    [id, name, sortOrder]
  );
}

/**
 * Update a workspace's details.
 */
export async function updateWorkspace(workspace: DbWorkspace): Promise<void> {
  await getDb().execute(
    `UPDATE workspaces
     SET name = ?,
         active_spec_id = ?,
         active_environment_id = ?,
         base_url = ?,
         selected_operation_key = ?,
         sort_order = ?,
         spec_url = ?
     WHERE id = ?`,
    [
      workspace.name,
      workspace.active_spec_id,
      workspace.active_environment_id,
      workspace.base_url,
      workspace.selected_operation_key,
      workspace.sort_order,
      workspace.spec_url,
      workspace.id,
    ]
  );
}

/**
 * Delete a workspace and all its related data (CASCADE).
 */
export async function deleteWorkspace(id: string): Promise<void> {
  await getDb().execute("DELETE FROM workspaces WHERE id = ?", [id]);
}

/**
 * Get full workspace data for a specific workspace.
 * This is the key operation when switching workspaces.
 */
export async function getFullWorkspaceData(
  workspaceId: string
): Promise<FullWorkspaceData | null> {
  try {
    console.log(`Fetching workspace data for: ${workspaceId}`);

    // Fetch workspace details
    const workspaces = await getDb().select<DbWorkspace[]>(
      "SELECT * FROM workspaces WHERE id = ?",
      [workspaceId]
    );

    if (workspaces.length === 0) {
      console.warn(`Workspace not found: ${workspaceId}`);
      return null;
    }

    const workspace = workspaces[0];
    console.log(`Workspace found: ${workspace.name}`);

    // Fetch spec if active_spec_id is set
    let spec: DbSpec | null = null;
    if (workspace.active_spec_id) {
      const specs = await getDb().select<DbSpec[]>(
        "SELECT * FROM specs WHERE id = ?",
        [workspace.active_spec_id]
      );
      spec = specs.length > 0 ? specs[0] : null;
    }

    // Fetch all related data in parallel
    const [
      environments,
      variableKeys,
      variableValues,
      globalHeaders,
      authValues,
      history,
    ] = await Promise.all([
      getDb().select<DbEnvironment[]>(
        "SELECT * FROM environments WHERE workspace_id = ?",
        [workspaceId]
      ),
      getDb().select<DbVariableKey[]>(
        "SELECT * FROM workspace_variable_keys WHERE workspace_id = ? ORDER BY key_name ASC",
        [workspaceId]
      ),
      getDb().select<DbVariableValue[]>(
        `SELECT evv.* FROM environment_variable_values evv
       INNER JOIN environments e ON evv.environment_id = e.id
       WHERE e.workspace_id = ?`,
        [workspaceId]
      ),
      getDb().select<DbGlobalHeader[]>(
        "SELECT * FROM global_headers WHERE workspace_id = ?",
        [workspaceId]
      ),
      getDb().select<DbAuthValue[]>(
        "SELECT * FROM auth_values WHERE workspace_id = ?",
        [workspaceId]
      ),
      getDb().select<DbHistoryEntry[]>(
        "SELECT * FROM history WHERE workspace_id = ? ORDER BY timestamp DESC LIMIT 50",
        [workspaceId]
      ),
    ]);

    console.log(`Loaded workspace data:`, {
      workspaceName: workspace.name,
      hasSpec: !!spec,
      environmentCount: environments.length,
      variableKeyCount: variableKeys.length,
      variableValueCount: variableValues.length,
      globalHeaderCount: globalHeaders.length,
      authValueCount: authValues.length,
      historyCount: history.length,
    });

    return {
      workspace,
      spec,
      environments,
      variableKeys,
      variableValues,
      globalHeaders,
      authValues,
      history,
    };
  } catch (error) {
    console.error(
      `Failed to get full workspace data for ${workspaceId}:`,
      error
    );
    throw error;
  }
}

// ============================================================================
// SPEC MANAGEMENT
// ============================================================================

/**
 * Save or update a spec.
 */
export async function saveSpec(id: string, specContent: string): Promise<void> {
  await getDb().execute(
    "INSERT OR REPLACE INTO specs (id, spec_content) VALUES (?, ?)",
    [id, specContent]
  );
}

/**
 * Get a spec by ID.
 */
export async function getSpec(id: string): Promise<DbSpec | null> {
  const specs = await getDb().select<DbSpec[]>(
    "SELECT * FROM specs WHERE id = ?",
    [id]
  );
  return specs.length > 0 ? specs[0] : null;
}

/**
 * Delete a spec.
 */
export async function deleteSpec(id: string): Promise<void> {
  await getDb().execute("DELETE FROM specs WHERE id = ?", [id]);
}

// ============================================================================
// ENVIRONMENT MANAGEMENT
// ============================================================================

/**
 * Create a new environment.
 */
export async function createEnvironment(
  id: string,
  workspaceId: string,
  name: string
): Promise<void> {
  await getDb().execute(
    "INSERT INTO environments (id, workspace_id, name) VALUES (?, ?, ?)",
    [id, workspaceId, name]
  );
}

/**
 * Update an environment's name.
 */
export async function updateEnvironment(
  id: string,
  name: string
): Promise<void> {
  await getDb().execute("UPDATE environments SET name = ? WHERE id = ?", [
    name,
    id,
  ]);
}

/**
 * Delete an environment (CASCADE deletes variable values).
 */
export async function deleteEnvironment(id: string): Promise<void> {
  await getDb().execute("DELETE FROM environments WHERE id = ?", [id]);
}

// ============================================================================
// VARIABLE MANAGEMENT
// ============================================================================

/**
 * Add a new variable key to a workspace.
 */
export async function addVariableKey(
  workspaceId: string,
  keyName: string
): Promise<number> {
  const result = await getDb().execute(
    "INSERT INTO workspace_variable_keys (workspace_id, key_name) VALUES (?, ?)",
    [workspaceId, keyName]
  );
  return result.lastInsertId ?? 0;
}

/**
 * Remove a variable key (CASCADE deletes all values).
 */
export async function removeVariableKey(keyId: number): Promise<void> {
  await getDb().execute("DELETE FROM workspace_variable_keys WHERE id = ?", [
    keyId,
  ]);
}

/**
 * Rename a variable key.
 */
export async function renameVariableKey(
  keyId: number,
  newKeyName: string
): Promise<void> {
  await getDb().execute(
    "UPDATE workspace_variable_keys SET key_name = ? WHERE id = ?",
    [newKeyName, keyId]
  );
}

/**
 * Set or update a variable value for a specific environment.
 */
export async function setVariableValue(
  environmentId: string,
  variableKeyId: number,
  value: string
): Promise<void> {
  await getDb().execute(
    `INSERT OR REPLACE INTO environment_variable_values
     (environment_id, variable_key_id, value)
     VALUES (?, ?, ?)`,
    [environmentId, variableKeyId, value]
  );
}

/**
 * Delete a variable value for a specific environment.
 */
export async function deleteVariableValue(
  environmentId: string,
  variableKeyId: number
): Promise<void> {
  await getDb().execute(
    "DELETE FROM environment_variable_values WHERE environment_id = ? AND variable_key_id = ?",
    [environmentId, variableKeyId]
  );
}

// ============================================================================
// GLOBAL HEADERS
// ============================================================================

/**
 * Set or update a global header.
 */
export async function setGlobalHeader(
  workspaceId: string,
  key: string,
  value: string
): Promise<void> {
  await getDb().execute(
    "INSERT OR REPLACE INTO global_headers (workspace_id, key, value) VALUES (?, ?, ?)",
    [workspaceId, key, value]
  );
}

/**
 * Delete a global header.
 */
export async function deleteGlobalHeader(
  workspaceId: string,
  key: string
): Promise<void> {
  await getDb().execute(
    "DELETE FROM global_headers WHERE workspace_id = ? AND key = ?",
    [workspaceId, key]
  );
}

/**
 * Set all global headers for a workspace (replaces existing).
 */
export async function setAllGlobalHeaders(
  workspaceId: string,
  headers: Record<string, string>
): Promise<void> {
  // Delete existing headers
  await getDb().execute("DELETE FROM global_headers WHERE workspace_id = ?", [
    workspaceId,
  ]);

  // Insert new headers
  for (const [key, value] of Object.entries(headers)) {
    await setGlobalHeader(workspaceId, key, value);
  }
}

// ============================================================================
// AUTH VALUES
// ============================================================================

/**
 * Set or update an auth value (global or per-environment).
 */
export async function setAuthValue(
  workspaceId: string,
  environmentId: string | null,
  schemeName: string,
  valueJson: string
): Promise<void> {
  await getDb().execute(
    `INSERT OR REPLACE INTO auth_values
     (workspace_id, environment_id, scheme_name, value_json)
     VALUES (?, ?, ?, ?)`,
    [workspaceId, environmentId, schemeName, valueJson]
  );
}

/**
 * Delete an auth value.
 */
export async function deleteAuthValue(
  workspaceId: string,
  environmentId: string | null,
  schemeName: string
): Promise<void> {
  await getDb().execute(
    `DELETE FROM auth_values
     WHERE workspace_id = ?
     AND environment_id IS ?
     AND scheme_name = ?`,
    [workspaceId, environmentId, schemeName]
  );
}

// ============================================================================
// OPERATION STATES
// ============================================================================

/**
 * Save or update operation state.
 */
export async function saveOperationState(
  workspaceId: string,
  operationKey: string,
  formData: string,
  response: string | null
): Promise<void> {
  const lastModified = Date.now();
  await getDb().execute(
    `INSERT OR REPLACE INTO operation_states
     (workspace_id, operation_key, form_data, response, last_modified)
     VALUES (?, ?, ?, ?, ?)`,
    [workspaceId, operationKey, formData, response, lastModified]
  );
}

/**
 * Get operation state.
 */
export async function getOperationState(
  workspaceId: string,
  operationKey: string
): Promise<DbOperationState | null> {
  const states = await getDb().select<DbOperationState[]>(
    "SELECT * FROM operation_states WHERE workspace_id = ? AND operation_key = ?",
    [workspaceId, operationKey]
  );
  return states.length > 0 ? states[0] : null;
}

/**
 * Delete operation state.
 */
export async function deleteOperationState(
  workspaceId: string,
  operationKey: string
): Promise<void> {
  await getDb().execute(
    "DELETE FROM operation_states WHERE workspace_id = ? AND operation_key = ?",
    [workspaceId, operationKey]
  );
}

/**
 * Clean up old operation responses.
 */
export async function cleanupOldResponses(maxAgeMs: number): Promise<void> {
  const cutoffTime = Date.now() - maxAgeMs;
  await getDb().execute(
    "DELETE FROM operation_states WHERE last_modified < ?",
    [cutoffTime]
  );
}

// ============================================================================
// HISTORY
// ============================================================================

/**
 * Add a history entry.
 */
export async function addHistoryEntry(
  workspaceId: string,
  operationKey: string
): Promise<void> {
  const timestamp = Date.now();
  await getDb().execute(
    "INSERT INTO history (workspace_id, operation_key, timestamp) VALUES (?, ?, ?)",
    [workspaceId, operationKey, timestamp]
  );
}

/**
 * Delete old history entries beyond a limit.
 */
export async function pruneHistory(
  workspaceId: string,
  keepCount: number
): Promise<void> {
  await getDb().execute(
    `DELETE FROM history
     WHERE workspace_id = ?
     AND id NOT IN (
       SELECT id FROM history
       WHERE workspace_id = ?
       ORDER BY timestamp DESC
       LIMIT ?
     )`,
    [workspaceId, workspaceId, keepCount]
  );
}

/**
 * Clear all history for a workspace.
 */
export async function clearHistory(workspaceId: string): Promise<void> {
  await getDb().execute("DELETE FROM history WHERE workspace_id = ?", [
    workspaceId,
  ]);
}

// ============================================================================
// RESPONSE HISTORY
// ============================================================================

const RESPONSE_HISTORY_LIMIT = 25;

/**
 * Add a response history entry and prune old entries beyond the limit.
 */
export async function addResponseHistoryEntry(
  workspaceId: string,
  operationKey: string,
  responseJson: string
): Promise<number> {
  const timestamp = Date.now();
  const result = await getDb().execute(
    `INSERT INTO response_history (workspace_id, operation_key, response_json, timestamp)
     VALUES (?, ?, ?, ?)`,
    [workspaceId, operationKey, responseJson, timestamp]
  );

  // Prune: keep only the most recent entries per operation
  await getDb().execute(
    `DELETE FROM response_history
     WHERE workspace_id = ? AND operation_key = ?
     AND id NOT IN (
       SELECT id FROM response_history
       WHERE workspace_id = ? AND operation_key = ?
       ORDER BY timestamp DESC
       LIMIT ?
     )`,
    [
      workspaceId,
      operationKey,
      workspaceId,
      operationKey,
      RESPONSE_HISTORY_LIMIT,
    ]
  );

  return result.lastInsertId ?? 0;
}

/**
 * Get response history for an operation (most recent first).
 */
export async function getResponseHistory(
  workspaceId: string,
  operationKey: string
): Promise<DbResponseHistoryEntry[]> {
  return getDb().select<DbResponseHistoryEntry[]>(
    `SELECT * FROM response_history
     WHERE workspace_id = ? AND operation_key = ?
     ORDER BY timestamp DESC
     LIMIT ?`,
    [workspaceId, operationKey, RESPONSE_HISTORY_LIMIT]
  );
}

/**
 * Clear all response history for an operation.
 */
export async function clearResponseHistory(
  workspaceId: string,
  operationKey: string
): Promise<void> {
  await getDb().execute(
    "DELETE FROM response_history WHERE workspace_id = ? AND operation_key = ?",
    [workspaceId, operationKey]
  );
}
