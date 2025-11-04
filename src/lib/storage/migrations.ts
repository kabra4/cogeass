// src/lib/storage/migrations.ts
import { operationRepository } from "./OperationRepository";

/**
 * Migrate operation state data from localStorage (Zustand persist) to IndexedDB
 * This reads the old format and saves it to the new IndexedDB structure
 */
export async function migrateToIndexedDB(): Promise<void> {
  try {
    // 1. Read from localStorage (zustand persist)
    const stored = localStorage.getItem("cogeass-storage");
    if (!stored) {
      console.log("No data to migrate from localStorage");
      return;
    }

    const data = JSON.parse(stored);

    // Check if this is already migrated format (has workspaces)
    if (!data.workspaces || typeof data.workspaces !== "object") {
      console.log("No workspaces found in storage, skipping migration");
      return;
    }

    let totalMigrated = 0;
    let totalOperations = 0;

    // 2. For each workspace, migrate operationState to IndexedDB
    for (const [wsId, ws] of Object.entries(data.workspaces)) {
      if (!ws || typeof ws !== "object") continue;

      const workspace = ws as {
        data?: { operationState?: Record<string, unknown> };
      };
      const opStates = workspace.data?.operationState || {};

      for (const [opKey, opState] of Object.entries(opStates)) {
        if (!opState || typeof opState !== "object") continue;

        totalOperations++;
        const state = opState as {
          pathData?: Record<string, unknown>;
          queryData?: Record<string, unknown>;
          headerData?: Record<string, unknown>;
          customHeaderData?: Record<string, string>;
          bodyData?: Record<string, unknown>;
          response?: {
            status: number;
            statusText: string;
            headers: Record<string, string>;
            bodyText: string;
            bodyJson: unknown;
            timestamp: number;
          };
        };

        try {
          await operationRepository.saveOperationData(wsId, opKey, {
            formData: {
              pathData: state.pathData,
              queryData: state.queryData,
              headerData: state.headerData,
              customHeaderData: state.customHeaderData,
              bodyData: state.bodyData,
            },
            response: state.response, // if exists
          });
          totalMigrated++;
        } catch (error) {
          console.error(
            `Failed to migrate operation ${opKey} for workspace ${wsId}:`,
            error
          );
        }
      }

      // 3. Clean up workspace data (remove operationState from localStorage)
      // We'll keep the workspace structure but empty the operationState
      if (workspace.data && workspace.data.operationState) {
        workspace.data.operationState = {};
      }
    }

    // 4. Save cleaned up data back to localStorage
    localStorage.setItem("cogeass-storage", JSON.stringify(data));

    console.log(
      `Migration completed: ${totalMigrated}/${totalOperations} operations migrated to IndexedDB`
    );
  } catch (error) {
    console.error("Migration to IndexedDB failed:", error);
    throw error;
  }
}

/**
 * Check if migration has been completed
 */
export function isMigrationCompleted(): boolean {
  return localStorage.getItem("idb-migration-v1") === "true";
}

/**
 * Mark migration as completed
 */
export function markMigrationCompleted(): void {
  localStorage.setItem("idb-migration-v1", "true");
}

/**
 * Reset migration flag (for testing purposes)
 */
export function resetMigrationFlag(): void {
  localStorage.removeItem("idb-migration-v1");
}

/**
 * Full migration workflow with error handling and flag management
 */
export async function runMigrationIfNeeded(): Promise<void> {
  if (isMigrationCompleted()) {
    console.log("Migration already completed, skipping");
    return;
  }

  console.log("Starting migration to IndexedDB...");

  try {
    await migrateToIndexedDB();
    markMigrationCompleted();
    console.log("Migration successful and marked as completed");
  } catch (error) {
    console.error("Migration failed:", error);
    // Don't mark as completed if it failed
    throw error;
  }
}
