import type { OpenAPIV3 } from "openapi-types";
import type { Environment } from "@/store/types";
import type { ImportResult, ImportWarning, ImportOptions } from "../types";
import type {
  InsomniaExport,
  InsomniaRequest,
  InsomniaRequestGroup,
  InsomniaWorkspace,
  InsomniaEnvironment,
} from "./types";
import {
  isInsomniaRequest,
  isInsomniaRequestGroup,
  isInsomniaWorkspace,
  isInsomniaEnvironment,
} from "./types";
import { detectPathParameters, applyPathPatterns } from "../path-detection";
import { inferRequestBodySchema } from "../schema-inference";
import { mapInsomniaAuth } from "../auth-mapping";

/**
 * Build a parent lookup map for resources.
 */
function buildParentMap(
  resources: InsomniaExport["resources"]
): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const resource of resources) {
    map.set(resource._id, resource.parentId);
  }
  return map;
}

/**
 * Build a name lookup map for resources.
 */
function buildNameMap(
  resources: InsomniaExport["resources"]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const resource of resources) {
    map.set(resource._id, resource.name);
  }
  return map;
}

/**
 * Get the folder path for a resource by traversing up the parent chain.
 */
function getFolderPath(
  resourceId: string,
  parentMap: Map<string, string | null>,
  nameMap: Map<string, string>,
  workspaceId: string | undefined
): string[] {
  const path: string[] = [];
  let currentId = parentMap.get(resourceId);

  while (currentId && currentId !== workspaceId) {
    const name = nameMap.get(currentId);
    if (name) {
      path.unshift(name);
    }
    currentId = parentMap.get(currentId);
  }

  return path;
}

/**
 * Parse URL and extract path and query parameters.
 */
function parseInsomniaUrl(
  url: string,
  params?: InsomniaRequest["parameters"]
): {
  path: string;
  queryParams: Array<{ name: string; value?: string; description?: string }>;
  baseUrl: string;
} {
  let path = "/";
  let baseUrl = "";
  const queryParams: Array<{ name: string; value?: string; description?: string }> = [];

  try {
    // Handle template variables like {{ base_url }}
    const cleanUrl = url.replace(/\{\{\s*[\w.]+\s*\}\}/g, "placeholder");
    const parsed = new URL(cleanUrl);
    path = parsed.pathname || "/";
    baseUrl = `${parsed.protocol}//${parsed.host}`;

    // Extract query params from URL
    parsed.searchParams.forEach((value, key) => {
      queryParams.push({ name: key, value });
    });
  } catch {
    // If URL parsing fails, try to extract path
    const pathMatch = url.match(/^(?:https?:\/\/[^/]+)?(\/[^?]*)/);
    if (pathMatch) {
      path = pathMatch[1];
    }
  }

  // Add explicit parameters
  if (params) {
    for (const param of params) {
      if (!param.disabled) {
        queryParams.push({
          name: param.name,
          value: param.value,
          description: param.description,
        });
      }
    }
  }

  return { path, queryParams, baseUrl };
}

/**
 * Convert Insomnia body to OpenAPI request body.
 */
