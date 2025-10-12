import { openDB, type DBSchema } from "idb";
import type { DerefSpec } from "./openapi";

const DB_NAME = "cogeass-db";
const DB_VERSION = 1;
const SPEC_STORE_NAME = "specs";
const SPEC_KEY = "current-spec";

interface CoGeassDB extends DBSchema {
  [SPEC_STORE_NAME]: {
    key: string;
    value: DerefSpec;
  };
}

// Open the database
const dbPromise = openDB<CoGeassDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    db.createObjectStore(SPEC_STORE_NAME);
  },
});

/**
 * Saves the current OpenAPI specification object to IndexedDB.
 * @param spec The dereferenced spec object to save.
 */
export async function saveSpecToDB(spec: DerefSpec): Promise<void> {
  try {
    const db = await dbPromise;
    await db.put(SPEC_STORE_NAME, spec, SPEC_KEY);
    console.log("Spec saved to IndexedDB.");
  } catch (error) {
    console.error("Failed to save spec to IndexedDB:", error);
  }
}

/**
 * Retrieves the OpenAPI specification object from IndexedDB.
 * @returns The saved spec object, or undefined if not found.
 */
export async function getSpecFromDB(): Promise<DerefSpec | undefined> {
  try {
    const db = await dbPromise;
    return await db.get(SPEC_STORE_NAME, SPEC_KEY);
  } catch (error) {
    console.error("Failed to get spec from IndexedDB:", error);
    return undefined;
  }
}

/**
 * Clears the saved OpenAPI specification from IndexedDB.
 */
export async function clearSpecFromDB(): Promise<void> {
  try {
    const db = await dbPromise;
    await db.delete(SPEC_STORE_NAME, SPEC_KEY);
    console.log("Spec cleared from IndexedDB.");
  } catch (error) {
    console.error("Failed to clear spec from IndexedDB:", error);
  }
}
