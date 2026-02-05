import type { OpenAPIV3 } from "openapi-types";
import type { Environment } from "@/store/types";

/**
 * Represents a detected path parameter pattern.
 * Used to allow users to review and edit auto-detected dynamic segments.
 */
export interface DetectedPathParam {
  /** Original path as found in the source, e.g., "/users/123/posts/456" */
  originalPath: string;
  /** Parameterized path, e.g., "/users/{userId}/posts/{postId}" */
  parameterizedPath: string;
  /** Mapping of parameter names to example values */
  parameters: Array<{
    name: string;
    exampleValue: string;
    segmentIndex: number;
  }>;
  /** Confidence score 0-1 for the detection */
  confidence: number;
}

/**
 * Warning generated during import conversion.
 */
export interface ImportWarning {
  /** Warning type for categorization */
  type:
    | "unsupported_auth"
    | "unsupported_body"
    | "script_ignored"
    | "graphql_skipped"
    | "websocket_skipped"
    | "binary_body"
    | "formdata_body"
    | "oauth2_flow"
    | "unknown_format"
    | "parse_error";
  /** Human-readable message */
  message: string;
  /** Context: affected item (request name, path, etc.) */
  context?: string;
}

/**
 * Metadata about the import source.
 */
export interface ImportMetadata {
  /** Format of the source file */
  sourceFormat: "postman" | "insomnia" | "har";
  /** Name of the collection/workspace/file */
  sourceName: string;
  /** Number of requests in the source */
  requestCount: number;
  /** Number of unique endpoints (method + path) */
  endpointCount: number;
  /** Version of the source format if available */
  formatVersion?: string;
}

/**
 * Result of importing a collection file.
 */
export interface ImportResult {
  /** The converted OpenAPI specification */
  spec: OpenAPIV3.Document;
  /** Extracted environments (from Postman/Insomnia variables) */
  environments: Environment[];
  /** Detected path parameters for user review */
  detectedPaths: DetectedPathParam[];
  /** Warnings generated during conversion */
  warnings: ImportWarning[];
  /** Metadata about the import */
  metadata: ImportMetadata;
}

/**
 * Options for the import process.
 */
export interface ImportOptions {
  /** Custom name for the imported workspace */
  workspaceName?: string;
  /** Whether to infer schemas from request/response bodies */
  inferSchemas?: boolean;
  /** Whether to import environments/variables */
  importEnvironments?: boolean;
  /** Base URL to use for the spec (overrides detected) */
  baseUrl?: string;
  /** Path parameter patterns to apply (user-edited) */
  pathPatterns?: DetectedPathParam[];
}

/**
 * Supported import formats.
 */
export type ImportFormat = "postman" | "insomnia" | "har" | null;
