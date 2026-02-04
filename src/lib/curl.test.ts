import { describe, it, expect } from "vitest";
import { toCurl } from "./curl";

describe("toCurl", () => {
  describe("basic requests", () => {
    it("generates GET request", () => {
      const result = toCurl({
        url: "https://api.example.com/users",
        method: "GET",
      });
      expect(result).toContain("curl");
      expect(result).toContain("https://api.example.com/users");
      expect(result).toContain("-X GET");
    });

    it("generates POST request", () => {
      const result = toCurl({
        url: "https://api.example.com/users",
        method: "POST",
      });
      expect(result).toContain("-X POST");
    });

    it("generates PUT request", () => {
      const result = toCurl({
        url: "https://api.example.com/users/1",
        method: "PUT",
      });
      expect(result).toContain("-X PUT");
    });

    it("generates DELETE request", () => {
      const result = toCurl({
        url: "https://api.example.com/users/1",
        method: "DELETE",
      });
      expect(result).toContain("-X DELETE");
    });

    it("generates PATCH request", () => {
      const result = toCurl({
        url: "https://api.example.com/users/1",
        method: "PATCH",
      });
      expect(result).toContain("-X PATCH");
    });
  });

  describe("headers handling", () => {
    it("includes custom headers", () => {
      const result = toCurl({
        url: "https://api.example.com",
        method: "GET",
        headers: {
          "X-Custom-Header": "custom-value",
        },
      });
      expect(result).toContain("-H");
      expect(result).toContain("X-Custom-Header: custom-value");
    });

    it("includes multiple headers", () => {
      const result = toCurl({
        url: "https://api.example.com",
        method: "GET",
        headers: {
          "X-Header-One": "value1",
          "X-Header-Two": "value2",
        },
      });
      expect(result).toContain("X-Header-One: value1");
      expect(result).toContain("X-Header-Two: value2");
    });

    it("handles empty headers object", () => {
      const result = toCurl({
        url: "https://api.example.com",
        method: "GET",
        headers: {},
      });
      expect(result).toContain("curl");
      expect(result).toContain("https://api.example.com");
    });
  });

  describe("body serialization", () => {
    it("includes JSON body", () => {
      const result = toCurl({
        url: "https://api.example.com/users",
        method: "POST",
        body: { name: "John", email: "john@example.com" },
      });
      expect(result).toContain("-d");
      expect(result).toContain("name");
      expect(result).toContain("John");
    });

    it("includes string body", () => {
      const result = toCurl({
        url: "https://api.example.com/users",
        method: "POST",
        body: "raw string body",
      });
      expect(result).toContain("-d");
      expect(result).toContain("raw string body");
    });

    it("includes array body", () => {
      const result = toCurl({
        url: "https://api.example.com/items",
        method: "POST",
        body: [1, 2, 3],
      });
      expect(result).toContain("-d");
    });

    it("handles nested object body", () => {
      const result = toCurl({
        url: "https://api.example.com/data",
        method: "POST",
        body: {
          user: {
            name: "John",
            address: {
              city: "NYC",
            },
          },
        },
      });
      expect(result).toContain("-d");
      expect(result).toContain("user");
      expect(result).toContain("address");
    });
  });

  describe("auth header handling", () => {
    it("adds Authorization header from authHeader param", () => {
      const result = toCurl({
        url: "https://api.example.com",
        method: "GET",
        authHeader: "Bearer token123",
      });
      expect(result).toContain("Authorization: Bearer token123");
    });

    it("does not override existing Authorization header", () => {
      const result = toCurl({
        url: "https://api.example.com",
        method: "GET",
        headers: {
          Authorization: "Bearer existing-token",
        },
        authHeader: "Bearer new-token",
      });
      expect(result).toContain("Authorization: Bearer existing-token");
      expect(result).not.toContain("Bearer new-token");
    });

    it("handles null authHeader", () => {
      const result = toCurl({
        url: "https://api.example.com",
        method: "GET",
        authHeader: null,
      });
      expect(result).not.toContain("Authorization");
    });

    it("handles Basic auth header", () => {
      const result = toCurl({
        url: "https://api.example.com",
        method: "GET",
        authHeader: "Basic dXNlcjpwYXNz",
      });
      expect(result).toContain("Authorization: Basic dXNlcjpwYXNz");
    });
  });

  describe("Content-Type header handling", () => {
    it("adds Content-Type from mediaType param", () => {
      const result = toCurl({
        url: "https://api.example.com",
        method: "POST",
        mediaType: "application/json",
      });
      expect(result).toContain("Content-Type: application/json");
    });

    it("does not override existing Content-Type header", () => {
      const result = toCurl({
        url: "https://api.example.com",
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        mediaType: "application/json",
      });
      expect(result).toContain("Content-Type: text/plain");
      expect(result).not.toContain("Content-Type: application/json");
    });

    it("handles null mediaType", () => {
      const result = toCurl({
        url: "https://api.example.com",
        method: "GET",
        mediaType: null,
      });
      expect(result).not.toContain("Content-Type");
    });

    it("supports various media types", () => {
      const xmlResult = toCurl({
        url: "https://api.example.com",
        method: "POST",
        mediaType: "application/xml",
      });
      expect(xmlResult).toContain("Content-Type: application/xml");

      const formResult = toCurl({
        url: "https://api.example.com",
        method: "POST",
        mediaType: "application/x-www-form-urlencoded",
      });
      expect(formResult).toContain(
        "Content-Type: application/x-www-form-urlencoded"
      );
    });
  });

  describe("combined scenarios", () => {
    it("generates full POST request with body, auth, and content-type", () => {
      const result = toCurl({
        url: "https://api.example.com/users",
        method: "POST",
        headers: {
          "X-Request-Id": "abc123",
        },
        body: { name: "John" },
        mediaType: "application/json",
        authHeader: "Bearer token123",
      });

      expect(result).toContain("curl");
      expect(result).toContain("-X POST");
      expect(result).toContain("https://api.example.com/users");
      expect(result).toContain("Authorization: Bearer token123");
      expect(result).toContain("Content-Type: application/json");
      expect(result).toContain("X-Request-Id: abc123");
      expect(result).toContain("-d");
    });

    it("handles URL with query parameters", () => {
      const result = toCurl({
        url: "https://api.example.com/search?q=test&page=1",
        method: "GET",
      });
      expect(result).toContain("https://api.example.com/search?q=test&page=1");
    });

    it("handles URL with special characters", () => {
      const result = toCurl({
        url: "https://api.example.com/path%20with%20spaces",
        method: "GET",
      });
      expect(result).toContain("https://api.example.com/path%20with%20spaces");
    });
  });
});
