import { describe, it, expect } from "vitest";
import type { OpenAPIV3 } from "openapi-types";
import {
  inferSchemaFromExample,
  inferSchemaFromJson,
  inferRequestBodySchema,
  inferResponseSchema,
} from "./schema-inference";

type SchemaObject = OpenAPIV3.SchemaObject;
type ArraySchemaObject = OpenAPIV3.ArraySchemaObject;

describe("inferSchemaFromExample", () => {
  describe("primitives", () => {
    it("infers string type", () => {
      const result = inferSchemaFromExample("hello");
      expect(result.type).toBe("string");
      expect(result.example).toBe("hello");
    });

    it("infers integer type", () => {
      const result = inferSchemaFromExample(42);
      expect(result.type).toBe("integer");
      expect(result.example).toBe(42);
    });

    it("infers number type for floats", () => {
      const result = inferSchemaFromExample(3.14);
      expect(result.type).toBe("number");
      expect(result.example).toBe(3.14);
    });

    it("infers boolean type", () => {
      const result = inferSchemaFromExample(true);
      expect(result.type).toBe("boolean");
      expect(result.example).toBe(true);
    });

    it("handles null", () => {
      const result = inferSchemaFromExample(null);
      expect(result.type).toBe("string");
      expect(result.nullable).toBe(true);
    });

    it("handles undefined", () => {
      const result = inferSchemaFromExample(undefined);
      expect(result.type).toBe("string");
    });
  });

  describe("string formats", () => {
    it("detects date-time format", () => {
      const result = inferSchemaFromExample("2024-01-15T10:30:00Z");
      expect(result.type).toBe("string");
      expect(result.format).toBe("date-time");
    });

    it("detects date format", () => {
      const result = inferSchemaFromExample("2024-01-15");
      expect(result.type).toBe("string");
      expect(result.format).toBe("date");
    });

    it("detects time format", () => {
      const result = inferSchemaFromExample("10:30:00");
      expect(result.type).toBe("string");
      expect(result.format).toBe("time");
    });

    it("detects email format", () => {
      const result = inferSchemaFromExample("user@example.com");
      expect(result.type).toBe("string");
      expect(result.format).toBe("email");
    });

    it("detects URI format", () => {
      const result = inferSchemaFromExample("https://example.com/path");
      expect(result.type).toBe("string");
      expect(result.format).toBe("uri");
    });

    it("detects UUID format", () => {
      const result = inferSchemaFromExample("550e8400-e29b-41d4-a716-446655440000");
      expect(result.type).toBe("string");
      expect(result.format).toBe("uuid");
    });
  });

  describe("arrays", () => {
    it("infers array of strings", () => {
      const result = inferSchemaFromExample(["a", "b", "c"]) as ArraySchemaObject;
      expect(result.type).toBe("array");
      expect(result.items).toEqual({ type: "string", example: "a" });
    });

    it("infers array of numbers", () => {
      const result = inferSchemaFromExample([1, 2, 3]) as ArraySchemaObject;
      expect(result.type).toBe("array");
      expect(result.items).toEqual({ type: "integer", example: 1 });
    });

    it("infers empty array as string items", () => {
      const result = inferSchemaFromExample([]) as ArraySchemaObject;
      expect(result.type).toBe("array");
      expect(result.items).toEqual({ type: "string" });
    });

    it("infers array of objects with merged schema", () => {
      const result = inferSchemaFromExample([
        { name: "Alice", age: 30 },
        { name: "Bob", email: "bob@example.com" },
      ]) as ArraySchemaObject;
      const items = result.items as SchemaObject;
      expect(result.type).toBe("array");
      expect(items.type).toBe("object");
      expect(items.properties).toHaveProperty("name");
      expect(items.properties).toHaveProperty("age");
      expect(items.properties).toHaveProperty("email");
    });
  });

  describe("objects", () => {
    it("infers object schema", () => {
      const result = inferSchemaFromExample({ name: "test", count: 42 });
      expect(result.type).toBe("object");
      expect(result.properties).toBeDefined();
      expect((result.properties?.name as SchemaObject).type).toBe("string");
      expect((result.properties?.count as SchemaObject).type).toBe("integer");
    });

    it("includes non-null properties in required", () => {
      const result = inferSchemaFromExample({ name: "test", optional: null });
      expect(result.required).toContain("name");
      expect(result.required).not.toContain("optional");
    });

    it("handles nested objects", () => {
      const result = inferSchemaFromExample({
        user: { name: "Alice", profile: { bio: "Hello" } },
      });
      const user = result.properties?.user as SchemaObject;
      const profile = user.properties?.profile as SchemaObject;
      expect(result.type).toBe("object");
      expect(user.type).toBe("object");
      expect(profile.type).toBe("object");
    });

    it("handles empty objects", () => {
      const result = inferSchemaFromExample({});
      expect(result.type).toBe("object");
      expect(result.properties).toEqual({});
    });
  });
});

