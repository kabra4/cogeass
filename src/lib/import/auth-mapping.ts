import type { OpenAPIV3 } from "openapi-types";
import type { ImportWarning } from "./types";

/**
 * Auth configuration from Postman/Insomnia.
 */
export interface SourceAuthConfig {
  type: string;
  apikey?: Array<{ key: string; value: string }>;
  bearer?: Array<{ key: string; value: string }>;
  basic?: Array<{ key: string; value: string }>;
  oauth2?: unknown;
  awsv4?: unknown;
  hawk?: unknown;
  digest?: unknown;
  ntlm?: unknown;
}

/**
 * Result of mapping auth to OpenAPI security schemes.
 */
export interface AuthMappingResult {
  /** OpenAPI security schemes */
  securitySchemes: Record<string, OpenAPIV3.SecuritySchemeObject>;
  /** Security requirement for the spec */
  security: OpenAPIV3.SecurityRequirementObject[];
  /** Initial auth values to populate */
  authValues: Record<string, Record<string, string>>;
  /** Warnings for unsupported auth types */
  warnings: ImportWarning[];
}

/**
 * Map Postman auth configuration to OpenAPI security schemes.
 */
export function mapPostmanAuth(auth: SourceAuthConfig | undefined): AuthMappingResult {
  const result: AuthMappingResult = {
    securitySchemes: {},
    security: [],
    authValues: {},
    warnings: [],
  };

  if (!auth || auth.type === "noauth") {
    return result;
  }

  switch (auth.type) {
    case "apikey": {
      const keyConfig = auth.apikey || [];
      const keyValue = keyConfig.find((k) => k.key === "key")?.value || "X-API-Key";
      const valueValue = keyConfig.find((k) => k.key === "value")?.value || "";
      const inValue = keyConfig.find((k) => k.key === "in")?.value || "header";

      result.securitySchemes["apiKey"] = {
        type: "apiKey",
        name: keyValue,
        in: inValue === "query" ? "query" : "header",
      };
      result.security.push({ apiKey: [] });
      if (valueValue) {
        result.authValues["apiKey"] = { apiKey: valueValue };
      }
      break;
    }

    case "bearer": {
      const tokenValue = auth.bearer?.find((k) => k.key === "token")?.value || "";

      result.securitySchemes["bearerAuth"] = {
        type: "http",
        scheme: "bearer",
      };
      result.security.push({ bearerAuth: [] });
      if (tokenValue) {
        result.authValues["bearerAuth"] = { token: tokenValue };
      }
      break;
    }

    case "basic": {
      const username = auth.basic?.find((k) => k.key === "username")?.value || "";
      const password = auth.basic?.find((k) => k.key === "password")?.value || "";

      result.securitySchemes["basicAuth"] = {
        type: "http",
        scheme: "basic",
      };
      result.security.push({ basicAuth: [] });
      if (username || password) {
        result.authValues["basicAuth"] = { username, password };
      }
      break;
    }

    case "oauth2": {
      result.warnings.push({
        type: "oauth2_flow",
        message:
          "OAuth2 authentication detected but cannot be fully converted. Manual configuration required.",
      });
      break;
    }

    case "awsv4":
    case "hawk":
    case "digest":
    case "ntlm":
      result.warnings.push({
        type: "unsupported_auth",
        message: `${auth.type} authentication is not supported in OpenAPI. Skipped.`,
      });
      break;

    default:
      result.warnings.push({
        type: "unsupported_auth",
        message: `Unknown auth type "${auth.type}". Skipped.`,
      });
  }

  return result;
}

/**
 * Insomnia auth configuration.
 */
export interface InsomniaAuthConfig {
  type: string;
  token?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  addTo?: string;
  key?: string;
}

/**
 * Map Insomnia auth configuration to OpenAPI security schemes.
 */
