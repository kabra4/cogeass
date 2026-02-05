import { describe, it, expect } from "vitest";
import type { OpenAPIV3 } from "openapi-types";
import { convertPostmanToOpenAPI } from "./converter";
import type { PostmanCollection } from "./types";

type ParameterObject = OpenAPIV3.ParameterObject;
type RequestBodyObject = OpenAPIV3.RequestBodyObject;

function createMinimalCollection(
  items: PostmanCollection["item"] = []
): PostmanCollection {
  return {
    info: {
      name: "Test Collection",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: items,
  };
}

describe("convertPostmanToOpenAPI", () => {
  describe("basic conversion", () => {
    it("converts empty collection", () => {
      const collection = createMinimalCollection();
      const result = convertPostmanToOpenAPI(collection);

      expect(result.spec.openapi).toBe("3.0.3");
      expect(result.spec.info.title).toBe("Test Collection");
      expect(result.spec.paths).toEqual({});
      expect(result.metadata.sourceFormat).toBe("postman");
    });

    it("uses custom workspace name", () => {
      const collection = createMinimalCollection();
      const result = convertPostmanToOpenAPI(collection, {
        workspaceName: "Custom API",
      });

      expect(result.spec.info.title).toBe("Custom API");
    });

    it("preserves collection description", () => {
      const collection = createMinimalCollection();
      collection.info.description = "API description";
      const result = convertPostmanToOpenAPI(collection);

      expect(result.spec.info.description).toBe("API description");
    });
  });

  describe("request conversion", () => {
    it("converts simple GET request", () => {
      const collection = createMinimalCollection([
        {
          name: "Get Users",
          request: {
            method: "GET",
            url: "https://api.example.com/users",
          },
        },
      ]);

      const result = convertPostmanToOpenAPI(collection);
      expect(result.spec.paths["/users"]?.get).toBeDefined();
      expect(result.spec.paths["/users"]?.get?.summary).toBe("Get Users");
    });

    it("converts POST request with body", () => {
      const collection = createMinimalCollection([
        {
          name: "Create User",
          request: {
            method: "POST",
            url: "https://api.example.com/users",
            body: {
              mode: "raw",
              raw: '{"name": "John", "email": "john@example.com"}',
              options: { raw: { language: "json" } },
            },
          },
        },
      ]);

      const result = convertPostmanToOpenAPI(collection, { inferSchemas: true });
      const post = result.spec.paths["/users"]?.post;

      expect(post).toBeDefined();
      expect(post?.requestBody).toBeDefined();
      expect((post?.requestBody as RequestBodyObject)?.content["application/json"]).toBeDefined();
    });

    it("converts URL-encoded body", () => {
      const collection = createMinimalCollection([
        {
          name: "Login",
          request: {
            method: "POST",
            url: "https://api.example.com/login",
            body: {
              mode: "urlencoded",
              urlencoded: [
                { key: "username", value: "user" },
                { key: "password", value: "pass" },
              ],
            },
          },
        },
      ]);

      const result = convertPostmanToOpenAPI(collection);
      const post = result.spec.paths["/login"]?.post;
      const content = (post?.requestBody as RequestBodyObject)?.content;

      expect(content["application/x-www-form-urlencoded"]).toBeDefined();
    });

    it("handles form-data with warning", () => {
      const collection = createMinimalCollection([
        {
          name: "Upload",
          request: {
            method: "POST",
            url: "https://api.example.com/upload",
            body: {
              mode: "formdata",
              formdata: [{ key: "file", type: "file" }],
            },
          },
        },
      ]);

      const result = convertPostmanToOpenAPI(collection);
      expect(result.warnings.some((w) => w.type === "formdata_body")).toBe(true);
    });

    it("skips GraphQL requests with warning", () => {
      const collection = createMinimalCollection([
        {
          name: "GraphQL Query",
          request: {
            method: "POST",
            url: "https://api.example.com/graphql",
            body: {
              mode: "graphql",
              graphql: { query: "{ users { id } }" },
            },
          },
        },
      ]);

      const result = convertPostmanToOpenAPI(collection);
      expect(result.warnings.some((w) => w.type === "graphql_skipped")).toBe(true);
      expect(result.spec.paths["/graphql"]).toBeUndefined();
    });
  });

  describe("URL parsing", () => {
    it("extracts path from full URL", () => {
      const collection = createMinimalCollection([
        {
          name: "Request",
          request: {
            method: "GET",
            url: "https://api.example.com/api/v1/users",
          },
        },
      ]);

      const result = convertPostmanToOpenAPI(collection);
      expect(result.spec.paths["/api/v1/users"]).toBeDefined();
    });

    it("extracts query parameters", () => {
      const collection = createMinimalCollection([
        {
          name: "Request",
          request: {
            method: "GET",
            url: {
              raw: "https://api.example.com/users?page=1&limit=10",
              path: ["users"],
              query: [
                { key: "page", value: "1" },
                { key: "limit", value: "10" },
              ],
            },
          },
        },
      ]);

      const result = convertPostmanToOpenAPI(collection);
      const params = result.spec.paths["/users"]?.get?.parameters;

      expect(params?.some((p: OpenAPIV3.ReferenceObject | ParameterObject) => (p as ParameterObject).name === "page" && (p as ParameterObject).in === "query")).toBe(true);
      expect(params?.some((p: OpenAPIV3.ReferenceObject | ParameterObject) => (p as ParameterObject).name === "limit" && (p as ParameterObject).in === "query")).toBe(true);
    });

    it("excludes disabled query parameters", () => {
      const collection = createMinimalCollection([
        {
          name: "Request",
          request: {
            method: "GET",
            url: {
              raw: "https://api.example.com/users",
              path: ["users"],
              query: [
                { key: "active", value: "true", disabled: true },
                { key: "page", value: "1" },
              ],
            },
          },
        },
      ]);

      const result = convertPostmanToOpenAPI(collection);
      const params = result.spec.paths["/users"]?.get?.parameters || [];

      expect(params.some((p: OpenAPIV3.ReferenceObject | ParameterObject) => (p as ParameterObject).name === "active")).toBe(false);
      expect(params.some((p: OpenAPIV3.ReferenceObject | ParameterObject) => (p as ParameterObject).name === "page")).toBe(true);
    });
  });

  describe("headers", () => {
    it("converts custom headers as parameters", () => {
      const collection = createMinimalCollection([
        {
          name: "Request",
          request: {
            method: "GET",
            url: "https://api.example.com/data",
            header: [{ key: "X-Custom-Header", value: "custom-value" }],
          },
        },
      ]);

      const result = convertPostmanToOpenAPI(collection);
      const params = result.spec.paths["/data"]?.get?.parameters || [];

      expect(
        params.some(
          (p: OpenAPIV3.ReferenceObject | ParameterObject) => (p as ParameterObject).name === "X-Custom-Header" && (p as ParameterObject).in === "header"
        )
      ).toBe(true);
    });

    it("excludes common headers", () => {
      const collection = createMinimalCollection([
        {
          name: "Request",
          request: {
            method: "GET",
            url: "https://api.example.com/data",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Accept", value: "application/json" },
              { key: "Authorization", value: "Bearer token" },
              { key: "X-Custom", value: "custom" },
            ],
          },
        },
      ]);

      const result = convertPostmanToOpenAPI(collection);
      const params = result.spec.paths["/data"]?.get?.parameters || [];
      const headerParams = params.filter((p) => (p as ParameterObject).in === "header");

      expect(headerParams).toHaveLength(1);
      expect((headerParams[0] as ParameterObject).name).toBe("X-Custom");
    });
  });

  describe("folder structure", () => {
    it("uses folder names as tags", () => {
      const collection = createMinimalCollection([
        {
          name: "Users",
          item: [
            {
              name: "Get User",
              request: { method: "GET", url: "https://api.example.com/users/1" },
            },
          ],
        },
      ]);

      const result = convertPostmanToOpenAPI(collection);
      expect(result.spec.paths["/users/{userId}"]?.get?.tags).toContain("Users");
    });

    it("flattens nested folders", () => {
      const collection = createMinimalCollection([
        {
          name: "API",
          item: [
            {
              name: "V1",
              item: [
                {
                  name: "Get Data",
                  request: { method: "GET", url: "https://api.example.com/data" },
                },
              ],
            },
          ],
        },
      ]);

      const result = convertPostmanToOpenAPI(collection);
      expect(result.spec.paths["/data"]?.get?.tags).toContain("API");
    });
  });

  describe("path parameter detection", () => {
    it("detects numeric path parameters", () => {
      const collection = createMinimalCollection([
        {
          name: "Get User",
          request: { method: "GET", url: "https://api.example.com/users/123" },
        },
      ]);

      const result = convertPostmanToOpenAPI(collection);
      expect(result.spec.paths["/users/{userId}"]).toBeDefined();
      expect(result.detectedPaths).toHaveLength(1);
    });

    it("adds path parameters to operation", () => {
      const collection = createMinimalCollection([
        {
          name: "Get User",
          request: { method: "GET", url: "https://api.example.com/users/123" },
        },
      ]);

      const result = convertPostmanToOpenAPI(collection);
      const params = result.spec.paths["/users/{userId}"]?.get?.parameters || [];

      expect(
        params.some((p: OpenAPIV3.ReferenceObject | ParameterObject) => (p as ParameterObject).name === "userId" && (p as ParameterObject).in === "path")
      ).toBe(true);
    });
  });

  describe("responses", () => {
    it("uses example responses when available", () => {
      const collection = createMinimalCollection([
        {
          name: "Get User",
          request: { method: "GET", url: "https://api.example.com/users/1" },
          response: [
            {
              name: "Success",
              code: 200,
              body: '{"id": 1, "name": "John"}',
              header: [{ key: "Content-Type", value: "application/json" }],
            },
          ],
        },
      ]);

      const result = convertPostmanToOpenAPI(collection, { inferSchemas: true });
      const responses = result.spec.paths["/users/{userId}"]?.get?.responses;

      expect(responses?.["200"]).toBeDefined();
    });

    it("adds default response when no examples", () => {
      const collection = createMinimalCollection([
        {
          name: "Get User",
          request: { method: "GET", url: "https://api.example.com/users" },
        },
      ]);

      const result = convertPostmanToOpenAPI(collection);
      const responses = result.spec.paths["/users"]?.get?.responses;

      expect(responses?.["200"]).toBeDefined();
    });
  });

  describe("authentication", () => {
    it("converts collection-level auth", () => {
      const collection = createMinimalCollection([
        {
          name: "Request",
          request: { method: "GET", url: "https://api.example.com/data" },
        },
      ]);
      collection.auth = {
        type: "bearer",
        bearer: [{ key: "token", value: "jwt-token" }],
      };

      const result = convertPostmanToOpenAPI(collection);

      expect(result.spec.components?.securitySchemes?.bearerAuth).toBeDefined();
      expect(result.spec.security).toEqual([{ bearerAuth: [] }]);
    });

    it("converts request-level auth", () => {
      const collection = createMinimalCollection([
        {
          name: "Request",
          request: {
            method: "GET",
            url: "https://api.example.com/data",
            auth: {
              type: "apikey",
              apikey: [
                { key: "key", value: "X-API-Key" },
                { key: "value", value: "secret" },
              ],
            },
          },
        },
      ]);

      const result = convertPostmanToOpenAPI(collection);
      const op = result.spec.paths["/data"]?.get;

      expect(op?.security).toBeDefined();
    });
  });

  describe("variables and environments", () => {
    it("extracts collection variables as environment", () => {
      const collection = createMinimalCollection([]);
      collection.variable = [
        { key: "baseUrl", value: "https://api.example.com" },
        { key: "apiKey", value: "secret123" },
      ];

      const result = convertPostmanToOpenAPI(collection, {
        importEnvironments: true,
      });

      expect(result.environments).toHaveLength(1);
      expect(result.environments[0].variables.baseUrl).toBe(
        "https://api.example.com"
      );
    });

    it("skips environment import when disabled", () => {
      const collection = createMinimalCollection([]);
      collection.variable = [{ key: "baseUrl", value: "https://api.example.com" }];

      const result = convertPostmanToOpenAPI(collection, {
        importEnvironments: false,
      });

      expect(result.environments).toHaveLength(0);
    });

    it("skips disabled variables", () => {
      const collection = createMinimalCollection([]);
      collection.variable = [
        { key: "active", value: "value1" },
        { key: "inactive", value: "value2", disabled: true },
      ];

      const result = convertPostmanToOpenAPI(collection);
      expect(result.environments[0].variables.active).toBe("value1");
      expect(result.environments[0].variables.inactive).toBeUndefined();
    });
  });

  describe("scripts warning", () => {
    it("warns about pre-request/test scripts", () => {
      const collection = createMinimalCollection([
        {
          name: "Request",
          request: { method: "GET", url: "https://api.example.com/data" },
          event: [
            {
              listen: "test",
              script: { exec: ["pm.test('works', () => {})"] },
            },
          ],
        },
      ]);

      const result = convertPostmanToOpenAPI(collection);
      expect(result.warnings.some((w) => w.type === "script_ignored")).toBe(true);
    });
  });

  describe("metadata", () => {
    it("provides correct metadata", () => {
      const collection = createMinimalCollection([
        {
          name: "Request 1",
          request: { method: "GET", url: "https://api.example.com/a" },
        },
        {
          name: "Request 2",
          request: { method: "GET", url: "https://api.example.com/b" },
        },
      ]);

      const result = convertPostmanToOpenAPI(collection);

      expect(result.metadata.sourceFormat).toBe("postman");
      expect(result.metadata.sourceName).toBe("Test Collection");
      expect(result.metadata.requestCount).toBe(2);
      expect(result.metadata.endpointCount).toBe(2);
    });
  });
});
