// src/lib/http/index.ts
import { fetchHttpClient } from './FetchHttpClient';
import { tauriHttpClient } from './TauriHttpClient';

const isTauri = () =>
  typeof window !== "undefined" &&
  (window as any).__TAURI__ !== undefined;

export const httpClient = isTauri() ? tauriHttpClient : fetchHttpClient;
