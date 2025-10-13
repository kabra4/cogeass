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

export default function WorkspacePage() {
  const [layout, setLayout] = useState<[number, number] | null>(null);
  const hasHydrated = useHasHydrated();

  // Persist layout of left/right panels
  useEffect(() => {
    if (!hasHydrated) return;
    try {
      const raw = localStorage.getItem("cogeass.layout");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length === 2) {
          setLayout([arr[0], arr[1]]);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [hasHydrated]);

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full w-full"
      onLayout={(sizes) => {
        try {
          localStorage.setItem("cogeass.layout", JSON.stringify(sizes));
        } catch {
          // Ignore localStorage errors
        }
      }}
    >
      <ResizablePanel defaultSize={layout?.[0] ?? 25} minSize={20}>
        <div className="border-r h-full p-4 overflow-auto">
          <OperationExplorer />
        </div>
      </ResizablePanel>
      <ResizableHandle className="w-2 bg-muted flex items-center justify-center">
        <GripHorizontal className="h-10 w-1.5 text-muted-foreground" />
      </ResizableHandle>
      <ResizablePanel defaultSize={layout?.[1] ?? 75} minSize={50}>
        <div className="h-full p-4 overflow-auto">
          <RequestBuilder />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
