import { useState, useEffect } from "react";
import SpecLoader from "@/components/SpecLoader";
import { useAppStore } from "@/store/useAppStore";
import { ThemeProvider } from "next-themes";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { WorkspaceCreationForm } from "@/components/WorkspaceCreationForm";

export default function App() {
  const hasHydrated = useHasHydrated();

  const {
    spec,
    specId,
    specUrl,
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
      specUrl: s.specUrl,
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

  // These are the runtime values set by __applyWorkspaceToRoot when workspace changes
  const runtimeSpecId = specId;
  const runtimeSpecUrl = specUrl;

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

  // Load the spec whenever the active workspace changes (or its specId changes)
  // We use the runtime specId/specUrl from the store (set by __applyWorkspaceToRoot)
  // as the source of truth for when to load a new spec
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isInitialized) return;
    if (!activeWorkspaceId) return;

    // Only load if we don't already have the correct spec loaded
    // runtimeSpecId is what we SHOULD have, specId is what we currently have in memory
    if (runtimeSpecId && spec && specId === runtimeSpecId) {
      return; // Already have the correct spec
    }

    let cancelled = false;
    const load = async () => {
      setIsAutoLoading(true);
      try {
        if (runtimeSpecId) {
          const dbSpec = await getSpec(runtimeSpecId);
          if (!cancelled) {
            if (dbSpec) {
              try {
                const specData = JSON.parse(dbSpec.spec_content);
                // Use runtimeSpecUrl which is set by __applyWorkspaceToRoot
                setSpec(specData, runtimeSpecId, runtimeSpecUrl || undefined);
                setOperations(listOperations(specData));
              } catch (parseError) {
                console.error("Failed to parse spec content:", parseError);
                toast.error(
                  "Failed to parse stored specification. Resetting..."
                );
                // @ts-expect-error setSpec handles nulls
                setSpec(null, null, null);
              }
            } else {
              console.warn(
                "Spec ID present but not found in database:",
                runtimeSpecId
              );
              // @ts-expect-error setSpec handles nulls
              setSpec(null, null, null);
              setOperations([]);
            }
          }
        } else {
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
    runtimeSpecId,
    runtimeSpecUrl,
    specId,
    spec,
    setSpec,
    setOperations,
  ]);

  const loadPetstore = async () => {
    const url = "https://petstore3.swagger.io/api/v3/openapi.json";
    // For manual loading when spec is missing in existing workspace
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

  const createPetstoreWorkspace = async () => {
    const url = "https://petstore3.swagger.io/api/v3/openapi.json";
    setIsAutoLoading(true);
    try {
      const { spec, id } = await loadSpec(url);
      createWorkspace("Petstore Example");
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

  // Determine view state
  const showLoading = isAutoLoading || (activeWorkspace?.specId && !spec);
  // Show empty state if no workspace is selected OR if the selected workspace has no spec loaded
  const showEmpty = !showLoading && (!activeWorkspaceId || !spec);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        {/* Sidebar is only visible if we have a workspace to manage */}
        {activeWorkspaceId && (
          <Sidebar activeItem={activePage} onItemClick={setActivePage} />
        )}

        <main className="flex flex-col flex-1 min-w-0">
          {/* Header is always visible */}
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
                {activeWorkspaceId && (
                  <EnvironmentSelector
                    onManageEnvironments={() => setActivePage("envs")}
                  />
                )}
              </div>
              <div className="flex flex-1 justify-center px-4 md:px-8 min-w-0">
                {activeWorkspaceId && <BaseUrlSelector />}
              </div>
              <div className="flex gap-2 items-center ml-auto shrink-0">
                {activeWorkspaceId && <SpecLoader />}
                <ThemeToggle />
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-h-0 overflow-hidden relative">
            {showLoading ? (
              <div className="absolute inset-0 flex justify-center items-center bg-background/80 z-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-3 text-sm">
                  Loading workspace specification...
                </span>
              </div>
            ) : showEmpty ? (
              <div className="flex justify-center items-center h-full p-4 bg-muted/10">
                <Card className="w-full max-w-lg shadow-md">
                  <CardHeader>
                    <CardTitle className="text-xl">
                      {!activeWorkspaceId
                        ? "Create First Workspace"
                        : "Load Specification"}
                    </CardTitle>
                    <CardDescription>
                      {!activeWorkspaceId
                        ? "Create a new workspace by loading an OpenAPI specification."
                        : "This workspace has no specification loaded. Load one to continue."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {!activeWorkspaceId ? (
                      // Case 1: No workspace at all. Show Creation Form.
                      <WorkspaceCreationForm />
                    ) : (
                      // Case 2: Workspace exists but no spec. Show Loader for current workspace.
                      <SpecLoader />
                    )}

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                          Or
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={
                        !activeWorkspaceId
                          ? createPetstoreWorkspace
                          : loadPetstore
                      }
                      className="w-full"
                    >
                      Try the Petstore Example
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              renderActivePage()
            )}
          </div>
        </main>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