export function mapInsomniaAuth(auth: InsomniaAuthConfig | undefined): AuthMappingResult {
  const result: AuthMappingResult = {
    securitySchemes: {},
    security: [],
    authValues: {},
    warnings: [],
  };

  if (!auth || auth.type === "none") {
    return result;
  }

  switch (auth.type) {
    case "apikey": {
      const headerName = auth.key || "X-API-Key";
      const inLocation = auth.addTo === "query" ? "query" : "header";

      result.securitySchemes["apiKey"] = {
        type: "apiKey",
        name: headerName,
        in: inLocation,
      };
      result.security.push({ apiKey: [] });
      if (auth.apiKey) {
        result.authValues["apiKey"] = { apiKey: auth.apiKey };
      }
      break;
    }

    case "bearer": {
      result.securitySchemes["bearerAuth"] = {
        type: "http",
        scheme: "bearer",
      };
      result.security.push({ bearerAuth: [] });
      if (auth.token) {
        result.authValues["bearerAuth"] = { token: auth.token };
      }
      break;
    }

    case "basic": {
      result.securitySchemes["basicAuth"] = {
        type: "http",
        scheme: "basic",
      };
      result.security.push({ basicAuth: [] });
      if (auth.username || auth.password) {
        result.authValues["basicAuth"] = {
          username: auth.username || "",
          password: auth.password || "",
        };
      }
      break;
    }

    case "oauth2":
      result.warnings.push({
        type: "oauth2_flow",
        message:
          "OAuth2 authentication detected but cannot be fully converted. Manual configuration required.",
      });
      break;

    default:
      result.warnings.push({
        type: "unsupported_auth",
        message: `Unknown auth type "${auth.type}". Skipped.`,
      });
  }

  return result;
}

/**
 * Detect auth from HTTP headers.
 * Used for HAR imports where auth is in the request headers.
 */
export function detectAuthFromHeaders(
  headers: Record<string, string>
): AuthMappingResult {
  const result: AuthMappingResult = {
    securitySchemes: {},
    security: [],
    authValues: {},
    warnings: [],
  };

  const authHeader = headers["Authorization"] || headers["authorization"];

  if (authHeader) {
    if (authHeader.startsWith("Bearer ")) {
      result.securitySchemes["bearerAuth"] = {
        type: "http",
        scheme: "bearer",
      };
      result.security.push({ bearerAuth: [] });
      result.authValues["bearerAuth"] = {
        token: authHeader.slice(7),
      };
    } else if (authHeader.startsWith("Basic ")) {
      result.securitySchemes["basicAuth"] = {
        type: "http",
        scheme: "basic",
      };
      result.security.push({ basicAuth: [] });
      // Note: We don't decode basic auth for security reasons
    }
  }

  // Check for common API key headers
  const apiKeyHeaders = [
    "X-API-Key",
    "x-api-key",
    "X-Api-Key",
    "Api-Key",
    "api-key",
    "apikey",
  ];

  for (const headerName of apiKeyHeaders) {
    if (headers[headerName]) {
      result.securitySchemes["apiKey"] = {
        type: "apiKey",
        name: headerName,
        in: "header",
      };
      result.security.push({ apiKey: [] });
      result.authValues["apiKey"] = {
        apiKey: headers[headerName],
      };
      break;
    }
  }

  return result;
}

/**
 * Merge multiple auth mapping results into one.
 */
export function mergeAuthResults(results: AuthMappingResult[]): AuthMappingResult {
  const merged: AuthMappingResult = {
    securitySchemes: {},
    security: [],
    authValues: {},
    warnings: [],
  };

  const seenSchemes = new Set<string>();

  for (const result of results) {
    // Merge security schemes
    for (const [name, scheme] of Object.entries(result.securitySchemes)) {
      if (!seenSchemes.has(name)) {
        merged.securitySchemes[name] = scheme;
        seenSchemes.add(name);
      }
    }

    // Merge security requirements (deduplicate)
    for (const req of result.security) {
      const key = Object.keys(req)[0];
      if (!merged.security.some((r) => Object.keys(r)[0] === key)) {
        merged.security.push(req);
      }
    }

    // Merge auth values
    Object.assign(merged.authValues, result.authValues);

    // Collect all warnings
    merged.warnings.push(...result.warnings);
  }

  return merged;
}
