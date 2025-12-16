import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import converter from "swagger2openapi";
import { saveSpec } from "@/lib/storage/sqliteRepository";
import { invoke } from "@tauri-apps/api/core";
import yaml from "js-yaml";

export type DerefSpec = OpenAPIV3.Document | OpenAPIV3_1.Document;

const isTauri = () =>
  typeof window !== "undefined" &&
  (window as any).__TAURI_INTERNALS__ !== undefined;

/**
 * Loads and processes an OpenAPI specification from a URL or File object.
 * This function automatically detects if the spec is Swagger 2.0 and, if so,
 * converts it to OpenAPI 3.0 before dereferencing. When running in a Tauri
 * environment, it uses the Rust backend to fetch URLs.
 *
 * @param input - A URL string or a File object.
 * @returns A fully dereferenced OpenAPI 3.0+ specification.
 */
export async function loadSpec(
  input: string | File
): Promise<{ spec: DerefSpec; id: string; baseUrl: string }> {
  try {
    let specObject: any;
    let baseUrl: string | undefined;

    const isHttpUrl =
      typeof input === "string" &&
      (input.startsWith("http://") || input.startsWith("https://"));

    if (isHttpUrl && isTauri()) {
      console.log("Tauri environment detected, fetching spec via backend...");
      try {
        // Using invoke to call the Rust command, as recommended.
        const specContent = await invoke<string>("load_spec_from_url", {
          url: input,
        });
        console.log("Spec fetched from backend successfully");
        try {
          specObject = JSON.parse(specContent);
          console.log("Parsed as JSON");
        } catch (e) {
          // Fallback to YAML parsing if JSON fails
          specObject = yaml.load(specContent);
          console.log("Parsed as YAML");
        }
        baseUrl = input;
      } catch (error) {
        console.error("Error fetching/parsing spec from backend:", error);
        throw error;
      }
    } else {
      console.log("Using SwaggerParser.parse for local file or URL");
      try {
        const specUrlOrObject =
          typeof input === "string" ? input : await fileToObjectUrl(input);
        specObject = await SwaggerParser.parse(specUrlOrObject);
        baseUrl = specUrlOrObject;
        console.log("SwaggerParser.parse completed successfully");
      } catch (error) {
        console.error("Error in SwaggerParser.parse:", error);
        throw error;
      }
    }

    let specToProcess = specObject;

    if (specToProcess.swagger === "2.0") {
      console.log("Detected Swagger 2.0 spec, attempting conversion...");
      try {
        const { openapi } = await converter.convertObj(specToProcess, {
          patch: true,
          warnOnly: true,
          resolve: false, // Don't resolve external references
        });
        specToProcess = openapi;
        console.log("Conversion to OpenAPI 3.0 successful.");
      } catch (error) {
        console.error("Error during Swagger 2.0 conversion:", error);
        throw error;
      }
    }

    console.log("Starting dereference...");
    try {
      const dereferencedDoc = (await SwaggerParser.dereference(specToProcess, {
        resolve: {
          external: false, // Disable external reference resolution for local files
        },
      })) as unknown as DerefSpec;
      console.log("Dereference completed successfully");

      const specId =
        typeof input === "string"
          ? input
          : `${input.name}-${input.size}-${input.lastModified}`;

      await saveSpec(specId, JSON.stringify(dereferencedDoc));

      return {
        spec: dereferencedDoc,
        id: specId,
        baseUrl: baseUrl || "",
      };
    } catch (error) {
      console.error("Error during dereference:", error);
      throw error;
    }
  } catch (error) {
    console.error("Failed during spec loading or conversion:", error);
    throw new Error(
      "The specification file could not be loaded, parsed, or converted."
    );
  }
}

async function fileToObjectUrl(file: File): Promise<string> {
  return URL.createObjectURL(file);
}

export function isOAS31(spec: DerefSpec): spec is OpenAPIV3_1.Document {
  return spec.openapi.startsWith("3.1");
}

export function listOperations(spec: DerefSpec) {
  const ops: Array<{
    method: string;
    path: string;
    op: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;
    tag: string;
  }> = [];
  const seen = new Set<string>();

  for (const [path, item] of Object.entries(spec.paths || {})) {
    const pathItem = item as
      | OpenAPIV3.PathItemObject
      | OpenAPIV3_1.PathItemObject;

    for (const method of [
      "get",
      "post",
      "put",
      "patch",
      "delete",
      "head",
      "options",
      "trace",
    ] as const) {
      const op = pathItem?.[method];
      if (!op) continue;

      // Deduplicate by method:path key
      const key = `${method}:${path}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const combinedParameters = [
        ...(pathItem.parameters || []),
        ...(op.parameters || []),
      ];
      if (combinedParameters.length > 0) {
        op.parameters = combinedParameters;
      }

      const tag = op.tags?.[0] ?? "default";
      ops.push({ method, path, op, tag });
    }
  }
  return ops;
}
