Final Project Plan: Migrating to a Normalized SQLite Database

1. Objective

To replace the application's current IndexedDB and localStorage-heavy persistence layer with a robust, normalized SQLite database managed by the Rust backend. This will improve data integrity, performance, and scalability.

2. Strategy: Nuke and Pave

As there is no user data to migrate, we will perform a clean implementation:

Build the new SQLite backend with a multi-table schema.

Create a comprehensive API of Tauri commands for all data operations.

Rewrite the frontend's data access layer and state management logic to use this new API.

Remove all legacy IndexedDB code and dependencies.

Phase 1: Backend Implementation (Rust Core)

Task 1.1: Add Dependencies

In src-tauri/Cargo.toml, add the tauri-plugin-sql dependency.

code
Toml
download
content_copy
expand_less
[dependencies]

# ...

tauri-plugin-sql = { git = "https://github.com/tauri-apps/plugins-workspace", branch = "v1", features = ["sqlite"] }

Task 1.2: Database Initialization and Schema Migration

In src-tauri/src/main.rs, initialize the tauri-plugin-sql and define the complete 8-table schema using its migration system. This will create the cogeass.db file and all tables on the first application launch.

Migration SQL (main.rs):

code
Rust
download
content_copy
expand_less
// Migration 1: Workspaces
"CREATE TABLE workspaces (id TEXT PRIMARY KEY, name TEXT NOT NULL, ...);"
// Migration 2: Specs
"CREATE TABLE specs (id TEXT PRIMARY KEY, spec_content TEXT NOT NULL);"
// Migration 3: Environments
"CREATE TABLE environments (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, ..., FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE);"
// Migration 4: Workspace Variable Keys
"CREATE TABLE workspace_variable_keys (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id TEXT NOT NULL, ..., FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE);"
// Migration 5: Environment Variable Values
"CREATE TABLE environment_variable_values (...);"
// Migration 6: Global Headers
"CREATE TABLE global_headers (...);"
// Migration 7: Auth Values
"CREATE TABLE auth_values (...);"
// Migration 8: Operation States
"CREATE TABLE operation_states (...);"
// Migration 9: History
"CREATE TABLE history (...);"
// Migration 10: Indexes for performance
"CREATE INDEX idx_operations_last_modified ON operation_states(last_modified);"
"CREATE INDEX idx_history_timestamp ON history(timestamp);"

Task 1.3: Implement a Comprehensive Tauri Command API

In src-tauri/src/main.rs, create a suite of async Rust functions exposed as Tauri commands. These will be the sole interface for the frontend to interact with the database.

Required Commands:

Initial Load:

load_initial_data(): Fetches the list of all workspaces (id, name, sort_order) to populate the workspace selector on startup.

Workspace Switching:

get_full_workspace_data(workspace_id: String): A key command that fetches all data related to a single workspace in one call (details, environments, variables, headers, auth, history). This minimizes round-trips between the frontend and backend.

Workspace Management:

create_workspace(name: String): Creates a new workspace and returns its full object.

update_workspace(workspace: Workspace): Updates a workspace's details (name, base_url, etc.).

delete_workspace(id: String).

Spec Management:

save_spec(id: String, spec_content: String).

get_spec(id: String) -> String.

Environment & Variable Management:

create_environment(workspace_id: String, name: String).

update_environment(id: String, name: String).

delete_environment(id: String).

update_variable_value(environment_id: String, key_id: i64, value: String).

Operation State & History:

save_operation_state(state: OperationState).

get_operation_state(workspace_id: String, operation_key: String) -> Option<OperationState>.

add_history_entry(workspace_id: String, operation_key: String).

cleanup_old_responses(max_age_ms: i64).

Phase 2: Frontend Implementation

Task 2.1: Add Frontend Dependency

In package.json, add the JS client for the SQL plugin:

code
JSON
download
content_copy
expand_less
"dependencies": { "@tauri-apps/plugin-sql": "^1.0.0", ... }

Task 2.2: Define Backend Data Types

Create a new file, e.g., src/types/backend.ts, to define the TypeScript interfaces that match the JSON structures returned by the new Tauri commands (especially the payload from get_full_workspace_data).

Task 2.3: Create a New SQLite Repository

Create a new file: src/lib/storage/sqliteRepository.ts.

This file will contain TypeScript functions that wrap invoke() for every single Tauri command defined in Phase 1. This centralizes all backend communication.

Task 2.4: Overhaul the Zustand Store (useAppStore.ts)

Modify persist Middleware: Change the middleware to only persist minimal UI state that needs to survive a refresh before the database is loaded, such as activeWorkspaceId and workspaceOrder. The main application state will no longer be stored in localStorage.

