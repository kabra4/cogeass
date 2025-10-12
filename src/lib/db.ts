import { openDB, type DBSchema } from "idb";
import type { DerefSpec } from "./openapi";

const DB_NAME = "cogeass-db";
const DB_VERSION = 1;
const SPEC_STORE_NAME = "specs";
const LAST_SPEC_ID_KEY = "__last_spec_id__";
const METADATA_STORE_NAME = "metadata";

interface CoGeassDB extends DBSchema {
  [SPEC_STORE_NAME]: {
    key: string;
    value: DerefSpec;
  };
  [METADATA_STORE_NAME]: {
    key: string;
    value: string;
  };
}

// Open the database
const dbPromise = openDB<CoGeassDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    db.createObjectStore(SPEC_STORE_NAME);
    db.createObjectStore(METADATA_STORE_NAME);
  },
});

/**
 * Saves the current OpenAPI specification object to IndexedDB.
 * @param spec The dereferenced spec object to save.
 */
export async function saveSpecToDB(spec: DerefSpec): Promise<void> {
  // For backward compatibility, use a fixed ID
  const specId = "current-spec";
  await saveSpecWithIdToDB(specId, spec);
}

/**
 * Saves an OpenAPI specification with a specific ID to IndexedDB.
 * @param id The unique identifier for the spec.
 * @param spec The dereferenced spec object to save.
 */
export async function saveSpecWithIdToDB(
  id: string,
  spec: DerefSpec
): Promise<void> {
  try {
    const db = await dbPromise;
    await db.put(SPEC_STORE_NAME, spec, id);
    await db.put(METADATA_STORE_NAME, id, LAST_SPEC_ID_KEY);
    console.log(`Spec saved to IndexedDB with ID: ${id}`);
  } catch (error) {
    console.error("Failed to save spec to IndexedDB:", error);
  }
}

/**
 * Retrieves the OpenAPI specification object from IndexedDB.
 * @returns The saved spec object, or undefined if not found.
 */
export async function getSpecFromDB(): Promise<DerefSpec | undefined> {
  // For backward compatibility, use a fixed ID
  const specId = "current-spec";
  return await getSpecFromDBById(specId);
}

/**
 * Retrieves an OpenAPI specification by ID from IndexedDB.
 * @param id The unique identifier for the spec.
 * @returns The saved spec object, or undefined if not found.
 */
export async function getSpecFromDBById(
  id: string
): Promise<DerefSpec | undefined> {
  try {
    const db = await dbPromise;
    return await db.get(SPEC_STORE_NAME, id);
  } catch (error) {
    console.error("Failed to get spec from IndexedDB:", error);
    return undefined;
  }
}

/**
 * Retrieves the ID of the last used spec from IndexedDB.
 * @returns The last used spec ID, or undefined if not found.
 */
export async function getLastUsedSpecId(): Promise<string | undefined> {
  try {
    const db = await dbPromise;
    const result = await db.get(METADATA_STORE_NAME, LAST_SPEC_ID_KEY);
    return typeof result === "string" ? result : undefined;
  } catch (error) {
    console.error("Failed to get last used spec ID from IndexedDB:", error);
    return undefined;
  }
}

/**
 * Clears the saved OpenAPI specification from IndexedDB.
 */
export async function clearSpecFromDB(): Promise<void> {
  // For backward compatibility, use a fixed ID
  const specId = "current-spec";
  await clearSpecFromDBById(specId);
}

/**
 * Clears a specific OpenAPI specification by ID from IndexedDB.
 * @param id The unique identifier for the spec to clear.
 */
export async function clearSpecFromDBById(id: string): Promise<void> {
  try {
    const db = await dbPromise;
    await db.delete(SPEC_STORE_NAME, id);
    console.log(`Spec cleared from IndexedDB with ID: ${id}`);
  } catch (error) {
    console.error("Failed to clear spec from IndexedDB:", error);
  }
}
