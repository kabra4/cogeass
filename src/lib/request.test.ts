import { describe, it, expect } from "vitest";
import { buildUrl } from "./request";

describe("buildUrl", () => {
  describe("basic URL construction", () => {
    it("combines baseUrl and path", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users",
      });
      expect(result).toBe("https://api.example.com/users");
    });

    it("handles baseUrl with trailing slash", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com/",
        path: "/users",
      });
      expect(result).toBe("https://api.example.com/users");
    });

    it("handles baseUrl with multiple trailing slashes", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com///",
        path: "/users",
      });
      expect(result).toBe("https://api.example.com/users");
    });

    it("handles path without leading slash", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "users",
      });
      expect(result).toBe("https://api.example.com/users");
    });

    it("handles empty path", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "",
      });
      expect(result).toBe("https://api.example.com/");
    });
  });

  describe("path parameters", () => {
    it("replaces single path parameter", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users/{id}",
        pathParams: { id: "123" },
      });
      expect(result).toBe("https://api.example.com/users/123");
    });

    it("replaces multiple path parameters", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users/{userId}/posts/{postId}",
        pathParams: { userId: "123", postId: "456" },
      });
      expect(result).toBe("https://api.example.com/users/123/posts/456");
    });

    it("handles numeric path parameters", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users/{id}",
        pathParams: { id: 123 },
      });
      expect(result).toBe("https://api.example.com/users/123");
    });

    it("encodes special characters in path parameters", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users/{name}",
        pathParams: { name: "john doe" },
      });
      expect(result).toBe("https://api.example.com/users/john%20doe");
    });

    it("handles null path parameter value", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users/{id}",
        pathParams: { id: null as unknown as string },
      });
      expect(result).toBe("https://api.example.com/users/");
    });

    it("handles undefined path parameter value", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users/{id}",
        pathParams: { id: undefined as unknown as string },
      });
      expect(result).toBe("https://api.example.com/users/");
    });

    it("handles missing path parameter", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users/{id}",
        pathParams: {},
      });
      expect(result).toBe("https://api.example.com/users/");
    });
  });

  describe("query parameters", () => {
    it("appends single query parameter", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users",
        queryParams: { page: 1 },
      });
      expect(result).toBe("https://api.example.com/users?page=1");
    });

    it("appends multiple query parameters", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users",
        queryParams: { page: 1, limit: 10 },
      });
      expect(result).toBe("https://api.example.com/users?page=1&limit=10");
    });

    it("handles string query parameter", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/search",
        queryParams: { q: "hello world" },
      });
      expect(result).toBe("https://api.example.com/search?q=hello+world");
    });

    it("handles boolean query parameter", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users",
        queryParams: { active: true },
      });
      expect(result).toBe("https://api.example.com/users?active=true");
    });

    it("skips null query parameter", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users",
        queryParams: { page: 1, filter: null },
      });
      expect(result).toBe("https://api.example.com/users?page=1");
    });

    it("skips undefined query parameter", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users",
        queryParams: { page: 1, filter: undefined },
      });
      expect(result).toBe("https://api.example.com/users?page=1");
    });

    it("skips empty string query parameter", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users",
        queryParams: { page: 1, filter: "" },
      });
      expect(result).toBe("https://api.example.com/users?page=1");
    });

    it("returns URL without query string when all params are null/undefined/empty", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users",
        queryParams: { a: null, b: undefined, c: "" },
      });
      expect(result).toBe("https://api.example.com/users");
    });
  });

  describe("array query parameters", () => {
    it("handles array with multiple values", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users",
        queryParams: { ids: [1, 2, 3] },
      });
      expect(result).toBe("https://api.example.com/users?ids=1&ids=2&ids=3");
    });

    it("handles array with string values", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/search",
        queryParams: { tags: ["foo", "bar"] },
      });
      expect(result).toBe("https://api.example.com/search?tags=foo&tags=bar");
    });

    it("skips null values in array", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users",
        queryParams: { ids: [1, null, 3] },
      });
      expect(result).toBe("https://api.example.com/users?ids=1&ids=3");
    });

    it("skips undefined values in array", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users",
        queryParams: { ids: [1, undefined, 3] },
      });
      expect(result).toBe("https://api.example.com/users?ids=1&ids=3");
    });

    it("handles empty array", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users",
        queryParams: { ids: [] },
      });
      expect(result).toBe("https://api.example.com/users");
    });

    it("handles array with all null values", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users",
        queryParams: { ids: [null, null] },
      });
      expect(result).toBe("https://api.example.com/users");
    });
  });

  describe("object query parameters", () => {
    it("JSON stringifies object values", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/search",
        queryParams: { filter: { status: "active", role: "admin" } },
      });
      expect(result).toBe(
        "https://api.example.com/search?filter=%7B%22status%22%3A%22active%22%2C%22role%22%3A%22admin%22%7D"
      );
      // Decode to verify the JSON content
      const url = new URL(result);
      expect(url.searchParams.get("filter")).toBe(
        '{"status":"active","role":"admin"}'
      );
    });

    it("JSON stringifies nested object", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/search",
        queryParams: { filter: { user: { name: "john" } } },
      });
      const url = new URL(result);
      expect(url.searchParams.get("filter")).toBe('{"user":{"name":"john"}}');
    });

    it("handles empty object", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/search",
        queryParams: { filter: {} },
      });
      const url = new URL(result);
      expect(url.searchParams.get("filter")).toBe("{}");
    });
  });

  describe("combined path and query parameters", () => {
    it("handles both path and query parameters", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users/{id}/posts",
        pathParams: { id: "123" },
        queryParams: { page: 1, limit: 10 },
      });
      expect(result).toBe(
        "https://api.example.com/users/123/posts?page=1&limit=10"
      );
    });

    it("handles complex scenario with all parameter types", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com/",
        path: "/users/{userId}/posts/{postId}",
        pathParams: { userId: 123, postId: 456 },
        queryParams: {
          include: ["author", "comments"],
          filter: { status: "published" },
          page: 1,
          sort: null,
        },
      });
      const url = new URL(result);
      expect(url.pathname).toBe("/users/123/posts/456");
      expect(url.searchParams.getAll("include")).toEqual(["author", "comments"]);
      expect(url.searchParams.get("filter")).toBe('{"status":"published"}');
      expect(url.searchParams.get("page")).toBe("1");
      expect(url.searchParams.has("sort")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles zero as a valid query parameter", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users",
        queryParams: { page: 0 },
      });
      expect(result).toBe("https://api.example.com/users?page=0");
    });

    it("handles zero as a valid path parameter", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/items/{index}",
        pathParams: { index: 0 },
      });
      expect(result).toBe("https://api.example.com/items/0");
    });

    it("handles false as a valid query parameter", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users",
        queryParams: { active: false },
      });
      expect(result).toBe("https://api.example.com/users?active=false");
    });

    it("handles special characters in query parameter values", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/search",
        queryParams: { q: "foo&bar=baz" },
      });
      const url = new URL(result);
      expect(url.searchParams.get("q")).toBe("foo&bar=baz");
    });

    it("handles unicode in path parameters", () => {
      const result = buildUrl({
        baseUrl: "https://api.example.com",
        path: "/users/{name}",
        pathParams: { name: "日本語" },
      });
      expect(result).toContain("%E6%97%A5%E6%9C%AC%E8%AA%9E");
    });
  });
});
