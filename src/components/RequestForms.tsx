import { useMemo, useState } from "react";
import { withTheme } from "@rjsf/core";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { IChangeEvent } from "@rjsf/core";
import type { JSONSchema7 } from "json-schema";
import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import validator from "@rjsf/validator-ajv8";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getJsonBodySchema, buildParamsSchema } from "@/lib/schema";
import { shadcnTheme } from "@/rjsf";
import { Info, Filter, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { clsx } from "clsx";

const ThemedForm = withTheme(shadcnTheme);

interface RequestFormsProps {
  baseUrl: string;
  onBaseUrlChange: (url: string) => void;
  method: string;
  path: string;
  pathData: Record<string, unknown>;
  onPathDataChange: (data: Record<string, unknown>) => void;
  queryData: Record<string, unknown>;
  onQueryDataChange: (data: Record<string, unknown>) => void;
  headerData: Record<string, unknown>;
  onHeaderDataChange: (data: Record<string, unknown>) => void;
  bodyData: Record<string, unknown>;
  onBodyDataChange: (data: Record<string, unknown>) => void;
  onSend: () => Promise<void>;
  isLoading?: boolean;
  op: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;
  spec: OpenAPIV3.Document | OpenAPIV3_1.Document;
}

export default function RequestForms({
  baseUrl,
  onBaseUrlChange,
  method,
  path,
  pathData,
  onPathDataChange,
  queryData,
  onQueryDataChange,
  headerData,
  onHeaderDataChange,
  bodyData,
  onBodyDataChange,
  onSend,
  isLoading,
  op,
  spec,
}: RequestFormsProps) {
  const [active, setActive] = useState<"path" | "query" | "header" | "body">(
    "path"
  );
  const [showDocs, setShowDocs] = useState(false);
  const [showOptional, setShowOptional] = useState(true);
  const [filterQ, setFilterQ] = useState("");

  const paramsSchemas = useMemo(() => {
    if (!op) return null;
    return {
      path: buildParamsSchema(op, "path") as JSONSchema7,
      query: buildParamsSchema(op, "query") as JSONSchema7,
      header: buildParamsSchema(op, "header") as JSONSchema7,
    };
  }, [op]);

  const bodySchema = useMemo(() => {
    if (!spec || !op)
      return {
        schema: null as JSONSchema7 | null,
        mediaType: null as string | null,
      };
    return getJsonBodySchema(spec, op);
  }, [spec, op]);

  const pathUi = useMemo(
    () => (paramsSchemas?.path ? buildUiSchema(paramsSchemas.path) : undefined),
    [paramsSchemas?.path]
  );
  const queryUi = useMemo(
    () =>
      paramsSchemas?.query ? buildUiSchema(paramsSchemas.query) : undefined,
    [paramsSchemas?.query]
  );
  const headerUi = useMemo(
    () =>
      paramsSchemas?.header ? buildUiSchema(paramsSchemas.header) : undefined,
    [paramsSchemas?.header]
  );
  const bodyUi = useMemo(
    () => (bodySchema.schema ? buildUiSchema(bodySchema.schema) : undefined),
    [bodySchema.schema]
  );

  if (!op) return null;

  const formContext = {
    showDescriptions: showDocs,
    showOptional,
    filterQ,
  };

  const hasPath = paramsSchemas?.path && hasProps(paramsSchemas.path);
  const hasQuery = paramsSchemas?.query && hasProps(paramsSchemas.query);
  const hasHeader = paramsSchemas?.header && hasProps(paramsSchemas.header);
  const hasBody = !!bodySchema.schema;

  const firstAvailable =
    (hasPath && "path") ||
    (hasQuery && "query") ||
    (hasHeader && "header") ||
    (hasBody && "body") ||
    "path";

  const value = normalizeTab(active, {
    hasPath: !!hasPath,
    hasQuery: !!hasQuery,
    hasHeader: !!hasHeader,
    hasBody: !!hasBody,
    firstAvailable: firstAvailable as "path" | "query" | "header" | "body",
  });

  const methodColor =
    {
      GET: "bg-green-500 text-white",
      POST: "bg-blue-500 text-white",
      PUT: "bg-orange-500 text-white",
      PATCH: "bg-yellow-500 text-white",
      DELETE: "bg-red-500 text-white",
      HEAD: "bg-gray-500 text-white",
      OPTIONS: "bg-purple-500 text-white",
    }[method] || "bg-gray-500 text-white";

  function clearActiveTab() {
    switch (value) {
      case "path":
        onPathDataChange({});
        break;
      case "query":
        onQueryDataChange({});
        break;
      case "header":
        onHeaderDataChange({});
        break;
      case "body":
        onBodyDataChange({});
        break;
    }
  }

  return (
    <div className="flex flex-col gap-3 h-full overflow-auto">
      {/* Sticky sub-header for operation + controls */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex flex-wrap items-center gap-2 p-2">
          <Badge className={clsx("w-14 justify-center", methodColor)}>
            {method}
          </Badge>
          <div className="font-mono text-sm truncate flex-1">{path}</div>
          <Button
            onClick={onSend}
            disabled={!!isLoading}
            title="Ctrl/Cmd+Enter"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              "Send"
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={clearActiveTab}
            disabled={!!isLoading}
            title="Clear current tab"
          >
            Clear
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 p-2 pt-0">
          <Input
            placeholder="Base URL (e.g., https://petstore3.swagger.io/api/v3)"
            value={baseUrl}
            onChange={(e) => onBaseUrlChange(e.target.value)}
          />
          <div className="ml-auto flex items-center gap-2">
            <Input
              placeholder="Search fields"
              value={filterQ}
              onChange={(e) => setFilterQ(e.target.value)}
              className="w-[220px]"
            />
            <Toggle
              pressed={showDocs}
              onPressedChange={setShowDocs}
              aria-label="Toggle docs"
              title="Show descriptions"
            >
              <Info className="size-4" />
              Docs
            </Toggle>
            <Toggle
              pressed={showOptional}
              onPressedChange={setShowOptional}
              aria-label="Toggle optional fields"
              title="Show optional fields"
            >
              <Filter className="size-4" />
              Optional
            </Toggle>
          </div>
        </div>
      </div>

      <Tabs value={value} onValueChange={(v) => setActive(v as any)}>
        <TabsList>
          {hasPath && <TabsTrigger value="path">Path</TabsTrigger>}
          {hasQuery && <TabsTrigger value="query">Query</TabsTrigger>}
          {hasHeader && <TabsTrigger value="header">Header</TabsTrigger>}
          {hasBody && <TabsTrigger value="body">Body</TabsTrigger>}
        </TabsList>

        {hasPath && (
          <TabsContent value="path">
            <ThemedForm
              schema={paramsSchemas!.path as RJSFSchema}
              uiSchema={pathUi as UiSchema}
              formData={pathData}
              onChange={(e: IChangeEvent) => onPathDataChange(e.formData || {})}
              validator={validator}
              liveValidate
              showErrorList={false}
              formContext={formContext}
              omitExtraData
              liveOmit
            >
              <div />
            </ThemedForm>
          </TabsContent>
        )}

        {hasQuery && (
          <TabsContent value="query">
            <ThemedForm
              schema={paramsSchemas!.query as RJSFSchema}
              uiSchema={queryUi as UiSchema}
              formData={queryData}
              onChange={(e: IChangeEvent) =>
                onQueryDataChange(e.formData || {})
              }
              validator={validator}
              liveValidate
              showErrorList={false}
              formContext={formContext}
              omitExtraData
              liveOmit
            >
              <div />
            </ThemedForm>
          </TabsContent>
        )}

        {hasHeader && (
          <TabsContent value="header">
            <ThemedForm
              schema={paramsSchemas!.header as RJSFSchema}
              uiSchema={headerUi as UiSchema}
              formData={headerData}
              onChange={(e: IChangeEvent) =>
                onHeaderDataChange(e.formData || {})
              }
              validator={validator}
              liveValidate
              showErrorList={false}
              formContext={formContext}
              omitExtraData
              liveOmit
            >
              <div />
            </ThemedForm>
          </TabsContent>
        )}

        {hasBody && (
          <TabsContent value="body">
            <ThemedForm
              schema={bodySchema.schema as RJSFSchema}
              uiSchema={bodyUi as UiSchema}
              formData={bodyData}
              onChange={(e: IChangeEvent) => onBodyDataChange(e.formData || {})}
              validator={validator}
              liveValidate
              showErrorList={false}
              formContext={formContext}
              omitExtraData
              liveOmit
            >
              <div />
            </ThemedForm>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function hasProps(schema: JSONSchema7) {
  return !!schema?.properties && Object.keys(schema.properties!).length > 0;
}

function normalizeTab<T extends string>(
  current: T,
  ctx: {
    hasPath: boolean;
    hasQuery: boolean;
    hasHeader: boolean;
    hasBody: boolean;
    firstAvailable: T;
  }
): T {
  switch (current) {
    case "path":
      return (ctx.hasPath ? "path" : ctx.firstAvailable) as T;
    case "query":
      return (ctx.hasQuery ? "query" : ctx.firstAvailable) as T;
    case "header":
      return (ctx.hasHeader ? "header" : ctx.firstAvailable) as T;
    case "body":
      return (ctx.hasBody ? "body" : ctx.firstAvailable) as T;
    default:
      return ctx.firstAvailable;
  }
}

// Build a uiSchema that assigns specific widgets for different field types.
function buildUiSchema(schema: JSONSchema7): UiSchema {
  const ui: UiSchema = {};
  function walk(node: JSONSchema7 | boolean, path: string[]) {
    if (!node || typeof node === "boolean") return;

    const key = toUiPath(path);
    const nodeType = Array.isArray(node.type) ? node.type : [node.type];

    // Check if 'number' or 'integer' is in the type array.
    // This correctly handles schemas like { "type": ["number", "null"] }.
    if (nodeType.includes("number") || nodeType.includes("integer")) {
      setUi(ui, key, { "ui:widget": "NumberWidget" });
    }
    if (nodeType.includes("boolean")) {
      setUi(ui, key, { "ui:widget": "CheckboxWidget" });
    }

    if (nodeType.includes("array") && node.items) {
      const items = node.items as JSONSchema7;
      if (items.enum) {
        // array of enums
        setUi(ui, key, { "ui:widget": "MultiSelectEnumWidget" });
      } else if (items.type === "string") {
        setUi(ui, key, { "ui:widget": "ArrayStringWidget" });
      }
    }
    if (nodeType.includes("object") && node.properties) {
      for (const [k, v] of Object.entries(node.properties)) {
        walk(v as JSONSchema7, [...path, k]);
      }
    }
    if (node.anyOf || node.oneOf || node.allOf) {
      // Best effort: dive into first variant
      const variants = (node.anyOf ||
        node.oneOf ||
        node.allOf) as JSONSchema7[];
      if (Array.isArray(variants)) {
        for (const v of variants) walk(v, path);
      }
    }
  }
  walk(schema, []);
  return ui;
}

function toUiPath(parts: string[]): string {
  // RJSF uiSchema nesting uses object keys; we’ll handle setting via setUi()
  return parts.join(".");
}

function setUi(ui: UiSchema, dotted: string, value: Record<string, unknown>) {
  if (!dotted) {
    Object.assign(ui, value);
    return;
  }
  const segs = dotted.split(".");
  let curr: Record<string, unknown> = ui;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    curr[s] = curr[s] || {};
    if (i === segs.length - 1) {
      Object.assign(curr[s] as Record<string, unknown>, value);
    } else {
      curr = curr[s] as Record<string, unknown>;
    }
  }
}
