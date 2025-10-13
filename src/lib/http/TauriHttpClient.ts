// src/lib/http/TauriHttpClient.ts
import { invoke } from "@tauri-apps/api/tauri";
import type { HttpClient, HttpResponse } from "./HttpClient";

type TauriResponse = {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body_text: string;
};

class TauriHttpClient implements HttpClient {
  async send(parts: Parameters<HttpClient['send']>[0]): Promise<HttpResponse> {
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
      } catch {}

      return {
        status: tauriResponse.status,
        statusText: tauriResponse.status_text,
        headers: tauriResponse.headers,
        bodyText: tauriResponse.body_text,
        bodyJson: json,
      };
    } catch (error) {
      const errorMsg = typeof error === "string" ? error : "An unknown error occurred";
      return {
        status: 500, statusText: "Tauri Command Error", headers: {},
        bodyText: errorMsg, bodyJson: { error: errorMsg },
      };
    }
  }
}

export const tauriHttpClient = new TauriHttpClient();