Create an Initialization Action: Add a new async action, e.g., initializeAppState(), that is called once when the app starts. This action will call sqliteRepository.load_initial_data() to fetch the list of workspaces.

Refactor setActiveWorkspace: This action is now critical. It will call sqliteRepository.get_full_workspace_data() and use the response to hydrate all the relevant slices of the store (environmentSlice, authSlice, requestSlice, etc.) with the data for the selected workspace.

Update All Data-Modifying Actions: Every action that changes data (e.g., addEnvironment, setBaseUrl, setAuthValue) must now perform two steps:

Call the corresponding sqliteRepository function to persist the change to the database.

Update the in-memory Zustand state to reflect the change in the UI instantly.

Phase 3: Cleanup and Finalization

Task 3.1: Remove Old Dependencies and Files

Uninstall idb from package.json.

Delete the following files:

src/lib/storage/SpecRepository.ts

src/lib/storage/OperationRepository.ts

src/lib/storage/migrations.ts

clear-storage.html

Task 3.2: Clean Up Code

In App.tsx, remove the useEffect hook that calls runMigrationIfNeeded and ensureLocalStorageCleanup.

Search the project for any remaining references to the deleted files or idb and remove them.

Task 3.3: Clean Development Environment

Manually delete the application's support directory to remove old IndexedDB and localStorage.json files, ensuring a completely clean start with the new SQLite backend.

macOS: ~/Library/Application Support/cogeass.io/

Windows: %APPDATA%\cogeass.io\

Linux: ~/.config/cogeass.io/

This plan provides a clear, structured path from the current architecture to a more professional and robust SQLite backend. We will proceed with the code changes for each phase in sequence.

# Tables:

Workspaces: The top-level containers.

Specifications: The OpenAPI documents.

Environments: Named sets of variables within a workspace.

Variables: The actual key-value pairs. The keys are shared across a workspace, but values are specific to an environment.

Global Headers: Headers applied to all requests in a workspace.

Authorization Settings: Credentials that can be global or per-environment.

Operation State: The user's form data and last response for a specific API call.

History: A log of recently used operations.

This leads to the following normalized multi-table schema.

Proposed Normalized SQLite Schema

We will have 8 tables to cleanly separate concerns and establish proper relationships.

Table 1: workspaces

Purpose: The central table for user workspaces.
| Column Name | Data Type | Constraints | Description |
| :------------------------ | :-------- | :---------------------------------------------- | :-------------------------------------------------------------------------------- |
| id | TEXT | PRIMARY KEY | The unique ID for the workspace (e.g., ws_abc123). |
| name | TEXT | NOT NULL | The user-defined name of the workspace (e.g., "Project X API"). |
| active_spec_id | TEXT | REFERENCES specs(id) ON DELETE SET NULL | Foreign key to the currently active spec for this workspace. |
| active_environment_id | TEXT | REFERENCES environments(id) ON DELETE SET NULL| Foreign key to the currently active environment. |
| base_url | TEXT | | The base URL for API requests in this workspace. |
| selected_operation_key | TEXT | | The key of the last selected operation (e.g., get:/users/{id}). |
| sort_order | INTEGER | NOT NULL | An integer to maintain the user's preferred order of workspaces in the UI. |

Table 2: specs

Purpose: Stores the large OpenAPI JSON documents. Unchanged from the previous plan.
| Column Name | Data Type | Constraints | Description |
| :------------- | :-------- | :------------ | :----------------------------------------------------------------- |
| id | TEXT | PRIMARY KEY | The unique ID for the spec (URL or file hash). |
| spec_content | TEXT | NOT NULL | The full JSON content of the OpenAPI specification. |

Table 3: environments

Purpose: Defines the environments that belong to each workspace.
| Column Name | Data Type | Constraints | Description |
| :------------- | :-------- | :------------------------------------------------- | :----------------------------------------------------------------- |
| id | TEXT | PRIMARY KEY | The unique ID for the environment (e.g., env_xyz789). |
| workspace_id | TEXT | NOT NULL, REFERENCES workspaces(id) ON DELETE CASCADE | Foreign key linking this environment to its parent workspace. |
| name | TEXT | NOT NULL | The name of the environment (e.g., "Production", "Staging"). |
| | | UNIQUE(workspace_id, name) | Ensures no duplicate environment names within the same workspace. |

Table 4: workspace_variable_keys

