import { useEffect, useMemo, useState } from "react";
import { withTheme } from "@rjsf/core";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { IChangeEvent } from "@rjsf/core";
import type { JSONSchema7 } from "json-schema";
import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import validator from "@rjsf/validator-ajv8";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { getJsonBodySchema, buildParamsSchema } from "@/lib/schema";
import { shadcnTheme } from "@/rjsf";
import { Info, Filter, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { clsx } from "clsx";
import HeaderEditor from "./HeaderEditor";
import type { AppliedAuth } from "@/lib/auth";
import { useAppStore } from "@/store/useAppStore";

const ThemedForm = withTheme(shadcnTheme);

type ActiveTab = "path" | "query" | "headers" | "body";

interface RequestFormsProps {
  method: string;
  path: string;
  pathData: Record<string, unknown>;
  onPathDataChange: (data: Record<string, unknown>) => void;
  queryData: Record<string, unknown>;
  onQueryDataChange: (data: Record<string, unknown>) => void;
  headerData: Record<string, unknown>;
  onHeaderDataChange: (data: Record<string, unknown>) => void;
  customHeaderData: Record<string, string>;
  onCustomHeaderDataChange: (data: Record<string, string>) => void;
  bodyData: Record<string, unknown>;
  onBodyDataChange: (data: Record<string, unknown>) => void;
  onSend: () => Promise<void>;
  onCancel: () => void;
  appliedAuth: AppliedAuth;
  isLoading?: boolean;
  op: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;
  spec: OpenAPIV3.Document | OpenAPIV3_1.Document;
}

export default function RequestForms({
  method,
  path,
  pathData,
  onPathDataChange,
  queryData,
  onQueryDataChange,
  headerData,
  onHeaderDataChange,
  customHeaderData,
  onCustomHeaderDataChange,
  bodyData,
  onBodyDataChange,
  onSend,
  onCancel,
  appliedAuth,
  isLoading,
  op,
  spec,
}: RequestFormsProps) {
  const globalHeaders = useAppStore((s) => s.globalHeaders);
  const setActivePage = useAppStore((s) => s.setActivePage);
  const hasAuthHeaders = Object.keys(appliedAuth.headers).length > 0;
  const hasGlobalHeaders = Object.keys(globalHeaders).length > 0;
  const [activeTab, setActiveTab] = useState<ActiveTab>("path");
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

  const formContext = {
    showDescriptions: showDocs,
    showOptional,
    filterQ,
  };

  const hasPath = paramsSchemas?.path && hasProps(paramsSchemas.path);
  const hasQuery = paramsSchemas?.query && hasProps(paramsSchemas.query);
  const hasHeader = paramsSchemas?.header && hasProps(paramsSchemas.header);
  const hasBody = !!bodySchema.schema;

  // Set the default active tab when the operation changes
  useEffect(() => {
    if (!op) return;
    let firstAvailable: ActiveTab = "headers"; // Headers tab is always available as fallback
    if (hasPath) {
      firstAvailable = "path";
    } else if (hasQuery) {
      firstAvailable = "query";
    } else if (hasBody) {
      firstAvailable = "body";
    }
    setActiveTab(firstAvailable);
  }, [op, hasPath, hasQuery, hasHeader, hasBody]);

  if (!op) return null;
  const handleClear = () => {
    switch (activeTab) {
      case "path":
        onPathDataChange({});
        break;
      case "query":
        onQueryDataChange({});
        break;
      case "headers":
        onHeaderDataChange({});
        onCustomHeaderDataChange({});
        break;
      case "body":
        onBodyDataChange({});
        break;
    }
  };

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

  const canClear = ["path", "query", "headers", "body"].includes(activeTab);

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      {/* Sticky sub-header for operation + controls */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-2">
        <div className="flex flex-wrap items-center gap-2 py-2">
          <Badge className={clsx("w-14 justify-center", methodColor)}>
            {method}
          </Badge>
          <div className="font-mono text-sm truncate flex-1">{path}</div>
          {isLoading ? (
            <Button variant="outline" onClick={onCancel} title="Cancel Request">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Cancel
            </Button>
          ) : (
            <Button
              onClick={onSend}
              disabled={!!isLoading}
              title="Ctrl/Cmd+Enter"
            >
              Send
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 pb-2">
          <Input
            placeholder="Search fields"
            value={filterQ}
            onChange={(e) => setFilterQ(e.target.value)}
            className="w-[220px]"
          />
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={!canClear}
            >
              Clear
            </Button>
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

      {/* Button-based Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 px-2">
        {hasPath && (
          <Button
            variant={activeTab === "path" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("path")}
          >
            Path
          </Button>
        )}
        {hasQuery && (
          <Button
            variant={activeTab === "query" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("query")}
          >
            Query
          </Button>
        )}
        <Button
          variant={activeTab === "headers" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("headers")}
        >
          Headers
        </Button>
        {hasBody && (
          <Button
            variant={activeTab === "body" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("body")}
          >
            Body
          </Button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-grow overflow-auto px-2 pb-2">
        {activeTab === "path" && hasPath && (
          <div className="space-y-4 pt-2">
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
          </div>
        )}
        {activeTab === "query" && hasQuery && (
          <div className="space-y-4 pt-2">
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
          </div>
        )}
        {activeTab === "headers" && (
          <div className="space-y-6 pt-2">
            {hasAuthHeaders && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Authorization Headers
                </h3>
                <p className="text-xs text-muted-foreground -mt-1">
                  Applied from the{" "}
                  <button
                    type="button"
                    className="text-primary underline hover:opacity-80"
                    onClick={() => setActivePage("auth")}
                  >
                    Authorization page
                  </button>
                  . These override all other headers.
                </p>
                <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                  {Object.entries(appliedAuth.headers).map(([key, value]) => (
                    <div
                      key={key}
                      className="grid grid-cols-[1fr_2fr] gap-3 items-center"
                    >
                      <Input value={key} disabled className="font-mono h-8" />
                      <Input value={value} disabled className="font-mono h-8" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {hasGlobalHeaders && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Global Headers
                </h3>
                <p className="text-xs text-muted-foreground -mt-1">
                  Applied to all requests. Manage on the{" "}
                  <button
                    type="button"
                    className="text-primary underline hover:opacity-80"
                    onClick={() => setActivePage("headers")}
                  >
                    Headers page
                  </button>
                  .
                </p>
                <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                  {Object.entries(globalHeaders).map(([key, value]) => (
                    <div
                      key={key}
                      className="grid grid-cols-[1fr_2fr] gap-3 items-center"
                    >
                      <Input value={key} disabled className="font-mono h-8" />
                      <Input value={value} disabled className="font-mono h-8" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {hasHeader && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Defined Headers
                </h3>
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
              </div>
            )}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Custom Headers
              </h3>
              <p className="text-xs text-muted-foreground -mt-1">
                These will override any spec-defined headers with the same key.
              </p>
              <HeaderEditor
                headers={customHeaderData}
                onChange={onCustomHeaderDataChange}
              />
            </div>
          </div>
        )}
        {activeTab === "body" && hasBody && (
          <div className="space-y-4 pt-2">
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
          </div>
        )}
      </div>
    </div>
  );
}

function hasProps(schema: JSONSchema7) {
  return !!schema?.properties && Object.keys(schema.properties!).length > 0;
}

// Build a uiSchema that assigns specific widgets for different field types.
function buildUiSchema(schema: JSONSchema7): UiSchema {
  const ui: UiSchema = {};
  function walk(node: JSONSchema7 | boolean, path: string[]) {
    if (!node || typeof node === "boolean") return;

    const key = toUiPath(path);
    const nodeType = Array.isArray(node.type) ? node.type : [node.type];

    if (nodeType.includes("number") || nodeType.includes("integer")) {
      setUi(ui, key, { "ui:widget": "NumberWidget" });
    }
    if (nodeType.includes("boolean")) {
      setUi(ui, key, { "ui:widget": "CheckboxWidget" });
    }

    if (nodeType.includes("array") && node.items) {
      const items = node.items as JSONSchema7;
      if (items.enum) {
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
