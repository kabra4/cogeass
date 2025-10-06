import { useState, useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Input } from "@/components/ui/input";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { clsx } from "clsx";

export default function OperationExplorer() {
  const { operations, selected, setSelected } = useAppStore();
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

  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((o) => {
      const tag = o.tag || "Other";
      if (!map.has(tag)) map.set(tag, []);
      map.get(tag)?.push(o);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="flex flex-col gap-2 overflow-auto">
      <Input
        placeholder="Search operations"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <Accordion
        type="multiple"
        defaultValue={groups.map(([tag]) => tag)}
        className="w-full"
      >
        {groups.map(([tag, ops]) => (
          <AccordionItem key={tag} value={tag}>
            <AccordionTrigger className="hover:no-underline">
              <span className="text-base font-medium">{tag}</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1 pt-1">
                {ops.map((o) => {
                  const isActive =
                    selected &&
                    selected.method === o.method &&
                    selected.path === o.path;
                  const methodColor =
                    {
                      get: "bg-green-500 hover:bg-green-500/80 text-white",
                      post: "bg-blue-500 hover:bg-blue-500/80 text-white",
                      put: "bg-orange-500 hover:bg-orange-500/80 text-white",
                      patch: "bg-yellow-500 hover:bg-yellow-500/80 text-white",
                      delete: "bg-red-500 hover:bg-red-500/80 text-white",
                      head: "bg-gray-500 hover:bg-gray-500/80 text-white",
                      options:
                        "bg-purple-500 hover:bg-purple-500/80 text-white",
                    }[o.method.toLowerCase()] ||
                    "bg-gray-500 hover:bg-gray-500/80 text-white";
                  return (
                    <div
                      key={`${o.method}:${o.path}`}
                      className={clsx(
                        "flex items-center gap-2 border rounded p-2 cursor-pointer hover:bg-muted",
                        isActive && "bg-accent border-2 border-primary"
                      )}
                      onClick={() => setSelected(o)}
                    >
                      <Badge className={`${methodColor} w-14 justify-center`}>
                        {o.method.toUpperCase()}
                      </Badge>
                      <div className="flex-1">
                        <div className="font-mono text-sm">{o.path}</div>
                        <div className="text-xs text-muted-foreground">
                          {o.op.summary || o.tag}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
