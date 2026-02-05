import type { ImportFormat, ImportResult, ImportOptions } from "./types";
import { isPostmanCollection, importPostmanCollection } from "./postman";
import { isInsomniaExport, importInsomniaExport } from "./insomnia";
import { isHarFile, importHarFile } from "./har";

export type { ImportFormat, ImportResult, ImportOptions, ImportWarning, DetectedPathParam, ImportMetadata } from "./types";
export { detectPathParameters, detectPathParametersInPath, applyPathPatterns } from "./path-detection";
export { inferSchemaFromExample, inferSchemaFromJson, inferRequestBodySchema, inferResponseSchema } from "./schema-inference";
export { mapPostmanAuth, mapInsomniaAuth, detectAuthFromHeaders, mergeAuthResults } from "./auth-mapping";

// Re-export converters
export { importPostmanCollection, isPostmanCollection } from "./postman";
export { importInsomniaExport, isInsomniaExport } from "./insomnia";
export { importHarFile, isHarFile } from "./har";

/**
 * Detect the format of an import file from its content.
 *
 * @param content - The file content as a string or parsed object
 * @returns The detected format, or null if not recognized
 */
export function detectFormat(content: string | object): ImportFormat {
  try {
    const obj = typeof content === "string" ? JSON.parse(content) : content;

    // Check Postman Collection (info.schema contains "getpostman.com")
    if (isPostmanCollection(obj)) {
      return "postman";
    }

    // Check Insomnia Export (_type === "export" && __export_format === 4)
    if (isInsomniaExport(obj)) {
      return "insomnia";
    }

    // Check HAR file (log.version && log.entries exist)
    if (isHarFile(obj)) {
      return "har";
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Import a file and convert it to OpenAPI specification.
 * Automatically detects the format and uses the appropriate converter.
 *
 * @param content - The file content as a string or parsed object
 * @param options - Import options
 * @returns The import result containing the OpenAPI spec and metadata
 * @throws Error if the format is not recognized
 */
export function importFile(
  content: string | object,
  options: ImportOptions = {}
): ImportResult {
  const format = detectFormat(content);

  switch (format) {
    case "postman":
      return importPostmanCollection(content, options);
    case "insomnia":
      return importInsomniaExport(content, options);
    case "har":
      return importHarFile(content, options);
    default:
      throw new Error(
        "Unrecognized file format. Supported formats: Postman Collection v2.1, Insomnia Export v4, HAR."
      );
  }
}

/**
 * Get the display name for an import format.
 */
export function getFormatDisplayName(format: ImportFormat): string {
  switch (format) {
    case "postman":
      return "Postman Collection";
    case "insomnia":
      return "Insomnia Export";
    case "har":
      return "HAR File";
    default:
      return "Unknown";
  }
}

/**
 * Get the icon name for an import format (for use with lucide-react icons).
 */
export function getFormatIcon(format: ImportFormat): string {
  switch (format) {
    case "postman":
      return "Package"; // Represents a collection
    case "insomnia":
      return "Moon"; // Insomnia theme
    case "har":
      return "FileJson"; // Archive format
    default:
      return "File";
  }
}

/**
 * Validate that a file can be imported.
 * Returns format if valid, throws error with details if not.
 */
export function validateImportFile(content: string): {
  format: ImportFormat;
  parsedContent: object;
} {
  let parsedContent: object;

  try {
    parsedContent = JSON.parse(content);
  } catch (e) {
    throw new Error("Invalid JSON: " + (e instanceof Error ? e.message : "Parse error"));
  }

  const format = detectFormat(parsedContent);

  if (!format) {
    // Provide helpful error message
    const obj = parsedContent as Record<string, unknown>;

    if (obj.info && typeof obj.info === "object") {
      throw new Error(
        "This looks like a Postman collection, but the schema version is not supported. " +
        "Please export as Collection v2.1."
      );
    }

    if (obj._type === "export") {
      throw new Error(
        "This looks like an Insomnia export, but the format version is not supported. " +
        "Please export using Insomnia v4 format."
      );
    }

    if (obj.log) {
      throw new Error(
        "This looks like a HAR file, but it's missing required fields. " +
        "Please ensure it's a valid HTTP Archive file."
      );
    }

    throw new Error(
      "Unrecognized file format. Supported formats:\n" +
      "• Postman Collection v2.1\n" +
      "• Insomnia Export v4\n" +
      "• HAR (HTTP Archive)"
    );
  }

  return { format, parsedContent };
}
