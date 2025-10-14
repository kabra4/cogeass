import type { AuthState, OperationRef } from "@/store/types";
import type { DerefSpec } from "./openapi";

// Type for the resolved auth credentials to be applied.
export type AppliedAuth = {
  headers: Record<string, string>;
  queryParams: Record<string, string>;
};

/**
 * Resolves the authentication credentials for a given operation based on the
 * spec's security requirements and the user's configured values.
 *
 * @param op - The operation object from the spec.
 * @param authState - The current authentication state from the store.
 * @returns An object containing headers and query parameters to be applied.
 */
export function resolveOperationAuth(
  op: OperationRef["op"] | undefined,
  authState: AuthState,
  spec: DerefSpec | null
): AppliedAuth {
  const result: AppliedAuth = { headers: {}, queryParams: {} };

  // An operation's security requirement overrides the global one.
  const securityRequirement = op?.security?.[0] ?? spec?.security?.[0];

  if (!securityRequirement) {
    return result;
  }

  const { schemes, values } = authState;

  for (const schemeName in securityRequirement) {
    const scheme = schemes[schemeName];
    const userValues = values[schemeName];

    if (!scheme || !userValues) continue;

    switch (scheme.type) {
      case "apiKey": {
        const apiKey = userValues.apiKey;
        if (apiKey) {
          if (scheme.in === "header") {
            result.headers[scheme.name] = apiKey;
          } else if (scheme.in === "query") {
            result.queryParams[scheme.name] = apiKey;
          }
        }
        break;
      }
      case "http": {
        if (scheme.scheme === "bearer" && userValues.token) {
          result.headers["Authorization"] = `Bearer ${userValues.token}`;
        } else if (
          scheme.scheme === "basic" &&
          userValues.username &&
          userValues.password
        ) {
          const credentials = btoa(
            `${userValues.username}:${userValues.password}`
          );
          result.headers["Authorization"] = `Basic ${credentials}`;
        }
        break;
      }
      // Note: oauth2 and openIdConnect are not handled in this simplified version.
    }
  }

  return result;
}
