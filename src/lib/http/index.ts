// src/lib/http/index.ts
import { fetchHttpClient } from "./FetchHttpClient";
import { tauriHttpClient } from "./TauriHttpClient";

const isTauri = () => {
  const result =
    typeof window !== "undefined" &&
    (window as any).__TAURI_INTERNALS__ !== undefined;
  console.log("[HTTP Client] Tauri detection:", result);
  return result;
};

export const httpClient = isTauri() ? tauriHttpClient : fetchHttpClient;

console.log(
  "[HTTP Client] Using:",
  isTauri() ? "TauriHttpClient (Rust backend)" : "FetchHttpClient (Browser)"
);
