import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import converter from "swagger2openapi";
import { saveSpecToDB } from "./db";

/**
 * Loads and processes an OpenAPI specification from a URL or File object.
 * This function automatically detects if the spec is Swagger 2.0 and, if so,
 * converts it to OpenAPI 3.0 before dereferencing.
 *
 * @param input - A URL string or a File object.
 * @returns A fully dereferenced OpenAPI 3.0+ specification.
 */
export async function loadSpec(input: string | File): Promise<DerefSpec> {
  try {
    const specUrlOrObject =
      typeof input === "string" ? input : await fileToObjectUrl(input);

    const parsedSpec: any = await SwaggerParser.parse(specUrlOrObject);

    let specToProcess = parsedSpec;

    if (parsedSpec.swagger === "2.0") {
      console.log("Detected Swagger 2.0 spec, attempting conversion...");
      const { openapi } = await converter.convertObj(parsedSpec, {});
      specToProcess = openapi;
      console.log("Conversion to OpenAPI 3.0 successful.");
    }

    const dereferencedDoc = (await SwaggerParser.dereference(
      specToProcess
    )) as unknown as DerefSpec;

    await saveSpecToDB(dereferencedDoc);

    return dereferencedDoc;
  } catch (error) {
    console.error("Failed during spec loading or conversion:", error);
    throw new Error(
      "The specification file could not be loaded, parsed, or converted."
    );
  }
}
export type DerefSpec = OpenAPIV3.Document | OpenAPIV3_1.Document;

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
      const op = (
        item as OpenAPIV3.PathItemObject | OpenAPIV3_1.PathItemObject
      )?.[method];
      if (!op) continue;
      const tag = op.tags?.[0] ?? "default";
      ops.push({ method, path, op, tag });
    }
  }
  return ops;
}
