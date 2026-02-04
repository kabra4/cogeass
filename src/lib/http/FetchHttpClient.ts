// src/lib/http/FetchHttpClient.ts
import type { HttpClient, HttpResponse, StreamEvent } from "./HttpClient";

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

function parseSseFrame(frame: string): { eventType: string; data: string } {
  let eventType = "message";
  const dataLines: string[] = [];

  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      const value = line.slice(5);
      dataLines.push(value.startsWith(" ") ? value.slice(1) : value);
    }
  }

  return { eventType, data: dataLines.join("\n") };
}

async function handleSseStream(
  res: Response,
  startTime: number,
  onStreamEvent?: (event: StreamEvent) => void
): Promise<HttpResponse> {
  const events: StreamEvent[] = [];
  let accumulatedBody = "";
  let eventId = 0;
  let wireSizeBytes = 0;

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      wireSizeBytes += value.byteLength;
      buffer += decoder.decode(value, { stream: true });

      let pos: number;
      while ((pos = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, pos);
        buffer = buffer.slice(pos + 2);

        if (!frame.trim()) continue;

        const { eventType, data } = parseSseFrame(frame);
        if (!data) continue;

        eventId++;
        const now = Date.now();
        const elapsedMs = now - startTime;

        const streamEvent: StreamEvent = {
          eventId,
          eventType,
          data,
          timestamp: now,
          elapsedMs,
        };

        events.push(streamEvent);
        onStreamEvent?.(streamEvent);
        accumulatedBody += data + "\n";
      }
    }
  }

  const endTime = performance.now();
  const responseTimeMs = Math.round(endTime - (startTime - performance.timeOrigin));

  return {
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers.entries()),
    bodyText: accumulatedBody,
    bodyJson: null,
    timings: {
      prepareMs: 0,
      dnsLookupMs: 0,
      tcpConnectMs: 0,
      tlsHandshakeMs: 0,
      ttfbMs: 0,
      downloadMs: 0,
      processMs: 0,
      totalMs: responseTimeMs,
    },
    wireSizeBytes,
    bodySizeBytes: accumulatedBody.length,
    streamEvents: events.length > 0 ? events : undefined,
  };
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

    // Check if this is an SSE stream
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (contentType.includes("text/event-stream")) {
      return handleSseStream(res, Date.now(), parts.onStreamEvent);
    }

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
      timings: {
        prepareMs: 0,
        dnsLookupMs: 0,
        tcpConnectMs: 0,
        tlsHandshakeMs: 0,
        ttfbMs: 0,
        downloadMs: 0,
        processMs: 0,
        totalMs: responseTimeMs,
      },
      wireSizeBytes: responseSizeBytes,
      bodySizeBytes: responseSizeBytes,
    };
  }
}

export const fetchHttpClient = new FetchHttpClient();
