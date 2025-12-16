// src/lib/schema.ts
import { openapiSchemaToJsonSchema } from "@openapi-contrib/openapi-schema-to-json-schema";
import type { JSONSchema7 } from "json-schema";
import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import { isOAS31 } from "./openapi";

/**
 * Recursively simplifies the JSON Schema by flattening "anyOf" nullable types.
 *
 * Pattern: "anyOf": [{type: "string"}, {type: "null"}]
 * Action: Flattens to { type: "string" } and removes "anyOf" key completely.
 */
function simplifySchema(schema: any): JSONSchema7 {
  if (!schema || typeof schema !== "object") return schema;

  // Clone to avoid mutating original
  let s = { ...schema };

  // 1. Handle Flattening Logic
  if (Array.isArray(s.anyOf)) {
    // Filter out 'null' types from the anyOf array
    const nonNulls = s.anyOf.filter((sub: any) => sub.type !== "null");

    // If we have exactly one real type left, flatten it
    if (nonNulls.length === 1) {
      const main = nonNulls[0];

      // CRITICAL: Strictly remove 'anyOf' key so RJSF doesn't see it
      delete s.anyOf;

      // Merge the main type's properties into the parent
      s = { ...s, ...main };

      // Restore parent metadata if it exists (parent usually wins for params)
      if (schema.title) s.title = schema.title;
      if (schema.description) s.description = schema.description;
      if (schema.default !== undefined) s.default = schema.default;
    }
  }

  // 2. Recursion Logic (to handle nested objects/arrays)

  // Recurse into 'properties' (for objects)
  if (s.properties && typeof s.properties === "object") {
    const newProps: any = {};
    for (const key in s.properties) {
      newProps[key] = simplifySchema(s.properties[key]);
    }
    s.properties = newProps;
  }

  // Recurse into 'items' (for arrays)
  if (s.items) {
    if (Array.isArray(s.items)) {
      s.items = s.items.map((item: any) => simplifySchema(item));
    } else {
      s.items = simplifySchema(s.items);
    }
  }

  // Recurse into combinators if they still exist
  if (s.anyOf && Array.isArray(s.anyOf)) {
    s.anyOf = s.anyOf.map((item: any) => simplifySchema(item));
  }
  if (s.oneOf && Array.isArray(s.oneOf)) {
    s.oneOf = s.oneOf.map((item: any) => simplifySchema(item));
  }
  if (s.allOf && Array.isArray(s.allOf)) {
    s.allOf = s.allOf.map((item: any) => simplifySchema(item));
  }

  return s as JSONSchema7;
}

export function getJsonBodySchema(
  spec: OpenAPIV3.Document | OpenAPIV3_1.Document,
  op: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject
): { schema: JSONSchema7 | null; mediaType: string | null } {
  const requestBody = op.requestBody as
    | OpenAPIV3.RequestBodyObject
    | OpenAPIV3_1.RequestBodyObject
    | undefined;
  const content = requestBody?.content ?? {};
  const mt = (content["application/json"] ??
    content["application/*+json"] ??
    null) as OpenAPIV3.MediaTypeObject | OpenAPIV3_1.MediaTypeObject | null;
  if (!mt) return { schema: null, mediaType: null };
  const raw = mt.schema;
  if (!raw) {
    return {
      schema: { type: "object", additionalProperties: true } as JSONSchema7,
      mediaType: "application/json",
    };
  }

  if (isOAS31(spec)) {
    return { schema: simplifySchema(raw), mediaType: "application/json" };
  }

  const converted = openapiSchemaToJsonSchema(
    raw as OpenAPIV3.SchemaObject
  ) as JSONSchema7;

  return { schema: simplifySchema(converted), mediaType: "application/json" };
}

export function buildParamsSchema(
  op: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject,
  location: "path" | "query" | "header" | "cookie"
) {
  const params = (op.parameters ?? []) as Array<
    OpenAPIV3.ParameterObject | OpenAPIV3_1.ParameterObject
  >;
  const props: Record<string, JSONSchema7> = {};
  const required: string[] = [];

  for (const p of params) {
    if (p.in !== location) continue;
    const name = p.name;
    const schema = p.schema ?? { type: "string" as const };

    // Apply simplification to parameters
    const s: JSONSchema7 = simplifySchema(schema);

    // Treat enums as selects; map examples to default
    if (
      typeof s.exclusiveMaximum === "boolean" &&
      s.exclusiveMaximum &&
      typeof s.maximum === "number"
    ) {
      s.exclusiveMaximum = s.maximum;
      delete s.maximum;
    }
    if (
      typeof s.exclusiveMinimum === "boolean" &&
      s.exclusiveMinimum &&
      typeof s.minimum === "number"
    ) {
      s.exclusiveMinimum = s.minimum;
      delete s.minimum;
    }
    if (p.example !== undefined) s.default = p.example;
    props[name] = s;
    if (p.required) required.push(name);
  }

  return {
    type: "object",
    properties: props,
    required,
    additionalProperties: false,
  } as JSONSchema7;
}
