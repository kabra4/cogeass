// src/lib/storage/SpecRepository.ts
import { openDB, type DBSchema } from "idb";
import type { DerefSpec } from "@/lib/openapi";

const DB_NAME = "cogeass-db";
const DB_VERSION = 2;
const SPEC_STORE_NAME = "specs";
const METADATA_STORE_NAME = "metadata";
const LAST_USED_SPEC_ID_KEY = "__last_spec_id__";

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

const dbPromise = openDB<CoGeassDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(SPEC_STORE_NAME)) {
      db.createObjectStore(SPEC_STORE_NAME);
    }
    if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
      db.createObjectStore(METADATA_STORE_NAME);
    }
  },
});

export const specRepository = {
  async save(id: string, spec: DerefSpec): Promise<void> {
    const db = await dbPromise;
    await db.put(SPEC_STORE_NAME, spec, id);
    // Also mark this as the last one used
    await this.setLastUsedId(id);
  },

  async getById(id: string): Promise<DerefSpec | undefined> {
    const db = await dbPromise;
    return db.get(SPEC_STORE_NAME, id);
  },

  async setLastUsedId(id: string): Promise<void> {
    const db = await dbPromise;
    await db.put(METADATA_STORE_NAME, id, LAST_USED_SPEC_ID_KEY);
  },

  async getLastUsedId(): Promise<string | undefined> {
    const db = await dbPromise;
    return db.get(METADATA_STORE_NAME, LAST_USED_SPEC_ID_KEY);
  },

  async clearById(id: string): Promise<void> {
    const db = await dbPromise;
    await db.delete(SPEC_STORE_NAME, id);
  }
};
