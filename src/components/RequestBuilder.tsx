import { useEffect, useMemo, useState } from "react";
import RequestForms from "./RequestForms";
import Previews from "./Previews";
import { useRequestBuilderState } from "@/hooks/useRequestBuilderState";
import { useAppStore } from "@/store/useAppStore";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

type TabType = "body" | "curl" | "response" | "headers" | "timeline" | "history";

export default function RequestBuilder() {
  const [activePreviewTab, setActivePreviewTab] = useState<TabType>("body");

  const {
    operationKey,
    spec,
    op,
    method,
    path,
    curl,
    resp,
    isLoading,
    isStreaming,
    liveStreamEvents,
    appliedAuth,
    pathData,
    queryData,
    headerData,
    customHeaderData,
    bodyData,
    bodySchema,
    handleSend,
    handleCancel,
    onPathDataChange,
    onQueryDataChange,
    onHeaderDataChange,
    onCustomHeaderDataChange,
    onBodyDataChange,
  } = useRequestBuilderState();

  const responseHistoryRaw = useAppStore(
    (s) => s.responseHistory[operationKey]
  );
  const responseHistory = useMemo(
    () => responseHistoryRaw ?? [],
    [responseHistoryRaw]
  );
  const loadResponseHistory = useAppStore((s) => s.loadResponseHistory);
  const clearResponseHistory = useAppStore((s) => s.clearResponseHistory);

  // Lazy-load response history when switching to history tab
  useEffect(() => {
    if (activePreviewTab === "history" && operationKey) {
      loadResponseHistory(operationKey);
    }
  }, [activePreviewTab, operationKey, loadResponseHistory]);

  const handleSendWithTabSwitch = async () => {
    setActivePreviewTab("response");
    await handleSend();
  };

  if (!op) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        Select an operation on the left to begin
      </div>
    );
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full w-full">
      <ResizablePanel
        defaultSize={50}
        minSize={30}
        className="border-r overflow-hidden"
      >
        <RequestForms
          method={method}
          path={path}
          pathData={pathData}
          onPathDataChange={onPathDataChange}
          queryData={queryData}
          onQueryDataChange={onQueryDataChange}
          headerData={headerData}
          onHeaderDataChange={onHeaderDataChange}
          customHeaderData={customHeaderData}
          onCustomHeaderDataChange={onCustomHeaderDataChange}
          bodyData={bodyData}
          onBodyDataChange={onBodyDataChange}
          onSend={handleSendWithTabSwitch}
          onCancel={handleCancel}
          appliedAuth={appliedAuth}
          isLoading={isLoading}
          op={op}
          spec={spec!}
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={50} className="overflow-hidden">
        <Previews
          bodyData={bodyData}
          bodySchema={bodySchema}
          curl={curl}
          resp={resp}
          isLoading={isLoading}
          isStreaming={isStreaming}
          liveStreamEvents={liveStreamEvents}
          activeTab={activePreviewTab}
          onTabChange={setActivePreviewTab}
          responseHistory={responseHistory}
          onClearHistory={() =>
            operationKey && clearResponseHistory(operationKey)
          }
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
