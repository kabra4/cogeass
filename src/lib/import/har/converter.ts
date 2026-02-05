import type { Har, Entry, Request, Response } from "har-format";
import type { OpenAPIV3 } from "openapi-types";
import type { ImportResult, ImportWarning, ImportOptions } from "../types";
import { detectPathParameters, applyPathPatterns } from "../path-detection";
import { inferSchemaFromExample, inferResponseSchema } from "../schema-inference";
import { detectAuthFromHeaders, mergeAuthResults } from "../auth-mapping";

/**
 * Group HAR entries by method + path pattern.
 */
interface GroupedEntry {
  method: string;
  path: string;
  entries: Entry[];
}

/**
 * Parse URL and extract path and query parameters.
 */
function parseHarUrl(url: string): {
  path: string;
  queryParams: Map<string, string>;
  baseUrl: string;
} {
  const queryParams = new Map<string, string>();

  try {
    const parsed = new URL(url);
    parsed.searchParams.forEach((value, key) => {
      queryParams.set(key, value);
    });

    return {
      path: parsed.pathname || "/",
      queryParams,
      baseUrl: `${parsed.protocol}//${parsed.host}`,
    };
  } catch {
    // If URL parsing fails, try to extract path
    const pathMatch = url.match(/^(?:https?:\/\/[^/]+)?(\/[^?]*)/);
    return {
      path: pathMatch ? pathMatch[1] : "/",
      queryParams,
      baseUrl: "",
    };
  }
}

/**
 * Group entries by method and parameterized path.
 */
function groupEntries(
  entries: Entry[],
  pathMapping: Map<string, string>
): Map<string, GroupedEntry> {
  const groups = new Map<string, GroupedEntry>();

  for (const entry of entries) {
    const method = entry.request.method.toLowerCase();
    const { path: originalPath } = parseHarUrl(entry.request.url);
    const path = pathMapping.get(originalPath) || originalPath;

    const key = `${method}:${path}`;

    if (!groups.has(key)) {
      groups.set(key, {
        method,
        path,
        entries: [],
      });
    }

    groups.get(key)!.entries.push(entry);
  }

  return groups;
}

/**
 * Extract headers from HAR request, excluding common/unwanted ones.
 */
function extractHeaders(
  request: Request
): Record<string, string> {
  const headers: Record<string, string> = {};
  const excludedHeaders = new Set([
    "host",
    "connection",
    "content-length",
    "accept-encoding",
    "user-agent",
    "cache-control",
    "pragma",
    "cookie",
    "set-cookie",
    "sec-",
    "upgrade-insecure-requests",
    "dnt",
  ]);

  for (const header of request.headers) {
    const lowerName = header.name.toLowerCase();
    const isExcluded = [...excludedHeaders].some((ex) =>
      lowerName.startsWith(ex)
    );
    if (!isExcluded) {
      headers[header.name] = header.value;
    }
  }

  return headers;
}

/**
 * Convert HAR request body to OpenAPI request body.
 */
function convertRequestBody(
  request: Request,
  inferSchemas: boolean
): { requestBody?: OpenAPIV3.RequestBodyObject; warnings: ImportWarning[] } {
  const warnings: ImportWarning[] = [];
  const postData = request.postData;

  if (!postData) {
    return { warnings };
  }

  const mimeType = postData.mimeType || "application/json";

  // Skip binary/multipart
  if (mimeType.includes("multipart/form-data")) {
    warnings.push({
      type: "formdata_body",
      message: "Multipart form-data bodies are not fully converted.",
    });

    if (postData.params) {
      const properties: Record<string, OpenAPIV3.SchemaObject> = {};
      for (const param of postData.params) {
        properties[param.name] = {
          type: "string",
          ...(param.value ? { example: param.value } : {}),
        };
      }

      return {
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties,
              },
            },
          },
        },
        warnings,
      };
    }
  }

  // URL-encoded form
  if (mimeType.includes("application/x-www-form-urlencoded")) {
    const properties: Record<string, OpenAPIV3.SchemaObject> = {};

    if (postData.params) {
      for (const param of postData.params) {
        properties[param.name] = {
          type: "string",
          ...(param.value ? { example: param.value } : {}),
        };
      }
    }

    return {
      requestBody: {
        content: {
          "application/x-www-form-urlencoded": {
            schema: {
              type: "object",
              properties,
            },
          },
        },
      },
      warnings,
    };
  }

  // JSON body
  if (mimeType.includes("application/json") && postData.text) {
    if (inferSchemas) {
      try {
        const parsed = JSON.parse(postData.text);
        const schema = inferSchemaFromExample(parsed);
        return {
          requestBody: {
            content: {
              "application/json": {
                schema,
                example: parsed,
              },
            },
          },
          warnings,
        };
      } catch {
        // Fall through to text handling
      }
    }

    return {
      requestBody: {
        content: {
          "application/json": {
            schema: { type: "object" },
            example: postData.text,
          },
        },
      },
      warnings,
    };
  }

  // Text body
  if (postData.text) {
    return {
      requestBody: {
        content: {
          [mimeType]: {
            schema: { type: "string" },
            example: postData.text,
          },
        },
      },
      warnings,
    };
  }

  return { warnings };
}

