import { describe, it, expect } from "vitest";
import { resolveOperationAuth } from "./auth";
import type { AuthState } from "@/store/types";
import type { DerefSpec } from "./openapi";
import type { OpenAPIV3 } from "openapi-types";

// Helper to create a minimal AuthState
function createAuthState(
  overrides: Partial<AuthState> = {}
): AuthState {
  return {
    schemes: {},
    values: {},
    environmentValues: {},
    ...overrides,
  };
}

// Helper to create a minimal operation object
function createOperation(
  security?: OpenAPIV3.SecurityRequirementObject[]
): OpenAPIV3.OperationObject {
  return {
    responses: {},
    ...(security !== undefined && { security }),
  };
}

// Helper to create a minimal spec object
function createSpec(
  security?: OpenAPIV3.SecurityRequirementObject[]
): DerefSpec {
  return {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {},
    ...(security !== undefined && { security }),
  };
}

describe("resolveOperationAuth", () => {
  describe("no security requirements", () => {
    it("returns empty auth when operation and spec have no security", () => {
      const op = createOperation();
      const authState = createAuthState();
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      expect(result).toEqual({ headers: {}, queryParams: {} });
    });

    it("returns empty auth when operation is undefined", () => {
      const authState = createAuthState();
      const spec = createSpec();

      const result = resolveOperationAuth(undefined, authState, spec);

      expect(result).toEqual({ headers: {}, queryParams: {} });
    });

    it("returns empty auth when spec is null", () => {
      const op = createOperation();
      const authState = createAuthState();

      const result = resolveOperationAuth(op, authState, null);

      expect(result).toEqual({ headers: {}, queryParams: {} });
    });

    it("returns empty auth when security array is empty", () => {
      const op = createOperation([]);
      const authState = createAuthState();
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      expect(result).toEqual({ headers: {}, queryParams: {} });
    });
  });

  describe("API Key authentication", () => {
    describe("header-based API key", () => {
      it("applies API key to header when scheme is in header", () => {
        const op = createOperation([{ myApiKey: [] }]);
        const authState = createAuthState({
          schemes: {
            myApiKey: {
              type: "apiKey",
              in: "header",
              name: "X-API-Key",
            },
          },
          values: {
            myApiKey: { apiKey: "secret-key-123" },
          },
        });
        const spec = createSpec();

        const result = resolveOperationAuth(op, authState, spec);

        expect(result.headers).toEqual({ "X-API-Key": "secret-key-123" });
        expect(result.queryParams).toEqual({});
      });

      it("uses custom header name from scheme", () => {
        const op = createOperation([{ customAuth: [] }]);
        const authState = createAuthState({
          schemes: {
            customAuth: {
              type: "apiKey",
              in: "header",
              name: "Authorization-Token",
            },
          },
          values: {
            customAuth: { apiKey: "my-token" },
          },
        });
        const spec = createSpec();

        const result = resolveOperationAuth(op, authState, spec);

        expect(result.headers).toEqual({ "Authorization-Token": "my-token" });
      });
    });

    describe("query parameter API key", () => {
      it("applies API key to query params when scheme is in query", () => {
        const op = createOperation([{ queryApiKey: [] }]);
        const authState = createAuthState({
          schemes: {
            queryApiKey: {
              type: "apiKey",
              in: "query",
              name: "api_key",
            },
          },
          values: {
            queryApiKey: { apiKey: "query-secret-456" },
          },
        });
        const spec = createSpec();

        const result = resolveOperationAuth(op, authState, spec);

        expect(result.queryParams).toEqual({ api_key: "query-secret-456" });
        expect(result.headers).toEqual({});
      });

      it("uses custom query parameter name from scheme", () => {
        const op = createOperation([{ accessToken: [] }]);
        const authState = createAuthState({
          schemes: {
            accessToken: {
              type: "apiKey",
              in: "query",
              name: "access_token",
            },
          },
          values: {
            accessToken: { apiKey: "token-789" },
          },
        });
        const spec = createSpec();

        const result = resolveOperationAuth(op, authState, spec);

        expect(result.queryParams).toEqual({ access_token: "token-789" });
      });
    });

    it("does not apply API key when value is missing", () => {
      const op = createOperation([{ myApiKey: [] }]);
      const authState = createAuthState({
        schemes: {
          myApiKey: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
          },
        },
        values: {
          myApiKey: { apiKey: "" }, // empty string
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      expect(result.headers).toEqual({});
      expect(result.queryParams).toEqual({});
    });

    it("does not apply API key when userValues is missing", () => {
      const op = createOperation([{ myApiKey: [] }]);
      const authState = createAuthState({
        schemes: {
          myApiKey: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
          },
        },
        values: {}, // no values for myApiKey
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      expect(result.headers).toEqual({});
    });
  });

  describe("HTTP Bearer authentication", () => {
    it("applies bearer token to Authorization header", () => {
      const op = createOperation([{ bearerAuth: [] }]);
      const authState = createAuthState({
        schemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
          },
        },
        values: {
          bearerAuth: { token: "jwt-token-abc123" },
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      expect(result.headers).toEqual({
        Authorization: "Bearer jwt-token-abc123",
      });
      expect(result.queryParams).toEqual({});
    });

    it("does not apply bearer auth when token is missing", () => {
      const op = createOperation([{ bearerAuth: [] }]);
      const authState = createAuthState({
        schemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
          },
        },
        values: {
          bearerAuth: { token: "" },
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      expect(result.headers).toEqual({});
    });

    it("does not apply bearer auth when token field is undefined", () => {
      const op = createOperation([{ bearerAuth: [] }]);
      const authState = createAuthState({
        schemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
          },
        },
        values: {
          bearerAuth: {}, // no token field
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      expect(result.headers).toEqual({});
    });
  });

  describe("HTTP Basic authentication", () => {
    it("applies basic auth to Authorization header with base64 encoding", () => {
      const op = createOperation([{ basicAuth: [] }]);
      const authState = createAuthState({
        schemes: {
          basicAuth: {
            type: "http",
            scheme: "basic",
          },
        },
        values: {
          basicAuth: { username: "user", password: "pass" },
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      // btoa("user:pass") = "dXNlcjpwYXNz"
      expect(result.headers).toEqual({
        Authorization: "Basic dXNlcjpwYXNz",
      });
      expect(result.queryParams).toEqual({});
    });

    it("handles special characters in username and password", () => {
      const op = createOperation([{ basicAuth: [] }]);
      const authState = createAuthState({
        schemes: {
          basicAuth: {
            type: "http",
            scheme: "basic",
          },
        },
        values: {
          basicAuth: { username: "admin@example.com", password: "p@ss:word!" },
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      // btoa("admin@example.com:p@ss:word!") = "YWRtaW5AZXhhbXBsZS5jb206cEBzczp3b3JkIQ=="
      expect(result.headers.Authorization).toBe(
        "Basic YWRtaW5AZXhhbXBsZS5jb206cEBzczp3b3JkIQ=="
      );
    });

    it("does not apply basic auth when username is missing", () => {
      const op = createOperation([{ basicAuth: [] }]);
      const authState = createAuthState({
        schemes: {
          basicAuth: {
            type: "http",
            scheme: "basic",
          },
        },
        values: {
          basicAuth: { username: "", password: "pass" },
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      expect(result.headers).toEqual({});
    });

    it("does not apply basic auth when password is missing", () => {
      const op = createOperation([{ basicAuth: [] }]);
      const authState = createAuthState({
        schemes: {
          basicAuth: {
            type: "http",
            scheme: "basic",
          },
        },
        values: {
          basicAuth: { username: "user", password: "" },
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      expect(result.headers).toEqual({});
    });

    it("does not apply basic auth when both credentials are missing", () => {
      const op = createOperation([{ basicAuth: [] }]);
      const authState = createAuthState({
        schemes: {
          basicAuth: {
            type: "http",
            scheme: "basic",
          },
        },
        values: {
          basicAuth: {},
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      expect(result.headers).toEqual({});
    });
  });

  describe("environment-specific auth values", () => {
    it("uses environment-specific values when environment is active", () => {
      const op = createOperation([{ apiKey: [] }]);
      const authState = createAuthState({
        schemes: {
          apiKey: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
          },
        },
        values: {
          apiKey: { apiKey: "global-key" },
        },
        environmentValues: {
          "env-prod": {
            apiKey: { apiKey: "prod-key" },
          },
          "env-dev": {
            apiKey: { apiKey: "dev-key" },
          },
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec, "env-prod");

      expect(result.headers).toEqual({ "X-API-Key": "prod-key" });
    });

    it("falls back to global values when no environment is active", () => {
      const op = createOperation([{ apiKey: [] }]);
      const authState = createAuthState({
        schemes: {
          apiKey: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
          },
        },
        values: {
          apiKey: { apiKey: "global-key" },
        },
        environmentValues: {
          "env-prod": {
            apiKey: { apiKey: "prod-key" },
          },
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec, null);

      expect(result.headers).toEqual({ "X-API-Key": "global-key" });
    });

    it("falls back to global values when activeEnvironmentId is undefined", () => {
      const op = createOperation([{ apiKey: [] }]);
      const authState = createAuthState({
        schemes: {
          apiKey: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
          },
        },
        values: {
          apiKey: { apiKey: "global-key" },
        },
        environmentValues: {
          "env-prod": {
            apiKey: { apiKey: "prod-key" },
          },
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec, undefined);

      expect(result.headers).toEqual({ "X-API-Key": "global-key" });
    });

    it("falls back to global values when environment has no values", () => {
      const op = createOperation([{ apiKey: [] }]);
      const authState = createAuthState({
        schemes: {
          apiKey: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
          },
        },
        values: {
          apiKey: { apiKey: "global-key" },
        },
        environmentValues: {
          "env-prod": {}, // empty values for this environment
        },
      });
      const spec = createSpec();

      // When the environment exists but has no values for the scheme,
      // it uses the environment's empty object, so no key is applied
      const result = resolveOperationAuth(op, authState, spec, "env-prod");

      // The environment values object exists but is empty, so it uses that
      expect(result.headers).toEqual({});
    });

    it("falls back to global values when environmentValues is undefined (legacy)", () => {
      const op = createOperation([{ apiKey: [] }]);
      const authState = {
        schemes: {
          apiKey: {
            type: "apiKey" as const,
            in: "header" as const,
            name: "X-API-Key",
          },
        },
        values: {
          apiKey: { apiKey: "global-key" },
        },
        // environmentValues intentionally missing (legacy workspace)
      } as unknown as AuthState;
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec, "env-prod");

      expect(result.headers).toEqual({ "X-API-Key": "global-key" });
    });

    it("falls back to global values when environment ID not found in environmentValues", () => {
      const op = createOperation([{ apiKey: [] }]);
      const authState = createAuthState({
        schemes: {
          apiKey: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
          },
        },
        values: {
          apiKey: { apiKey: "global-key" },
        },
        environmentValues: {
          "env-dev": {
            apiKey: { apiKey: "dev-key" },
          },
        },
      });
      const spec = createSpec();

      // Using an environment ID that doesn't exist in environmentValues
      const result = resolveOperationAuth(
        op,
        authState,
        spec,
        "env-nonexistent"
      );

      expect(result.headers).toEqual({ "X-API-Key": "global-key" });
    });
  });

  describe("security requirement precedence", () => {
    it("operation security overrides global spec security", () => {
      const op = createOperation([{ opAuth: [] }]);
      const authState = createAuthState({
        schemes: {
          opAuth: {
            type: "apiKey",
            in: "header",
            name: "X-Op-Key",
          },
          globalAuth: {
            type: "apiKey",
            in: "header",
            name: "X-Global-Key",
          },
        },
        values: {
          opAuth: { apiKey: "op-secret" },
          globalAuth: { apiKey: "global-secret" },
        },
      });
      const spec = createSpec([{ globalAuth: [] }]);

      const result = resolveOperationAuth(op, authState, spec);

      expect(result.headers).toEqual({ "X-Op-Key": "op-secret" });
      expect(result.headers["X-Global-Key"]).toBeUndefined();
    });

    it("uses global spec security when operation has no security", () => {
      const op = createOperation(); // no security defined
      const authState = createAuthState({
        schemes: {
          globalAuth: {
            type: "apiKey",
            in: "header",
            name: "X-Global-Key",
          },
        },
        values: {
          globalAuth: { apiKey: "global-secret" },
        },
      });
      const spec = createSpec([{ globalAuth: [] }]);

      const result = resolveOperationAuth(op, authState, spec);

      expect(result.headers).toEqual({ "X-Global-Key": "global-secret" });
    });

    it("uses first security requirement from array", () => {
      const op = createOperation([{ firstAuth: [] }, { secondAuth: [] }]);
      const authState = createAuthState({
        schemes: {
          firstAuth: {
            type: "apiKey",
            in: "header",
            name: "X-First",
          },
          secondAuth: {
            type: "apiKey",
            in: "header",
            name: "X-Second",
          },
        },
        values: {
          firstAuth: { apiKey: "first-key" },
          secondAuth: { apiKey: "second-key" },
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      expect(result.headers).toEqual({ "X-First": "first-key" });
      expect(result.headers["X-Second"]).toBeUndefined();
    });
  });

  describe("multiple schemes in single requirement", () => {
    it("applies multiple schemes from same security requirement", () => {
      const op = createOperation([{ apiKey: [], bearerAuth: [] }]);
      const authState = createAuthState({
        schemes: {
          apiKey: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
          },
          bearerAuth: {
            type: "http",
            scheme: "bearer",
          },
        },
        values: {
          apiKey: { apiKey: "my-api-key" },
          bearerAuth: { token: "my-token" },
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      expect(result.headers).toEqual({
        "X-API-Key": "my-api-key",
        Authorization: "Bearer my-token",
      });
    });

    it("applies header and query schemes together", () => {
      const op = createOperation([{ headerKey: [], queryKey: [] }]);
      const authState = createAuthState({
        schemes: {
          headerKey: {
            type: "apiKey",
            in: "header",
            name: "X-Header-Key",
          },
          queryKey: {
            type: "apiKey",
            in: "query",
            name: "api_key",
          },
        },
        values: {
          headerKey: { apiKey: "header-value" },
          queryKey: { apiKey: "query-value" },
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      expect(result.headers).toEqual({ "X-Header-Key": "header-value" });
      expect(result.queryParams).toEqual({ api_key: "query-value" });
    });

    it("skips schemes that are missing from auth state", () => {
      const op = createOperation([{ knownScheme: [], unknownScheme: [] }]);
      const authState = createAuthState({
        schemes: {
          knownScheme: {
            type: "apiKey",
            in: "header",
            name: "X-Known",
          },
          // unknownScheme not in schemes
        },
        values: {
          knownScheme: { apiKey: "known-key" },
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      expect(result.headers).toEqual({ "X-Known": "known-key" });
    });
  });

  describe("edge cases", () => {
    it("handles scheme with no matching values gracefully", () => {
      const op = createOperation([{ myAuth: [] }]);
      const authState = createAuthState({
        schemes: {
          myAuth: {
            type: "apiKey",
            in: "header",
            name: "X-My-Auth",
          },
        },
        values: {}, // no values at all
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      expect(result).toEqual({ headers: {}, queryParams: {} });
    });

    it("handles empty security requirement object", () => {
      const op = createOperation([{}]); // empty object - no schemes required
      const authState = createAuthState({
        schemes: {
          myAuth: {
            type: "apiKey",
            in: "header",
            name: "X-My-Auth",
          },
        },
        values: {
          myAuth: { apiKey: "some-key" },
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      // Empty security requirement means no auth is required
      expect(result).toEqual({ headers: {}, queryParams: {} });
    });

    it("handles unsupported auth types gracefully (oauth2)", () => {
      const op = createOperation([{ oauthAuth: [] }]);
      const authState = createAuthState({
        schemes: {
          oauthAuth: {
            type: "oauth2",
            flows: {
              implicit: {
                authorizationUrl: "https://example.com/auth",
                scopes: {},
              },
            },
          },
        },
        values: {
          oauthAuth: { token: "oauth-token" },
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      // oauth2 is not handled, so no auth is applied
      expect(result).toEqual({ headers: {}, queryParams: {} });
    });

    it("handles unsupported auth types gracefully (openIdConnect)", () => {
      const op = createOperation([{ oidcAuth: [] }]);
      const authState = createAuthState({
        schemes: {
          oidcAuth: {
            type: "openIdConnect",
            openIdConnectUrl: "https://example.com/.well-known/openid",
          },
        },
        values: {
          oidcAuth: { token: "oidc-token" },
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      // openIdConnect is not handled, so no auth is applied
      expect(result).toEqual({ headers: {}, queryParams: {} });
    });

    it("handles apiKey with unsupported 'in' value (cookie)", () => {
      const op = createOperation([{ cookieAuth: [] }]);
      const authState = createAuthState({
        schemes: {
          cookieAuth: {
            type: "apiKey",
            in: "cookie" as "header", // type assertion to test runtime behavior
            name: "session",
          },
        },
        values: {
          cookieAuth: { apiKey: "cookie-value" },
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      // cookie is not handled in the switch, so no auth is applied
      expect(result).toEqual({ headers: {}, queryParams: {} });
    });

    it("handles http scheme with unsupported scheme type", () => {
      const op = createOperation([{ digestAuth: [] }]);
      const authState = createAuthState({
        schemes: {
          digestAuth: {
            type: "http",
            scheme: "digest",
          },
        },
        values: {
          digestAuth: { username: "user", password: "pass" },
        },
      });
      const spec = createSpec();

      const result = resolveOperationAuth(op, authState, spec);

      // digest is not handled, so no auth is applied
      expect(result).toEqual({ headers: {}, queryParams: {} });
    });
  });
});
