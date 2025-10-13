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
import { Loader2, Server } from "lucide-react";
import { specRepository } from "@/lib/storage/SpecRepository";
import { Input } from "@/components/ui/input";

export default function App() {
  const hasHydrated = useHasHydrated();
  const { spec, specId, setSpec, setOperations, baseUrl, setBaseUrl } =
    useAppStore((s) => s);
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [layout, setLayout] = useState<[number, number] | null>(null);

  useEffect(() => {
    const autoLoadPreviousSpec = async () => {
      if (hasHydrated && !spec) {
        setIsAutoLoading(true);
        try {
          // Get the ID of the last spec, then fetch it
          const lastUsedId = await specRepository.getLastUsedId();
          if (lastUsedId) {
            const specData = await specRepository.getById(lastUsedId);
            if (!specData) return;
            setSpec(specData, lastUsedId);
            setOperations(listOperations(specData));
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
  }, [hasHydrated, spec, setSpec, setOperations]);

  // Persist base URL from localStorage on startup
  useEffect(() => {
    if (!hasHydrated) return;
    const saved = localStorage.getItem("cogeass.baseUrl");
    if (saved) setBaseUrl(saved);
  }, [hasHydrated, setBaseUrl]); // specId removed from dependencies

  // Save base URL to localStorage when it changes
  useEffect(
    () => localStorage.setItem("cogeass.baseUrl", baseUrl || ""),
    [baseUrl]
  );

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

  const loadPetstore = async () => {
    const url = "https://petstore3.swagger.io/api/v3/openapi.json";
    setIsAutoLoading(true);
    try {
      const { spec, id } = await loadSpec(url);
      setSpec(spec, id);
      setOperations(listOperations(spec));
    } catch {
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
          <div className="h-screen grid grid-rows-[auto_1fr]">
            {/* Sticky header */}
            <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="px-4 h-12 flex items-center gap-3">
                <div className="text-sm font-semibold tracking-tight">
                  CoGeass
                </div>
                <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                  {(() => {
                    try {
                      // Best effort to read spec title
                      const specObj = spec as Record<string, any>;
                      return specObj?.info?.title || "";
                    } catch {
                      return "";
                    }
                  })()}
                </div>
                <div className="flex-1 relative">
                  <Server className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Base URL"
                    value={baseUrl || ""}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="h-8 pl-8"
                  />
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <SpecLoader />
                  <ThemeToggle />
                </div>
              </div>
            </div>
            <div className="h-full overflow-hidden p-4">
              <ResizablePanelGroup
                direction="horizontal"
                className="h-full gap-4"
                onLayout={(sizes) => {
                  try {
                    localStorage.setItem(
                      "cogeass.layout",
                      JSON.stringify(sizes)
                    );
                  } catch {
                    // Ignore localStorage errors
                  }
                }}
              >
                <ResizablePanel
                  defaultSize={layout?.[0] ?? 25}
                  minSize={20}
                  className="h-full"
                >
                  <div className="border rounded-lg p-3 overflow-auto h-full">
                    <OperationExplorer />
                  </div>
                </ResizablePanel>
                <ResizableHandle className="bg-border" />
                <ResizablePanel
                  defaultSize={layout?.[1] ?? 75}
                  minSize={50}
                  className="h-full"
                >
                  <div className="border rounded-lg p-3 overflow-auto h-full">
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
                <DialogTitle className="text-lg">
                  Welcome to CoGeass
                </DialogTitle>
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
