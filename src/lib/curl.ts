import { CurlGenerator } from "curl-generator";
import type { CurlBody } from "curl-generator/dist/bodies/body";

export type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type CurlParts = {
  url: string;
  method: Method;
  headers?: Record<string, string>;
  body?: unknown;
  mediaType?: string | null; // e.g., application/json
  authHeader?: string | null; // optional Authorization header value
};

export function toCurl({
  url,
  method,
  headers = {},
  body,
  mediaType,
  authHeader,
}: CurlParts) {
  const allHeaders: Record<string, string> = { ...headers };
  if (authHeader && !allHeaders["Authorization"]) {
    allHeaders["Authorization"] = authHeader;
  }
  if (mediaType && !allHeaders["Content-Type"]) {
    allHeaders["Content-Type"] = mediaType;
  }

  return CurlGenerator({
    url: url,
    method: method,
    headers: allHeaders,
    body: body as CurlBody,
  });
}
