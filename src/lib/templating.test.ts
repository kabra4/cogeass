import { describe, it, expect } from "vitest";
import {
  resolveVariables,
  extractVariables,
  extractAllVariables,
  validateTemplate,
} from "./templating";

describe("resolveVariables", () => {
  it("resolves simple string variables", () => {
    const result = resolveVariables("Hello {{name}}", { name: "World" });
    expect(result).toBe("Hello World");
  });

  it("resolves multiple variables in a string", () => {
    const result = resolveVariables("{{greeting}} {{name}}!", {
      greeting: "Hello",
      name: "World",
    });
    expect(result).toBe("Hello World!");
  });

  it("handles variables with spaces around name", () => {
    const result = resolveVariables("Hello {{ name }}", { name: "World" });
    expect(result).toBe("Hello World");
  });

  it("leaves unresolved variables unchanged", () => {
    const result = resolveVariables("Hello {{name}} {{unknown}}", {
      name: "World",
    });
    expect(result).toBe("Hello World {{unknown}}");
  });

  it("resolves variables in objects", () => {
    const result = resolveVariables(
      { url: "{{baseUrl}}/api", token: "{{apiKey}}" },
      { baseUrl: "https://example.com", apiKey: "secret123" }
    );
    expect(result).toEqual({
      url: "https://example.com/api",
      token: "secret123",
    });
  });

  it("resolves variables in arrays", () => {
    const result = resolveVariables(["{{a}}", "{{b}}", "{{c}}"], {
      a: "1",
      b: "2",
      c: "3",
    });
    expect(result).toEqual(["1", "2", "3"]);
  });

  it("resolves variables in nested objects", () => {
    const result = resolveVariables(
      {
        outer: {
          inner: "{{value}}",
        },
      },
      { value: "nested" }
    );
    expect(result).toEqual({ outer: { inner: "nested" } });
  });

  it("handles null and undefined", () => {
    expect(resolveVariables(null, { a: "1" })).toBe(null);
    expect(resolveVariables(undefined, { a: "1" })).toBe(undefined);
  });

  it("passes through primitives unchanged", () => {
    expect(resolveVariables(42, { a: "1" })).toBe(42);
    expect(resolveVariables(true, { a: "1" })).toBe(true);
  });
});

