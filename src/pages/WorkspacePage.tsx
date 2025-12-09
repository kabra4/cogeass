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
  const [layout, setLayout] = useState<[number, number]>([25, 75]);
  const hasHydrated = useHasHydrated();
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);

  // Load layout from localStorage only once on mount or when workspace changes
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

  const handleLayoutChange = (sizes: number[]) => {
    if (sizes.length !== 2) return;
    const newLayout = [sizes[0], sizes[1]] as [number, number];

    // Update state to keep UI in sync during re-renders
    setLayout(newLayout);

    // Persist to local storage
    try {
      const key = activeWorkspaceId
        ? `cogeass.layout.${activeWorkspaceId}`
        : `cogeass.layout`;
      localStorage.setItem(key, JSON.stringify(newLayout));
    } catch {
      // Ignore localStorage errors
    }
  };

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full w-full"
      onLayout={handleLayoutChange}
    >
      <ResizablePanel
        defaultSize={layout[0]}
        minSize={15}
        maxSize={40}
        order={1}
      >
        <div className="border-r h-full overflow-hidden">
          <div className="h-full p-4 overflow-y-auto">
            <OperationExplorer />
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle className="w-1.5 bg-muted flex items-center justify-center transition-colors hover:bg-primary/20">
        <GripHorizontal className="h-4 w-4 text-muted-foreground rotate-90" />
      </ResizableHandle>
      <ResizablePanel defaultSize={layout[1]} minSize={30} order={2}>
        <div className="h-full w-full overflow-hidden">
          <RequestBuilder />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
