import type { ImportResult, ImportOptions } from "../types";
import type { InsomniaExport } from "./types";
import { isInsomniaExport } from "./types";
import { convertInsomniaToOpenAPI } from "./converter";

export { isInsomniaExport } from "./types";
export { convertInsomniaToOpenAPI } from "./converter";
export type { InsomniaExport } from "./types";

/**
 * Parse an Insomnia export from a JSON string or object.
 */
export function parseInsomniaExport(input: string | object): InsomniaExport {
  const obj = typeof input === "string" ? JSON.parse(input) : input;

  if (!isInsomniaExport(obj)) {
    throw new Error("Invalid Insomnia export format");
  }

  return obj;
}

/**
 * Import an Insomnia export and convert to OpenAPI.
 */
export function importInsomniaExport(
  input: string | object,
  options: ImportOptions = {}
): ImportResult {
  const exportData = parseInsomniaExport(input);
  return convertInsomniaToOpenAPI(exportData, options);
}