describe("extractVariables", () => {
  it("extracts single variable", () => {
    expect(extractVariables("Hello {{name}}")).toEqual(["name"]);
  });

  it("extracts multiple variables", () => {
    const result = extractVariables("{{a}} and {{b}} and {{c}}");
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("extracts unique variables only", () => {
    const result = extractVariables("{{a}} {{a}} {{b}}");
    expect(result).toEqual(["a", "b"]);
  });

  it("handles variables with spaces", () => {
    expect(extractVariables("{{ name }}")).toEqual(["name"]);
  });

  it("returns empty array for no variables", () => {
    expect(extractVariables("no variables here")).toEqual([]);
  });
});

describe("extractAllVariables", () => {
  it("extracts from nested objects", () => {
    const result = extractAllVariables({
      a: "{{var1}}",
      b: { c: "{{var2}}" },
    });
    expect(result).toContain("var1");
    expect(result).toContain("var2");
  });

  it("extracts from arrays", () => {
    const result = extractAllVariables(["{{a}}", "{{b}}"]);
    expect(result).toEqual(["a", "b"]);
  });

  it("extracts variables from object keys", () => {
    const result = extractAllVariables({ "{{key}}": "value" });
    expect(result).toContain("key");
  });

  it("handles null and undefined", () => {
    expect(extractAllVariables(null)).toEqual([]);
    expect(extractAllVariables(undefined)).toEqual([]);
  });
});

describe("validateTemplate", () => {
  it("returns valid for fully resolved templates", () => {
    const result = validateTemplate("Hello {{name}}", { name: "World" });
    expect(result.isValid).toBe(true);
    expect(result.missingVariables).toEqual([]);
  });

  it("returns invalid with missing variables", () => {
    const result = validateTemplate("{{a}} {{b}} {{c}}", { a: "1" });
    expect(result.isValid).toBe(false);
    expect(result.missingVariables).toEqual(["b", "c"]);
  });

  it("validates nested structures", () => {
    const result = validateTemplate(
      { url: "{{baseUrl}}", headers: { auth: "{{token}}" } },
      { baseUrl: "http://example.com" }
    );
    expect(result.isValid).toBe(false);
    expect(result.missingVariables).toEqual(["token"]);
  });
});

describe("resolveVariables - additional edge cases", () => {
  it("handles empty context", () => {
    const result = resolveVariables("Hello {{name}}", {});
    expect(result).toBe("Hello {{name}}");
  });

  it("handles empty string variable value", () => {
    const result = resolveVariables("Hello {{name}}", { name: "" });
    expect(result).toBe("Hello ");
  });

  it("resolves same variable multiple times", () => {
    const result = resolveVariables("{{x}} + {{x}} = {{x}}{{x}}", { x: "1" });
    expect(result).toBe("1 + 1 = 11");
  });

  it("handles special characters in variable values", () => {
    const result = resolveVariables("{{url}}", {
      url: "https://example.com?a=1&b=2",
    });
    expect(result).toBe("https://example.com?a=1&b=2");
  });

  it("handles newlines in variable values", () => {
    const result = resolveVariables("{{text}}", {
      text: "line1\nline2",
    });
    expect(result).toBe("line1\nline2");
  });

  it("handles deeply nested objects", () => {
    const result = resolveVariables(
      {
        level1: {
          level2: {
            level3: {
              value: "{{deep}}",
            },
          },
        },
      },
      { deep: "found" }
    );
    expect(result).toEqual({
      level1: { level2: { level3: { value: "found" } } },
    });
  });

  it("handles mixed arrays and objects", () => {
    const result = resolveVariables(
      {
        items: [
          { name: "{{item1}}" },
          { name: "{{item2}}" },
        ],
      },
      { item1: "first", item2: "second" }
    );
    expect(result).toEqual({
      items: [{ name: "first" }, { name: "second" }],
    });
  });

  it("preserves non-string types in objects", () => {
    const result = resolveVariables(
      {
        count: 42,
        active: true,
        name: "{{name}}",
      },
      { name: "test" }
    );
    expect(result).toEqual({
      count: 42,
      active: true,
      name: "test",
    });
  });

  it("resolves variables in object keys", () => {
    const result = resolveVariables(
      { "X-{{header}}": "value" },
      { header: "Custom" }
    );
    expect(result).toEqual({ "X-Custom": "value" });
  });
});

describe("extractVariables - additional edge cases", () => {
  it("handles variable at start of string", () => {
    expect(extractVariables("{{start}} rest")).toEqual(["start"]);
  });

  it("handles variable at end of string", () => {
    expect(extractVariables("rest {{end}}")).toEqual(["end"]);
  });

  it("handles variables with underscores", () => {
    expect(extractVariables("{{my_variable}}")).toEqual(["my_variable"]);
  });

  it("handles variables with numbers", () => {
    expect(extractVariables("{{var1}} {{var2}}")).toEqual(["var1", "var2"]);
  });

  it("handles empty string", () => {
    expect(extractVariables("")).toEqual([]);
  });

  it("handles malformed variables", () => {
    expect(extractVariables("{{incomplete")).toEqual([]);
    expect(extractVariables("incomplete}}")).toEqual([]);
    expect(extractVariables("{single}")).toEqual([]);
  });
});

describe("extractAllVariables - additional edge cases", () => {
  it("handles mixed primitives", () => {
    const result = extractAllVariables({
      str: "{{a}}",
      num: 42,
      bool: true,
      nil: null,
    });
    expect(result).toEqual(["a"]);
  });

  it("handles deeply nested arrays", () => {
    const result = extractAllVariables([
      [[["{{deep}}"]]],
    ]);
    expect(result).toEqual(["deep"]);
  });

  it("handles empty objects and arrays", () => {
    expect(extractAllVariables({})).toEqual([]);
    expect(extractAllVariables([])).toEqual([]);
  });

  it("deduplicates variables across structure", () => {
    const result = extractAllVariables({
      a: "{{x}}",
      b: "{{x}}",
      c: ["{{x}}", "{{y}}"],
    });
    expect(result.sort()).toEqual(["x", "y"]);
  });
});

describe("validateTemplate - additional edge cases", () => {
  it("validates empty template", () => {
    const result = validateTemplate("", { a: "1" });
    expect(result.isValid).toBe(true);
    expect(result.missingVariables).toEqual([]);
  });

  it("validates template with no variables", () => {
    const result = validateTemplate("plain text", {});
    expect(result.isValid).toBe(true);
    expect(result.missingVariables).toEqual([]);
  });

  it("validates array templates", () => {
    const result = validateTemplate(["{{a}}", "{{b}}"], { a: "1" });
    expect(result.isValid).toBe(false);
    expect(result.missingVariables).toEqual(["b"]);
  });

  it("handles extra context variables", () => {
    const result = validateTemplate("{{a}}", { a: "1", b: "2", c: "3" });
    expect(result.isValid).toBe(true);
  });
});