function convertBody(
  body: InsomniaRequest["body"],
  inferSchemas: boolean
): { requestBody?: OpenAPIV3.RequestBodyObject; warnings: ImportWarning[] } {
  const warnings: ImportWarning[] = [];

  if (!body) {
    return { warnings };
  }

  const mimeType = body.mimeType || "application/json";

  // Raw text body
  if (body.text) {
    if (inferSchemas && mimeType.includes("application/json")) {
      const result = inferRequestBodySchema(mimeType, body.text);
      if (result) return { requestBody: result, warnings };
    }

    return {
      requestBody: {
        content: {
          [mimeType]: {
            schema: { type: "string" },
            example: body.text,
          },
        },
      },
      warnings,
    };
  }

  // Form data
  if (body.params && body.params.length > 0) {
    const properties: Record<string, OpenAPIV3.SchemaObject> = {};

    for (const param of body.params) {
      if (!param.disabled) {
        if (param.type === "file") {
          properties[param.name] = {
            type: "string",
            format: "binary",
          };
        } else {
          properties[param.name] = {
            type: "string",
            ...(param.description ? { description: param.description } : {}),
            ...(param.value ? { example: param.value } : {}),
          };
        }
      }
    }

    const contentType =
      mimeType === "multipart/form-data"
        ? "multipart/form-data"
        : "application/x-www-form-urlencoded";

    return {
      requestBody: {
        content: {
          [contentType]: {
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

  // File upload
  if (body.fileName) {
    warnings.push({
      type: "binary_body",
      message: "Binary file body converted to basic schema.",
    });

    return {
      requestBody: {
        content: {
          "application/octet-stream": {
            schema: {
              type: "string",
              format: "binary",
            },
          },
        },
      },
      warnings,
    };
  }

  return { warnings };
}

/**
 * Convert Insomnia export to OpenAPI specification.
 */
export function convertInsomniaToOpenAPI(
  exportData: InsomniaExport,
  options: ImportOptions = {}
): ImportResult {
  const warnings: ImportWarning[] = [];
  const inferSchemas = options.inferSchemas !== false;

  // Separate resources by type
  const requests: InsomniaRequest[] = [];
  const groups: InsomniaRequestGroup[] = [];
  const workspaces: InsomniaWorkspace[] = [];
  const envResources: InsomniaEnvironment[] = [];

  for (const resource of exportData.resources) {
    if (isInsomniaRequest(resource)) {
      requests.push(resource);
    } else if (isInsomniaRequestGroup(resource)) {
      groups.push(resource);
    } else if (isInsomniaWorkspace(resource)) {
      workspaces.push(resource);
    } else if (isInsomniaEnvironment(resource)) {
      envResources.push(resource);
    }
  }

  const workspace = workspaces[0];
  const parentMap = buildParentMap(exportData.resources);
  const nameMap = buildNameMap(exportData.resources);

  // Collect all paths for parameter detection
  const allPaths: string[] = [];
  const baseUrls = new Set<string>();

  for (const request of requests) {
    const { path, baseUrl } = parseInsomniaUrl(request.url, request.parameters);
    allPaths.push(path);
    if (baseUrl) baseUrls.add(baseUrl);
  }

  // Detect path parameters
  const detectedPaths = detectPathParameters(allPaths);
  const pathPatterns = options.pathPatterns || detectedPaths;
  const pathMapping = applyPathPatterns(allPaths, pathPatterns);

  // Determine base URL
  const baseUrl = options.baseUrl || [...baseUrls][0] || "https://api.example.com";

  // Collect unique tags
  const tags = new Set<string>();

  // Build OpenAPI paths
  const paths: OpenAPIV3.PathsObject = {};

  for (const request of requests) {
    const method = request.method.toLowerCase();

    // Skip unsupported methods
    if (!["get", "post", "put", "patch", "delete", "head", "options"].includes(method)) {
      warnings.push({
        type: "unknown_format",
        message: `Unsupported HTTP method "${request.method}" skipped.`,
        context: request.name,
      });
      continue;
    }

    const { path: originalPath, queryParams } = parseInsomniaUrl(
      request.url,
      request.parameters
    );
    const path = pathMapping.get(originalPath) || originalPath;

    // Get folder path for tag
    const folderPath = getFolderPath(
      request._id,
      parentMap,
      nameMap,
      workspace?._id
    );
    const tag = folderPath.length > 0 ? folderPath[0] : "default";
    tags.add(tag);

    // Initialize path if not exists
    if (!paths[path]) {
      paths[path] = {};
    }

    // Build operation
    const operation: OpenAPIV3.OperationObject = {
      summary: request.name,
      tags: [tag],
      responses: {
        "200": { description: "Successful response" },
      },
    };

    if (request.description) {
      operation.description = request.description;
    }

    // Add operation ID
    operation.operationId = generateOperationId(method, path, request.name);

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

    // Query parameters
    for (const qp of queryParams) {
      parameters.push({
        name: qp.name,
        in: "query",
        schema: { type: "string" },
        ...(qp.value ? { example: qp.value } : {}),
        ...(qp.description ? { description: qp.description } : {}),
      });
    }

    // Header parameters (excluding common headers)
    const excludedHeaders = new Set([
      "content-type",
      "accept",
      "authorization",
      "user-agent",
      "host",
      "connection",
      "cache-control",
    ]);

    for (const header of request.headers || []) {
      if (!header.disabled && !excludedHeaders.has(header.name.toLowerCase())) {
        parameters.push({
          name: header.name,
          in: "header",
          schema: { type: "string" },
          ...(header.value ? { example: header.value } : {}),
          ...(header.description ? { description: header.description } : {}),
        });
      }
    }

    if (parameters.length > 0) {
      operation.parameters = parameters;
    }

    // Request body
    const { requestBody, warnings: bodyWarnings } = convertBody(
      request.body,
      inferSchemas
    );
    warnings.push(...bodyWarnings);

    if (requestBody) {
      operation.requestBody = requestBody;
    }

    // Per-request auth
    if (request.authentication && !request.authentication.disabled) {
      const authResult = mapInsomniaAuth(request.authentication);
      if (authResult.security.length > 0) {
        operation.security = authResult.security;
      }
      warnings.push(...authResult.warnings);
    }

    // Add to paths
    (paths[path] as OpenAPIV3.PathItemObject)[
      method as keyof OpenAPIV3.PathItemObject
    ] = operation as never;
  }

  // Build environments from Insomnia environment resources
  const environments: Environment[] = [];

  if (options.importEnvironments !== false) {
    for (const envResource of envResources) {
      // Skip base environments (they're usually private)
      if (envResource.isPrivate) continue;

      const variables: Record<string, string> = {};
      for (const [key, value] of Object.entries(envResource.data)) {
        if (typeof value === "string" || typeof value === "number") {
          variables[key] = String(value);
        }
      }

      if (Object.keys(variables).length > 0) {
        environments.push({
          id: crypto.randomUUID(),
          name: envResource.name,
          variables,
        });
      }
    }
  }

  // Build OpenAPI spec
  const spec: OpenAPIV3.Document = {
    openapi: "3.0.3",
    info: {
      title: options.workspaceName || workspace?.name || "Imported API",
      version: "1.0.0",
      ...(workspace?.description ? { description: workspace.description } : {}),
    },
    servers: [{ url: baseUrl }],
    paths,
    tags: [...tags].map((name) => ({ name })),
  };

  return {
    spec,
    environments,
    detectedPaths,
    warnings,
    metadata: {
      sourceFormat: "insomnia",
      sourceName: workspace?.name || "Insomnia Export",
      requestCount: requests.length,
      endpointCount: Object.keys(paths).length,
      formatVersion: `${exportData.__export_format}`,
    },
  };
}

/**
 * Generate a unique operation ID.
 */
function generateOperationId(method: string, path: string, name: string): string {
  // Clean the name to create a valid ID
  const cleanName = name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .map((word, i) =>
      i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join("");

  if (cleanName) {
    return cleanName;
  }

  // Fallback to method + path
  const pathPart = path
    .replace(/[{}]/g, "")
    .split("/")
    .filter(Boolean)
    .map((seg, i) =>
      i === 0 ? seg.toLowerCase() : seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase()
    )
    .join("");

  return `${method}${pathPart.charAt(0).toUpperCase()}${pathPart.slice(1)}`;
}
