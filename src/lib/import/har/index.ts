import type { Har } from "har-format";
import type { ImportResult, ImportOptions } from "../types";
import { isHarFile, convertHarToOpenAPI } from "./converter";

export { isHarFile, convertHarToOpenAPI } from "./converter";

/**
 * Parse a HAR file from a JSON string or object.
 */
export function parseHarFile(input: string | object): Har {
  const obj = typeof input === "string" ? JSON.parse(input) : input;

  if (!isHarFile(obj)) {
    throw new Error("Invalid HAR file format");
  }

  return obj;
}

/**
 * Import a HAR file and convert to OpenAPI.
 */
export function importHarFile(
  input: string | object,
  options: ImportOptions = {}
): ImportResult {
  const har = parseHarFile(input);
  return convertHarToOpenAPI(har, options);
}
