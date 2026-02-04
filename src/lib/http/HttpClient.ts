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

export type StreamEvent = {
  eventId: number;
  eventType: string;
  data: string;
  timestamp: number;
  elapsedMs: number;
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
  streamEvents?: StreamEvent[];
  sessionId?: string;
}

export interface HttpClient {
  send(parts: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
    sessionId?: string;
    onStreamEvent?: (event: StreamEvent) => void;
  }): Promise<HttpResponse>;
}
