import { describe, it, expect } from "vitest";
import type { OpenAPIV3 } from "openapi-types";
import { convertInsomniaToOpenAPI } from "./converter";
import type { InsomniaExport, InsomniaRequest, InsomniaWorkspace } from "./types";

type ParameterObject = OpenAPIV3.ParameterObject;
type RequestBodyObject = OpenAPIV3.RequestBodyObject;

function createMinimalExport(
  resources: InsomniaExport["resources"] = []
): InsomniaExport {
  return {
    _type: "export",
    __export_format: 4,
    __export_date: "2024-01-01T00:00:00.000Z",
    __export_source: "insomnia.desktop.app:v2023.5.8",
    resources,
  };
}

function createWorkspace(
  id = "wrk_1",
  name = "Test Workspace"
): InsomniaWorkspace {
  return {
    _id: id,
    _type: "workspace",
    parentId: null,
    name,
    created: Date.now(),
    modified: Date.now(),
  };
}

function createRequest(
  id: string,
  name: string,
  method: string,
  url: string,
  parentId: string | null = "wrk_1"
): InsomniaRequest {
  return {
    _id: id,
    _type: "request",
    parentId,
    name,
    method,
    url,
    created: Date.now(),
    modified: Date.now(),
  };
}

describe("convertInsomniaToOpenAPI", () => {
  describe("basic conversion", () => {
    it("converts empty export", () => {
      const exportData = createMinimalExport([createWorkspace()]);
      const result = convertInsomniaToOpenAPI(exportData);

      expect(result.spec.openapi).toBe("3.0.3");
      expect(result.spec.info.title).toBe("Test Workspace");
      expect(result.spec.paths).toEqual({});
      expect(result.metadata.sourceFormat).toBe("insomnia");
    });

    it("uses custom workspace name", () => {
      const exportData = createMinimalExport([createWorkspace()]);
      const result = convertInsomniaToOpenAPI(exportData, {
        workspaceName: "Custom API",
      });

      expect(result.spec.info.title).toBe("Custom API");
    });
  });

  describe("request conversion", () => {
    it("converts simple GET request", () => {
      const exportData = createMinimalExport([
        createWorkspace(),
        createRequest("req_1", "Get Users", "GET", "https://api.example.com/users"),
      ]);

      const result = convertInsomniaToOpenAPI(exportData);
      expect(result.spec.paths["/users"]?.get).toBeDefined();
      expect(result.spec.paths["/users"]?.get?.summary).toBe("Get Users");
    });

    it("converts POST request with JSON body", () => {
      const exportData = createMinimalExport([
        createWorkspace(),
        {
          ...createRequest("req_1", "Create User", "POST", "https://api.example.com/users"),
          body: {
            mimeType: "application/json",
            text: '{"name": "John"}',
          },
        },
      ]);

      const result = convertInsomniaToOpenAPI(exportData, { inferSchemas: true });
      const post = result.spec.paths["/users"]?.post;

      expect(post?.requestBody).toBeDefined();
    });

    it("converts form data body", () => {
      const exportData = createMinimalExport([
        createWorkspace(),
        {
          ...createRequest("req_1", "Login", "POST", "https://api.example.com/login"),
          body: {
            mimeType: "application/x-www-form-urlencoded",
            params: [
              { name: "username", value: "user" },
              { name: "password", value: "pass" },
            ],
          },
        },
      ]);

      const result = convertInsomniaToOpenAPI(exportData);
      const content = (result.spec.paths["/login"]?.post?.requestBody as RequestBodyObject)?.content;

      expect(content["application/x-www-form-urlencoded"]).toBeDefined();
    });
  });

  describe("URL and parameters", () => {
    it("extracts path from URL", () => {
      const exportData = createMinimalExport([
        createWorkspace(),
        createRequest("req_1", "Request", "GET", "https://api.example.com/api/v1/data"),
      ]);

      const result = convertInsomniaToOpenAPI(exportData);
      expect(result.spec.paths["/api/v1/data"]).toBeDefined();
    });

    it("converts query parameters", () => {
      const exportData = createMinimalExport([
        createWorkspace(),
        {
          ...createRequest("req_1", "Request", "GET", "https://api.example.com/data"),
          parameters: [
            { name: "page", value: "1" },
            { name: "limit", value: "10" },
          ],
        },
      ]);

      const result = convertInsomniaToOpenAPI(exportData);
      const params = result.spec.paths["/data"]?.get?.parameters || [];

      expect(params.some((p) => (p as ParameterObject).name === "page")).toBe(true);
      expect(params.some((p) => (p as ParameterObject).name === "limit")).toBe(true);
    });

    it("excludes disabled parameters", () => {
      const exportData = createMinimalExport([
        createWorkspace(),
        {
          ...createRequest("req_1", "Request", "GET", "https://api.example.com/data"),
          parameters: [
            { name: "active", value: "1" },
            { name: "disabled", value: "2", disabled: true },
          ],
        },
      ]);

      const result = convertInsomniaToOpenAPI(exportData);
      const params = result.spec.paths["/data"]?.get?.parameters || [];

      expect(params.some((p) => (p as ParameterObject).name === "active")).toBe(true);
      expect(params.some((p) => (p as ParameterObject).name === "disabled")).toBe(false);
    });
  });

  describe("headers", () => {
    it("converts custom headers", () => {
      const exportData = createMinimalExport([
        createWorkspace(),
        {
          ...createRequest("req_1", "Request", "GET", "https://api.example.com/data"),
          headers: [{ name: "X-Custom-Header", value: "custom" }],
        },
      ]);

      const result = convertInsomniaToOpenAPI(exportData);
      const params = result.spec.paths["/data"]?.get?.parameters || [];

      expect(params.some((p) => (p as ParameterObject).name === "X-Custom-Header")).toBe(true);
    });

    it("excludes common headers", () => {
      const exportData = createMinimalExport([
        createWorkspace(),
        {
          ...createRequest("req_1", "Request", "GET", "https://api.example.com/data"),
          headers: [
            { name: "Content-Type", value: "application/json" },
            { name: "X-Custom", value: "value" },
          ],
        },
      ]);

      const result = convertInsomniaToOpenAPI(exportData);
      const params = result.spec.paths["/data"]?.get?.parameters || [];
      const headerParams = params.filter((p) => (p as ParameterObject).in === "header");

      expect(headerParams).toHaveLength(1);
      expect((headerParams[0] as ParameterObject).name).toBe("X-Custom");
    });
  });

  describe("request groups (folders)", () => {
    it("uses request group as tag", () => {
      const exportData = createMinimalExport([
        createWorkspace("wrk_1"),
        {
          _id: "fld_1",
          _type: "request_group" as const,
          parentId: "wrk_1",
          name: "Users",
          created: Date.now(),
          modified: Date.now(),
        },
        createRequest("req_1", "Get Users", "GET", "https://api.example.com/users", "fld_1"),
      ]);

      const result = convertInsomniaToOpenAPI(exportData);
      expect(result.spec.paths["/users"]?.get?.tags).toContain("Users");
    });
  });

  describe("path parameter detection", () => {
    it("detects numeric path parameters", () => {
      const exportData = createMinimalExport([
        createWorkspace(),
        createRequest("req_1", "Get User", "GET", "https://api.example.com/users/123"),
      ]);

      const result = convertInsomniaToOpenAPI(exportData);
      expect(result.spec.paths["/users/{userId}"]).toBeDefined();
      expect(result.detectedPaths.length).toBeGreaterThan(0);
    });
  });

  describe("authentication", () => {
    it("converts bearer auth", () => {
      const exportData = createMinimalExport([
        createWorkspace(),
        {
          ...createRequest("req_1", "Request", "GET", "https://api.example.com/data"),
          authentication: {
            type: "bearer",
            token: "my-token",
          },
        },
      ]);

      const result = convertInsomniaToOpenAPI(exportData);
      const op = result.spec.paths["/data"]?.get;

      expect(op?.security).toBeDefined();
    });

    it("converts basic auth", () => {
      const exportData = createMinimalExport([
        createWorkspace(),
        {
          ...createRequest("req_1", "Request", "GET", "https://api.example.com/data"),
          authentication: {
            type: "basic",
            username: "user",
            password: "pass",
          },
        },
      ]);

      const result = convertInsomniaToOpenAPI(exportData);
      const op = result.spec.paths["/data"]?.get;

      expect(op?.security).toBeDefined();
    });

    it("skips disabled auth", () => {
      const exportData = createMinimalExport([
        createWorkspace(),
        {
          ...createRequest("req_1", "Request", "GET", "https://api.example.com/data"),
          authentication: {
            type: "bearer",
            token: "my-token",
            disabled: true,
          },
        },
      ]);

      const result = convertInsomniaToOpenAPI(exportData);
      const op = result.spec.paths["/data"]?.get;

      expect(op?.security).toBeUndefined();
    });
  });

  describe("environments", () => {
    it("imports environment resources", () => {
      const exportData = createMinimalExport([
        createWorkspace("wrk_1"),
        {
          _id: "env_1",
          _type: "environment" as const,
          parentId: "wrk_1",
          name: "Development",
          data: {
            baseUrl: "https://dev.api.example.com",
            apiKey: "dev-key",
          },
          created: Date.now(),
          modified: Date.now(),
        },
      ]);

      const result = convertInsomniaToOpenAPI(exportData);

      expect(result.environments).toHaveLength(1);
      expect(result.environments[0].name).toBe("Development");
      expect(result.environments[0].variables.baseUrl).toBe(
        "https://dev.api.example.com"
      );
    });

    it("skips private environments", () => {
      const exportData = createMinimalExport([
        createWorkspace("wrk_1"),
        {
          _id: "env_1",
          _type: "environment" as const,
          parentId: "wrk_1",
          name: "Private Env",
          data: { secret: "value" },
          isPrivate: true,
          created: Date.now(),
          modified: Date.now(),
        },
      ]);

      const result = convertInsomniaToOpenAPI(exportData);
      expect(result.environments).toHaveLength(0);
    });

    it("skips environment import when disabled", () => {
      const exportData = createMinimalExport([
        createWorkspace("wrk_1"),
        {
          _id: "env_1",
          _type: "environment" as const,
          parentId: "wrk_1",
          name: "Environment",
          data: { key: "value" },
          created: Date.now(),
          modified: Date.now(),
        },
      ]);

      const result = convertInsomniaToOpenAPI(exportData, {
        importEnvironments: false,
      });
      expect(result.environments).toHaveLength(0);
    });
  });

  describe("unsupported methods", () => {
    it("warns about unsupported HTTP methods", () => {
      const exportData = createMinimalExport([
        createWorkspace(),
        createRequest("req_1", "Custom", "CUSTOM", "https://api.example.com/data"),
      ]);

      const result = convertInsomniaToOpenAPI(exportData);
      expect(result.warnings.some((w) => w.type === "unknown_format")).toBe(true);
      expect(result.spec.paths["/data"]).toBeUndefined();
    });
  });

  describe("metadata", () => {
    it("provides correct metadata", () => {
      const exportData = createMinimalExport([
        createWorkspace("wrk_1", "My API"),
        createRequest("req_1", "Request 1", "GET", "https://api.example.com/a"),
        createRequest("req_2", "Request 2", "POST", "https://api.example.com/b"),
      ]);

      const result = convertInsomniaToOpenAPI(exportData);

      expect(result.metadata.sourceFormat).toBe("insomnia");
      expect(result.metadata.sourceName).toBe("My API");
      expect(result.metadata.requestCount).toBe(2);
      expect(result.metadata.formatVersion).toBe("4");
    });
  });
});