Purpose: Defines the master list of all variable keys available within a workspace.
| Column Name | Data Type | Constraints | Description |
| :------------- | :-------- | :---------------------------------------------------- | :----------------------------------------------------------------- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | A simple integer primary key. |
| workspace_id | TEXT | NOT NULL, REFERENCES workspaces(id) ON DELETE CASCADE | Foreign key linking this variable key to its workspace. |
| key_name | TEXT | NOT NULL | The name of the variable (e.g., "API_TOKEN", "BASE_URL"). |
| | | UNIQUE(workspace_id, key_name) | Ensures no duplicate variable keys within the same workspace. |

Table 5: environment_variable_values

Purpose: Stores the actual value for each variable key within a specific environment. This is a junction table.
| Column Name | Data Type | Constraints | Description |
| :---------------- | :-------- | :-------------------------------------------------------------- | :----------------------------------------------------------- |
| environment_id | TEXT | NOT NULL, REFERENCES environments(id) ON DELETE CASCADE | Part of the composite primary key, links to an environment. |
| variable_key_id | INTEGER | NOT NULL, REFERENCES workspace_variable_keys(id) ON DELETE CASCADE | Part of the composite primary key, links to a variable key. |
| value | TEXT | NOT NULL | The value of the variable for this specific environment. |
| | | PRIMARY KEY(environment_id, variable_key_id) | Composite key ensures one value per variable per environment.|

Table 6: global_headers

Purpose: Stores the key-value headers for a workspace.
| Column Name | Data Type | Constraints | Description |
| :------------- | :-------- | :---------------------------------------------------- | :---------------------------------------------------------- |
| workspace_id | TEXT | NOT NULL, REFERENCES workspaces(id) ON DELETE CASCADE | Part of the primary key, links to the workspace. |
| key | TEXT | NOT NULL | Part of the primary key, the header name (e.g., "User-Agent"). |
| value | TEXT | NOT NULL | The header value. |
| | | PRIMARY KEY(workspace_id, key) | Ensures header keys are unique per workspace. |

Table 7: auth_values

Purpose: Stores authorization credentials. Supports both global (workspace-level) and per-environment overrides.
| Column Name | Data Type | Constraints | Description |
| :--------------- | :-------- | :----------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| workspace_id | TEXT | NOT NULL, REFERENCES workspaces(id) ON DELETE CASCADE | Links to the workspace. |
| environment_id | TEXT | REFERENCES environments(id) ON DELETE CASCADE | Nullable. If NULL, this is a global value. If set, it's an override for that specific environment. |
| scheme_name | TEXT | NOT NULL | The name of the security scheme from the spec (e.g., "bearerAuth", "apiKey"). |
| value_json | TEXT | NOT NULL | A JSON string containing the auth data (e.g., {"token": "..."} or {"username": "...", "password": "..."}). |
| | | PRIMARY KEY(workspace_id, environment_id, scheme_name) | Ensures uniqueness for each scheme within a workspace/environment scope. |

Table 8: operations & history (Combined Logic)

We can handle both operation state and history efficiently. Let's split them for clarity.

Table 8a: operation_states

Purpose: Stores the form data and last response for an operation.
| Column Name | Data Type | Constraints | Description |
| :-------------- | :-------- | :----------------------------------------------- | :------------------------------------------------------------------- |
| workspace_id | TEXT | NOT NULL, REFERENCES workspaces(id) ON DELETE CASCADE | Part of the primary key, links to the workspace. |
| operation_key | TEXT | NOT NULL | Part of the primary key, the operation identifier. |
| form_data | TEXT | NOT NULL | JSON string of all request form data. |
| response | TEXT | | Nullable JSON string of the last response. |
| last_modified | INTEGER | NOT NULL | Unix timestamp for when the record was last touched. Indexed for cleanup. |
| | | PRIMARY KEY(workspace_id, operation_key) | Ensures one state per operation per workspace. |

Table 8b: history

Purpose: A simple, ordered log of recently used operations.
| Column Name | Data Type | Constraints | Description |
| :-------------- | :-------- | :---------------------------------------------------- | :------------------------------------------------------------------- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | A simple auto-incrementing key. |
| workspace_id | TEXT | NOT NULL, REFERENCES workspaces(id) ON DELETE CASCADE | Links the history entry to a workspace. |
| operation_key | TEXT | NOT NULL | The identifier of the operation that was used. |
| timestamp | INTEGER | NOT NULL | Unix timestamp of when the operation was executed. Indexed for ordering. |

This normalized schema is robust and correctly models the application's state. It uses foreign keys with ON DELETE CASCADE to ensure data integrity (e.g., deleting a workspace automatically cleans up all its related environments, variables, etc.).
