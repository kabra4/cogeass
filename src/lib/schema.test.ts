import { describe, it, expect } from "vitest";
import { buildParamsSchema } from "./schema";
import type { OpenAPIV3 } from "openapi-types";

// Helper to create a minimal operation with parameters
function createOperation(
  parameters: OpenAPIV3.ParameterObject[]
): OpenAPIV3.OperationObject {
  return { responses: {}, parameters };
}

describe("buildParamsSchema", () => {
  describe("location filtering", () => {
    it("filters parameters by path location", () => {
      const op = createOperation([
        { name: "id", in: "path", schema: { type: "string" } },
        { name: "filter", in: "query", schema: { type: "string" } },
        { name: "auth", in: "header", schema: { type: "string" } },
      ]);

      const result = buildParamsSchema(op, "path");

      expect(result.properties).toHaveProperty("id");
      expect(result.properties).not.toHaveProperty("filter");
      expect(result.properties).not.toHaveProperty("auth");
    });

    it("filters parameters by query location", () => {
      const op = createOperation([
        { name: "id", in: "path", schema: { type: "string" } },
        { name: "filter", in: "query", schema: { type: "string" } },
        { name: "page", in: "query", schema: { type: "integer" } },
      ]);

      const result = buildParamsSchema(op, "query");

      expect(result.properties).not.toHaveProperty("id");
      expect(result.properties).toHaveProperty("filter");
      expect(result.properties).toHaveProperty("page");
    });

    it("filters parameters by header location", () => {
      const op = createOperation([
        { name: "X-Api-Key", in: "header", schema: { type: "string" } },
        { name: "filter", in: "query", schema: { type: "string" } },
      ]);

      const result = buildParamsSchema(op, "header");

      expect(result.properties).toHaveProperty("X-Api-Key");
      expect(result.properties).not.toHaveProperty("filter");
    });

    it("filters parameters by cookie location", () => {
      const op = createOperation([
        { name: "session", in: "cookie", schema: { type: "string" } },
        { name: "filter", in: "query", schema: { type: "string" } },
      ]);

      const result = buildParamsSchema(op, "cookie");

      expect(result.properties).toHaveProperty("session");
      expect(result.properties).not.toHaveProperty("filter");
    });

    it("returns empty properties when no parameters match location", () => {
      const op = createOperation([
        { name: "id", in: "path", schema: { type: "string" } },
      ]);

      const result = buildParamsSchema(op, "query");

      expect(result.properties).toEqual({});
      expect(result.required).toEqual([]);
    });
  });

  describe("required parameters", () => {
    it("includes required parameters in required array", () => {
      const op = createOperation([
        { name: "id", in: "path", required: true, schema: { type: "string" } },
        { name: "name", in: "path", required: true, schema: { type: "string" } },
      ]);

      const result = buildParamsSchema(op, "path");

      expect(result.required).toContain("id");
      expect(result.required).toContain("name");
      expect(result.required).toHaveLength(2);
    });

    it("excludes optional parameters from required array", () => {
      const op = createOperation([
        { name: "id", in: "query", required: true, schema: { type: "string" } },
        { name: "filter", in: "query", required: false, schema: { type: "string" } },
        { name: "page", in: "query", schema: { type: "integer" } },
      ]);

      const result = buildParamsSchema(op, "query");

      expect(result.required).toContain("id");
      expect(result.required).not.toContain("filter");
      expect(result.required).not.toContain("page");
      expect(result.required).toHaveLength(1);
    });

    it("returns empty required array when all parameters are optional", () => {
      const op = createOperation([
        { name: "filter", in: "query", schema: { type: "string" } },
        { name: "page", in: "query", schema: { type: "integer" } },
      ]);

      const result = buildParamsSchema(op, "query");

      expect(result.required).toEqual([]);
    });
  });

  describe("example as default", () => {
    it("maps parameter example to schema default", () => {
      const op = createOperation([
        {
          name: "status",
          in: "query",
          example: "active",
          schema: { type: "string" },
        },
      ]);

      const result = buildParamsSchema(op, "query");

      expect(result.properties?.status).toHaveProperty("default", "active");
    });

    it("maps numeric example to default", () => {
      const op = createOperation([
        {
          name: "limit",
          in: "query",
          example: 100,
          schema: { type: "integer" },
        },
      ]);

      const result = buildParamsSchema(op, "query");

      expect(result.properties?.limit).toHaveProperty("default", 100);
    });

    it("maps boolean example to default", () => {
      const op = createOperation([
        {
          name: "active",
          in: "query",
          example: true,
          schema: { type: "boolean" },
        },
      ]);

      const result = buildParamsSchema(op, "query");

      expect(result.properties?.active).toHaveProperty("default", true);
    });

    it("does not set default when example is undefined", () => {
      const op = createOperation([
        { name: "filter", in: "query", schema: { type: "string" } },
      ]);

      const result = buildParamsSchema(op, "query");

      expect(result.properties?.filter).not.toHaveProperty("default");
    });
  });

  describe("nullable anyOf simplification", () => {
    it("simplifies anyOf with null type to single type", () => {
      const op = createOperation([
        {
          name: "field",
          in: "query",
          schema: {
            anyOf: [{ type: "string" }, { type: "null" }],
          } as OpenAPIV3.SchemaObject,
        },
      ]);

      const result = buildParamsSchema(op, "query");
      const fieldSchema = result.properties?.field;

      expect(fieldSchema).toHaveProperty("type", "string");
      expect(fieldSchema).not.toHaveProperty("anyOf");
    });

    it("preserves parent metadata when simplifying anyOf", () => {
      const op = createOperation([
        {
          name: "field",
          in: "query",
          schema: {
            title: "My Field",
            description: "A description",
            anyOf: [{ type: "integer" }, { type: "null" }],
          } as OpenAPIV3.SchemaObject,
        },
      ]);

      const result = buildParamsSchema(op, "query");
      const fieldSchema = result.properties?.field;

      expect(fieldSchema).toHaveProperty("type", "integer");
      expect(fieldSchema).toHaveProperty("title", "My Field");
      expect(fieldSchema).toHaveProperty("description", "A description");
      expect(fieldSchema).not.toHaveProperty("anyOf");
    });

    it("does not simplify anyOf with multiple non-null types", () => {
      const op = createOperation([
        {
          name: "field",
          in: "query",
          schema: {
            anyOf: [{ type: "string" }, { type: "integer" }],
          },
        },
      ]);

      const result = buildParamsSchema(op, "query");
      const fieldSchema = result.properties?.field;

      expect(fieldSchema).toHaveProperty("anyOf");
    });

    it("simplifies nested anyOf in object properties", () => {
      const op = createOperation([
        {
          name: "data",
          in: "query",
          schema: {
            type: "object",
            properties: {
              nested: {
                anyOf: [{ type: "string" }, { type: "null" }],
              },
            },
          } as OpenAPIV3.SchemaObject,
        },
      ]);

      const result = buildParamsSchema(op, "query");
      const nestedSchema = (result.properties?.data as Record<string, unknown>)
        ?.properties as Record<string, Record<string, unknown>>;

      expect(nestedSchema?.nested).toHaveProperty("type", "string");
      expect(nestedSchema?.nested).not.toHaveProperty("anyOf");
    });

    it("simplifies anyOf in array items", () => {
      const op = createOperation([
        {
          name: "items",
          in: "query",
          schema: {
            type: "array",
            items: {
              anyOf: [{ type: "string" }, { type: "null" }],
            },
          } as OpenAPIV3.SchemaObject,
        },
      ]);

      const result = buildParamsSchema(op, "query");
      const itemsSchema = (result.properties?.items as Record<string, unknown>)
        ?.items as Record<string, unknown>;

      expect(itemsSchema).toHaveProperty("type", "string");
      expect(itemsSchema).not.toHaveProperty("anyOf");
    });
  });

  describe("schema defaults", () => {
    it("defaults to string type when schema is missing", () => {
      const op = createOperation([{ name: "param", in: "query" }]);

      const result = buildParamsSchema(op, "query");

      expect(result.properties?.param).toHaveProperty("type", "string");
    });
  });

  describe("exclusiveMinimum/Maximum handling", () => {
    it("converts boolean exclusiveMaximum to numeric", () => {
      const op = createOperation([
        {
          name: "value",
          in: "query",
          schema: {
            type: "number",
            maximum: 100,
            exclusiveMaximum: true,
          } as OpenAPIV3.SchemaObject,
        },
      ]);

      const result = buildParamsSchema(op, "query");
      const valueSchema = result.properties?.value;

      expect(valueSchema).toHaveProperty("exclusiveMaximum", 100);
      expect(valueSchema).not.toHaveProperty("maximum");
    });

    it("converts boolean exclusiveMinimum to numeric", () => {
      const op = createOperation([
        {
          name: "value",
          in: "query",
          schema: {
            type: "number",
            minimum: 0,
            exclusiveMinimum: true,
          } as OpenAPIV3.SchemaObject,
        },
      ]);

      const result = buildParamsSchema(op, "query");
      const valueSchema = result.properties?.value;

      expect(valueSchema).toHaveProperty("exclusiveMinimum", 0);
      expect(valueSchema).not.toHaveProperty("minimum");
    });

    it("does not convert when exclusiveMaximum is false", () => {
      const op = createOperation([
        {
          name: "value",
          in: "query",
          schema: {
            type: "number",
            maximum: 100,
            exclusiveMaximum: false,
          } as OpenAPIV3.SchemaObject,
        },
      ]);

      const result = buildParamsSchema(op, "query");
      const valueSchema = result.properties?.value;

      expect(valueSchema).toHaveProperty("maximum", 100);
      expect(valueSchema).toHaveProperty("exclusiveMaximum", false);
    });
  });

  describe("output schema structure", () => {
    it("returns a valid JSON Schema object structure", () => {
      const op = createOperation([
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ]);

      const result = buildParamsSchema(op, "path");

      expect(result).toHaveProperty("type", "object");
      expect(result).toHaveProperty("properties");
      expect(result).toHaveProperty("required");
      expect(result).toHaveProperty("additionalProperties", false);
    });

    it("handles operations with no parameters", () => {
      const op: OpenAPIV3.OperationObject = { responses: {} };

      const result = buildParamsSchema(op, "query");

      expect(result.type).toBe("object");
      expect(result.properties).toEqual({});
      expect(result.required).toEqual([]);
    });

    it("handles operations with empty parameters array", () => {
      const op = createOperation([]);

      const result = buildParamsSchema(op, "query");

      expect(result.type).toBe("object");
      expect(result.properties).toEqual({});
      expect(result.required).toEqual([]);
    });
  });

  describe("schema types preservation", () => {
    it("preserves string type with format", () => {
      const op = createOperation([
        {
          name: "date",
          in: "query",
          schema: { type: "string", format: "date-time" },
        },
      ]);

      const result = buildParamsSchema(op, "query");

      expect(result.properties?.date).toHaveProperty("type", "string");
      expect(result.properties?.date).toHaveProperty("format", "date-time");
    });

    it("preserves enum values", () => {
      const op = createOperation([
        {
          name: "status",
          in: "query",
          schema: { type: "string", enum: ["active", "inactive", "pending"] },
        },
      ]);

      const result = buildParamsSchema(op, "query");

      expect(result.properties?.status).toHaveProperty("type", "string");
      expect(result.properties?.status).toHaveProperty("enum", [
        "active",
        "inactive",
        "pending",
      ]);
    });

    it("preserves array type with items", () => {
      const op = createOperation([
        {
          name: "tags",
          in: "query",
          schema: { type: "array", items: { type: "string" } },
        },
      ]);

      const result = buildParamsSchema(op, "query");

      expect(result.properties?.tags).toHaveProperty("type", "array");
      expect(result.properties?.tags).toHaveProperty("items");
    });

    it("preserves integer type", () => {
      const op = createOperation([
        {
          name: "count",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 100 },
        },
      ]);

      const result = buildParamsSchema(op, "query");

      expect(result.properties?.count).toHaveProperty("type", "integer");
      expect(result.properties?.count).toHaveProperty("minimum", 1);
      expect(result.properties?.count).toHaveProperty("maximum", 100);
    });
  });
});
