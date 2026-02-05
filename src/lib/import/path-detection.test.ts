import { describe, it, expect } from "vitest";
import {
  detectPathParametersInPath,
  detectPathParameters,
  applyPathPatterns,
  extractExistingPathParams,
} from "./path-detection";

describe("detectPathParametersInPath", () => {
  describe("numeric IDs", () => {
    it("detects numeric ID in path", () => {
      const result = detectPathParametersInPath("/users/123");
      expect(result).not.toBeNull();
      expect(result!.parameterizedPath).toBe("/users/{userId}");
      expect(result!.parameters).toHaveLength(1);
      expect(result!.parameters[0].name).toBe("userId");
      expect(result!.parameters[0].exampleValue).toBe("123");
    });

    it("detects multiple numeric IDs", () => {
      const result = detectPathParametersInPath("/users/123/posts/456");
      expect(result).not.toBeNull();
      expect(result!.parameterizedPath).toBe("/users/{userId}/posts/{postId}");
      expect(result!.parameters).toHaveLength(2);
    });

    it("handles long numeric IDs", () => {
      const result = detectPathParametersInPath("/orders/9876543210");
      expect(result).not.toBeNull();
      expect(result!.parameterizedPath).toBe("/orders/{orderId}");
    });
  });

  describe("UUIDs", () => {
    it("detects UUID v4", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const result = detectPathParametersInPath(`/resources/${uuid}`);
      expect(result).not.toBeNull();
      expect(result!.parameterizedPath).toBe("/resources/{resourceId}");
      expect(result!.confidence).toBeGreaterThanOrEqual(0.95);
    });

    it("detects UUID in mixed path", () => {
      const result = detectPathParametersInPath(
        "/api/users/550e8400-e29b-41d4-a716-446655440000/profile"
      );
      expect(result).not.toBeNull();
      expect(result!.parameterizedPath).toBe("/api/users/{userId}/profile");
    });
  });

  describe("MongoDB ObjectIds", () => {
    it("detects ObjectId", () => {
      const result = detectPathParametersInPath("/documents/507f1f77bcf86cd799439011");
      expect(result).not.toBeNull();
      expect(result!.parameterizedPath).toBe("/documents/{documentId}");
      expect(result!.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe("parameter naming", () => {
    it("singularizes plural segment names", () => {
      const result = detectPathParametersInPath("/categories/123");
      expect(result!.parameters[0].name).toBe("categoryId");
    });

    it("handles 'ies' plural ending", () => {
      const result = detectPathParametersInPath("/companies/123");
      expect(result!.parameters[0].name).toBe("companyId");
    });

    it("handles 'es' plural ending", () => {
      const result = detectPathParametersInPath("/boxes/123");
      expect(result!.parameters[0].name).toBe("boxId");
    });

    it("generates names based on previous segment for consecutive IDs", () => {
      const result = detectPathParametersInPath("/items/123/subitems/456");
      expect(result!.parameters[0].name).toBe("itemId");
      expect(result!.parameters[1].name).toBe("subitemId");
    });

    it("uses previous segment as base for parameter name", () => {
      const result = detectPathParametersInPath("/accounts/123");
      expect(result!.parameters[0].name).toBe("accountId");
    });
  });

  describe("URL handling", () => {
    it("handles full URLs", () => {
      const result = detectPathParametersInPath("https://api.example.com/users/123");
      expect(result!.parameterizedPath).toBe("/users/{userId}");
    });

    it("handles query strings", () => {
      const result = detectPathParametersInPath("/users/123?include=posts");
      expect(result!.parameterizedPath).toBe("/users/{userId}");
    });

    it("handles paths without leading slash", () => {
      const result = detectPathParametersInPath("users/123");
      expect(result!.parameterizedPath).toBe("/users/{userId}");
    });
  });

  describe("non-detection cases", () => {
    it("returns null for single segment paths", () => {
      const result = detectPathParametersInPath("/users");
      expect(result).toBeNull();
    });

    it("returns null for paths with only static words", () => {
      const result = detectPathParametersInPath("/api/v1/health");
      expect(result).toBeNull();
    });

    it("returns null for empty path", () => {
      const result = detectPathParametersInPath("/");
      expect(result).toBeNull();
    });
  });

  describe("slug with ID", () => {
    it("detects slug with numeric suffix", () => {
      const result = detectPathParametersInPath("/articles/my-article-123");
      expect(result).not.toBeNull();
      expect(result!.confidence).toBeLessThan(0.9);
    });
  });
});

describe("detectPathParameters", () => {
  it("groups similar paths into single pattern", () => {
    const paths = ["/users/1", "/users/2", "/users/3"];
    const result = detectPathParameters(paths);
    expect(result).toHaveLength(1);
    expect(result[0].parameterizedPath).toBe("/users/{userId}");
  });

  it("increases confidence for multiple matching paths", () => {
    const paths = ["/users/1", "/users/2", "/users/3", "/users/4", "/users/5"];
    const result = detectPathParameters(paths);
    expect(result[0].confidence).toBeGreaterThan(0.9);
  });

  it("detects multiple patterns", () => {
    const paths = ["/users/1", "/users/2", "/posts/10", "/posts/20"];
    const result = detectPathParameters(paths);
    expect(result).toHaveLength(2);
  });

  it("sorts by confidence descending", () => {
    const paths = [
      "/users/1",
      "/users/2",
      "/posts/550e8400-e29b-41d4-a716-446655440000",
    ];
    const result = detectPathParameters(paths);
    expect(result[0].confidence).toBeGreaterThanOrEqual(result[1].confidence);
  });

  it("deduplicates paths", () => {
    const paths = ["/users/1", "/users/1", "/users/1"];
    const result = detectPathParameters(paths);
    expect(result).toHaveLength(1);
  });

  it("handles empty array", () => {
    const result = detectPathParameters([]);
    expect(result).toHaveLength(0);
  });
});

describe("applyPathPatterns", () => {
  it("applies patterns to matching paths", () => {
    const patterns = detectPathParameters(["/users/123"]);
    const result = applyPathPatterns(["/users/456", "/users/789"], patterns);
    expect(result.get("/users/456")).toBe("/users/{userId}");
    expect(result.get("/users/789")).toBe("/users/{userId}");
  });

  it("keeps non-matching paths unchanged", () => {
    const patterns = detectPathParameters(["/users/123"]);
    const result = applyPathPatterns(["/api/health"], patterns);
    expect(result.get("/api/health")).toBe("/api/health");
  });

  it("handles full URLs", () => {
    const patterns = detectPathParameters(["/users/123"]);
    const result = applyPathPatterns(
      ["https://api.example.com/users/456"],
      patterns
    );
    expect(result.get("https://api.example.com/users/456")).toBe("/users/{userId}");
  });
});

describe("extractExistingPathParams", () => {
  it("extracts parameter names from path", () => {
    const result = extractExistingPathParams("/users/{userId}/posts/{postId}");
    expect(result).toEqual(["userId", "postId"]);
  });

  it("returns empty array for no parameters", () => {
    const result = extractExistingPathParams("/api/health");
    expect(result).toEqual([]);
  });

  it("handles single parameter", () => {
    const result = extractExistingPathParams("/users/{id}");
    expect(result).toEqual(["id"]);
  });
});
