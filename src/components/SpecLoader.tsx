import { useRef, useState } from "react";
import { loadSpec, listOperations } from "@/lib/openapi";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function SpecLoader() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const setSpec = useAppStore((s) => s.setSpec);
  const setOps = useAppStore((s) => s.setOperations);

  async function doLoad(specInput: string | File) {
    setIsLoading(true);
    try {
      const { spec, id } = await loadSpec(specInput);
      setSpec(spec, id);
      setOps(listOperations(spec));
    } catch (error) {
      toast.error("Failed to load or parse the specification.");
    } finally {
      setIsLoading(false);
    }
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
        accept=".json,.yaml,.yml"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) doLoad(f);
        }}
      />
      <Button disabled={isLoading} onClick={() => fileRef.current?.click()}>
        Upload
      </Button>
    </div>
  );
}
