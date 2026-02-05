import { describe, it, expect } from "vitest";
import type { OpenAPIV3 } from "openapi-types";
import { convertHarToOpenAPI, isHarFile } from "./converter";
import type { Har, Entry, Response } from "har-format";

type ParameterObject = OpenAPIV3.ParameterObject;
type ResponseObject = OpenAPIV3.ResponseObject;
type SchemaObject = OpenAPIV3.SchemaObject;
type MediaTypeObject = OpenAPIV3.MediaTypeObject;

function createMinimalHar(entries: Entry[] = []): Har {
  return {
    log: {
      version: "1.2",
      creator: { name: "Browser DevTools", version: "1.0" },
      entries,
    },
  };
}

function createEntry(
  method: string,
  url: string,
  response: Partial<Response> = {}
): Entry {
  return {
    startedDateTime: "2024-01-01T00:00:00.000Z",
    time: 100,
    request: {
      method,
      url,
      httpVersion: "HTTP/1.1",
      headers: [],
      queryString: [],
      cookies: [],
      headersSize: -1,
      bodySize: -1,
    },
    response: {
      status: 200,
      statusText: "OK",
      httpVersion: "HTTP/1.1",
      headers: [],
      cookies: [],
      content: { size: 0, mimeType: "application/json" },
      redirectURL: "",
      headersSize: -1,
      bodySize: -1,
      ...response,
    },
    cache: {},
    timings: { send: 0, wait: 100, receive: 0 },
  };
}

describe("isHarFile", () => {
  it("returns true for valid HAR", () => {
    const har = createMinimalHar();
    expect(isHarFile(har)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isHarFile(null)).toBe(false);
  });

  it("returns false for non-object", () => {
    expect(isHarFile("string")).toBe(false);
  });

  it("returns false for missing log", () => {
    expect(isHarFile({})).toBe(false);
  });

  it("returns false for missing version", () => {
    expect(isHarFile({ log: { entries: [] } })).toBe(false);
  });

  it("returns false for missing entries", () => {
    expect(isHarFile({ log: { version: "1.2" } })).toBe(false);
  });
});

