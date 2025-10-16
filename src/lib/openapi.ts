import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import converter from "swagger2openapi";
import { specRepository } from "@/lib/storage/SpecRepository";
import { invoke } from "@tauri-apps/api/tauri";
import yaml from "js-yaml";

export type DerefSpec = OpenAPIV3.Document | OpenAPIV3_1.Document;

const isTauri = () =>
  typeof window !== "undefined" && (window as any).__TAURI__ !== undefined;

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
): Promise<{ spec: DerefSpec; id: string }> {
  try {
    let specObject: any;

    if (typeof input === "string" && isTauri()) {
      console.log("Tauri environment detected, fetching spec via backend...");
      // Using invoke to call the Rust command, as recommended.
      const specContent = await invoke<string>("load_spec_from_url", {
        url: input,
      });
      try {
        specObject = JSON.parse(specContent);
      } catch (e) {
        // Fallback to YAML parsing if JSON fails
        specObject = yaml.load(specContent);
      }
    } else {
      const specUrlOrObject =
        typeof input === "string" ? input : await fileToObjectUrl(input);
      specObject = await SwaggerParser.parse(specUrlOrObject);
    }

    let specToProcess = specObject;

    if (specToProcess.swagger === "2.0") {
      console.log("Detected Swagger 2.0 spec, attempting conversion...");
      const { openapi } = await converter.convertObj(specToProcess, {});
      specToProcess = openapi;
      console.log("Conversion to OpenAPI 3.0 successful.");
    }

    const dereferencedDoc = (await SwaggerParser.dereference(
      specToProcess
    )) as unknown as DerefSpec;

    const specId =
      typeof input === "string"
        ? input
        : `${input.name}-${input.size}-${input.lastModified}`;

    await specRepository.save(specId, dereferencedDoc);

    return { spec: dereferencedDoc, id: specId };
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
