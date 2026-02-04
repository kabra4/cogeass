import { useState, useCallback, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type SessionProtocol = "Http" | "Sse" | "WebSocket" | "Grpc";

export type SessionConfig = {
  protocol: SessionProtocol;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string | null;
};

export type SessionEvent =
  | { kind: "Lifecycle"; status: string }
  | { kind: "Data"; payload: number[] }
  | { kind: "Timing"; phase: string; ms: number }
  | { kind: "SseFrame"; event_type: string; data: string; id: string | null };

type SessionEventPayload = {
  session_id: string;
  event: SessionEvent;
};

export type SessionStatus = "idle" | "connecting" | "active" | "closed" | "error";

export function useNetworkSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const unlistenRef = useRef<UnlistenFn | null>(null);

  const open = useCallback(async (config: SessionConfig) => {
    // Clean up any previous session listener
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }

    setStatus("connecting");
    setEvents([]);

    try {
      const id = await invoke<string>("open_session", { config });
      setSessionId(id);
      setStatus("active");

      // Listen for session events
      const unlisten = await listen<SessionEventPayload>(
        `session:${id}`,
        (event) => {
          const sessionEvent = event.payload.event;
          setEvents((prev) => [...prev, sessionEvent]);

          if (sessionEvent.kind === "Lifecycle") {
            if (sessionEvent.status === "closed") {
              setStatus("closed");
            } else if (sessionEvent.status.startsWith("error")) {
              setStatus("error");
            }
          }
        }
      );

      unlistenRef.current = unlisten;
      return id;
    } catch (error) {
      setStatus("error");
      throw error;
    }
  }, []);

  const close = useCallback(async () => {
    if (sessionId) {
      await invoke("close_session", { sessionId });
      setStatus("closed");
    }
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }
  }, [sessionId]);

  const send = useCallback(
    async (data: Uint8Array) => {
      if (sessionId) {
        await invoke("send_message", {
          sessionId,
          data: Array.from(data),
        });
      }
    },
    [sessionId]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, []);

  return { sessionId, status, events, open, close, send };
}
