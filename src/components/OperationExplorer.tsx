import { useState, useMemo, useRef, useEffect } from "react";
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
import { Search } from "lucide-react";

export default function OperationExplorer() {
  const { operations, selected, setSelected } = useAppStore();
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

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

  // Focus search with "/" like many tools
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/") {
        const t = e.target as HTMLElement | null;
        const tag = (t?.tagName || "").toLowerCase();
        const isEditable = t?.isContentEditable;
        const isTypingField =
          isEditable ||
          tag === "input" ||
          tag === "textarea" ||
          tag === "select";
        if (isTypingField) return;
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function Highlight({
    text,
    term,
  }: {
    text: string;
    term: string;
  }): React.ReactElement {
    if (!term) return (<>{text}</>) as React.ReactElement;
    const parts = text.split(new RegExp(`(${escapeRegExp(term)})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === term.toLowerCase() ? (
            <mark
              key={i}
              className="rounded px-0.5 bg-yellow-200 dark:bg-yellow-500/20"
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    ) as React.ReactElement;
  }

  return (
    <div className="flex flex-col gap-2 h-full overflow-auto">
      <div className="sticky top-0 z-10 bg-background pb-2">
        <div className="relative">
          <Input
            ref={searchRef}
            placeholder="Search operations (/ to focus)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <Accordion
        type="multiple"
        defaultValue={groups.map(([tag]) => tag)}
        className="w-full"
      >
        {groups.map(([tag, ops]) => (
          <AccordionItem key={tag} value={tag}>
            <AccordionTrigger className="hover:no-underline">
              <span className="text-base font-medium">{tag}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {ops.length}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1 pt-1">
                {ops.map((o: any) => {
                  const isActive =
                    selected &&
                    selected.method === o.method &&
                    selected.path === o.path;
                  const methodColors = {
                    get: "bg-green-600 hover:bg-green-600/80 text-white",
                    post: "bg-blue-600 hover:bg-blue-600/80 text-white",
                    put: "bg-orange-600 hover:bg-orange-600/80 text-white",
                    patch: "bg-yellow-700 hover:bg-yellow-600/80 text-white",
                    delete: "bg-red-600 hover:bg-red-600/80 text-white",
                    head: "bg-gray-600 hover:bg-gray-600/80 text-white",
                    options: "bg-purple-600 hover:bg-purple-600/80 text-white",
                  } as const;
                  const methodColor =
                    methodColors[
                      o.method.toLowerCase() as keyof typeof methodColors
                    ] || "bg-gray-500 hover:bg-gray-500/80 text-white";
                  return (
                    <div
                      key={`${o.method}:${o.path}`}
                      className={clsx(
                        "flex items-center gap-2 border rounded-md p-2 cursor-pointer hover:bg-muted transition-colors",
                        isActive && "bg-accent border-2 border-primary"
                      )}
                      onClick={() => setSelected(o)}
                      role="button"
                      aria-pressed={isActive ? "true" : "false"}
                    >
                      <Badge className={`${methodColor} w-14 justify-center`}>
                        {o.method.toUpperCase()}
                      </Badge>
                      <div className="flex-1">
                        <div
                          className={clsx(
                            "text-sm",
                            !o.op.summary && "font-mono"
                          )}
                        >
                          <Highlight text={o.op.summary || o.path} term={q} />
                        </div>
                        <div
                          className={clsx(
                            "text-xs text-muted-foreground",
                            o.op.summary && "font-mono"
                          )}
                        >
                          <Highlight
                            text={o.op.summary ? o.path : o.tag}
                            term={q}
                          />
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
      {filtered.length === 0 && (
        <div className="text-sm text-muted-foreground py-6 text-center">
          No operations match "{q}".
        </div>
      )}
    </div>
  );
}
