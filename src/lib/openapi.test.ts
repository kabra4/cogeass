import { describe, it, expect } from "vitest";
import { isOAS31, listOperations, type DerefSpec } from "./openapi";
import type { OpenAPIV3 } from "openapi-types";

function createBaseSpec(overrides: Partial<DerefSpec> = {}): DerefSpec {
  return {
    openapi: "3.0.0",
    info: {
      title: "Test API",
      version: "1.0.0",
    },
    paths: {},
    ...overrides,
  };
}

function createOperation(
  overrides: Partial<OpenAPIV3.OperationObject> = {}
): OpenAPIV3.OperationObject {
  return {
    responses: {
      "200": {
        description: "OK",
      },
    },
    ...overrides,
  };
}

describe("isOAS31", () => {
  describe("OpenAPI 3.1.x detection", () => {
    it("returns true for openapi 3.1.0", () => {
      const spec = createBaseSpec({ openapi: "3.1.0" });
      expect(isOAS31(spec)).toBe(true);
    });

    it("returns true for openapi 3.1.1", () => {
      const spec = createBaseSpec({ openapi: "3.1.1" });
      expect(isOAS31(spec)).toBe(true);
    });

    it("returns true for openapi 3.1.99", () => {
      const spec = createBaseSpec({ openapi: "3.1.99" });
      expect(isOAS31(spec)).toBe(true);
    });
  });

  describe("OpenAPI 3.0.x detection", () => {
    it("returns false for openapi 3.0.0", () => {
      const spec = createBaseSpec({ openapi: "3.0.0" });
      expect(isOAS31(spec)).toBe(false);
    });

    it("returns false for openapi 3.0.1", () => {
      const spec = createBaseSpec({ openapi: "3.0.1" });
      expect(isOAS31(spec)).toBe(false);
    });

    it("returns false for openapi 3.0.3", () => {
      const spec = createBaseSpec({ openapi: "3.0.3" });
      expect(isOAS31(spec)).toBe(false);
    });
  });
});