/**
 * Convert HAR response to OpenAPI response.
 */
function convertResponse(
  response: Response,
  inferSchemas: boolean
): OpenAPIV3.ResponseObject {
  const contentType =
    response.content.mimeType?.split(";")[0] || "application/json";
  const body = response.content.text;

  if (inferSchemas) {
    return inferResponseSchema(response.status, contentType, body);
  }

  const result: OpenAPIV3.ResponseObject = {
    description: response.statusText || `Response ${response.status}`,
  };

  if (body) {
    result.content = {
      [contentType]: {
        schema: { type: "string" },
      },
    };
  }

  return result;
}

/**
 * Merge responses from multiple entries for the same endpoint.
 */
function mergeResponses(
  entries: Entry[],
  inferSchemas: boolean
): Record<string, OpenAPIV3.ResponseObject> {
  const responses: Record<string, OpenAPIV3.ResponseObject> = {};

  for (const entry of entries) {
    const status = entry.response.status.toString();

    // Skip if we already have this status code
    if (responses[status]) continue;

    responses[status] = convertResponse(entry.response, inferSchemas);
  }

  // Ensure at least one response
  if (Object.keys(responses).length === 0) {
    responses["200"] = { description: "Successful response" };
  }

  return responses;
}

/**
 * Check if HAR entry is a valid Har object.
 */
export function isHarFile(obj: unknown): obj is Har {
  if (typeof obj !== "object" || obj === null) return false;
  const har = obj as Har;
  return (
    typeof har.log === "object" &&
    har.log !== null &&
    typeof har.log.version === "string" &&
    Array.isArray(har.log.entries)
  );
}

/**
 * Convert HAR file to OpenAPI specification.
 */
