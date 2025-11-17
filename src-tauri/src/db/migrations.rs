use tauri_plugin_sql::{Migration, MigrationKind};

/// Returns all database migrations for the application
pub fn get_migrations() -> Vec<Migration> {
    vec![
        // Migration 1: Workspaces table
        Migration {
            version: 1,
            description: "create workspaces table",
            sql: "CREATE TABLE workspaces (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                active_spec_id TEXT,
                active_environment_id TEXT,
                base_url TEXT,
                selected_operation_key TEXT,
                sort_order INTEGER NOT NULL
            );",
            kind: MigrationKind::Up,
        },
        // Migration 2: Specs table
        Migration {
            version: 2,
            description: "create specs table",
            sql: "CREATE TABLE specs (
                id TEXT PRIMARY KEY,
                spec_content TEXT NOT NULL
            );",
            kind: MigrationKind::Up,
        },
        // Migration 3: Environments table
        Migration {
            version: 3,
            description: "create environments table",
            sql: "CREATE TABLE environments (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                name TEXT NOT NULL,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                UNIQUE(workspace_id, name)
            );",
            kind: MigrationKind::Up,
        },
        // Migration 4: Workspace variable keys table
        Migration {
            version: 4,
            description: "create workspace_variable_keys table",
            sql: "CREATE TABLE workspace_variable_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id TEXT NOT NULL,
                key_name TEXT NOT NULL,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                UNIQUE(workspace_id, key_name)
            );",
            kind: MigrationKind::Up,
        },
        // Migration 5: Environment variable values table
        Migration {
            version: 5,
            description: "create environment_variable_values table",
            sql: "CREATE TABLE environment_variable_values (
                environment_id TEXT NOT NULL,
                variable_key_id INTEGER NOT NULL,
                value TEXT NOT NULL,
                PRIMARY KEY(environment_id, variable_key_id),
                FOREIGN KEY(environment_id) REFERENCES environments(id) ON DELETE CASCADE,
                FOREIGN KEY(variable_key_id) REFERENCES workspace_variable_keys(id) ON DELETE CASCADE
            );",
            kind: MigrationKind::Up,
        },
        // Migration 6: Global headers table
        Migration {
            version: 6,
            description: "create global_headers table",
            sql: "CREATE TABLE global_headers (
                workspace_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                PRIMARY KEY(workspace_id, key),
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            );",
            kind: MigrationKind::Up,
        },
        // Migration 7: Auth values table
        Migration {
            version: 7,
            description: "create auth_values table",
            sql: "CREATE TABLE auth_values (
                workspace_id TEXT NOT NULL,
                environment_id TEXT,
                scheme_name TEXT NOT NULL,
                value_json TEXT NOT NULL,
                PRIMARY KEY(workspace_id, environment_id, scheme_name),
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY(environment_id) REFERENCES environments(id) ON DELETE CASCADE
            );",
            kind: MigrationKind::Up,
        },
        // Migration 8: Operation states table
        Migration {
            version: 8,
            description: "create operation_states table",
            sql: "CREATE TABLE operation_states (
                workspace_id TEXT NOT NULL,
                operation_key TEXT NOT NULL,
                form_data TEXT NOT NULL,
                response TEXT,
                last_modified INTEGER NOT NULL,
                PRIMARY KEY(workspace_id, operation_key),
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            );",
            kind: MigrationKind::Up,
        },
        // Migration 9: History table
        Migration {
            version: 9,
            description: "create history table",
            sql: "CREATE TABLE history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id TEXT NOT NULL,
                operation_key TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            );",
            kind: MigrationKind::Up,
        },
        // Migration 10: Indexes for performance
        Migration {
            version: 10,
            description: "create performance indexes",
            sql: "CREATE INDEX idx_operations_last_modified ON operation_states(last_modified);
                   CREATE INDEX idx_history_timestamp ON history(timestamp);",
            kind: MigrationKind::Up,
        },
    ]
}
