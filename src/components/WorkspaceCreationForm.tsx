import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadSpec, listOperations } from "@/lib/openapi";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

interface WorkspaceCreationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

export function WorkspaceCreationForm({ onSuccess, onCancel, showCancel }: WorkspaceCreationFormProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createWorkspace = useAppStore(s => s.createWorkspace);
  const setSpec = useAppStore(s => s.setSpec);
  const setOperations = useAppStore(s => s.setOperations);

  const handleCreate = async (specInput: string | File) => {
    setIsLoading(true);
    try {
      // 1. Load Spec (validates it)
      const { spec, id } = await loadSpec(specInput);

      // 2. Create Workspace
      const wsName = name.trim() || "New Workspace";
      // This sets the new workspace as active immediately
      createWorkspace(wsName);

      // 3. Set Spec on the new active workspace
      const sourceUrl = typeof specInput === "string" ? specInput : specInput.name;
      setSpec(spec, id, sourceUrl);
      setOperations(listOperations(spec));

      toast.success("Workspace created successfully");
      setName("");
      setUrl("");
      onSuccess?.();
    } catch (e) {
      console.error(e);
      toast.error("Failed to load specification. Workspace not created.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="ws-name">Workspace Name</Label>
        <Input
          id="ws-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. My API"
        />
      </div>

      <div className="grid gap-2">
        <Label>Specification</Label>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://api.example.com/openapi.json"
            onKeyDown={(e) => {
                if (e.key === "Enter" && url) handleCreate(url);
            }}
          />
          <Button size="icon" variant="outline" onClick={() => fileInputRef.current?.click()} title="Upload File">
            <Upload className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".json,.yaml,.yml"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleCreate(f);
            }}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-2">
        {showCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
            </Button>
        )}
        <Button disabled={!url && !isLoading} onClick={() => handleCreate(url)}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Workspace
        </Button>
      </div>
    </div>
  );
}
