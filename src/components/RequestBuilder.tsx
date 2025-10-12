import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [resp, setResp] = useState<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    bodyText: string;
    bodyJson: unknown;
  } | null>(null);
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

  // Persist base URL across sessions
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cogeass.baseUrl");
      if (saved) setBaseUrl(saved);
    } catch {
      // Ignore localStorage errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      if (baseUrl) localStorage.setItem("cogeass.baseUrl", baseUrl);
    } catch {
      // Ignore localStorage errors
    }
  }, [baseUrl]);

  useEffect(() => {
    if (!path || !method || !baseUrl) {
      setCurl("");
      return;
    }
    const c = buildCurlFromParts({
      baseUrl,
      path,
      method: method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
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

  const handleSend = useCallback(async () => {
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

  // Keyboard shortcut: Ctrl/Cmd + Enter to send
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isSend =
        e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isLoading;
      if (isSend) {
        e.preventDefault();
        handleSend();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSend, isLoading]);

  // Handlers now update the global store
  const onPathDataChange = (data: Record<string, unknown>) =>
    setOperationState(operationKey, { pathData: data });
  const onQueryDataChange = (data: Record<string, unknown>) =>
    setOperationState(operationKey, { queryData: data });
  const onHeaderDataChange = (data: Record<string, unknown>) =>
    setOperationState(operationKey, { headerData: data });
  const onBodyDataChange = (data: Record<string, unknown>) =>
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
          baseUrl={baseUrl || ""}
          onBaseUrlChange={setBaseUrl}
          method={method}
          path={path}
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
          spec={spec!}
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
