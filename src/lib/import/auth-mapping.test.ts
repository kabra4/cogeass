import { describe, it, expect } from "vitest";
import type { OpenAPIV3 } from "openapi-types";
import {
  mapPostmanAuth,
  mapInsomniaAuth,
  detectAuthFromHeaders,
  mergeAuthResults,
} from "./auth-mapping";

describe("mapPostmanAuth", () => {
  it("returns empty result for no auth", () => {
    const result = mapPostmanAuth(undefined);
    expect(result.securitySchemes).toEqual({});
    expect(result.security).toEqual([]);
  });

  it("returns empty result for noauth type", () => {
    const result = mapPostmanAuth({ type: "noauth" });
    expect(result.securitySchemes).toEqual({});
  });

  describe("API Key auth", () => {
    it("maps API key in header", () => {
      const result = mapPostmanAuth({
        type: "apikey",
        apikey: [
          { key: "key", value: "X-Custom-Key" },
          { key: "value", value: "secret123" },
          { key: "in", value: "header" },
        ],
      });

      expect(result.securitySchemes.apiKey).toEqual({
        type: "apiKey",
        name: "X-Custom-Key",
        in: "header",
      });
      expect(result.security).toEqual([{ apiKey: [] }]);
      expect(result.authValues.apiKey).toEqual({ apiKey: "secret123" });
    });

    it("maps API key in query", () => {
      const result = mapPostmanAuth({
        type: "apikey",
        apikey: [
          { key: "key", value: "api_key" },
          { key: "value", value: "secret" },
          { key: "in", value: "query" },
        ],
      });

      expect((result.securitySchemes.apiKey as OpenAPIV3.ApiKeySecurityScheme)?.in).toBe("query");
    });

    it("defaults to header when in not specified", () => {
      const result = mapPostmanAuth({
        type: "apikey",
        apikey: [{ key: "key", value: "X-API-Key" }],
      });

      expect((result.securitySchemes.apiKey as OpenAPIV3.ApiKeySecurityScheme)?.in).toBe("header");
    });
  });

  describe("Bearer auth", () => {
    it("maps bearer token", () => {
      const result = mapPostmanAuth({
        type: "bearer",
        bearer: [{ key: "token", value: "my-jwt-token" }],
      });

      expect(result.securitySchemes.bearerAuth).toEqual({
        type: "http",
        scheme: "bearer",
      });
      expect(result.security).toEqual([{ bearerAuth: [] }]);
      expect(result.authValues.bearerAuth).toEqual({ token: "my-jwt-token" });
    });

    it("handles missing token value", () => {
      const result = mapPostmanAuth({
        type: "bearer",
        bearer: [],
      });

      expect(result.securitySchemes.bearerAuth).toBeDefined();
      expect(result.authValues.bearerAuth).toBeUndefined();
    });
  });

  describe("Basic auth", () => {
    it("maps basic auth", () => {
      const result = mapPostmanAuth({
        type: "basic",
        basic: [
          { key: "username", value: "user" },
          { key: "password", value: "pass" },
        ],
      });

      expect(result.securitySchemes.basicAuth).toEqual({
        type: "http",
        scheme: "basic",
      });
      expect(result.security).toEqual([{ basicAuth: [] }]);
      expect(result.authValues.basicAuth).toEqual({
        username: "user",
        password: "pass",
      });
    });
  });

  describe("unsupported auth types", () => {
    it("warns for OAuth2", () => {
      const result = mapPostmanAuth({ type: "oauth2" });
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe("oauth2_flow");
    });

    it("warns for AWS Signature", () => {
      const result = mapPostmanAuth({ type: "awsv4" });
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe("unsupported_auth");
    });

    it("warns for Hawk auth", () => {
      const result = mapPostmanAuth({ type: "hawk" });
      expect(result.warnings).toHaveLength(1);
    });

    it("warns for Digest auth", () => {
      const result = mapPostmanAuth({ type: "digest" });
      expect(result.warnings).toHaveLength(1);
    });

    it("warns for NTLM auth", () => {
      const result = mapPostmanAuth({ type: "ntlm" });
      expect(result.warnings).toHaveLength(1);
    });

    it("warns for unknown auth type", () => {
      const result = mapPostmanAuth({ type: "custom" });
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain("custom");
    });
  });
});

