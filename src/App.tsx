import SpecLoader from "@/components/SpecLoader";
import OperationExplorer from "@/components/OperationExplorer";
import RequestBuilder from "@/components/RequestBuilder";
import { useAppStore } from "@/store/useAppStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { loadSpec, listOperations } from "@/lib/openapi";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export default function App() {
  const spec = useAppStore((s) => s.spec);
  const setSpec = useAppStore((s) => s.setSpec);
  const setOps = useAppStore((s) => s.setOperations);

  const loadPetstore = async () => {
    const url = "https://petstore3.swagger.io/api/v3/openapi.json";
    try {
      const specData = await loadSpec(url);
      setSpec(specData);
      setOps(listOperations(specData));
    } catch (error) {
      toast.error("Failed to load Petstore example");
    }
  };
  return (
    <>
      {spec && (
        <div className="p-4 h-screen grid grid-rows-[auto_1fr] gap-4">
          <SpecLoader />
          <div className="h-full overflow-hidden">
            <ResizablePanelGroup
              direction="horizontal"
              className="h-full gap-4"
            >
              <ResizablePanel defaultSize={25} minSize={20} className="h-full">
                <div className="border rounded p-2 overflow-auto h-full">
                  <OperationExplorer />
                </div>
              </ResizablePanel>
              <ResizableHandle className="bg-border" />
              <ResizablePanel defaultSize={75} minSize={50} className="h-full">
                <div className="border rounded p-2 overflow-auto h-full">
                  <RequestBuilder />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      )}
      <Dialog open={!spec}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Welcome to Plyt</DialogTitle>
            <DialogDescription>
              Load an OpenAPI specification by URL or file to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <SpecLoader />
            <Button variant="outline" onClick={loadPetstore}>
              Or try the Petstore example
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Toaster />
    </>
  );
}
