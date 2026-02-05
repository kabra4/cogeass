import type { OpenAPIV3 } from "openapi-types";
import type { Environment } from "@/store/types";
import type { ImportResult, ImportWarning, ImportOptions } from "../types";
import type {
  PostmanCollection,
  PostmanItem,
  PostmanRequest,
  PostmanUrl,
  PostmanResponse,
} from "./types";
import { detectPathParameters, applyPathPatterns } from "../path-detection";
import { inferSchemaFromExample, inferRequestBodySchema } from "../schema-inference";
import { mapPostmanAuth } from "../auth-mapping";

/**
 * Flatten nested Postman items (folders) into a flat list of requests.
 * Returns requests with their folder path for tag assignment.
 */
function flattenItems(
  items: PostmanItem[],
  parentPath: string[] = []
): Array<{ item: PostmanItem; folderPath: string[] }> {
  const result: Array<{ item: PostmanItem; folderPath: string[] }> = [];

  for (const item of items) {
    if (item.item && item.item.length > 0) {
      // This is a folder, recurse
      const newPath = [...parentPath, item.name];
      result.push(...flattenItems(item.item, newPath));
    } else if (item.request) {
      // This is a request
      result.push({ item, folderPath: parentPath });
    }
  }

  return result;
}

/**
 * Parse Postman URL to extract path, query params, and base URL.
 */
function parsePostmanUrl(url: PostmanUrl | string | undefined): {
  path: string;
  queryParams: Array<{ name: string; value?: string; description?: string }>;
  baseUrl: string;
} {
  if (!url) {
    return { path: "/", queryParams: [], baseUrl: "" };
  }

  if (typeof url === "string") {
    try {
      const parsed = new URL(url);
      const queryParams: Array<{ name: string; value?: string }> = [];
      parsed.searchParams.forEach((value, key) => {
        queryParams.push({ name: key, value });
      });
      return {
        path: parsed.pathname || "/",
        queryParams,
        baseUrl: `${parsed.protocol}//${parsed.host}`,
      };
    } catch {
      return { path: url, queryParams: [], baseUrl: "" };
    }
  }

  // Structured URL object
  const path = url.path ? "/" + url.path.join("/") : "/";
  const queryParams = (url.query || [])
    .filter((q) => !q.disabled)
    .map((q) => ({
      name: q.key,
      value: q.value,
      description: q.description,
    }));

  let baseUrl = "";
  if (url.protocol && url.host) {
    const host = Array.isArray(url.host) ? url.host.join(".") : url.host;
    const port = url.port ? `:${url.port}` : "";
    baseUrl = `${url.protocol}://${host}${port}`;
  } else if (url.raw) {
    try {
      const parsed = new URL(url.raw);
      baseUrl = `${parsed.protocol}//${parsed.host}`;
    } catch {
      // Ignore parse errors
    }
  }

  return { path, queryParams, baseUrl };
}

/**
 * Convert Postman request body to OpenAPI request body.
 */
