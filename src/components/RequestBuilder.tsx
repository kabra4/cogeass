import RequestForms from "./RequestForms";
import Previews from "./Previews";
import { useRequestBuilderState } from "@/hooks/useRequestBuilderState";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export default function RequestBuilder() {
  const {
    spec, op, method, path, curl, resp, isLoading,
    pathData, queryData, headerData, customHeaderData, bodyData, bodySchema,
    handleSend, handleCancel, onPathDataChange, onQueryDataChange,
    onHeaderDataChange, onCustomHeaderDataChange, onBodyDataChange
  } = useRequestBuilderState();

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
          customHeaderData={customHeaderData}
          onCustomHeaderDataChange={onCustomHeaderDataChange}
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