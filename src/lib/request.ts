import { toCurl, type Method } from "./curl";
import { httpClient } from "@/lib/http";

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
  const url = buildUrl(parts);
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
  baseUrl: string;
  path: string;
  pathParams?: Record<string, string | number>;
  queryParams?: Record<string, unknown>;
};

export function buildUrl({
  baseUrl,
  path,
  pathParams = {},
  queryParams = {},
}: RequestParts): string {
  const urlPath = path.replace(/{([^}]+)}/g, (_, key) => {
    const v = pathParams[key];
    return encodeURIComponent(v == null ? "" : String(v));
  });

  const base = baseUrl.replace(/\/+$/, "");
  let url = `${base}${urlPath.startsWith("/") ? "" : "/"}${urlPath}`;

  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(queryParams)) {
    if (v == null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item == null) continue;
        usp.append(k, String(item));
      }
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
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
  timeoutMs?: number;
  signal?: AbortSignal;
};

export async function send(parts: SendParts) {
  const url = buildUrl({
    baseUrl: parts.baseUrl,
    path: parts.path,
    pathParams: parts.pathParams,
    queryParams: parts.queryParams,
  });

  const headers: Record<string, string> = { ...(parts.headers || {}) };
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

  return httpClient.send({
    url,
    method,
    headers,
    body,
    timeoutMs: parts.timeoutMs,
    signal: parts.signal,
  });
}