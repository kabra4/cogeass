import { useEffect, useState } from "react";
import OperationExplorer from "@/components/OperationExplorer";
import RequestBuilder from "@/components/RequestBuilder";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { GripHorizontal } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export default function WorkspacePage() {
  const [layout, setLayout] = useState<[number, number] | null>(null);
  const hasHydrated = useHasHydrated();
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);

  // Persist layout of left/right panels
  useEffect(() => {
    if (!hasHydrated) return;
    const key = activeWorkspaceId
      ? `cogeass.layout.${activeWorkspaceId}`
      : `cogeass.layout`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length === 2) {
          setLayout([arr[0], arr[1]]);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [hasHydrated, activeWorkspaceId]);

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full w-full"
      onLayout={(sizes) => {
        try {
          const key = activeWorkspaceId
            ? `cogeass.layout.${activeWorkspaceId}`
            : `cogeass.layout`;
          localStorage.setItem(key, JSON.stringify(sizes));
        } catch {
          // Ignore localStorage errors
        }
      }}
    >
      <ResizablePanel defaultSize={layout?.[0] ?? 25} minSize={20}>
        <div className="border-r h-full overflow-auto">
          <div className="p-4">
            <OperationExplorer />
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle className="w-2 bg-muted flex items-center justify-center">
        <GripHorizontal className="h-10 w-1.5 text-muted-foreground" />
      </ResizableHandle>
      <ResizablePanel defaultSize={layout?.[1] ?? 75} minSize={50}>
        <div className="h-full py-4 pl-2 pr-0 overflow-auto overflow-x-clip">
          <RequestBuilder />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
