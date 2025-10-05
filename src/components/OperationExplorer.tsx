import { useState, useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Input } from "@/components/ui/input";

export default function OperationExplorer() {
  const { operations, setSelected } = useAppStore();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return operations.filter(
      (o) =>
        o.path.toLowerCase().includes(term) ||
        o.op.summary?.toLowerCase().includes(term) ||
        o.tag.toLowerCase().includes(term)
    );
  }, [operations, q]);

  return (
    <div className="flex flex-col gap-2 overflow-auto">
      <Input
        placeholder="Search operations"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="space-y-1">
        {filtered.map((o) => (
          <div
            key={`${o.method}:${o.path}`}
            className="border rounded p-2 cursor-pointer hover:bg-muted"
            onClick={() => setSelected(o)}
          >
            <div className="text-xs uppercase">{o.method}</div>
            <div className="font-mono text-sm">{o.path}</div>
            <div className="text-xs text-muted-foreground">
              {o.op.summary || o.tag}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