function convertBody(
  body: PostmanRequest["body"] | undefined,
  inferSchemas: boolean
): { requestBody?: OpenAPIV3.RequestBodyObject; warnings: ImportWarning[] } {
  const warnings: ImportWarning[] = [];

  if (!body || !body.mode) {
    return { warnings };
  }

  switch (body.mode) {
    case "raw": {
      if (!body.raw) return { warnings };

      const language = body.options?.raw?.language || "json";
      let contentType = "application/json";

      if (language === "xml") {
        contentType = "application/xml";
      } else if (language === "text") {
        contentType = "text/plain";
      } else if (language === "html") {
        contentType = "text/html";
      }

      if (inferSchemas && contentType === "application/json") {
        const result = inferRequestBodySchema(contentType, body.raw);
        if (result) return { requestBody: result, warnings };
      }

      return {
        requestBody: {
          content: {
            [contentType]: {
              schema: { type: "string" },
              example: body.raw,
            },
          },
        },
        warnings,
      };
    }

    case "urlencoded": {
      const properties: Record<string, OpenAPIV3.SchemaObject> = {};
      for (const param of body.urlencoded || []) {
        if (!param.disabled) {
          properties[param.key] = {
            type: "string",
            ...(param.description ? { description: param.description } : {}),
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

    case "formdata": {
      warnings.push({
        type: "formdata_body",
        message:
          "Form-data body converted to basic schema. File uploads not preserved.",
      });

      const properties: Record<string, OpenAPIV3.SchemaObject> = {};
      for (const param of body.formdata || []) {
        if (!param.disabled) {
          if (param.type === "file") {
            properties[param.key] = {
              type: "string",
              format: "binary",
            };
          } else {
            properties[param.key] = {
              type: "string",
              ...(param.description ? { description: param.description } : {}),
              ...(param.value ? { example: param.value } : {}),
            };
          }
        }
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

    case "file": {
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

    case "graphql": {
      warnings.push({
        type: "graphql_skipped",
        message: "GraphQL requests are not supported. Request skipped.",
      });
      return { warnings };
    }

    default:
      return { warnings };
  }
}

/**
 * Convert Postman responses to OpenAPI responses.
 */
function convertResponses(
  responses: PostmanResponse[] | undefined,
  inferSchemas: boolean
): Record<string, OpenAPIV3.ResponseObject> {
  const result: Record<string, OpenAPIV3.ResponseObject> = {};

  if (!responses || responses.length === 0) {
    // Default response
    result["200"] = { description: "Successful response" };
    return result;
  }

  for (const response of responses) {
    const code = response.code?.toString() || "200";

    const responseObj: OpenAPIV3.ResponseObject = {
      description: response.name || response.status || `Response ${code}`,
    };

    if (response.body) {
      const contentType =
        response.header?.find(
          (h) => h.key.toLowerCase() === "content-type"
        )?.value || "application/json";

      if (inferSchemas && contentType.includes("application/json")) {
        try {
          const parsed = JSON.parse(response.body);
          const schema = inferSchemaFromExample(parsed);
          responseObj.content = {
            "application/json": {
              schema,
              example: parsed,
            },
          };
        } catch {
          responseObj.content = {
            [contentType]: {
              schema: { type: "string" },
            },
          };
        }
      } else {
        responseObj.content = {
          [contentType]: {
            schema: { type: "string" },
          },
        };
      }
    }

    result[code] = responseObj;
  }

  return result;
}

/**
 * Convert Postman collection to OpenAPI specification.
 */
export function convertPostmanToOpenAPI(
  collection: PostmanCollection,
  options: ImportOptions = {}
): ImportResult {
  const warnings: ImportWarning[] = [];
  const inferSchemas = options.inferSchemas !== false;

  // Flatten nested items
  const flatItems = flattenItems(collection.item);

  // Check for scripts
  for (const { item } of flatItems) {
    if (item.event?.some((e) => e.script?.exec?.length)) {
      warnings.push({
        type: "script_ignored",
        message: `Pre-request/test scripts in "${item.name}" are ignored.`,
        context: item.name,
      });
    }
  }

  // Collect all paths for parameter detection
  const allPaths: string[] = [];
  const baseUrls = new Set<string>();

  for (const { item } of flatItems) {
    if (item.request) {
      const { path, baseUrl } = parsePostmanUrl(item.request.url);
      allPaths.push(path);
      if (baseUrl) baseUrls.add(baseUrl);
    }
  }

  // Detect path parameters
  const detectedPaths = detectPathParameters(allPaths);
  const pathPatterns = options.pathPatterns || detectedPaths;
  const pathMapping = applyPathPatterns(allPaths, pathPatterns);

  // Determine base URL
  const baseUrl = options.baseUrl || [...baseUrls][0] || "https://api.example.com";

  // Collect unique tags from folder structure
  const tags = new Set<string>();

  // Build OpenAPI paths
  const paths: OpenAPIV3.PathsObject = {};

  for (const { item, folderPath } of flatItems) {
    if (!item.request) continue;

    const request = item.request;
    const method = request.method.toLowerCase();

    // Skip GraphQL
    if (request.body?.mode === "graphql") {
      warnings.push({
        type: "graphql_skipped",
        message: `GraphQL request "${item.name}" is not supported. Skipped.`,
        context: item.name,
      });
      continue;
    }

    const { path: originalPath, queryParams } = parsePostmanUrl(request.url);
    const path = pathMapping.get(originalPath) || originalPath;

    // Use folder path as tag, or "default"
    const tag = folderPath.length > 0 ? folderPath[0] : "default";
    tags.add(tag);

    // Initialize path if not exists
    if (!paths[path]) {
      paths[path] = {};
    }

    // Build operation
    const operation: OpenAPIV3.OperationObject = {
      summary: item.name,
      tags: [tag],
      responses: convertResponses(item.response, inferSchemas),
    };

    if (item.description || request.description) {
      operation.description = item.description || request.description;
    }

    // Add operation ID
    operation.operationId = generateOperationId(method, path, item.name);

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

    for (const header of request.header || []) {
      if (!header.disabled && !excludedHeaders.has(header.key.toLowerCase())) {
        parameters.push({
          name: header.key,
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
    if (request.auth || item.auth) {
      const authResult = mapPostmanAuth(request.auth || item.auth);
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

  // Build environments from collection variables
  const environments: Environment[] = [];

  if (options.importEnvironments !== false && collection.variable?.length) {
    const variables: Record<string, string> = {};
    for (const v of collection.variable) {
      if (!v.disabled && v.key && v.value !== undefined) {
        variables[v.key] = v.value;
      }
    }

    if (Object.keys(variables).length > 0) {
      environments.push({
        id: crypto.randomUUID(),
        name: `${collection.info.name} Variables`,
        variables,
      });
    }
  }

  // Build OpenAPI spec
  const spec: OpenAPIV3.Document = {
    openapi: "3.0.3",
    info: {
      title: options.workspaceName || collection.info.name,
      version: collection.info.version || "1.0.0",
      ...(collection.info.description
        ? { description: collection.info.description }
        : {}),
    },
    servers: [{ url: baseUrl }],
    paths,
    tags: [...tags].map((name) => ({ name })),
  };

  // Collection-level auth
  if (collection.auth) {
    const authResult = mapPostmanAuth(collection.auth);
    if (Object.keys(authResult.securitySchemes).length > 0) {
      spec.components = {
        securitySchemes: authResult.securitySchemes,
      };
      spec.security = authResult.security;
    }
    warnings.push(...authResult.warnings);
  }

  return {
    spec,
    environments,
    detectedPaths,
    warnings,
    metadata: {
      sourceFormat: "postman",
      sourceName: collection.info.name,
      requestCount: flatItems.length,
      endpointCount: Object.keys(paths).length,
      formatVersion: collection.info.schema.match(/v(\d+\.\d+\.\d+)/)?.[1],
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
