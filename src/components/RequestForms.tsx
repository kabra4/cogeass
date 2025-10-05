import { useMemo, useState } from "react";
import { withTheme } from "@rjsf/core";
import type { RJSFSchema } from "@rjsf/utils";
import type { JSONSchema7 } from "json-schema";
import validator from "@rjsf/validator-ajv8";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getJsonBodySchema, buildParamsSchema } from "@/lib/schema";
import { shadcnTheme } from "@/rjsf";
import { Info, Filter } from "lucide-react";

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
  op: any; // Keep as-is for PoC
  spec: any; // Keep as-is for PoC
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
  const [active, setActive] = useState<"path" | "query" | "header" | "body">(
    "path"
  );
  const [showDocs, setShowDocs] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
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

  if (!op) {
    return null;
  }

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

  const value = ((): typeof active => {
    switch (active) {
      case "path":
        return (hasPath ? "path" : firstAvailable) as any;
      case "query":
        return (hasQuery ? "query" : firstAvailable) as any;
      case "header":
        return (hasHeader ? "header" : firstAvailable) as any;
      case "body":
        return (hasBody ? "body" : firstAvailable) as any;
      default:
        return firstAvailable as any;
    }
  })();

  return (
    <div className="flex flex-col gap-3 h-full overflow-auto">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Base URL (e.g., https://petstore3.swagger.io/api/v3)"
          value={baseUrl}
          onChange={(e) => onBaseUrlChange(e.target.value)}
        />
        <Button onClick={onSend}>Send</Button>

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
              formData={pathData}
              onChange={(e) => onPathDataChange(e.formData)}
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
              formData={queryData}
              onChange={(e) => onQueryDataChange(e.formData)}
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
              formData={headerData}
              onChange={(e) => onHeaderDataChange(e.formData)}
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
              formData={bodyData}
              onChange={(e) => onBodyDataChange(e.formData)}
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

/* Helpers */

function hasProps(schema: JSONSchema7) {
  return !!schema?.properties && Object.keys(schema.properties!).length > 0;
}
