import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { DetectedPathParam } from "@/lib/import";

interface PathPatternEditorProps {
  patterns: DetectedPathParam[];
  onChange: (patterns: DetectedPathParam[]) => void;
}

export function PathPatternEditor({ patterns, onChange }: PathPatternEditorProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingParamIndex, setEditingParamIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  if (patterns.length === 0) {
    return null;
  }

  const startEditing = (patternIndex: number, paramIndex: number, currentName: string) => {
    setEditingIndex(patternIndex);
    setEditingParamIndex(paramIndex);
    setEditValue(currentName);
  };

  const saveEdit = () => {
    if (editingIndex === null || editingParamIndex === null) return;

    const newPatterns = patterns.map((pattern, i) => {
      if (i !== editingIndex) return pattern;

      const newParams = pattern.parameters.map((param, j) => {
        if (j !== editingParamIndex) return param;
        return { ...param, name: editValue };
      });

      // Rebuild parameterized path with new param names
      const segments = pattern.parameterizedPath.split("/").filter(Boolean);
      for (const param of newParams) {
        segments[param.segmentIndex] = `{${param.name}}`;
      }

      return {
        ...pattern,
        parameters: newParams,
        parameterizedPath: "/" + segments.join("/"),
      };
    });

    onChange(newPatterns);
    setEditingIndex(null);
    setEditingParamIndex(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingParamIndex(null);
    setEditValue("");
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="flex items-center gap-2 text-sm font-medium hover:underline"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        Detected Path Parameters ({patterns.length})
      </button>

      {expanded && (
        <div className="space-y-2 pl-6">
          <p className="text-xs text-muted-foreground mb-2">
            Edit parameter names to customize the OpenAPI path structure
          </p>

          {patterns.map((pattern, patternIndex) => (
            <div
              key={patternIndex}
              className="p-3 rounded-lg bg-muted/50 space-y-2"
            >
              {/* Original path */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Original:</span>
                <code className="font-mono">{pattern.originalPath}</code>
              </div>

              {/* Parameterized path */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Converted:</span>
                <code className="font-mono text-primary">
                  {pattern.parameterizedPath}
                </code>
                <Badge variant="outline" className="text-xs">
                  {Math.round(pattern.confidence * 100)}% confidence
                </Badge>
              </div>

              {/* Parameters */}
              <div className="flex flex-wrap gap-2 mt-2">
                {pattern.parameters.map((param, paramIndex) => {
                  const isEditing =
                    editingIndex === patternIndex &&
                    editingParamIndex === paramIndex;

                  if (isEditing) {
                    return (
                      <div
                        key={paramIndex}
                        className="flex items-center gap-1"
                      >
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="h-7 w-32 text-xs"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={saveEdit}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={cancelEdit}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={paramIndex}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-background border text-xs"
                    >
                      <span className="font-mono">{`{${param.name}}`}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-muted-foreground">
                        {param.exampleValue}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 ml-1"
                        onClick={() =>
                          startEditing(patternIndex, paramIndex, param.name)
                        }
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
