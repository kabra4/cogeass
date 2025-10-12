import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { getJsonBodySchema } from "@/lib/schema";
import { send, buildCurlFromParts } from "@/lib/request";
import RequestForms from "./RequestForms";
import Previews from "./Previews";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export default function RequestBuilder() {
  const {
    spec,
    selected,
    baseUrl,
    setBaseUrl,
    operationState,
    setOperationState,
  } = useAppStore();

  const operationKey = useMemo(
    () => (selected ? `${selected.method}:${selected.path}` : ""),
    [selected]
  );

  // Data is now derived from the global store based on the selected operation
  const {
    pathData = {},
    queryData = {},
    headerData = {},
    bodyData = {},
  } = operationState[operationKey] || {};

  const [curl, setCurl] = useState<string>("");
  const [resp, setResp] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const method = (selected?.method ?? "get").toUpperCase();
  const path = selected?.path ?? "";
  const op = selected?.op;

  const bodySchema = useMemo(() => {
    if (!spec || !op) return { schema: null, mediaType: null };
    return getJsonBodySchema(spec, op);
  }, [spec, op]);

  // Reset response and curl when operation changes, but form data is now preserved
  useEffect(() => {
    setResp(null);
    setCurl("");
  }, [operationKey]);

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
    bodySchema,
  ]);

  const handleSend = async () => {
    if (!baseUrl) return;
    setIsLoading(true);
    try {
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
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers now update the global store
  const onPathDataChange = (data: any) =>
    setOperationState(operationKey, { pathData: data });
  const onQueryDataChange = (data: any) =>
    setOperationState(operationKey, { queryData: data });
  const onHeaderDataChange = (data: any) =>
    setOperationState(operationKey, { headerData: data });
  const onBodyDataChange = (data: any) =>
    setOperationState(operationKey, { bodyData: data });

  if (!op) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        Select an operation on the left to begin
      </div>
    );
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={50} minSize={30} className="border-r">
        <RequestForms
          baseUrl={baseUrl}
          onBaseUrlChange={setBaseUrl}
          pathData={pathData}
          onPathDataChange={onPathDataChange}
          queryData={queryData}
          onQueryDataChange={onQueryDataChange}
          headerData={headerData}
          onHeaderDataChange={onHeaderDataChange}
          bodyData={bodyData}
          onBodyDataChange={onBodyDataChange}
          onSend={handleSend}
          isLoading={isLoading}
          op={op}
          spec={spec}
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={50}>
        <Previews
          bodyData={bodyData}
          bodySchema={bodySchema}
          curl={curl}
          resp={resp}
          isLoading={isLoading}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
