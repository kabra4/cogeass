import { useEffect, useRef, useState } from "react";
import { loadSpec, listOperations } from "@/lib/openapi";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, RefreshCw, Import } from "lucide-react";
import { detectFormat } from "@/lib/import";
import { ImportDialog } from "./import";

export default function SpecLoader() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const setSpec = useAppStore((s) => s.setSpec);
  const setOps = useAppStore((s) => s.setOperations);
  const specUrl = useAppStore((s) => s.specUrl);

  // Sync local state with persisted specUrl when workspace changes
  useEffect(() => {
    setUrl(specUrl || "");
  }, [specUrl]);

  async function doLoad(specInput: string | File) {
    setIsLoading(true);
    try {
      // Check if file is an importable format (Postman, Insomnia, HAR)
      if (specInput instanceof File) {
        const content = await specInput.text();
        const format = detectFormat(content);
        if (format) {
          // This is an importable format - use the import dialog
          setIsImportOpen(true);
          setIsLoading(false);
          return;
        }
      }

      const { spec, id } = await loadSpec(specInput);
      const sourceUrl =
        typeof specInput === "string" ? specInput : specInput.name;
      setSpec(spec, id, sourceUrl);
      setOps(listOperations(spec));
      // Update local state to match what was loaded
      if (typeof specInput === "string") {
        setUrl(specInput);
      }
      toast.success("Specification loaded successfully");
    } catch {
      toast.error("Failed to load or parse the specification.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReload() {
    if (!specUrl) {
      toast.error("No spec URL to reload");
      return;
    }
    await doLoad(specUrl);
  }

  async function handlePasteUrl() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text);
    } catch {
      toast.error("Failed to read clipboard");
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        placeholder="Spec URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <Button disabled={isLoading || !url} onClick={() => doLoad(url)}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load"}
      </Button>
      <Button
        variant="secondary"
        disabled={isLoading || !specUrl}
        onClick={handleReload}
        title="Reload from saved URL"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="secondary"
        disabled={isLoading}
        onClick={handlePasteUrl}
        title="Paste URL from clipboard"
      >
        Paste
      </Button>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".json,.yaml,.yml,.har"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) doLoad(f);
        }}
      />
      <Button disabled={isLoading} onClick={() => fileRef.current?.click()}>
        Upload
      </Button>
      <Button
        variant="outline"
        disabled={isLoading}
        onClick={() => setIsImportOpen(true)}
        title="Import from Postman, Insomnia, or HAR"
      >
        <Import className="h-4 w-4" />
      </Button>

      <ImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
      />
    </div>
  );
}
