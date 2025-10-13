// src/lib/http/HttpClient.ts
export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  bodyText: string;
  bodyJson: unknown;
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
