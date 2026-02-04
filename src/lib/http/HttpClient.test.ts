import { describe, it, expect } from "vitest";
import type { ResponseTimings, StreamEvent, HttpResponse, HttpClient } from "./HttpClient";

describe("HttpClient types", () => {
  describe("ResponseTimings", () => {
    it("accepts valid timing object", () => {
      const timings: ResponseTimings = {
        prepareMs: 10,
        dnsLookupMs: 5,
        tcpConnectMs: 15,
        tlsHandshakeMs: 20,
        ttfbMs: 50,
        downloadMs: 100,
        processMs: 5,
        totalMs: 205,
      };

      expect(timings.totalMs).toBe(205);
      expect(timings.prepareMs).toBe(10);
      expect(timings.dnsLookupMs).toBe(5);
      expect(timings.tcpConnectMs).toBe(15);
      expect(timings.tlsHandshakeMs).toBe(20);
      expect(timings.ttfbMs).toBe(50);
      expect(timings.downloadMs).toBe(100);
      expect(timings.processMs).toBe(5);
    });

    it("accepts zero values", () => {
      const timings: ResponseTimings = {
        prepareMs: 0,
        dnsLookupMs: 0,
        tcpConnectMs: 0,
        tlsHandshakeMs: 0,
        ttfbMs: 0,
        downloadMs: 0,
        processMs: 0,
        totalMs: 0,
      };

      expect(timings.totalMs).toBe(0);
    });
  });

  describe("StreamEvent", () => {
    it("accepts valid stream event", () => {
      const event: StreamEvent = {
        eventId: 1,
        eventType: "message",
        data: '{"text": "Hello"}',
        timestamp: Date.now(),
        elapsedMs: 150,
      };

      expect(event.eventId).toBe(1);
      expect(event.eventType).toBe("message");
      expect(event.data).toContain("Hello");
    });

    it("handles different event types", () => {
      const messageEvent: StreamEvent = {
        eventId: 1,
        eventType: "message",
        data: "data",
        timestamp: Date.now(),
        elapsedMs: 100,
      };

      const errorEvent: StreamEvent = {
        eventId: 2,
        eventType: "error",
        data: "error message",
        timestamp: Date.now(),
        elapsedMs: 200,
      };

      const customEvent: StreamEvent = {
        eventId: 3,
        eventType: "custom-event",
        data: "custom data",
        timestamp: Date.now(),
        elapsedMs: 300,
      };

      expect(messageEvent.eventType).toBe("message");
      expect(errorEvent.eventType).toBe("error");
      expect(customEvent.eventType).toBe("custom-event");
    });
  });

  describe("HttpResponse", () => {
    it("accepts minimal response", () => {
      const response: HttpResponse = {
        status: 200,
        statusText: "OK",
        headers: {},
        bodyText: "",
        bodyJson: null,
      };

      expect(response.status).toBe(200);
      expect(response.statusText).toBe("OK");
      expect(response.bodyJson).toBeNull();
    });

    it("accepts full response with all fields", () => {
      const response: HttpResponse = {
        status: 200,
        statusText: "OK",
        headers: {
          "content-type": "application/json",
          "x-request-id": "abc123",
        },
        bodyText: '{"data": "test"}',
        bodyJson: { data: "test" },
        timings: {
          prepareMs: 10,
          dnsLookupMs: 5,
          tcpConnectMs: 15,
          tlsHandshakeMs: 20,
          ttfbMs: 50,
          downloadMs: 100,
          processMs: 5,
          totalMs: 205,
        },
        wireSizeBytes: 1024,
        bodySizeBytes: 1000,
        streamEvents: [
          {
            eventId: 1,
            eventType: "message",
            data: "chunk 1",
            timestamp: Date.now(),
            elapsedMs: 50,
          },
        ],
        sessionId: "session123",
      };

      expect(response.headers["content-type"]).toBe("application/json");
      expect(response.timings?.totalMs).toBe(205);
      expect(response.wireSizeBytes).toBe(1024);
      expect(response.streamEvents).toHaveLength(1);
      expect(response.sessionId).toBe("session123");
    });

    it("handles error responses", () => {
      const errorResponse: HttpResponse = {
        status: 404,
        statusText: "Not Found",
        headers: {},
        bodyText: '{"error": "Resource not found"}',
        bodyJson: { error: "Resource not found" },
      };

      expect(errorResponse.status).toBe(404);
      expect((errorResponse.bodyJson as { error: string }).error).toBe("Resource not found");
    });

    it("handles server error responses", () => {
      const serverErrorResponse: HttpResponse = {
        status: 500,
        statusText: "Internal Server Error",
        headers: {},
        bodyText: "Server error",
        bodyJson: null,
      };

      expect(serverErrorResponse.status).toBe(500);
    });
  });

  describe("HttpClient interface", () => {
    it("can create mock implementation", async () => {
      const mockClient: HttpClient = {
        send: async (parts) => {
          return {
            status: 200,
            statusText: "OK",
            headers: {},
            bodyText: JSON.stringify({ received: parts.method }),
            bodyJson: { received: parts.method },
          };
        },
      };

      const response = await mockClient.send({
        method: "GET",
        url: "https://example.com",
        headers: {},
      });

      expect(response.status).toBe(200);
      expect((response.bodyJson as { received: string }).received).toBe("GET");
    });

    it("supports all request options", async () => {
      const mockClient: HttpClient = {
        send: async (parts) => {
          return {
            status: 200,
            statusText: "OK",
            headers: {},
            bodyText: JSON.stringify({
              method: parts.method,
              url: parts.url,
              hasBody: !!parts.body,
              hasSignal: !!parts.signal,
              timeout: parts.timeoutMs,
              sessionId: parts.sessionId,
            }),
            bodyJson: {
              method: parts.method,
              url: parts.url,
              hasBody: !!parts.body,
              hasSignal: !!parts.signal,
              timeout: parts.timeoutMs,
              sessionId: parts.sessionId,
            },
          };
        },
      };

      const controller = new AbortController();
      const streamEvents: StreamEvent[] = [];

      const response = await mockClient.send({
        method: "POST",
        url: "https://api.example.com/data",
        headers: { "Content-Type": "application/json" },
        body: '{"data": "test"}',
        signal: controller.signal,
        timeoutMs: 30000,
        sessionId: "session456",
        onStreamEvent: (event) => streamEvents.push(event),
      });

      const body = response.bodyJson as {
        method: string;
        url: string;
        hasBody: boolean;
        hasSignal: boolean;
        timeout: number;
        sessionId: string;
      };

      expect(body.method).toBe("POST");
      expect(body.url).toBe("https://api.example.com/data");
      expect(body.hasBody).toBe(true);
      expect(body.hasSignal).toBe(true);
      expect(body.timeout).toBe(30000);
      expect(body.sessionId).toBe("session456");
    });
  });
});