describe("listOperations", () => {
  describe("basic operation listing", () => {
    it("returns empty array for spec with no paths", () => {
      const spec = createBaseSpec({ paths: {} });
      expect(listOperations(spec)).toEqual([]);
    });

    it("returns empty array for spec with undefined paths", () => {
      const spec = createBaseSpec();
      delete (spec as Record<string, unknown>).paths;
      expect(listOperations(spec)).toEqual([]);
    });

    it("lists single GET operation", () => {
      const spec = createBaseSpec({
        paths: {
          "/users": {
            get: createOperation(),
          },
        },
      });

      const ops = listOperations(spec);
      expect(ops).toHaveLength(1);
      expect(ops[0].method).toBe("get");
      expect(ops[0].path).toBe("/users");
    });

    it("lists multiple HTTP methods on same path", () => {
      const spec = createBaseSpec({
        paths: {
          "/users": {
            get: createOperation(),
            post: createOperation(),
            put: createOperation(),
          },
        },
      });

      const ops = listOperations(spec);
      expect(ops).toHaveLength(3);
      expect(ops.map((o) => o.method)).toContain("get");
      expect(ops.map((o) => o.method)).toContain("post");
      expect(ops.map((o) => o.method)).toContain("put");
    });

    it("lists operations from multiple paths", () => {
      const spec = createBaseSpec({
        paths: {
          "/users": {
            get: createOperation(),
          },
          "/products": {
            get: createOperation(),
          },
        },
      });

      const ops = listOperations(spec);
      expect(ops).toHaveLength(2);
      expect(ops.map((o) => o.path)).toContain("/users");
      expect(ops.map((o) => o.path)).toContain("/products");
    });
  });

  describe("HTTP method support", () => {
    it("supports all standard HTTP methods", () => {
      const spec = createBaseSpec({
        paths: {
          "/test": {
            get: createOperation(),
            post: createOperation(),
            put: createOperation(),
            patch: createOperation(),
            delete: createOperation(),
            head: createOperation(),
            options: createOperation(),
            trace: createOperation(),
          },
        },
      });

      const ops = listOperations(spec);
      expect(ops).toHaveLength(8);

      const methods = ops.map((o) => o.method);
      expect(methods).toContain("get");
      expect(methods).toContain("post");
      expect(methods).toContain("put");
      expect(methods).toContain("patch");
      expect(methods).toContain("delete");
      expect(methods).toContain("head");
      expect(methods).toContain("options");
      expect(methods).toContain("trace");
    });
  });

  describe("tag handling", () => {
    it("uses first tag when operation has tags", () => {
      const spec = createBaseSpec({
        paths: {
          "/users": {
            get: createOperation({
              tags: ["Users", "Admin"],
            }),
          },
        },
      });

      const ops = listOperations(spec);
      expect(ops[0].tag).toBe("Users");
    });

    it("uses 'default' tag when operation has no tags", () => {
      const spec = createBaseSpec({
        paths: {
          "/users": {
            get: createOperation({
              tags: undefined,
            }),
          },
        },
      });

      const ops = listOperations(spec);
      expect(ops[0].tag).toBe("default");
    });

    it("uses 'default' tag when operation has empty tags array", () => {
      const spec = createBaseSpec({
        paths: {
          "/users": {
            get: createOperation({
              tags: [],
            }),
          },
        },
      });

      const ops = listOperations(spec);
      expect(ops[0].tag).toBe("default");
    });
  });

  describe("parameter merging", () => {
    it("includes operation-level parameters", () => {
      const spec = createBaseSpec({
        paths: {
          "/users/{id}": {
            get: createOperation({
              parameters: [
                {
                  name: "id",
                  in: "path",
                  required: true,
                  schema: { type: "string" },
                },
              ],
            }),
          },
        },
      });

      const ops = listOperations(spec);
      expect(ops[0].op.parameters).toHaveLength(1);
      expect((ops[0].op.parameters?.[0] as OpenAPIV3.ParameterObject).name).toBe("id");
    });

    it("includes path-level parameters", () => {
      const spec = createBaseSpec({
        paths: {
          "/users/{id}": {
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
            ],
            get: createOperation(),
          },
        },
      });

      const ops = listOperations(spec);
      expect(ops[0].op.parameters).toHaveLength(1);
    });

    it("combines path-level and operation-level parameters", () => {
      const spec = createBaseSpec({
        paths: {
          "/users/{id}": {
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
            ],
            get: createOperation({
              parameters: [
                {
                  name: "include",
                  in: "query",
                  schema: { type: "string" },
                },
              ],
            }),
          },
        },
      });

      const ops = listOperations(spec);
      expect(ops[0].op.parameters).toHaveLength(2);
    });

    it("path-level parameters come before operation-level", () => {
      const spec = createBaseSpec({
        paths: {
          "/users/{id}": {
            parameters: [
              {
                name: "pathParam",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
            ],
            get: createOperation({
              parameters: [
                {
                  name: "opParam",
                  in: "query",
                  schema: { type: "string" },
                },
              ],
            }),
          },
        },
      });

      const ops = listOperations(spec);
      const params = ops[0].op.parameters as OpenAPIV3.ParameterObject[];
      expect(params[0].name).toBe("pathParam");
      expect(params[1].name).toBe("opParam");
    });
  });

  describe("deduplication", () => {
    it("deduplicates operations by method:path key", () => {
      // This shouldn't happen in valid specs, but tests the dedup logic
      const spec = createBaseSpec({
        paths: {
          "/users": {
            get: createOperation(),
          },
        },
      });

      // First call
      const ops1 = listOperations(spec);
      expect(ops1).toHaveLength(1);

      // Second call should still return 1 (not accumulate)
      const ops2 = listOperations(spec);
      expect(ops2).toHaveLength(1);
    });
  });

  describe("operation object preservation", () => {
    it("preserves operationId", () => {
      const spec = createBaseSpec({
        paths: {
          "/users": {
            get: createOperation({
              operationId: "getUsers",
            }),
          },
        },
      });

      const ops = listOperations(spec);
      expect(ops[0].op.operationId).toBe("getUsers");
    });

    it("preserves summary and description", () => {
      const spec = createBaseSpec({
        paths: {
          "/users": {
            get: createOperation({
              summary: "Get all users",
              description: "Returns a list of users",
            }),
          },
        },
      });

      const ops = listOperations(spec);
      expect(ops[0].op.summary).toBe("Get all users");
      expect(ops[0].op.description).toBe("Returns a list of users");
    });

    it("preserves requestBody", () => {
      const spec = createBaseSpec({
        paths: {
          "/users": {
            post: createOperation({
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                      },
                    },
                  },
                },
              },
            }),
          },
        },
      });

      const ops = listOperations(spec);
      expect(ops[0].op.requestBody).toBeDefined();
    });

    it("preserves security requirements", () => {
      const spec = createBaseSpec({
        paths: {
          "/users": {
            get: createOperation({
              security: [{ bearerAuth: [] }],
            }),
          },
        },
      });

      const ops = listOperations(spec);
      expect(ops[0].op.security).toEqual([{ bearerAuth: [] }]);
    });
  });

  describe("complex paths", () => {
    it("handles paths with multiple path parameters", () => {
      const spec = createBaseSpec({
        paths: {
          "/users/{userId}/posts/{postId}": {
            get: createOperation(),
          },
        },
      });

      const ops = listOperations(spec);
      expect(ops[0].path).toBe("/users/{userId}/posts/{postId}");
    });

    it("handles paths with query string patterns", () => {
      const spec = createBaseSpec({
        paths: {
          "/search": {
            get: createOperation({
              parameters: [
                { name: "q", in: "query", schema: { type: "string" } },
              ],
            }),
          },
        },
      });

      const ops = listOperations(spec);
      expect(ops[0].path).toBe("/search");
    });
  });
});
