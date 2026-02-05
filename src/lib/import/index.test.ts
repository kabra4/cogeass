import { describe, it, expect } from "vitest";
import {
  detectFormat,
  importFile,
  getFormatDisplayName,
  getFormatIcon,
  validateImportFile,
} from "./index";

describe("detectFormat", () => {
  describe("Postman Collection", () => {
    it("detects Postman Collection v2.1", () => {
      const content = {
        info: {
          name: "Test",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [],
      };

      expect(detectFormat(content)).toBe("postman");
    });

    it("detects from JSON string", () => {
      const content = JSON.stringify({
        info: {
          name: "Test",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [],
      });

      expect(detectFormat(content)).toBe("postman");
    });
  });

  describe("Insomnia Export", () => {
    it("detects Insomnia Export v4", () => {
      const content = {
        _type: "export",
        __export_format: 4,
        __export_date: "2024-01-01",
        __export_source: "insomnia",
        resources: [],
      };

      expect(detectFormat(content)).toBe("insomnia");
    });
  });

  describe("HAR file", () => {
    it("detects HAR file", () => {
      const content = {
        log: {
          version: "1.2",
          creator: { name: "DevTools", version: "1.0" },
          entries: [],
        },
      };

      expect(detectFormat(content)).toBe("har");
    });
  });

  describe("unknown formats", () => {
    it("returns null for unknown object", () => {
      expect(detectFormat({ unknown: true })).toBeNull();
    });

    it("returns null for invalid JSON string", () => {
      expect(detectFormat("not json")).toBeNull();
    });

    it("returns null for empty object", () => {
      expect(detectFormat({})).toBeNull();
    });

    it("returns null for OpenAPI spec (not an import format)", () => {
      const openapi = {
        openapi: "3.0.0",
        info: { title: "API", version: "1.0" },
        paths: {},
      };
      expect(detectFormat(openapi)).toBeNull();
    });
  });
});

describe("importFile", () => {
  it("imports Postman collection", () => {
    const content = {
      info: {
        name: "Test API",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [
        {
          name: "Get Users",
          request: {
            method: "GET",
            url: "https://api.example.com/users",
          },
        },
      ],
    };

    const result = importFile(content);

    expect(result.spec.openapi).toBe("3.0.3");
    expect(result.metadata.sourceFormat).toBe("postman");
    expect(result.spec.paths["/users"]).toBeDefined();
  });

  it("imports Insomnia export", () => {
    const content = {
      _type: "export",
      __export_format: 4,
      __export_date: "2024-01-01",
      __export_source: "insomnia",
      resources: [
        {
          _id: "wrk_1",
          _type: "workspace",
          parentId: null,
          name: "Test Workspace",
          created: Date.now(),
          modified: Date.now(),
        },
        {
          _id: "req_1",
          _type: "request",
          parentId: "wrk_1",
          name: "Get Data",
          method: "GET",
          url: "https://api.example.com/data",
          created: Date.now(),
          modified: Date.now(),
        },
      ],
    };

    const result = importFile(content);

    expect(result.spec.openapi).toBe("3.0.3");
    expect(result.metadata.sourceFormat).toBe("insomnia");
    expect(result.spec.paths["/data"]).toBeDefined();
  });

  it("imports HAR file", () => {
    const content = {
      log: {
        version: "1.2",
        creator: { name: "DevTools", version: "1.0" },
        entries: [
          {
            startedDateTime: "2024-01-01T00:00:00.000Z",
            time: 100,
            request: {
              method: "GET",
              url: "https://api.example.com/items",
              httpVersion: "HTTP/1.1",
              headers: [],
              queryString: [],
              cookies: [],
              headersSize: -1,
              bodySize: -1,
            },
            response: {
              status: 200,
              statusText: "OK",
              httpVersion: "HTTP/1.1",
              headers: [],
              cookies: [],
              content: { size: 0, mimeType: "application/json" },
              redirectURL: "",
              headersSize: -1,
              bodySize: -1,
            },
            cache: {},
            timings: { send: 0, wait: 100, receive: 0 },
          },
        ],
      },
    };

    const result = importFile(content);

    expect(result.spec.openapi).toBe("3.0.3");
    expect(result.metadata.sourceFormat).toBe("har");
    expect(result.spec.paths["/items"]).toBeDefined();
  });

  it("throws error for unrecognized format", () => {
    expect(() => importFile({ unknown: true })).toThrow("Unrecognized file format");
  });

  it("applies import options", () => {
    const content = {
      info: {
        name: "Original Name",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [],
    };

    const result = importFile(content, { workspaceName: "Custom Name" });
    expect(result.spec.info.title).toBe("Custom Name");
  });

  it("accepts JSON string", () => {
    const content = JSON.stringify({
      info: {
        name: "Test",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [],
    });

    const result = importFile(content);
    expect(result.metadata.sourceFormat).toBe("postman");
  });
});

describe("getFormatDisplayName", () => {
  it("returns correct names for each format", () => {
    expect(getFormatDisplayName("postman")).toBe("Postman Collection");
    expect(getFormatDisplayName("insomnia")).toBe("Insomnia Export");
    expect(getFormatDisplayName("har")).toBe("HAR File");
    expect(getFormatDisplayName(null)).toBe("Unknown");
  });
});

describe("getFormatIcon", () => {
  it("returns correct icon names for each format", () => {
    expect(getFormatIcon("postman")).toBe("Package");
    expect(getFormatIcon("insomnia")).toBe("Moon");
    expect(getFormatIcon("har")).toBe("FileJson");
    expect(getFormatIcon(null)).toBe("File");
  });
});

describe("validateImportFile", () => {
  it("returns format and parsed content for valid file", () => {
    const content = JSON.stringify({
      info: {
        name: "Test",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [],
    });

    const result = validateImportFile(content);

    expect(result.format).toBe("postman");
    expect(result.parsedContent).toBeDefined();
  });

  it("throws for invalid JSON", () => {
    expect(() => validateImportFile("not json")).toThrow("Invalid JSON");
  });

  it("throws helpful error for unsupported Postman version", () => {
    const content = JSON.stringify({
      info: {
        name: "Test",
        schema: "https://schema.postman.com/v1.0/collection.json",
      },
      item: [],
    });

    expect(() => validateImportFile(content)).toThrow("Collection v2.1");
  });

  it("throws helpful error for unsupported Insomnia version", () => {
    const content = JSON.stringify({
      _type: "export",
      __export_format: 3,
      resources: [],
    });

    expect(() => validateImportFile(content)).toThrow("v4 format");
  });

  it("throws helpful error for invalid HAR", () => {
    const content = JSON.stringify({
      log: { entries: "not an array" },
    });

    expect(() => validateImportFile(content)).toThrow("valid HTTP Archive");
  });

  it("throws generic error for completely unknown format", () => {
    const content = JSON.stringify({ something: "else" });

    expect(() => validateImportFile(content)).toThrow("Unrecognized file format");
  });
});