export function convertHarToOpenAPI(
  har: Har,
  options: ImportOptions = {}
): ImportResult {
  const warnings: ImportWarning[] = [];
  const inferSchemas = options.inferSchemas !== false;
  const entries = har.log.entries;

  // Filter out non-HTTP entries and WebSocket
  const httpEntries = entries.filter((entry) => {
    const url = entry.request.url.toLowerCase();
    if (url.startsWith("ws://") || url.startsWith("wss://")) {
      warnings.push({
        type: "websocket_skipped",
        message: `WebSocket request skipped: ${entry.request.url}`,
      });
      return false;
    }
    return url.startsWith("http://") || url.startsWith("https://");
  });

  if (httpEntries.length === 0) {
    return {
      spec: {
        openapi: "3.0.3",
        info: {
          title: options.workspaceName || "Imported HAR",
          version: "1.0.0",
        },
        paths: {},
      },
      environments: [],
      detectedPaths: [],
      warnings,
      metadata: {
        sourceFormat: "har",
        sourceName: har.log.creator?.name || "HAR Export",
        requestCount: 0,
        endpointCount: 0,
        formatVersion: har.log.version,
      },
    };
  }

  // Collect all paths for parameter detection
  const allPaths: string[] = [];
  const baseUrls = new Set<string>();

  for (const entry of httpEntries) {
    const { path, baseUrl } = parseHarUrl(entry.request.url);
    allPaths.push(path);
    if (baseUrl) baseUrls.add(baseUrl);
  }

  // Detect path parameters
  const detectedPaths = detectPathParameters(allPaths);
  const pathPatterns = options.pathPatterns || detectedPaths;
  const pathMapping = applyPathPatterns(allPaths, pathPatterns);

  // Determine base URL (use most common)
  const baseUrlCounts = new Map<string, number>();
  for (const entry of httpEntries) {
    const { baseUrl } = parseHarUrl(entry.request.url);
    baseUrlCounts.set(baseUrl, (baseUrlCounts.get(baseUrl) || 0) + 1);
  }
  const sortedBaseUrls = [...baseUrlCounts.entries()].sort((a, b) => b[1] - a[1]);
  const baseUrl = options.baseUrl || sortedBaseUrls[0]?.[0] || "https://api.example.com";

  // Group entries by method + path
  const groups = groupEntries(httpEntries, pathMapping);

  // Build OpenAPI paths
  const paths: OpenAPIV3.PathsObject = {};
  const allAuthResults: ReturnType<typeof detectAuthFromHeaders>[] = [];

  for (const [, group] of groups) {
    const { method, path, entries: groupEntries } = group;

    // Skip unsupported methods
    if (!["get", "post", "put", "patch", "delete", "head", "options"].includes(method)) {
      continue;
    }

    // Initialize path if not exists
    if (!paths[path]) {
      paths[path] = {};
    }

    // Use first entry as representative
    const representative = groupEntries[0];
    const { queryParams } = parseHarUrl(representative.request.url);

    // Build operation
    const operation: OpenAPIV3.OperationObject = {
      summary: `${method.toUpperCase()} ${path}`,
      responses: mergeResponses(groupEntries, inferSchemas),
    };

    // Generate operation ID
    operation.operationId = generateOperationId(method, path);

    // Parameters
    const parameters: OpenAPIV3.ParameterObject[] = [];

    // Path parameters from detected patterns
    const pathParamMatch = pathPatterns.find((p) => p.parameterizedPath === path);
    if (pathParamMatch) {
      for (const param of pathParamMatch.parameters) {
        parameters.push({
          name: param.name,
          in: "path",
          required: true,
          schema: { type: "string" },
          example: param.exampleValue,
        });
      }
    }

    // Query parameters (merge from all entries)
    const seenQueryParams = new Set<string>();
    for (const entry of groupEntries) {
      const { queryParams: entryParams } = parseHarUrl(entry.request.url);
      for (const [name, value] of entryParams) {
        if (!seenQueryParams.has(name)) {
          seenQueryParams.add(name);
          parameters.push({
            name,
            in: "query",
            schema: { type: "string" },
            example: value,
          });
        }
      }
    }

    // Also add query params from representative
    for (const [name, value] of queryParams) {
      if (!seenQueryParams.has(name)) {
        parameters.push({
          name,
          in: "query",
          schema: { type: "string" },
          example: value,
        });
      }
    }

    // Header parameters (from representative request)
    const headers = extractHeaders(representative.request);
    const excludedHeaderNames = new Set([
      "content-type",
      "accept",
      "authorization",
    ]);

    for (const [name, value] of Object.entries(headers)) {
      if (!excludedHeaderNames.has(name.toLowerCase())) {
        parameters.push({
          name,
          in: "header",
          schema: { type: "string" },
          example: value,
        });
      }
    }

    if (parameters.length > 0) {
      operation.parameters = parameters;
    }

    // Request body
    const { requestBody, warnings: bodyWarnings } = convertRequestBody(
      representative.request,
      inferSchemas
    );
    warnings.push(...bodyWarnings);

    if (requestBody) {
      operation.requestBody = requestBody;
    }

    // Detect auth from headers
    const headersMap: Record<string, string> = {};
    for (const h of representative.request.headers) {
      headersMap[h.name] = h.value;
    }
    const authResult = detectAuthFromHeaders(headersMap);
    if (authResult.security.length > 0) {
      allAuthResults.push(authResult);
    }

    // Add to paths
    (paths[path] as OpenAPIV3.PathItemObject)[
      method as keyof OpenAPIV3.PathItemObject
    ] = operation as never;
  }

  // Merge all auth results
  const mergedAuth = mergeAuthResults(allAuthResults);

  // Build OpenAPI spec
  const spec: OpenAPIV3.Document = {
    openapi: "3.0.3",
    info: {
      title: options.workspaceName || "Imported HAR",
      version: "1.0.0",
    },
    servers: [{ url: baseUrl }],
    paths,
  };

  // Add security schemes if detected
  if (Object.keys(mergedAuth.securitySchemes).length > 0) {
    spec.components = {
      securitySchemes: mergedAuth.securitySchemes,
    };
    spec.security = mergedAuth.security;
  }

  return {
    spec,
    environments: [],
    detectedPaths,
    warnings,
    metadata: {
      sourceFormat: "har",
      sourceName: har.log.creator?.name || "HAR Export",
      requestCount: httpEntries.length,
      endpointCount: Object.keys(paths).length,
      formatVersion: har.log.version,
    },
  };
}

/**
 * Generate a unique operation ID.
 */
function generateOperationId(method: string, path: string): string {
  const pathPart = path
    .replace(/[{}]/g, "")
    .split("/")
    .filter(Boolean)
    .map((seg, i) =>
      i === 0 ? seg.toLowerCase() : seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase()
    )
    .join("");

  return `${method}${pathPart ? pathPart.charAt(0).toUpperCase() + pathPart.slice(1) : "Root"}`;
}
