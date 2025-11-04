// src/lib/storage/OperationRepository.ts
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

const DB_NAME = "cogeass-operations-db";
const DB_VERSION = 1;
const OPERATIONS_STORE_NAME = "operations";

export interface OperationData {
  workspaceId: string;
  operationKey: string; // "get:/api/users"
  formData: {
    pathData?: Record<string, unknown>;
    queryData?: Record<string, unknown>;
    headerData?: Record<string, unknown>;
    customHeaderData?: Record<string, string>;
    bodyData?: Record<string, unknown>;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    bodyText: string;
    bodyJson: unknown;
    timestamp: number;
  };
  lastModified: number;
}

interface OperationDataDB extends DBSchema {
  [OPERATIONS_STORE_NAME]: {
    key: string; // composite: `${workspaceId}:${operationKey}`
    value: OperationData;
    indexes: {
      "by-workspace": string; // workspaceId
      "by-timestamp": number; // lastModified
    };
  };
}

let dbPromise: Promise<IDBPDatabase<OperationDataDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OperationDataDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(OPERATIONS_STORE_NAME)) {
          const store = db.createObjectStore(OPERATIONS_STORE_NAME);
          store.createIndex("by-workspace", "workspaceId", { unique: false });
          store.createIndex("by-timestamp", "lastModified", { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

function makeKey(workspaceId: string, operationKey: string): string {
  return `${workspaceId}:${operationKey}`;
}

export const operationRepository = {
  /**
   * Save or update operation data (form values)
   */
  async saveOperationData(
    workspaceId: string,
    operationKey: string,
    data: {
      formData: OperationData["formData"];
      response?: OperationData["response"];
    }
  ): Promise<void> {
    const db = await getDB();
    const key = makeKey(workspaceId, operationKey);

    // Get existing data to preserve response if not provided
    const existing = await db.get(OPERATIONS_STORE_NAME, key);

    const operationData: OperationData = {
      workspaceId,
      operationKey,
      formData: data.formData,
      response: data.response ?? existing?.response,
      lastModified: Date.now(),
    };

    await db.put(OPERATIONS_STORE_NAME, operationData, key);
  },

  /**
   * Save only the response for an operation
   */
  async saveOperationResponse(
    workspaceId: string,
    operationKey: string,
    response: OperationData["response"]
  ): Promise<void> {
    const db = await getDB();
    const key = makeKey(workspaceId, operationKey);

    // Get existing data to preserve form values
    const existing = await db.get(OPERATIONS_STORE_NAME, key);

    const operationData: OperationData = {
      workspaceId,
      operationKey,
      formData: existing?.formData ?? {},
      response,
      lastModified: Date.now(),
    };

    await db.put(OPERATIONS_STORE_NAME, operationData, key);
  },

  /**
   * Get operation data (form values + response)
   */
  async getOperationData(
    workspaceId: string,
    operationKey: string
  ): Promise<OperationData | undefined> {
    const db = await getDB();
    const key = makeKey(workspaceId, operationKey);
    return db.get(OPERATIONS_STORE_NAME, key);
  },

  /**
   * Delete specific operation data
   */
  async deleteOperationData(
    workspaceId: string,
    operationKey: string
  ): Promise<void> {
    const db = await getDB();
    const key = makeKey(workspaceId, operationKey);
    await db.delete(OPERATIONS_STORE_NAME, key);
  },

  /**
   * Delete all operations for a workspace
   */
  async deleteWorkspaceOperations(workspaceId: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(OPERATIONS_STORE_NAME, "readwrite");
    const index = tx.store.index("by-workspace");

    let cursor = await index.openCursor(IDBKeyRange.only(workspaceId));

    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    await tx.done;
  },

  /**
   * Get all operation keys for a workspace
   */
  async getAllOperationKeys(workspaceId: string): Promise<string[]> {
    const db = await getDB();
    const tx = db.transaction(OPERATIONS_STORE_NAME, "readonly");
    const index = tx.store.index("by-workspace");

    const operations: string[] = [];
    let cursor = await index.openCursor(IDBKeyRange.only(workspaceId));

    while (cursor) {
      operations.push(cursor.value.operationKey);
      cursor = await cursor.continue();
    }

    await tx.done;
    return operations;
  },

  /**
   * Clean up old responses (operations without responses are kept)
   */
  async cleanupOldResponses(maxAgeMs: number): Promise<number> {
    const db = await getDB();
    const cutoffTime = Date.now() - maxAgeMs;
    const tx = db.transaction(OPERATIONS_STORE_NAME, "readwrite");
    const index = tx.store.index("by-timestamp");

    let deletedCount = 0;
    let cursor = await index.openCursor(
      IDBKeyRange.upperBound(cutoffTime)
    );

    while (cursor) {
      // Only delete if it has a response (keep form data indefinitely)
      if (cursor.value.response) {
        const updated: OperationData = {
          ...cursor.value,
          response: undefined,
          lastModified: Date.now(),
        };
        await cursor.update(updated);
        deletedCount++;
      }
      cursor = await cursor.continue();
    }

    await tx.done;
    return deletedCount;
  },

  /**
   * Get total count of operations across all workspaces
   */
  async getTotalCount(): Promise<number> {
    const db = await getDB();
    return db.count(OPERATIONS_STORE_NAME);
  },

  /**
   * Clear all operation data (use with caution!)
   */
  async clearAll(): Promise<void> {
    const db = await getDB();
    await db.clear(OPERATIONS_STORE_NAME);
  },
};
