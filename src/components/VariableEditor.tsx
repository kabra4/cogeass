import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface VariableEditorProps {
  variables: Record<string, string>;
  onChange: (variables: Record<string, string>) => void;
  placeholder?: {
    key?: string;
    value?: string;
  };
}

type VariableRow = {
  id: number;
  key: string;
  value: string;
};

// Create a unique ID for rows
let idCounter = 0;
const nextId = () => Date.now() + idCounter++;

export default function VariableEditor({ variables, onChange, placeholder }: VariableEditorProps) {
  const [rows, setRows] = useState<VariableRow[]>([]);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    const newRows = Object.entries(variables || {}).map(([key, value]) => ({
      id: nextId(),
      key,
      value,
    }));
    setRows(newRows);
  }, [variables]);

  const triggerChange = (currentRows: VariableRow[]) => {
    const newVariables: Record<string, string> = {};
    currentRows.forEach((row) => {
      // Only include variables with a non-empty key
      if (row.key.trim()) {
        newVariables[row.key.trim()] = row.value;
      }
    });
    isInternalChange.current = true;
    onChange(newVariables);
  };

  const handleAddRow = () => {
    const newRows = [...rows, { id: nextId(), key: "", value: "" }];
    setRows(newRows);
    triggerChange(newRows); // Propagate change even for empty row
  };

  const handleRemoveRow = (id: number) => {
    const newRows = rows.filter((row) => row.id !== id);
    setRows(newRows);
    triggerChange(newRows);
  };

  const handleChange = (id: number, field: "key" | "value", text: string) => {
    const newRows = rows.map((row) =>
      row.id === id ? { ...row, [field]: text } : row
    );
    setRows(newRows);
    triggerChange(newRows);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center text-sm font-medium px-1">
        <span>Variable Name</span>
        <span>Value</span>
        <span />
      </div>
      {rows.map((row) => (
        <div
          key={row.id}
          className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center"
        >
          <Input
            placeholder={placeholder?.key || "VARIABLE_NAME"}
            value={row.key}
            onChange={(e) => handleChange(row.id, "key", e.target.value)}
            className="font-mono"
            aria-label="Variable name"
          />
          <Input
            placeholder={placeholder?.value || "Variable value"}
            value={row.value}
            onChange={(e) => handleChange(row.id, "value", e.target.value)}
            aria-label="Variable value"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemoveRow(row.id)}
            title="Remove variable"
            aria-label="Remove variable"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAddRow}
        className="mt-2"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Variable
      </Button>
    </div>
  );
}
