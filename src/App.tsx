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
import { Loader2 } from "lucide-react";
import { getSpec } from "@/lib/storage/sqliteRepository";
import BaseUrlSelector from "@/components/BaseUrlSelector";
import Sidebar from "@/components/Sidebar";
import WorkspacePage from "@/pages/WorkspacePage";
import EnvironmentsPage from "@/pages/EnvironmentsPage";
import HeadersPage from "@/pages/HeadersPage";
import AuthPage from "@/pages/AuthPage";
import { EnvironmentSelector } from "@/components/EnvironmentSelector";
import { WorkspaceSelector } from "@/components/WorkspaceSelector";
import { initDatabase } from "@/lib/storage/sqliteRepository";
import { useShallow } from "zustand/react/shallow";

export default function App() {
  const hasHydrated = useHasHydrated();

  // Use shallow selector to prevent re-renders on unrelated state changes
  const {
    spec,
    specId,
    setSpec,
    setOperations,
    activePage,
    setActivePage,
    workspaces,
    activeWorkspaceId,
    initializeAppState,
    createWorkspace,
  } = useAppStore(
    useShallow((s) => ({
      spec: s.spec,
      specId: s.specId,
      setSpec: s.setSpec,
      setOperations: s.setOperations,
      activePage: s.activePage,
      setActivePage: s.setActivePage,
      workspaces: s.workspaces,
      activeWorkspaceId: s.activeWorkspaceId,
      initializeAppState: s.initializeAppState,
      createWorkspace: s.createWorkspace,
    }))
  );

  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const activeWorkspace =
    activeWorkspaceId && workspaces[activeWorkspaceId]
      ? workspaces[activeWorkspaceId]
      : null;

  // Initialize SQLite database on first load
  useEffect(() => {
    if (!hasHydrated) return;

    const init = async () => {
      try {
        console.log("Initializing database...");
        await initDatabase();
        console.log("SQLite database initialized successfully");

        console.log("Loading workspaces from database...");
        await initializeAppState();
        console.log("App state initialized successfully");

        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize database:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setInitError(errorMessage);
        toast.error(`Failed to initialize database: ${errorMessage}`);
        setIsInitialized(true);
      }
    };
    init();
  }, [hasHydrated, initializeAppState]);

  // Create default workspace if none exists
  useEffect(() => {
    if (!hasHydrated) return;
    if (Object.keys(workspaces).length === 0 && !activeWorkspaceId) {
      createWorkspace("Workspace 1");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  // Load the spec whenever the active workspace changes (or its specId changes)
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isInitialized) return;
    if (!activeWorkspaceId) return;

    const ws = workspaces[activeWorkspaceId];
    if (!ws) return;

    // Only load if we don't already have the correct spec loaded
    if (ws.specId && spec && specId === ws.specId) {
      return; // Already have the correct spec
    }

    let cancelled = false;
    const load = async () => {
      setIsAutoLoading(true);
      try {
        if (ws.specId) {
          const dbSpec = await getSpec(ws.specId);
          if (!cancelled) {
            if (dbSpec) {
              try {
                const specData = JSON.parse(dbSpec.spec_content);
                setSpec(specData, ws.specId, ws.specUrl || undefined);
                setOperations(listOperations(specData));
              } catch (parseError) {
                console.error("Failed to parse spec content:", parseError);
                toast.error(
                  "Failed to parse stored specification. Resetting..."
                );
                // Clear spec if parsing fails
                // @ts-expect-error setSpec handles nulls
                setSpec(null, null, null);
              }
            } else {
              console.warn(
                "Spec ID present but not found in database:",
                ws.specId
              );
              // Clear spec from workspace if not found in DB to prevent getting stuck
              // @ts-expect-error setSpec handles nulls
              setSpec(null, null, null);
              setOperations([]);
            }
          }
        } else {
          // Workspace has no spec; ensure runtime state is clear
          if (!cancelled) {
            // @ts-expect-error setSpec handles nulls
            setSpec(null, null, null);
            setOperations([]);
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Failed loading spec for workspace:", e);
          toast.error("Failed to load workspace schema.");
          // Clear spec on error to exit loading state
          // @ts-expect-error setSpec handles nulls
          setSpec(null, null, null);
          setOperations([]);
        }
      } finally {
        if (!cancelled) {
          setIsAutoLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [
    hasHydrated,
    isInitialized,
    activeWorkspaceId,
    // Use optional chaining and default to null to ensure stability of dependency
    activeWorkspace?.specId || null,
    specId,
    setSpec,
    setOperations,
    setIsAutoLoading,
    workspaces, // workspaces needed for lookup inside effect, dependency structure is handled by activeWorkspaceId + optional specId
  ]);

  const loadPetstore = async () => {
    const url = "https://petstore3.swagger.io/api/v3/openapi.json";
    setIsAutoLoading(true);
    try {
      const { spec, id } = await loadSpec(url);
      setSpec(spec, id, url);
      setOperations(listOperations(spec));
    } catch {
      toast.error("Failed to load Petstore example");
    } finally {
      setIsAutoLoading(false);
    }
  };

  if (!hasHydrated || !isInitialized) {
    return (
      <div className="flex justify-center items-center w-screen h-screen bg-background text-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-3 text-sm">
          {!hasHydrated ? "Loading application..." : "Initializing database..."}
        </span>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex flex-col justify-center items-center w-screen h-screen bg-background text-foreground">
        <div className="text-destructive mb-4">
          Database initialization failed
        </div>
        <div className="text-sm text-muted-foreground mb-4">{initError}</div>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // Only show full screen loader if auto-loading is in progress AND we don't have a spec yet
  // If we have a spec (switching workspaces), we might want to keep showing the old one momentarily or show a loader
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
          <div className="flex h-screen overflow-hidden">
            <Sidebar activeItem={activePage} onItemClick={setActivePage} />
            <main className="flex flex-col flex-1 min-w-0">
              {/* Sticky header */}
              <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center px-4 h-14">
                  <div className="flex gap-3 items-center min-w-0">
                    <div className="text-lg font-bold tracking-tight shrink-0">
                      CoGeass
                    </div>
                    <WorkspaceSelector />
                    <div className="text-sm text-muted-foreground truncate max-w-[250px] hidden md:block">
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
                  <div className="flex flex-1 justify-center px-4 md:px-8 min-w-0">
                    <BaseUrlSelector />
                  </div>
                  <div className="flex gap-2 items-center ml-auto shrink-0">
                    <SpecLoader />
                    <ThemeToggle />
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                {renderActivePage()}
              </div>
            </main>
          </div>
        ) : activeWorkspace?.specId ? (
          // Workspace has a spec but it's still loading (or failed silently if isAutoLoading is false)
          // Since we fixed the error handling to clear specId on failure, this block effectively handles
          // the brief transition before isAutoLoading kicks in, or if something falls through.
          <div className="flex justify-center items-center w-screen h-screen bg-background text-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-3 text-sm">
              Loading workspace specification...
            </span>
          </div>
        ) : (
          // No spec in workspace, show welcome dialog
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