describe("convertHarToOpenAPI", () => {
  describe("basic conversion", () => {
    it("converts empty HAR", () => {
      const har = createMinimalHar();
      const result = convertHarToOpenAPI(har);

      expect(result.spec.openapi).toBe("3.0.3");
      expect(result.spec.paths).toEqual({});
      expect(result.metadata.sourceFormat).toBe("har");
    });

    it("uses custom workspace name", () => {
      const har = createMinimalHar();
      const result = convertHarToOpenAPI(har, { workspaceName: "My HAR API" });

      expect(result.spec.info.title).toBe("My HAR API");
    });

    it("uses creator name as source name", () => {
      const har = createMinimalHar();
      const result = convertHarToOpenAPI(har);

      expect(result.metadata.sourceName).toBe("Browser DevTools");
    });
  });

  describe("request conversion", () => {
    it("converts GET request", () => {
      const har = createMinimalHar([
        createEntry("GET", "https://api.example.com/users"),
      ]);

      const result = convertHarToOpenAPI(har);
      expect(result.spec.paths["/users"]?.get).toBeDefined();
    });

    it("converts POST request", () => {
      const har = createMinimalHar([
        createEntry("POST", "https://api.example.com/users"),
      ]);

      const result = convertHarToOpenAPI(har);
      expect(result.spec.paths["/users"]?.post).toBeDefined();
    });

    it("groups multiple entries for same endpoint", () => {
      const har = createMinimalHar([
        createEntry("GET", "https://api.example.com/users"),
        createEntry("GET", "https://api.example.com/users"),
      ]);

      const result = convertHarToOpenAPI(har);
      expect(result.metadata.requestCount).toBe(2);
      expect(result.metadata.endpointCount).toBe(1);
    });

    it("creates separate paths for different endpoints", () => {
      const har = createMinimalHar([
        createEntry("GET", "https://api.example.com/users"),
        createEntry("GET", "https://api.example.com/posts"),
      ]);

      const result = convertHarToOpenAPI(har);
      expect(result.spec.paths["/users"]).toBeDefined();
      expect(result.spec.paths["/posts"]).toBeDefined();
    });
  });

  describe("URL handling", () => {
    it("extracts path from full URL", () => {
      const har = createMinimalHar([
        createEntry("GET", "https://api.example.com/api/v1/data"),
      ]);

      const result = convertHarToOpenAPI(har);
      expect(result.spec.paths["/api/v1/data"]).toBeDefined();
    });

    it("extracts query parameters from URL", () => {
      const har = createMinimalHar([
        createEntry("GET", "https://api.example.com/users?page=1&limit=10"),
      ]);

      const result = convertHarToOpenAPI(har);
      const params = result.spec.paths["/users"]?.get?.parameters || [];

      expect(params.some((p) => (p as ParameterObject).name === "page")).toBe(true);
      expect(params.some((p) => (p as ParameterObject).name === "limit")).toBe(true);
    });

    it("uses most common base URL", () => {
      const har = createMinimalHar([
        createEntry("GET", "https://api.example.com/a"),
        createEntry("GET", "https://api.example.com/b"),
        createEntry("GET", "https://other.com/c"),
      ]);

      const result = convertHarToOpenAPI(har);
      expect(result.spec.servers?.[0].url).toBe("https://api.example.com");
    });
  });

  describe("path parameter detection", () => {
    it("detects numeric path parameters", () => {
      const har = createMinimalHar([
        createEntry("GET", "https://api.example.com/users/123"),
      ]);

      const result = convertHarToOpenAPI(har);
      expect(result.spec.paths["/users/{userId}"]).toBeDefined();
      expect(result.detectedPaths.length).toBeGreaterThan(0);
    });

    it("detects UUID path parameters", () => {
      const har = createMinimalHar([
        createEntry(
          "GET",
          "https://api.example.com/items/550e8400-e29b-41d4-a716-446655440000"
        ),
      ]);

      const result = convertHarToOpenAPI(har);
      expect(result.spec.paths["/items/{itemId}"]).toBeDefined();
    });
  });

  describe("headers", () => {
    it("converts custom headers", () => {
      const entry = createEntry("GET", "https://api.example.com/data");
      entry.request.headers = [{ name: "X-Custom-Header", value: "custom" }];

      const har = createMinimalHar([entry]);
      const result = convertHarToOpenAPI(har);
      const params = result.spec.paths["/data"]?.get?.parameters || [];

      expect(params.some((p) => (p as ParameterObject).name === "X-Custom-Header")).toBe(true);
    });

    it("excludes browser-specific headers", () => {
      const entry = createEntry("GET", "https://api.example.com/data");
      entry.request.headers = [
        { name: "User-Agent", value: "Mozilla/5.0" },
        { name: "Cookie", value: "session=abc" },
        { name: "X-Custom", value: "value" },
      ];

      const har = createMinimalHar([entry]);
      const result = convertHarToOpenAPI(har);
      const params = result.spec.paths["/data"]?.get?.parameters || [];
      const headerParams = params.filter((p) => (p as ParameterObject).in === "header");

      expect(headerParams.some((p) => (p as ParameterObject).name === "User-Agent")).toBe(false);
      expect(headerParams.some((p) => (p as ParameterObject).name === "X-Custom")).toBe(true);
    });
  });

  describe("request body", () => {
    it("converts JSON request body", () => {
      const entry = createEntry("POST", "https://api.example.com/users");
      entry.request.postData = {
        mimeType: "application/json",
        text: '{"name": "John"}',
      };

      const har = createMinimalHar([entry]);
      const result = convertHarToOpenAPI(har, { inferSchemas: true });
      const body = result.spec.paths["/users"]?.post?.requestBody as OpenAPIV3.RequestBodyObject;

      expect(body?.content["application/json"]).toBeDefined();
    });

    it("converts form data", () => {
      const entry = createEntry("POST", "https://api.example.com/login");
      entry.request.postData = {
        mimeType: "application/x-www-form-urlencoded",
        params: [
          { name: "username", value: "user" },
          { name: "password", value: "pass" },
        ],
      };

      const har = createMinimalHar([entry]);
      const result = convertHarToOpenAPI(har);
      const body = result.spec.paths["/login"]?.post?.requestBody as OpenAPIV3.RequestBodyObject;

      expect(body?.content["application/x-www-form-urlencoded"]).toBeDefined();
    });
  });

  describe("responses", () => {
    it("uses response status code", () => {
      const har = createMinimalHar([
        createEntry("GET", "https://api.example.com/data", { status: 201 }),
      ]);

      const result = convertHarToOpenAPI(har);
      expect(result.spec.paths["/data"]?.get?.responses?.["201"]).toBeDefined();
    });

    it("infers response schema from body", () => {
      const entry = createEntry("GET", "https://api.example.com/data");
      entry.response.content = {
        size: 100,
        mimeType: "application/json",
        text: '{"id": 1, "name": "Test"}',
      };

      const har = createMinimalHar([entry]);
      const result = convertHarToOpenAPI(har, { inferSchemas: true });
      const response = result.spec.paths["/data"]?.get?.responses?.["200"] as ResponseObject;
      const media = response?.content?.["application/json"] as MediaTypeObject;
      const schema = media?.schema as SchemaObject;

      expect(schema?.type).toBe("object");
    });

    it("merges responses from multiple entries", () => {
      const har = createMinimalHar([
        createEntry("GET", "https://api.example.com/data", { status: 200 }),
        createEntry("GET", "https://api.example.com/data", { status: 404 }),
      ]);

      const result = convertHarToOpenAPI(har);
      const responses = result.spec.paths["/data"]?.get?.responses;

      expect(responses?.["200"]).toBeDefined();
      expect(responses?.["404"]).toBeDefined();
    });
  });

  describe("authentication detection", () => {
    it("detects Bearer token from headers", () => {
      const entry = createEntry("GET", "https://api.example.com/data");
      entry.request.headers = [
        { name: "Authorization", value: "Bearer my-jwt-token" },
      ];

      const har = createMinimalHar([entry]);
      const result = convertHarToOpenAPI(har);

      expect(result.spec.components?.securitySchemes?.bearerAuth).toBeDefined();
    });

    it("detects API key from headers", () => {
      const entry = createEntry("GET", "https://api.example.com/data");
      entry.request.headers = [{ name: "X-API-Key", value: "secret123" }];

      const har = createMinimalHar([entry]);
      const result = convertHarToOpenAPI(har);

      expect(result.spec.components?.securitySchemes?.apiKey).toBeDefined();
    });
  });

  describe("WebSocket filtering", () => {
    it("skips WebSocket entries with warning", () => {
      const wsEntry = createEntry("GET", "wss://api.example.com/ws");
      const httpEntry = createEntry("GET", "https://api.example.com/data");

      const har = createMinimalHar([wsEntry, httpEntry]);
      const result = convertHarToOpenAPI(har);

      expect(result.warnings.some((w) => w.type === "websocket_skipped")).toBe(true);
      expect(result.spec.paths["/data"]).toBeDefined();
      expect(result.metadata.requestCount).toBe(1);
    });
  });

  describe("metadata", () => {
    it("provides correct metadata", () => {
      const har = createMinimalHar([
        createEntry("GET", "https://api.example.com/a"),
        createEntry("GET", "https://api.example.com/a"),
        createEntry("POST", "https://api.example.com/b"),
      ]);

      const result = convertHarToOpenAPI(har);

      expect(result.metadata.sourceFormat).toBe("har");
      expect(result.metadata.requestCount).toBe(3);
      expect(result.metadata.endpointCount).toBe(2);
      expect(result.metadata.formatVersion).toBe("1.2");
    });
  });

  describe("environments", () => {
    it("returns empty environments (HAR has no environment concept)", () => {
      const har = createMinimalHar([
        createEntry("GET", "https://api.example.com/data"),
      ]);

      const result = convertHarToOpenAPI(har);
      expect(result.environments).toEqual([]);
    });
  });
});
