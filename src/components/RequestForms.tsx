import { useMemo } from "react";
import { withTheme } from "@rjsf/core";
import type { RJSFSchema } from "@rjsf/utils";
import type { JSONSchema7 } from "json-schema";
import validator from "@rjsf/validator-ajv8";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getJsonBodySchema, buildParamsSchema } from "@/lib/schema";
import { shadcnTheme } from "@/rjsf";

const ThemedForm = withTheme(shadcnTheme);

interface RequestFormsProps {
  baseUrl: string;
  onBaseUrlChange: (url: string) => void;
  pathData: Record<string, unknown>;
  onPathDataChange: (data: Record<string, unknown>) => void;
  queryData: Record<string, unknown>;
  onQueryDataChange: (data: Record<string, unknown>) => void;
  headerData: Record<string, unknown>;
  onHeaderDataChange: (data: Record<string, unknown>) => void;
  bodyData: Record<string, unknown>;
  onBodyDataChange: (data: Record<string, unknown>) => void;
  onSend: () => Promise<void>;
  op: any; // Replace with proper type if available
  spec: any; // Replace with proper type if available
}

export default function RequestForms({
  baseUrl,
  onBaseUrlChange,
  pathData,
  onPathDataChange,
  queryData,
  onQueryDataChange,
  headerData,
  onHeaderDataChange,
  bodyData,
  onBodyDataChange,
  onSend,
  op,
  spec,
}: RequestFormsProps) {
  // Derive parameter schemas
  const paramsSchemas = useMemo(() => {
    if (!op) return null;
    return {
      path: buildParamsSchema(op, "path") as JSONSchema7,
      query: buildParamsSchema(op, "query") as JSONSchema7,
      header: buildParamsSchema(op, "header") as JSONSchema7,
    };
  }, [op]);

  // Derive request body schema (JSON only for PoC)
  const bodySchema = useMemo(() => {
    if (!spec || !op)
      return {
        schema: null as JSONSchema7 | null,
        mediaType: null as string | null,
      };
    return getJsonBodySchema(spec, op);
  }, [spec, op]);

  if (!op) {
    return null; // Or handle as needed; main component handles the empty state
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-auto">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Base URL (e.g., https://petstore3.swagger.io/api/v3)"
          value={baseUrl}
          onChange={(e) => onBaseUrlChange(e.target.value)}
        />
        <Button onClick={onSend}>Send</Button>
      </div>

      {/* Path Params */}
      {paramsSchemas?.path && hasProps(paramsSchemas.path) && (
        <Section title="Path Params">
          <ThemedForm
            schema={paramsSchemas.path as RJSFSchema}
            formData={pathData}
            onChange={(e) => onPathDataChange(e.formData)}
            liveValidate
            validator={validator}
          >
            <div />
          </ThemedForm>
        </Section>
      )}

      {/* Query Params */}
      {paramsSchemas?.query && hasProps(paramsSchemas.query) && (
        <Section title="Query Params">
          <ThemedForm
            schema={paramsSchemas.query as RJSFSchema}
            formData={queryData}
            onChange={(e) => onQueryDataChange(e.formData)}
            liveValidate
            validator={validator}
          >
            <div />
          </ThemedForm>
        </Section>
      )}

      {/* Header Params */}
      {paramsSchemas?.header && hasProps(paramsSchemas.header) && (
        <Section title="Header Params">
          <ThemedForm
            schema={paramsSchemas.header as RJSFSchema}
            formData={headerData}
            onChange={(e) => onHeaderDataChange(e.formData)}
            liveValidate
            validator={validator}
          >
            <div />
          </ThemedForm>
        </Section>
      )}

      {/* Request Body */}
      {bodySchema.schema && (
        <Section title="Request Body">
          <ThemedForm
            schema={bodySchema.schema as RJSFSchema}
            formData={bodyData}
            onChange={(e) => onBodyDataChange(e.formData)}
            liveValidate
            validator={validator}
          >
            <div />
          </ThemedForm>
        </Section>
      )}
    </div>
  );
}

/* Helpers */

function hasProps(schema: JSONSchema7) {
  return !!schema?.properties && Object.keys(schema.properties!).length > 0;
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded">
      <div className="px-3 py-2 text-sm font-medium">{props.title}</div>
      <div className="px-3 py-2">{props.children}</div>
    </div>
  );
}
