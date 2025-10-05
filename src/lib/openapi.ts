import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";

export type DerefSpec = OpenAPIV3.Document | OpenAPIV3_1.Document;

export async function loadSpec(input: string | File): Promise<DerefSpec> {
  const doc =
    typeof input === "string"
      ? await SwaggerParser.dereference(input)
      : await SwaggerParser.dereference(await fileToObjectUrl(input));
  return doc as unknown as DerefSpec;
}

async function fileToObjectUrl(file: File) {
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
