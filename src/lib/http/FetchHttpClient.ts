// src/lib/http/FetchHttpClient.ts
import type { HttpClient, HttpResponse } from "./HttpClient";

async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 600000, signal } = init;
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
  async send(parts: Parameters<HttpClient["send"]>[0]): Promise<HttpResponse> {
    // Start timing the request
    const startTime = performance.now();

    const res = await fetchWithTimeout(parts.url, {
      method: parts.method,
      headers: parts.headers,
      body: parts.body,
      signal: parts.signal,
      timeoutMs: parts.timeoutMs,
    });

    // Get raw bytes first to calculate accurate size
    const arrayBuffer = await res.arrayBuffer();

    // Calculate response time in milliseconds
    const endTime = performance.now();
    const responseTimeMs = Math.round(endTime - startTime);

    // Calculate response size in bytes (raw payload size)
    const responseSizeBytes = arrayBuffer.byteLength;

    // Decode bytes to text
    const text = new TextDecoder().decode(arrayBuffer);

    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Ignore JSON parse errors - json will remain null
    }

    return {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      bodyText: text,
      bodyJson: json,
      responseTimeMs,
      responseSizeBytes,
    };
  }
}

export const fetchHttpClient = new FetchHttpClient();
