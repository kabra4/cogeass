import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import converter from "swagger2openapi";

export type DerefSpec = OpenAPIV3.Document | OpenAPIV3_1.Document;

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

    // First, parse the document without dereferencing to inspect its version.
    // SwaggerParser.parse can handle both URLs and file object URLs.
    const parsedSpec: any = await SwaggerParser.parse(specUrlOrObject);

    let specToProcess = parsedSpec;

    // Check if the spec is Swagger 2.0 and convert it if necessary.
    if (parsedSpec.swagger === "2.0") {
      console.log("Detected Swagger 2.0 spec, attempting conversion...");

      // Use swagger2openapi to convert the object in memory.
      const { openapi } = await converter.convertObj(parsedSpec, {});
      specToProcess = openapi; // The converted spec is now in OpenAPI 3.0 format.

      console.log("Conversion to OpenAPI 3.0 successful.");
    }

    // Now, dereference the spec. At this point, it's guaranteed to be an
    // OpenAPI 3.0+ object, either originally or after conversion.
    // We pass the object directly to `dereference` to avoid a second network request.
    const dereferencedDoc = await SwaggerParser.dereference(specToProcess);

    return dereferencedDoc as unknown as DerefSpec;
  } catch (error) {
    console.error("Failed during spec loading or conversion:", error);
    // Re-throw a user-friendly error to be caught by the UI.
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
