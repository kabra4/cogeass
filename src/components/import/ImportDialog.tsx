import { useCallback, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  FileJson,
  Upload,
  Package,
  Moon,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";
import { loadSpec, listOperations } from "@/lib/openapi";
import {
  importFile,
  getFormatDisplayName,
  validateImportFile,
  type ImportFormat,
  type ImportResult,
  type ImportWarning,
} from "@/lib/import";
import { PathPatternEditor } from "./PathPatternEditor";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<ImportFormat>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Options
  const [workspaceName, setWorkspaceName] = useState("");
  const [inferSchemas, setInferSchemas] = useState(true);
  const [importEnvironments, setImportEnvironments] = useState(true);

  // Loading state
  const [isImporting, setIsImporting] = useState(false);

  // Store actions
  const createWorkspace = useAppStore((s) => s.createWorkspace);
  const setActiveWorkspace = useAppStore((s) => s.setActiveWorkspace);
  const setSpec = useAppStore((s) => s.setSpec);
  const setOps = useAppStore((s) => s.setOperations);
  const addEnvironment = useAppStore((s) => s.addEnvironment);
  const setVariableValue = useAppStore((s) => s.setVariableValue);
  const addVariableKey = useAppStore((s) => s.addVariableKey);

  const reset = useCallback(() => {
    setFileContent(null);
    setFileName(null);
    setDetectedFormat(null);
    setPreview(null);
    setError(null);
    setWorkspaceName("");
    setInferSchemas(true);
    setImportEnvironments(true);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }, []);

  const handleClose = useCallback(
    (open: boolean) => {
      if (!open) {
        reset();
      }
      onOpenChange(open);
    },
    [onOpenChange, reset]
  );

  const processFile = useCallback((content: string, name: string) => {
    setFileName(name);
    setError(null);

    try {
      const { format, parsedContent } = validateImportFile(content);
      setDetectedFormat(format);
      setFileContent(content);

      // Generate preview
      const result = importFile(parsedContent, {
        inferSchemas: true,
        importEnvironments: true,
      });
      setPreview(result);
      setWorkspaceName(result.metadata.sourceName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse file");
      setFileContent(null);
      setDetectedFormat(null);
      setPreview(null);
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          processFile(content, file.name);
        };
        reader.readAsText(file);
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          processFile(content, file.name);
        };
        reader.readAsText(file);
      }
    },
    [processFile]
  );

  const handleImport = useCallback(async () => {
    if (!fileContent || !preview) return;

    setIsImporting(true);

    try {
      // Re-import with user options
      const result = importFile(fileContent, {
        workspaceName: workspaceName || preview.metadata.sourceName,
        inferSchemas,
        importEnvironments,
        pathPatterns: preview.detectedPaths,
      });

      // Create workspace
      const wsId = createWorkspace(
        workspaceName || result.metadata.sourceName
      );
      setActiveWorkspace(wsId);

      // Convert to OpenAPI spec blob and load it
      const specJson = JSON.stringify(result.spec);
      const specBlob = new Blob([specJson], { type: "application/json" });
      const specFile = new File([specBlob], "imported-spec.json", {
        type: "application/json",
      });

      // Load the spec
      const { spec, id } = await loadSpec(specFile);
      setSpec(spec, id, `imported:${result.metadata.sourceName}`);
      setOps(listOperations(spec));

      // Import environments
      if (importEnvironments && result.environments.length > 0) {
        for (const env of result.environments) {
          const envId = addEnvironment(env.name);
          // Add variable keys and values
          for (const [key, value] of Object.entries(env.variables)) {
            addVariableKey(key);
            setVariableValue(envId, key, value);
          }
        }
      }

      // Show success
      const warningCount = result.warnings.length;
      if (warningCount > 0) {
        toast.success(
          `Imported ${result.metadata.endpointCount} endpoints with ${warningCount} warning${warningCount === 1 ? "" : "s"}`
        );
      } else {
        toast.success(
          `Imported ${result.metadata.endpointCount} endpoints successfully`
        );
      }

      handleClose(false);
    } catch (e) {
      console.error("Import failed:", e);
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  }, [
    fileContent,
    preview,
    workspaceName,
    inferSchemas,
    importEnvironments,
    createWorkspace,
    setActiveWorkspace,
    setSpec,
    setOps,
    addEnvironment,
    addVariableKey,
    setVariableValue,
    handleClose,
  ]);

  const FormatIcon = detectedFormat === "postman"
    ? Package
    : detectedFormat === "insomnia"
    ? Moon
    : FileJson;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Collection</DialogTitle>
          <DialogDescription>
            Import from Postman, Insomnia, or HAR files
          </DialogDescription>
        </DialogHeader>

        {/* Drop Zone */}
        {!preview && (
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors
              ${dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              Drop a file here, or click to select
            </p>
            <p className="text-xs text-muted-foreground">
              Supports .json, .yaml, .har files
            </p>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".json,.yaml,.yml,.har"
          onChange={handleFileSelect}
        />

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-line">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Preview */}
        {preview && (
          <div className="space-y-4">
            {/* Format Badge and Stats */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FormatIcon className="h-4 w-4 text-muted-foreground" />
                <Badge variant="secondary">
                  {getFormatDisplayName(detectedFormat)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {fileName}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                disabled={isImporting}
              >
                Change file
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">Endpoints</p>
                <p className="text-2xl font-bold">
                  {preview.metadata.endpointCount}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Requests</p>
                <p className="text-2xl font-bold">
                  {preview.metadata.requestCount}
                </p>
              </div>
            </div>

            {/* Warnings */}
            {preview.warnings.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  {preview.warnings.length} warning{preview.warnings.length === 1 ? "" : "s"}
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {preview.warnings.slice(0, 5).map((warning, i) => (
                    <WarningItem key={i} warning={warning} />
                  ))}
                  {preview.warnings.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      And {preview.warnings.length - 5} more...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Path Parameters */}
            {preview.detectedPaths.length > 0 && (
              <PathPatternEditor
                patterns={preview.detectedPaths}
                onChange={(patterns) =>
                  setPreview({ ...preview, detectedPaths: patterns })
                }
              />
            )}

            {/* Options */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspaceName">Workspace Name</Label>
                <Input
                  id="workspaceName"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder={preview.metadata.sourceName}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="inferSchemas"
                    checked={inferSchemas}
                    onCheckedChange={(checked) =>
                      setInferSchemas(checked === true)
                    }
                  />
                  <Label htmlFor="inferSchemas" className="text-sm">
                    Infer schemas from examples
                  </Label>
                </div>

                {preview.environments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="importEnvs"
                      checked={importEnvironments}
                      onCheckedChange={(checked) =>
                        setImportEnvironments(checked === true)
                      }
                    />
                    <Label htmlFor="importEnvs" className="text-sm">
                      Import {preview.environments.length} environment{preview.environments.length === 1 ? "" : "s"}
                    </Label>
                  </div>
                )}
              </div>
            </div>

            {/* Import Button */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Import
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function WarningItem({ warning }: { warning: ImportWarning }) {
  return (
    <div className="text-xs p-2 rounded bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
      {warning.context && (
        <span className="font-medium">{warning.context}: </span>
      )}
      {warning.message}
    </div>
  );
}