describe("mapInsomniaAuth", () => {
  it("returns empty result for no auth", () => {
    const result = mapInsomniaAuth(undefined);
    expect(result.securitySchemes).toEqual({});
  });

  it("returns empty result for none type", () => {
    const result = mapInsomniaAuth({ type: "none" });
    expect(result.securitySchemes).toEqual({});
  });

  describe("API Key auth", () => {
    it("maps API key auth", () => {
      const result = mapInsomniaAuth({
        type: "apikey",
        key: "X-API-Key",
        apiKey: "secret123",
        addTo: "header",
      });

      expect(result.securitySchemes.apiKey).toEqual({
        type: "apiKey",
        name: "X-API-Key",
        in: "header",
      });
      expect(result.authValues.apiKey).toEqual({ apiKey: "secret123" });
    });

    it("supports query location", () => {
      const result = mapInsomniaAuth({
        type: "apikey",
        key: "api_key",
        addTo: "query",
      });

      expect((result.securitySchemes.apiKey as OpenAPIV3.ApiKeySecurityScheme)?.in).toBe("query");
    });
  });

  describe("Bearer auth", () => {
    it("maps bearer token", () => {
      const result = mapInsomniaAuth({
        type: "bearer",
        token: "my-token",
      });

      expect(result.securitySchemes.bearerAuth).toEqual({
        type: "http",
        scheme: "bearer",
      });
      expect(result.authValues.bearerAuth).toEqual({ token: "my-token" });
    });
  });

  describe("Basic auth", () => {
    it("maps basic auth", () => {
      const result = mapInsomniaAuth({
        type: "basic",
        username: "user",
        password: "pass",
      });

      expect(result.securitySchemes.basicAuth).toEqual({
        type: "http",
        scheme: "basic",
      });
      expect(result.authValues.basicAuth).toEqual({
        username: "user",
        password: "pass",
      });
    });
  });

  it("warns for OAuth2", () => {
    const result = mapInsomniaAuth({ type: "oauth2" });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].type).toBe("oauth2_flow");
  });
});

describe("detectAuthFromHeaders", () => {
  it("detects Bearer token", () => {
    const result = detectAuthFromHeaders({
      Authorization: "Bearer my-jwt-token",
    });

    expect(result.securitySchemes.bearerAuth).toBeDefined();
    expect(result.authValues.bearerAuth).toEqual({ token: "my-jwt-token" });
  });

  it("detects Basic auth", () => {
    const result = detectAuthFromHeaders({
      Authorization: "Basic dXNlcjpwYXNz",
    });

    expect(result.securitySchemes.basicAuth).toBeDefined();
    expect(result.security).toEqual([{ basicAuth: [] }]);
  });

  it("detects API key headers", () => {
    const testHeaders = [
      "X-API-Key",
      "x-api-key",
      "X-Api-Key",
      "Api-Key",
      "api-key",
      "apikey",
    ];

    for (const headerName of testHeaders) {
      const result = detectAuthFromHeaders({ [headerName]: "secret" });
      expect(result.securitySchemes.apiKey).toBeDefined();
      expect(result.authValues.apiKey).toEqual({ apiKey: "secret" });
    }
  });

  it("handles lowercase authorization header", () => {
    const result = detectAuthFromHeaders({
      authorization: "Bearer token123",
    });

    expect(result.securitySchemes.bearerAuth).toBeDefined();
  });

  it("returns empty for no auth headers", () => {
    const result = detectAuthFromHeaders({
      "Content-Type": "application/json",
    });

    expect(result.securitySchemes).toEqual({});
    expect(result.security).toEqual([]);
  });
});

describe("mergeAuthResults", () => {
  it("merges multiple auth results", () => {
    const result = mergeAuthResults([
      mapPostmanAuth({
        type: "apikey",
        apikey: [{ key: "key", value: "X-API-Key" }],
      }),
      mapPostmanAuth({
        type: "bearer",
        bearer: [{ key: "token", value: "token123" }],
      }),
    ]);

    expect(result.securitySchemes).toHaveProperty("apiKey");
    expect(result.securitySchemes).toHaveProperty("bearerAuth");
    expect(result.security).toHaveLength(2);
  });

  it("deduplicates security schemes", () => {
    const result = mergeAuthResults([
      mapPostmanAuth({ type: "bearer", bearer: [] }),
      mapPostmanAuth({ type: "bearer", bearer: [] }),
    ]);

    expect(Object.keys(result.securitySchemes)).toHaveLength(1);
    expect(result.security).toHaveLength(1);
  });

  it("collects all warnings", () => {
    const result = mergeAuthResults([
      mapPostmanAuth({ type: "oauth2" }),
      mapPostmanAuth({ type: "awsv4" }),
    ]);

    expect(result.warnings).toHaveLength(2);
  });

  it("handles empty array", () => {
    const result = mergeAuthResults([]);
    expect(result.securitySchemes).toEqual({});
    expect(result.security).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});
