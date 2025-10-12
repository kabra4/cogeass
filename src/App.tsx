import { useState, useEffect } from "react";
import SpecLoader from "@/components/SpecLoader";
import OperationExplorer from "@/components/OperationExplorer";
import RequestBuilder from "@/components/RequestBuilder";
import { useAppStore } from "@/store/useAppStore";
import { ThemeProvider } from "next-themes";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { loadSpec, listOperations } from "@/lib/openapi";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Loader2 } from "lucide-react";
import { getSpecFromDB } from "@/lib/db";

export default function App() {
  const hasHydrated = useHasHydrated();
  const { spec, specId, setSpec, setOperations } = useAppStore((s) => s); // Corrected from setOps
  const [isAutoLoading, setIsAutoLoading] = useState(false);

  useEffect(() => {
    const autoLoadPreviousSpec = async () => {
      if (hasHydrated && !spec && specId) {
        setIsAutoLoading(true);
        try {
          const specData = await getSpecFromDB();
          if (specData) {
            setSpec(specData, specId);
            setOperations(listOperations(specData)); // Corrected from setOps
          } else {
            console.warn("specId found, but no matching spec in IndexedDB.");
          }
        } catch (error) {
          console.error("Error reading from IndexedDB:", error);
          toast.error("Failed to read from the local database.");
        } finally {
          setIsAutoLoading(false);
        }
      }
    };
    autoLoadPreviousSpec();
  }, [hasHydrated, spec, specId, setSpec, setOperations]); // Corrected dependency array

  const loadPetstore = async () => {
    const url = "https://petstore3.swagger.io/api/v3/openapi.json";
    setIsAutoLoading(true);
    try {
      const specData = await loadSpec(url);
      setSpec(specData, url);
      setOperations(listOperations(specData)); // Corrected from setOps
    } catch (error) {
      toast.error("Failed to load Petstore example");
    } finally {
      setIsAutoLoading(false);
    }
  };

  if (!hasHydrated) {
    return null;
  }

  if (isAutoLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-3 text-sm">Loading session...</span>
      </div>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <>
        {spec ? (
          <div className="p-4 h-screen grid grid-rows-[auto_1fr] gap-4">
            <div className="flex items-center gap-2">
              <SpecLoader />
              <ThemeToggle className="ml-auto" />
            </div>
            <div className="h-full overflow-hidden">
              <ResizablePanelGroup
                direction="horizontal"
                className="h-full gap-4"
              >
                <ResizablePanel
                  defaultSize={25}
                  minSize={20}
                  className="h-full"
                >
                  <div className="border rounded p-4 overflow-auto h-full">
                    <OperationExplorer />
                  </div>
                </ResizablePanel>
                <ResizableHandle className="bg-border" />
                <ResizablePanel
                  defaultSize={75}
                  minSize={50}
                  className="h-full"
                >
                  <div className="border rounded p-4 overflow-auto h-full">
                    <RequestBuilder />
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </div>
        ) : (
          <Dialog open={true}>
            <DialogContent className="p-4">
              <DialogHeader>
                <DialogTitle>Welcome to Plyt</DialogTitle>
                <DialogDescription>
                  Load an OpenAPI specification by URL or file to get started.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <SpecLoader />
                <Button variant="outline" onClick={loadPetstore}>
                  Or try the Petstore example
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        <Toaster />
      </>
    </ThemeProvider>
  );
}
