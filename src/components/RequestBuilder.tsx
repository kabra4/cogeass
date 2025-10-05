import { useEffect, useMemo, useState } from "react";
import type { JSONSchema7 } from "json-schema";
import { useAppStore } from "@/store/useAppStore";
import { getJsonBodySchema } from "@/lib/schema";
import { send, buildCurlFromParts } from "@/lib/request";
import RequestForms from "./RequestForms";
import Previews from "./Previews";

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

  const handleSend = async () => {
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
  };

  if (!op) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        Select an operation on the left to begin
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <RequestForms
        baseUrl={baseUrl}
        onBaseUrlChange={setBaseUrl}
        pathData={pathData}
        onPathDataChange={setPathData}
        queryData={queryData}
        onQueryDataChange={setQueryData}
        headerData={headerData}
        onHeaderDataChange={setHeaderData}
        bodyData={bodyData}
        onBodyDataChange={setBodyData}
        onSend={handleSend}
        op={op}
        spec={spec}
      />

      <Previews
        bodyData={bodyData}
        bodySchema={bodySchema}
        curl={curl}
        resp={resp}
      />
    </div>
  );
}
