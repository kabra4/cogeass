import type { OpenAPIV3 } from "openapi-types";

type SchemaObject = OpenAPIV3.SchemaObject;

/**
 * Infer a JSON Schema from an example value.
 * Recursively handles objects, arrays, and primitives.
 */
export function inferSchemaFromExample(example: unknown): SchemaObject {
  if (example === null) {
    return { type: "string", nullable: true };
  }

  if (example === undefined) {
    return { type: "string" };
  }

  if (Array.isArray(example)) {
    return inferArraySchema(example);
  }

  if (typeof example === "object") {
    return inferObjectSchema(example as Record<string, unknown>);
  }

  if (typeof example === "string") {
    return inferStringSchema(example);
  }

  if (typeof example === "number") {
    return inferNumberSchema(example);
  }

  if (typeof example === "boolean") {
    return { type: "boolean", example };
  }

  // Fallback
  return { type: "string" };
}

/**
 * Infer schema for an array.
 */
function inferArraySchema(arr: unknown[]): SchemaObject {
  if (arr.length === 0) {
    return { type: "array", items: { type: "string" } };
  }

  // If all items are the same type, infer from first item
  const firstItem = arr[0];
  const itemSchema = inferSchemaFromExample(firstItem);

  // Try to merge schemas from multiple items for better inference
  if (arr.length > 1 && typeof firstItem === "object" && firstItem !== null) {
    const mergedSchema = mergeObjectSchemas(
      arr.filter((item) => typeof item === "object" && item !== null) as Record<
        string,
        unknown
      >[]
    );
    return { type: "array", items: mergedSchema };
  }

  return { type: "array", items: itemSchema };
}

/**
 * Infer schema for an object.
 */
function inferObjectSchema(obj: Record<string, unknown>): SchemaObject {
  const properties: Record<string, SchemaObject> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    properties[key] = inferSchemaFromExample(value);
    // Assume all properties with non-null values are required
    if (value !== null && value !== undefined) {
      required.push(key);
    }
  }

  const schema: SchemaObject = {
    type: "object",
    properties,
  };

  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}

/**
 * Infer schema for a string, detecting common formats.
 */
function inferStringSchema(str: string): SchemaObject {
  const schema: SchemaObject = { type: "string" };

  // Detect date-time format (ISO 8601)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) {
    schema.format = "date-time";
    return schema;
  }

  // Detect date format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    schema.format = "date";
    return schema;
  }

  // Detect time format
  if (/^\d{2}:\d{2}:\d{2}$/.test(str)) {
    schema.format = "time";
    return schema;
  }

  // Detect email format
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
    schema.format = "email";
    return schema;
  }

  // Detect URI format
  if (/^https?:\/\//.test(str)) {
    schema.format = "uri";
    return schema;
  }

  // Detect UUID format
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  ) {
    schema.format = "uuid";
    return schema;
  }

  // Add example for short strings
  if (str.length <= 100) {
    schema.example = str;
  }

  return schema;
}

/**
 * Infer schema for a number, detecting integer vs float.
 */
function inferNumberSchema(num: number): SchemaObject {
  if (Number.isInteger(num)) {
    return { type: "integer", example: num };
  }
  return { type: "number", example: num };
}

/**
 * Merge multiple object schemas into one, combining all properties.
 * Useful when inferring from multiple array items.
 */
function mergeObjectSchemas(objects: Record<string, unknown>[]): SchemaObject {
  const allProperties: Record<string, SchemaObject> = {};
  const propertyOccurrences: Record<string, number> = {};

  for (const obj of objects) {
    for (const [key, value] of Object.entries(obj)) {
      const schema = inferSchemaFromExample(value);

      if (allProperties[key]) {
        // Merge with existing schema
        allProperties[key] = mergeSchemas(allProperties[key], schema);
      } else {
        allProperties[key] = schema;
      }

      propertyOccurrences[key] = (propertyOccurrences[key] || 0) + 1;
    }
  }

  // Properties that appear in all objects are required
  const required = Object.entries(propertyOccurrences)
    .filter(([, count]) => count === objects.length)
    .map(([key]) => key);

  const schema: SchemaObject = {
    type: "object",
    properties: allProperties,
  };

  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}

/**
 * Merge two schemas into one, handling type conflicts.
 */
