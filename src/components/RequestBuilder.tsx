import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { withTheme } from "@rjsf/core";
import type { RJSFSchema } from "@rjsf/utils";
import type { JSONSchema7 } from "json-schema";
import validator from "@rjsf/validator-ajv8";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/useAppStore";
import { getJsonBodySchema, buildParamsSchema } from "@/lib/schema";
import { send, buildCurlFromParts } from "@/lib/request";
import { shadcnTheme } from "@/rjsf";

const ThemedForm = withTheme(shadcnTheme);

export default function RequestBuilder() {
  const { spec, selected } = useAppStore();
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [pathData, setPathData] = useState<Record<string, unknown>>({});
  const [queryData, setQueryData] = useState<Record<string, unknown>>({});
  const [headerData, setHeaderData] = useState<Record<string, unknown>>({});
  const [bodyData, setBodyData] = useState<Record<string, unknown>>({});
  const [curl, setCurl] = useState<string>("");
  const [resp, setResp] = useState<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    bodyText: string;
    bodyJson: any;
  } | null>(null);

  const method = (selected?.method ?? "get").toUpperCase();
  const path = selected?.path ?? "";
  const op = selected?.op;

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

  // Reset form state when operation changes
  useEffect(() => {
    setPathData({});
    setQueryData({});
    setHeaderData({});
    setBodyData({});
    setResp(null);
    setCurl("");
  }, [selected?.method, selected?.path]);

  // Update cURL on any relevant change
  useEffect(() => {
    if (!path || !method || !baseUrl) {
      setCurl("");
      return;
    }
    const c = buildCurlFromParts({
      baseUrl,
      path,
      method,
      pathParams: pathData as Record<string, string | number>,
      queryParams: queryData,
      headerParams: headerData as Record<string, string>,
      body: bodySchema.schema ? bodyData : undefined,
      mediaType: bodySchema.mediaType,
    });
    setCurl(c);
  }, [
    baseUrl,
    path,
    method,
    pathData,
    queryData,
    headerData,
    bodyData,
    bodySchema.mediaType,
    bodySchema.schema,
  ]);

  if (!op) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        Select an operation on the left to begin
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {/* Left: forms and controls */}
      <div className="flex flex-col gap-4 overflow-auto">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Base URL (e.g., https://petstore3.swagger.io/api/v3)"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
          <Button
            onClick={async () => {
              if (!baseUrl) return;
              const r = await send({
                baseUrl,
                path,
                method,
                pathParams: pathData as Record<string, string | number>,
                queryParams: queryData,
                headers: headerData as Record<string, string>,
                body: bodySchema.schema ? bodyData : undefined,
                mediaType: bodySchema.mediaType ?? undefined,
              });
              setResp(r);
            }}
          >
            Send
          </Button>
        </div>

        {/* Path Params */}
        {paramsSchemas?.path && hasProps(paramsSchemas.path) && (
          <Section title="Path Params">
            <ThemedForm
              schema={paramsSchemas.path as RJSFSchema}
              formData={pathData}
              onChange={(e) => setPathData(e.formData)}
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
              onChange={(e) => setQueryData(e.formData)}
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
              onChange={(e) => setHeaderData(e.formData)}
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
              onChange={(e) => setBodyData(e.formData)}
              liveValidate
              validator={validator}
            >
              <div />
            </ThemedForm>
          </Section>
        )}
      </div>

      {/* Right: previews and response */}
      <div className="flex flex-col gap-4 overflow-auto">
        {/* Body Preview */}
        <Panel title="Body JSON">
          <Editor
            height="200px"
            defaultLanguage="json"
            value={bodySchema.schema ? safeStringify(bodyData ?? {}, 2) : ""}
            options={{ readOnly: true, minimap: { enabled: false } }}
          />
        </Panel>

        {/* cURL */}
        <Panel title="cURL">
          <Editor
            height="140px"
            defaultLanguage="shell"
            value={curl}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              wordWrap: "on",
            }}
          />
        </Panel>

        {/* Response */}
        <Panel title="Response">
          <div className="text-xs px-2 py-1 text-muted-foreground">
            {resp ? `${resp.status} ${resp.statusText}` : "No response yet"}
          </div>
          <Editor
            height="260px"
            defaultLanguage={resp?.bodyJson ? "json" : "plaintext"}
            value={
              resp
                ? resp.bodyJson
                  ? safeStringify(resp.bodyJson, 2)
                  : resp.bodyText
                : ""
            }
            options={{
              readOnly: true,
              minimap: { enabled: false },
              wordWrap: "on",
            }}
          />
        </Panel>
      </div>
    </div>
  );
}

/* Helpers and small UI wrappers */

function hasProps(schema: JSONSchema7) {
  return !!schema?.properties && Object.keys(schema.properties!).length > 0;
}

function safeStringify(v: unknown, spaces = 2) {
  try {
    return JSON.stringify(v, null, spaces);
  } catch {
    return "";
  }
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded">
      <div className="px-3 py-2 text-sm font-medium">{props.title}</div>
      <div className="px-3 py-2">{props.children}</div>
    </div>
  );
}

function Panel(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded">
      <div className="px-3 py-2 text-sm font-medium">{props.title}</div>
      <div>{props.children}</div>
    </div>
  );
}
