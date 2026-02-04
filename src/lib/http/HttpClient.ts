// src/lib/http/HttpClient.ts
export type ResponseTimings = {
  prepareMs: number;
  dnsLookupMs: number;
  tcpConnectMs: number;
  tlsHandshakeMs: number;
  ttfbMs: number;
  downloadMs: number;
  processMs: number;
  totalMs: number;
};

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  bodyText: string;
  bodyJson: unknown;
  timings?: ResponseTimings;
  wireSizeBytes?: number;
  bodySizeBytes?: number;
}

export interface HttpClient {
  send(parts: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
  }): Promise<HttpResponse>;
}
