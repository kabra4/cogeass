import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const { spec, selected, baseUrl, operationState, setOperationState } =
    useAppStore();

  const operationKey = useMemo(
    () => (selected ? `${selected.method}:${selected.path}` : ""),
    [selected]
  );

  // Data is now derived from the global store based on the selected operation
  const {
    pathData = {},
    queryData = {},
    headerData = {},
    customHeaderData = {}, // <-- Added
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const method = (selected?.method ?? "get").toUpperCase();
  const path = selected?.path ?? "";
  const op = selected?.op;

  const bodySchema = useMemo(() => {
    if (!spec || !op) return { schema: null, mediaType: null };
    return getJsonBodySchema(spec, op);
  }, [spec, op]);

  // Reset response and curl when operation changes
  useEffect(() => {
    setResp(null);
    setCurl("");
  }, [operationKey]);

  useEffect(() => {
    if (!path || !method || !baseUrl) {
      setCurl("");
      return;
    }
    // Normalize header keys to lowercase to avoid case-sensitive duplicates
    const norm = (obj: Record<string, string>) =>
      Object.fromEntries(
        Object.entries(obj || {}).map(([k, v]) => [k.toLowerCase(), String(v)])
      );
    const mergedHeaders = {
      ...norm(headerData as Record<string, string>),
      ...norm(customHeaderData),
    };
    const c = buildCurlFromParts({
      baseUrl,
      path,
      method: method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
      pathParams: pathData as Record<string, string | number>,
      queryParams: queryData,
      headerParams: mergedHeaders, // <-- Use merged headers
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
    customHeaderData, // <-- Added dependency
    bodyData,
    bodySchema,
  ]);

  const handleSend = useCallback(async () => {
    if (!baseUrl) return;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    // Normalize header keys to lowercase to avoid case-sensitive duplicates
    const norm = (obj: Record<string, string>) =>
      Object.fromEntries(
        Object.entries(obj || {}).map(([k, v]) => [k.toLowerCase(), String(v)])
      );
    const mergedHeaders = {
      ...norm(headerData as Record<string, string>),
      ...norm(customHeaderData),
    };
    try {
      const r = await send({
        baseUrl,
        path,
        method,
        pathParams: pathData as Record<string, string | number>,
        queryParams: queryData,
        headers: mergedHeaders, // <-- Use merged headers
        body: bodySchema.schema ? bodyData : undefined,
        mediaType: bodySchema.mediaType ?? undefined,
        timeoutMs: 15000,
        signal: abortController.signal,
      });

      // Only set response if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setResp(r);
      }
    } catch (error) {
      // Only handle errors if not aborted
      if (!abortController.signal.aborted) {
        console.error("Request failed:", error);
        setResp({
          status: 500,
          statusText: "Request Failed",
          headers: {},
          bodyText: error instanceof Error ? error.message : "Unknown error",
          bodyJson: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    } finally {
      // Only set loading to false if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
      // Clear the ref if this was the current request
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [
    baseUrl,
    path,
    method,
    pathData,
    queryData,
    headerData,
    customHeaderData, // <-- Added dependency
    bodyData,
    bodySchema,
  ]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  // Cancel request on component unmount or operation change
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [operationKey]);

  // Keyboard shortcut: Ctrl/Cmd + Enter
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isLoading) {
        e.preventDefault();
        handleSend();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSend, isLoading]);

  // Handlers to update the global store
  const onPathDataChange = (data: Record<string, unknown>) =>
    setOperationState(operationKey, { pathData: data });
  const onQueryDataChange = (data: Record<string, unknown>) =>
    setOperationState(operationKey, { queryData: data });
  const onHeaderDataChange = (data: Record<string, unknown>) =>
    setOperationState(operationKey, { headerData: data });
  const onCustomHeaderDataChange = (
    data: Record<string, string> // <-- New handler
  ) => setOperationState(operationKey, { customHeaderData: data });
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
          method={method}
          path={path}
          pathData={pathData}
          onPathDataChange={onPathDataChange}
          queryData={queryData}
          onQueryDataChange={onQueryDataChange}
          headerData={headerData}
          onHeaderDataChange={onHeaderDataChange}
          customHeaderData={customHeaderData} // <-- Pass down
          onCustomHeaderDataChange={onCustomHeaderDataChange} // <-- Pass down
          bodyData={bodyData}
          onBodyDataChange={onBodyDataChange}
          onSend={handleSend}
          onCancel={handleCancel}
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