function mergeSchemas(a: SchemaObject, b: SchemaObject): SchemaObject {
  // If same type, merge properties for objects
  if (a.type === b.type) {
    if (a.type === "object" && a.properties && b.properties) {
      const mergedProperties: Record<string, SchemaObject> = {};
      for (const [key, schema] of Object.entries(a.properties)) {
        mergedProperties[key] = schema as SchemaObject;
      }
      for (const [key, schema] of Object.entries(b.properties)) {
        if (mergedProperties[key]) {
          mergedProperties[key] = mergeSchemas(
            mergedProperties[key],
            schema as SchemaObject
          );
        } else {
          mergedProperties[key] = schema as SchemaObject;
        }
      }
      // For merged objects, only properties in both are required
      const aRequired = new Set(a.required || []);
      const bRequired = new Set(b.required || []);
      const mergedRequired = [...aRequired].filter((r) => bRequired.has(r));

      return {
        type: "object",
        properties: mergedProperties,
        ...(mergedRequired.length > 0 ? { required: mergedRequired } : {}),
      };
    }
    return a;
  }

  // Different types - use oneOf
  return {
    oneOf: [a, b],
  };
}

/**
 * Parse a JSON string and infer its schema.
 */
export function inferSchemaFromJson(json: string): SchemaObject | null {
  try {
    const parsed = JSON.parse(json);
    return inferSchemaFromExample(parsed);
  } catch {
    return null;
  }
}

/**
 * Infer request body schema from content type and body.
 */
export function inferRequestBodySchema(
  contentType: string | undefined,
  body: string | undefined
): OpenAPIV3.RequestBodyObject | undefined {
  if (!body) return undefined;

  // JSON content
  if (!contentType || contentType.includes("application/json")) {
    const schema = inferSchemaFromJson(body);
    if (schema) {
      return {
        content: {
          "application/json": {
            schema,
            example: safeJsonParse(body),
          },
        },
      };
    }
  }

  // URL-encoded form
  if (contentType?.includes("application/x-www-form-urlencoded")) {
    const schema = inferFormSchema(body);
    return {
      content: {
        "application/x-www-form-urlencoded": {
          schema,
        },
      },
    };
  }

  // Plain text
  if (contentType?.includes("text/plain")) {
    return {
      content: {
        "text/plain": {
          schema: { type: "string" },
        },
      },
    };
  }

  // XML (basic support)
  if (contentType?.includes("application/xml") || contentType?.includes("text/xml")) {
    return {
      content: {
        "application/xml": {
          schema: { type: "string" },
        },
      },
    };
  }

  return undefined;
}

/**
 * Infer schema from URL-encoded form data.
 */
function inferFormSchema(body: string): SchemaObject {
  const properties: Record<string, SchemaObject> = {};

  try {
    const params = new URLSearchParams(body);
    for (const [key, value] of params.entries()) {
      properties[key] = inferStringSchema(value);
    }
  } catch {
    return { type: "object" };
  }

  return {
    type: "object",
    properties,
  };
}

/**
 * Safely parse JSON, returning undefined on error.
 */
function safeJsonParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

/**
 * Infer response schema from status code, content type, and body.
 */
export function inferResponseSchema(
  statusCode: number,
  contentType: string | undefined,
  body: string | undefined
): OpenAPIV3.ResponseObject {
  const response: OpenAPIV3.ResponseObject = {
    description: getStatusDescription(statusCode),
  };

  if (!body) return response;

  // JSON content
  if (!contentType || contentType.includes("application/json")) {
    const schema = inferSchemaFromJson(body);
    if (schema) {
      response.content = {
        "application/json": {
          schema,
          example: safeJsonParse(body),
        },
      };
    }
  } else if (contentType.includes("text/html")) {
    response.content = {
      "text/html": {
        schema: { type: "string" },
      },
    };
  } else if (contentType.includes("text/plain")) {
    response.content = {
      "text/plain": {
        schema: { type: "string" },
      },
    };
  }

  return response;
}

/**
 * Get a description for an HTTP status code.
 */
function getStatusDescription(statusCode: number): string {
  const descriptions: Record<number, string> = {
    200: "Successful response",
    201: "Created",
    204: "No content",
    400: "Bad request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not found",
    500: "Internal server error",
  };

  return descriptions[statusCode] || `Response with status ${statusCode}`;
}
