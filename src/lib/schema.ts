// src/lib/schema.ts
import { openapiSchemaToJsonSchema } from "@openapi-contrib/openapi-schema-to-json-schema";
import type { JSONSchema7 } from "json-schema";
import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import { isOAS31 } from "./openapi";

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
  if (!raw) return { schema: null, mediaType: null };

  if (isOAS31(spec)) {
    return { schema: raw as JSONSchema7, mediaType: "application/json" };
  }

  // OAS 3.0 → JSON Schema (draft 2020-12 target)
  const converted = openapiSchemaToJsonSchema(
    raw as OpenAPIV3.SchemaObject
  ) as JSONSchema7;

  return { schema: converted, mediaType: "application/json" };
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
    // Treat enums as selects; map examples to default
    const s: JSONSchema7 = { ...schema } as any;
    // Convert OpenAPI exclusiveMaximum boolean to JSONSchema7 number format
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
