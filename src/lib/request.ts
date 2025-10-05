// src/lib/request.ts (excerpt)
import { toCurl, type Method } from "./curl";

export function buildCurlFromParts(parts: {
  baseUrl: string;
  path: string;
  method: Method;
  pathParams: Record<string, string | number>;
  queryParams: Record<string, unknown>;
  headerParams: Record<string, string>;
  body?: unknown;
  mediaType?: string | null;
  authHeader?: string | null;
}) {
  const url = buildUrl(parts); // your existing buildUrl
  return toCurl({
    url,
    method: parts.method,
    headers: parts.headerParams,
    body: parts.body,
    mediaType: parts.mediaType,
    authHeader: parts.authHeader,
  });
}

export type RequestParts = {
  baseUrl: string; // e.g. https://api.example.com
  path: string; // e.g. /pets/{petId}
  pathParams?: Record<string, string | number>;
  queryParams?: Record<string, unknown>;
};

// Builds a fully qualified URL by interpolating {path} params and appending query
export function buildUrl({
  baseUrl,
  path,
  pathParams = {},
  queryParams = {},
}: RequestParts): string {
  // Interpolate path params like /pets/{petId}
  const urlPath = path.replace(/{([^}]+)}/g, (_, key) => {
    const v = pathParams[key];
    return encodeURIComponent(v == null ? "" : String(v));
  });

  // Normalize baseUrl and join
  const base = baseUrl.replace(/\/+$/, "");
  let url = `${base}${urlPath.startsWith("/") ? "" : "/"}${urlPath}`;

  // Build query string
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(queryParams)) {
    if (v == null || v === "") continue;

    if (Array.isArray(v)) {
      for (const item of v) {
        if (item == null) continue;
        usp.append(k, String(item));
      }
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      // For objects, use JSON string by default (customize if your API expects another style)
      usp.append(k, JSON.stringify(v));
    } else {
      usp.append(k, String(v));
    }
  }
  const qs = usp.toString();
  if (qs) url += `?${qs}`;

  return url;
}
export type SendParts = {
  baseUrl: string;
  path: string;
  method: string;
  pathParams?: Record<string, string | number>;
  queryParams?: Record<string, unknown>;
  headers?: Record<string, string>;
  body?: unknown;
  mediaType?: string | null;
};

export async function send(parts: SendParts) {
  const url = buildUrl({
    baseUrl: parts.baseUrl,
    path: parts.path,
    pathParams: parts.pathParams,
    queryParams: parts.queryParams,
  });

  let headers: Record<string, string> = { ...(parts.headers || {}) };
  if (parts.mediaType && !headers["Content-Type"]) {
    headers["Content-Type"] = parts.mediaType;
  }

  const method = parts.method.toUpperCase();
  const body =
    parts.body !== undefined && method !== "GET" && method !== "HEAD"
      ? typeof parts.body === "string"
        ? parts.body
        : JSON.stringify(parts.body)
      : undefined;

  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return {
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers.entries()),
    bodyText: text,
    bodyJson: json,
  };
}