describe("inferSchemaFromJson", () => {
  it("parses and infers JSON string", () => {
    const result = inferSchemaFromJson('{"name": "test"}');
    expect(result).not.toBeNull();
    expect(result?.type).toBe("object");
    expect((result?.properties?.name as SchemaObject).type).toBe("string");
  });

  it("returns null for invalid JSON", () => {
    const result = inferSchemaFromJson("not json");
    expect(result).toBeNull();
  });

  it("handles JSON arrays", () => {
    const result = inferSchemaFromJson("[1, 2, 3]");
    expect(result?.type).toBe("array");
  });
});

describe("inferRequestBodySchema", () => {
  it("infers JSON body schema", () => {
    const result = inferRequestBodySchema(
      "application/json",
      '{"name": "test"}'
    );
    expect(result).toBeDefined();
    expect(result?.content["application/json"]).toBeDefined();
    expect((result?.content["application/json"].schema as SchemaObject)?.type).toBe("object");
    expect(result?.content["application/json"].example).toEqual({ name: "test" });
  });

  it("infers URL-encoded form schema", () => {
    const result = inferRequestBodySchema(
      "application/x-www-form-urlencoded",
      "name=test&email=user@example.com"
    );
    expect(result).toBeDefined();
    expect(result?.content["application/x-www-form-urlencoded"]).toBeDefined();
    const schema = result?.content["application/x-www-form-urlencoded"].schema as SchemaObject;
    expect((schema?.properties?.name as SchemaObject).type).toBe("string");
  });

  it("handles plain text", () => {
    const result = inferRequestBodySchema("text/plain", "Hello, world!");
    expect(result?.content["text/plain"]).toBeDefined();
    expect((result?.content["text/plain"].schema as SchemaObject)?.type).toBe("string");
  });

  it("handles XML", () => {
    const result = inferRequestBodySchema(
      "application/xml",
      "<user><name>test</name></user>"
    );
    expect(result?.content["application/xml"]).toBeDefined();
  });

  it("returns undefined for empty body", () => {
    const result = inferRequestBodySchema("application/json", undefined);
    expect(result).toBeUndefined();
  });

  it("returns undefined for empty string body", () => {
    const result = inferRequestBodySchema("application/json", "");
    expect(result).toBeUndefined();
  });

  it("defaults to JSON for no content type", () => {
    const result = inferRequestBodySchema(undefined, '{"test": true}');
    expect(result?.content["application/json"]).toBeDefined();
  });
});

describe("inferResponseSchema", () => {
  it("infers JSON response schema", () => {
    const result = inferResponseSchema(200, "application/json", '{"id": 1}');
    expect(result.description).toBe("Successful response");
    expect(result.content?.["application/json"]).toBeDefined();
    expect((result.content?.["application/json"].schema as SchemaObject)?.type).toBe("object");
  });

  it("uses appropriate description for status codes", () => {
    expect(inferResponseSchema(201, undefined, "").description).toBe("Created");
    expect(inferResponseSchema(204, undefined, "").description).toBe("No content");
    expect(inferResponseSchema(400, undefined, "").description).toBe("Bad request");
    expect(inferResponseSchema(401, undefined, "").description).toBe("Unauthorized");
    expect(inferResponseSchema(404, undefined, "").description).toBe("Not found");
    expect(inferResponseSchema(500, undefined, "").description).toBe(
      "Internal server error"
    );
  });

  it("handles HTML response", () => {
    const result = inferResponseSchema(200, "text/html", "<html></html>");
    expect(result.content?.["text/html"]).toBeDefined();
    expect((result.content?.["text/html"].schema as SchemaObject)?.type).toBe("string");
  });

  it("handles plain text response", () => {
    const result = inferResponseSchema(200, "text/plain", "OK");
    expect(result.content?.["text/plain"]).toBeDefined();
  });

  it("handles response without body", () => {
    const result = inferResponseSchema(204, undefined, undefined);
    expect(result.content).toBeUndefined();
  });

  it("handles unknown status codes", () => {
    const result = inferResponseSchema(418, undefined, "");
    expect(result.description).toBe("Response with status 418");
  });
});
