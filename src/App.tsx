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
          <div className="grid grid-cols-[320px_1fr] gap-4 h-full overflow-hidden">
            <div className="border rounded p-2 overflow-auto">
              <OperationExplorer />
            </div>
            <div className="border rounded p-2 overflow-auto">
              <RequestBuilder />
            </div>
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
