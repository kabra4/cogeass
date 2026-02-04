// src/lib/http/TauriHttpClient.ts
import { invoke } from "@tauri-apps/api/core";
import type { HttpClient, HttpResponse } from "./HttpClient";

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

type TauriResponse = {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body_text: string;
  timings: TauriTimings;
  wire_size_bytes: number;
  body_size_bytes: number;
};

class TauriHttpClient implements HttpClient {
  async send(parts: Parameters<HttpClient["send"]>[0]): Promise<HttpResponse> {
    try {
      const tauriResponse = await invoke<TauriResponse>("make_request", {
        method: parts.method,
        url: parts.url,
        headers: parts.headers,
        body: parts.body,
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
    }
  }
}

export const tauriHttpClient = new TauriHttpClient();
