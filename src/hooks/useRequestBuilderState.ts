import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { getJsonBodySchema } from "@/lib/schema";
import { send, buildCurlFromParts } from "@/lib/request";
import { resolveOperationAuth } from "@/lib/auth";
import { resolveVariables } from "@/lib/templating";
import { debounce } from "@/lib/utils";

// Create stable empty object references to prevent infinite loops
const EMPTY_OPERATION_STATE = {};
const EMPTY_OBJECT = {};

// Define selector hooks for performance
const useSelectedOp = () => useAppStore((s) => s.selected);
const useOperationStateForKey = (key: string) =>
  useAppStore((s) => s.operationState[key] || EMPTY_OPERATION_STATE);
const useAuthState = () => useAppStore((s) => s.auth);
const useEnvironments = () => useAppStore((s) => s.environments);
const useActiveEnvironmentId = () => useAppStore((s) => s.activeEnvironmentId);
const useGlobalHeaders = () => useAppStore((s) => s.globalHeaders);
const useAddToHistory = () => useAppStore((s) => s.addToHistory);

export function useRequestBuilderState() {
  const spec = useAppStore((s) => s.spec);
  const baseUrl = useAppStore((s) => s.baseUrl);
  const globalHeaders = useGlobalHeaders();
  const selected = useSelectedOp();
  const setOperationState = useAppStore((s) => s.setOperationState);
  const setOperationResponse = useAppStore((s) => s.setOperationResponse);
  const addToHistory = useAddToHistory();
  const authState = useAuthState();
  const environments = useEnvironments();
  const activeEnvironmentId = useActiveEnvironmentId();

  const operationKey = useMemo(
    () => (selected ? `${selected.method}:${selected.path}` : ""),
    [selected]
  );

  const operationState = useOperationStateForKey(operationKey);
  const {
    pathData = EMPTY_OBJECT,
    queryData = EMPTY_OBJECT,
    headerData = EMPTY_OBJECT,
    customHeaderData = EMPTY_OBJECT,
    bodyData = EMPTY_OBJECT,
  } = operationState;

  const [curl, setCurl] = useState("");
  // Get response from store instead of local state
  const resp = useAppStore(
    (s) => s.operationState[operationKey]?.response || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const method = (selected?.method ?? "get").toUpperCase();
  const path = selected?.path ?? "";
  const op = selected?.op;

  const appliedAuth = useMemo(
    () => resolveOperationAuth(op, authState, spec),
    [op, authState, spec]
  );

  // Get active environment variables
  const activeEnvironmentVariables = useMemo(() => {
    if (!activeEnvironmentId || !environments[activeEnvironmentId]) {
      return {};
    }
    return environments[activeEnvironmentId].variables;
  }, [environments, activeEnvironmentId]);

  // Resolve variables in all request data
  const resolvedData = useMemo(() => {
    return {
      baseUrl: resolveVariables(baseUrl || "", activeEnvironmentVariables),
      globalHeaders: resolveVariables(
        globalHeaders,
        activeEnvironmentVariables
      ),
      pathData: resolveVariables(pathData, activeEnvironmentVariables),
      queryData: resolveVariables(queryData, activeEnvironmentVariables),
      headerData: resolveVariables(headerData, activeEnvironmentVariables),
      customHeaderData: resolveVariables(
        customHeaderData,
        activeEnvironmentVariables
      ),
      bodyData: resolveVariables(bodyData, activeEnvironmentVariables),
    };
  }, [
    baseUrl,
    globalHeaders,
    pathData,
    queryData,
    headerData,
    customHeaderData,
    bodyData,
    activeEnvironmentVariables,
  ]);

  const bodySchema = useMemo(() => {
    if (!spec || !op) return { schema: null, mediaType: null };
    return getJsonBodySchema(spec, op);
  }, [spec, op]);

  // Load operation data from IndexedDB when operation changes
  useEffect(() => {
    if (operationKey) {
      useAppStore.getState().loadOperationFromDB(operationKey);
    }
  }, [operationKey]);

  // Debounced persistence for form changes
  const debouncedPersist = useMemo(
    () =>
      debounce<(key: string) => void>((key: string) => {
        useAppStore.getState().persistOperationToDB(key);
      }, 1000),
    []
  );

  // Persist to IndexedDB when form data changes
  useEffect(() => {
    if (
      operationKey &&
      (pathData || queryData || headerData || customHeaderData || bodyData)
    ) {
      debouncedPersist(operationKey);
    }
  }, [
    pathData,
    queryData,
    headerData,
    customHeaderData,
    bodyData,
    operationKey,
    debouncedPersist,
  ]);

  // useEffect for cURL generation
  useEffect(() => {
    if (!path || !method || !resolvedData.baseUrl) {
      setCurl("");
      return;
    }
    // Normalize header keys to lowercase to avoid case-sensitive duplicates
    const norm = (obj: Record<string, string>) =>
      Object.fromEntries(
        Object.entries(obj || {}).map(([k, v]) => [k.toLowerCase(), String(v)])
      );
    // Auth headers should overwrite any others
    const mergedHeaders = {
      ...norm(resolvedData.globalHeaders),
      ...norm(resolvedData.headerData as Record<string, string>),
      ...norm(resolvedData.customHeaderData),
      ...norm(appliedAuth.headers),
    };
    const mergedQueryParams = {
      ...resolvedData.queryData,
      ...appliedAuth.queryParams,
    };

    const c = buildCurlFromParts({
      baseUrl: resolvedData.baseUrl,
      path,
      method: method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
      pathParams: resolvedData.pathData as Record<string, string | number>,
      queryParams: mergedQueryParams,
      headerParams: mergedHeaders,
      body: bodySchema.schema ? resolvedData.bodyData : undefined,
      mediaType: bodySchema.mediaType,
    });
    setCurl(c);
  }, [resolvedData, path, method, bodySchema, appliedAuth]);

  // handleSend, handleCancel, and shortcut useEffect
  const handleSend = useCallback(async () => {
    if (!resolvedData.baseUrl) return;

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
    // Auth headers should overwrite any others
    const mergedHeaders = {
      ...norm(resolvedData.globalHeaders),
      ...norm(resolvedData.headerData as Record<string, string>),
      ...norm(resolvedData.customHeaderData),
      ...norm(appliedAuth.headers),
    };
    const mergedQueryParams = {
      ...resolvedData.queryData,
      ...appliedAuth.queryParams,
    };

    try {
      const r = await send({
        baseUrl: resolvedData.baseUrl,
        path,
        method,
        pathParams: resolvedData.pathData as Record<string, string | number>,
        queryParams: mergedQueryParams,
        headers: mergedHeaders,
        body: bodySchema.schema ? resolvedData.bodyData : undefined,
        mediaType: bodySchema.mediaType ?? undefined,
        timeoutMs: 600000,
        signal: abortController.signal,
      });

      // Only set response if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setOperationResponse(operationKey, {
          status: r.status,
          statusText: r.statusText,
          headers: r.headers,
          bodyText: r.bodyText,
          bodyJson: r.bodyJson,
          timestamp: Date.now(),
          responseTimeMs: r.responseTimeMs,
          responseSizeBytes: r.responseSizeBytes,
        });

        // Add to history after successful request
        if (selected) {
          addToHistory(selected);
        }
      }
    } catch (error) {
      // Only handle errors if not aborted
      if (!abortController.signal.aborted) {
        console.error("Request failed:", error);
        setOperationResponse(operationKey, {
          status: 500,
          statusText: "Request Failed",
          headers: {},
          bodyText: error instanceof Error ? error.message : "Unknown error",
          bodyJson: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
          timestamp: Date.now(),
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
    resolvedData,
    path,
    method,
    bodySchema,
    appliedAuth,
    operationKey,
    setOperationResponse,
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

  // data change handlers
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

  return {
    // State and Data
    spec,
    op,
    method,
    path,
    curl,
    resp,
    appliedAuth,
    isLoading,
    pathData,
    queryData,
    headerData,
    customHeaderData,
    bodyData,
    bodySchema,
    // Handlers
    handleSend,
    handleCancel,
    onPathDataChange,
    onQueryDataChange,
    onHeaderDataChange,
    onCustomHeaderDataChange,
    onBodyDataChange,
  };
}
