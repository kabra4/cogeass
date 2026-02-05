import type { ImportResult, ImportOptions } from "../types";
import type { PostmanCollection } from "./types";
import { isPostmanCollection } from "./types";
import { convertPostmanToOpenAPI } from "./converter";

export { isPostmanCollection } from "./types";
export { convertPostmanToOpenAPI } from "./converter";
export type { PostmanCollection } from "./types";

/**
 * Parse a Postman collection from a JSON string or object.
 */
export function parsePostmanCollection(
  input: string | object
): PostmanCollection {
  const obj = typeof input === "string" ? JSON.parse(input) : input;

  if (!isPostmanCollection(obj)) {
    throw new Error("Invalid Postman collection format");
  }

  return obj;
}

/**
 * Import a Postman collection and convert to OpenAPI.
 */
export function importPostmanCollection(
  input: string | object,
  options: ImportOptions = {}
): ImportResult {
  const collection = parsePostmanCollection(input);
  return convertPostmanToOpenAPI(collection, options);
}
