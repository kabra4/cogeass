import { useState, useEffect } from "react";
import SpecLoader from "@/components/SpecLoader";
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
import { Loader2, Server } from "lucide-react";
import { specRepository } from "@/lib/storage/SpecRepository";
import { Input } from "@/components/ui/input";
import Sidebar from "@/components/Sidebar";
import WorkspacePage from "@/pages/WorkspacePage";
import EnvironmentsPage from "@/pages/EnvironmentsPage";
import HeadersPage from "@/pages/HeadersPage";
import AuthPage from "@/pages/AuthPage";
import { EnvironmentSelector } from "@/components/EnvironmentSelector";

type ActivePage = "workspace" | "auth" | "envs" | "headers";

export default function App() {
  const hasHydrated = useHasHydrated();
  const { spec, setSpec, setOperations, baseUrl, setBaseUrl } = useAppStore(
    (s) => s
  );
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [activePage, setActivePage] = useState<ActivePage>("workspace");

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
      <div className="flex justify-center items-center w-screen h-screen bg-background text-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-3 text-sm">Loading session...</span>
      </div>
    );
  }

  const renderActivePage = () => {
    switch (activePage) {
      case "workspace":
        return <WorkspacePage />;
      case "auth":
        return <AuthPage />;
      case "envs":
        return <EnvironmentsPage />;
      case "headers":
        return <HeadersPage />;
      default:
        return <WorkspacePage />;
    }
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <>
        {spec ? (
          <div className="flex h-screen">
            <Sidebar activeItem={activePage} onItemClick={setActivePage} />
            <main className="flex flex-col flex-1">
              {/* Sticky header */}
              <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center px-4 h-14">
                  <div className="flex gap-3 items-center">
                    <div className="text-lg font-bold tracking-tight">
                      CoGeass
                    </div>
                    <div className="text-sm text-muted-foreground truncate max-w-[250px]">
                      {(() => {
                        try {
                          // Best effort to read spec title
                          const specObj = spec as Record<string, unknown>;
                          const info = specObj?.info as
                            | Record<string, unknown>
                            | undefined;
                          return (info?.title as string) || "";
                        } catch {
                          return "";
                        }
                      })()}
                    </div>
                    <EnvironmentSelector
                      onManageEnvironments={() => setActivePage("envs")}
                    />
                  </div>
                  <div className="flex flex-1 justify-center px-8">
                    <div className="relative w-full max-w-xl">
                      <Server className="absolute top-2.5 left-2.5 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Base URL"
                        value={baseUrl || ""}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 items-center ml-auto">
                    <SpecLoader />
                    <ThemeToggle />
                  </div>
                </div>
              </div>
              {renderActivePage()}
            </main>
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
