import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchHttpClient } from "./FetchHttpClient";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock performance.now for timing tests
const mockPerformanceNow = vi.fn();
vi.stubGlobal("performance", {
  now: mockPerformanceNow,
  timeOrigin: 0,
});

function createMockResponse(
  body: string | object,
  options: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {}
): Response {
  const { status = 200, statusText = "OK", headers = {} } = options;

  const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
  const bodyArrayBuffer = new TextEncoder().encode(bodyStr).buffer;

  return {
    status,
    statusText,
    headers: new Headers(headers),
    arrayBuffer: vi.fn().mockResolvedValue(bodyArrayBuffer),
    body: null,
  } as unknown as Response;
}

describe("FetchHttpClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformanceNow.mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("basic requests", () => {
    it("sends GET request", async () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);
      mockFetch.mockResolvedValue(
        createMockResponse({ data: "test" }, { headers: { "content-type": "application/json" } })
      );

      const response = await fetchHttpClient.send({
        method: "GET",
        url: "https://api.example.com/users",
        headers: {},
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/users",
        expect.objectContaining({
          method: "GET",
          headers: {},
        })
      );
      expect(response.status).toBe(200);
    });

    it("sends POST request with body", async () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);
      mockFetch.mockResolvedValue(createMockResponse({ created: true }));

      const response = await fetchHttpClient.send({
        method: "POST",
        url: "https://api.example.com/users",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "John" }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/users",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "John" }),
        })
      );
      expect(response.status).toBe(200);
    });

    it("sends request with custom headers", async () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);
      mockFetch.mockResolvedValue(createMockResponse("ok"));

      await fetchHttpClient.send({
        method: "GET",
        url: "https://api.example.com/data",
        headers: {
          Authorization: "Bearer token123",
          "X-Custom-Header": "custom-value",
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/data",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer token123",
            "X-Custom-Header": "custom-value",
          },
        })
      );
    });
  });

  describe("response handling", () => {
    it("returns status and statusText", async () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);
      mockFetch.mockResolvedValue(
        createMockResponse("", { status: 201, statusText: "Created" })
      );

      const response = await fetchHttpClient.send({
        method: "POST",
        url: "https://api.example.com/users",
        headers: {},
      });

      expect(response.status).toBe(201);
      expect(response.statusText).toBe("Created");
    });

    it("returns response headers", async () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);
      mockFetch.mockResolvedValue(
        createMockResponse("test", {
          headers: {
            "content-type": "text/plain",
            "x-request-id": "abc123",
          },
        })
      );

      const response = await fetchHttpClient.send({
        method: "GET",
        url: "https://api.example.com/test",
        headers: {},
      });

      expect(response.headers["content-type"]).toBe("text/plain");
      expect(response.headers["x-request-id"]).toBe("abc123");
    });

    it("parses JSON response body", async () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);
      mockFetch.mockResolvedValue(
        createMockResponse({ users: [{ id: 1, name: "John" }] })
      );

      const response = await fetchHttpClient.send({
        method: "GET",
        url: "https://api.example.com/users",
        headers: {},
      });

      expect(response.bodyJson).toEqual({ users: [{ id: 1, name: "John" }] });
    });

    it("returns bodyText for all responses", async () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);
      mockFetch.mockResolvedValue(createMockResponse("plain text response"));

      const response = await fetchHttpClient.send({
        method: "GET",
        url: "https://api.example.com/text",
        headers: {},
      });

      expect(response.bodyText).toBe("plain text response");
    });

    it("returns null bodyJson for non-JSON response", async () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);
      mockFetch.mockResolvedValue(createMockResponse("not valid json"));

      const response = await fetchHttpClient.send({
        method: "GET",
        url: "https://api.example.com/text",
        headers: {},
      });

      expect(response.bodyJson).toBeNull();
      expect(response.bodyText).toBe("not valid json");
    });
  });

  describe("response timing", () => {
    it("calculates response time", async () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1250);
      mockFetch.mockResolvedValue(createMockResponse("ok"));

      const response = await fetchHttpClient.send({
        method: "GET",
        url: "https://api.example.com/test",
        headers: {},
      });

      expect(response.timings?.totalMs).toBe(250);
    });

    it("returns timing structure with all fields", async () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);
      mockFetch.mockResolvedValue(createMockResponse("ok"));

      const response = await fetchHttpClient.send({
        method: "GET",
        url: "https://api.example.com/test",
        headers: {},
      });

      expect(response.timings).toHaveProperty("prepareMs");
      expect(response.timings).toHaveProperty("dnsLookupMs");
      expect(response.timings).toHaveProperty("tcpConnectMs");
      expect(response.timings).toHaveProperty("tlsHandshakeMs");
      expect(response.timings).toHaveProperty("ttfbMs");
      expect(response.timings).toHaveProperty("downloadMs");
      expect(response.timings).toHaveProperty("processMs");
      expect(response.timings).toHaveProperty("totalMs");
    });
  });

  describe("response size calculation", () => {
    it("calculates response body size in bytes", async () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);
      const body = "Hello, World!"; // 13 bytes
      mockFetch.mockResolvedValue(createMockResponse(body));

      const response = await fetchHttpClient.send({
        method: "GET",
        url: "https://api.example.com/test",
        headers: {},
      });

      expect(response.bodySizeBytes).toBe(13);
      expect(response.wireSizeBytes).toBe(13);
    });

    it("calculates correct size for JSON response", async () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);
      const body = { key: "value" };
      const expectedSize = JSON.stringify(body).length;
      mockFetch.mockResolvedValue(createMockResponse(body));

      const response = await fetchHttpClient.send({
        method: "GET",
        url: "https://api.example.com/test",
        headers: {},
      });

      expect(response.bodySizeBytes).toBe(expectedSize);
    });
  });

  describe("error status codes", () => {
    it("handles 404 response", async () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);
      mockFetch.mockResolvedValue(
        createMockResponse({ error: "Not found" }, { status: 404, statusText: "Not Found" })
      );

      const response = await fetchHttpClient.send({
        method: "GET",
        url: "https://api.example.com/unknown",
        headers: {},
      });

      expect(response.status).toBe(404);
      expect(response.statusText).toBe("Not Found");
    });

    it("handles 500 response", async () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);
      mockFetch.mockResolvedValue(
        createMockResponse(
          { error: "Internal server error" },
          { status: 500, statusText: "Internal Server Error" }
        )
      );

      const response = await fetchHttpClient.send({
        method: "GET",
        url: "https://api.example.com/error",
        headers: {},
      });

      expect(response.status).toBe(500);
    });

    it("handles 401 unauthorized response", async () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);
      mockFetch.mockResolvedValue(
        createMockResponse(
          { error: "Unauthorized" },
          { status: 401, statusText: "Unauthorized" }
        )
      );

      const response = await fetchHttpClient.send({
        method: "GET",
        url: "https://api.example.com/protected",
        headers: {},
      });

      expect(response.status).toBe(401);
    });
  });

  describe("HTTP methods", () => {
    const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

    methods.forEach((method) => {
      it(`sends ${method} request`, async () => {
        mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);
        mockFetch.mockResolvedValue(createMockResponse("ok"));

        await fetchHttpClient.send({
          method,
          url: "https://api.example.com/test",
          headers: {},
        });

        expect(mockFetch).toHaveBeenCalledWith(
          "https://api.example.com/test",
          expect.objectContaining({ method })
        );
      });
    });
  });

  describe("signal handling", () => {
    it("passes abort signal to fetch", async () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);
      mockFetch.mockResolvedValue(createMockResponse("ok"));
      const controller = new AbortController();

      await fetchHttpClient.send({
        method: "GET",
        url: "https://api.example.com/test",
        headers: {},
        signal: controller.signal,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          signal: controller.signal,
        })
      );
    });
  });
});
