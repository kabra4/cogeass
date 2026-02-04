// src/lib/http/TauriHttpClient.ts
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { HttpClient, HttpResponse, StreamEvent } from "./HttpClient";

type TauriTimings = {
  prepare_ms: number;
  dns_lookup_ms: number;
  tcp_connect_ms: number;
  tls_handshake_ms: number;
  ttfb_ms: number;
  download_ms: number;
  process_ms: number;
  total_ms: number;
};

type TauriSseEvent = {
  session_id: string;
  event_id: number;
  event_type: string;
  data: string;
  timestamp: number;
  elapsed_ms: number;
};

type TauriResponse = {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body_text: string;
  timings: TauriTimings;
  wire_size_bytes: number;
  body_size_bytes: number;
  session_id: string | null;
};

class TauriHttpClient implements HttpClient {
  async send(parts: Parameters<HttpClient["send"]>[0]): Promise<HttpResponse> {
    const sessionId = parts.sessionId ?? crypto.randomUUID();
    const events: StreamEvent[] = [];

    // Set up SSE event listener before invoking the command
    const unlisten = await listen<TauriSseEvent>("sse_event", (event) => {
      if (event.payload.session_id === sessionId) {
        const streamEvent: StreamEvent = {
          eventId: event.payload.event_id,
          eventType: event.payload.event_type,
          data: event.payload.data,
          timestamp: event.payload.timestamp,
          elapsedMs: event.payload.elapsed_ms,
        };
        events.push(streamEvent);
        parts.onStreamEvent?.(streamEvent);
      }
    });

    try {
      const tauriResponse = await invoke<TauriResponse>("make_request", {
        method: parts.method,
        url: parts.url,
        headers: parts.headers,
        body: parts.body,
        sessionId,
      });

      let json: unknown = null;
      try {
        json = JSON.parse(tauriResponse.body_text);
      } catch {
        // Ignore JSON parse errors - json will remain null
      }

      return {
        status: tauriResponse.status,
        statusText: tauriResponse.status_text,
        headers: tauriResponse.headers,
        bodyText: tauriResponse.body_text,
        bodyJson: json,
        timings: {
          prepareMs: tauriResponse.timings.prepare_ms,
          dnsLookupMs: tauriResponse.timings.dns_lookup_ms,
          tcpConnectMs: tauriResponse.timings.tcp_connect_ms,
          tlsHandshakeMs: tauriResponse.timings.tls_handshake_ms,
          ttfbMs: tauriResponse.timings.ttfb_ms,
          downloadMs: tauriResponse.timings.download_ms,
          processMs: tauriResponse.timings.process_ms,
          totalMs: tauriResponse.timings.total_ms,
        },
        wireSizeBytes: tauriResponse.wire_size_bytes,
        bodySizeBytes: tauriResponse.body_size_bytes,
        streamEvents: events.length > 0 ? events : undefined,
        sessionId: tauriResponse.session_id ?? undefined,
      };
    } catch (error) {
      const errorMsg =
        typeof error === "string" ? error : "An unknown error occurred";
      return {
        status: 500,
        statusText: "Tauri Command Error",
        headers: {},
        bodyText: errorMsg,
        bodyJson: { error: errorMsg },
      };
    } finally {
      unlisten();
    }
  }
}

export const tauriHttpClient = new TauriHttpClient();
