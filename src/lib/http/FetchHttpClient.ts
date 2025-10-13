// src/lib/http/FetchHttpClient.ts
import type { HttpClient, HttpResponse } from "./HttpClient";

async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 15000, signal } = init;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, {
      ...init,
      signal: signal ?? controller.signal,
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

class FetchHttpClient implements HttpClient {
  async send(parts: Parameters<HttpClient['send']>[0]): Promise<HttpResponse> {
    const res = await fetchWithTimeout(parts.url, {
      method: parts.method,
      headers: parts.headers,
      body: parts.body,
      signal: parts.signal,
      timeoutMs: parts.timeoutMs,
    });

    const text = await res.text();
    let json: unknown = null;
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
}

export const fetchHttpClient = new FetchHttpClient();
