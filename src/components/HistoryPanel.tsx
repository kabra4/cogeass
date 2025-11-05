import { useAppStore } from "@/store/useAppStore";
import { Badge } from "@/components/ui/badge";
import { clsx } from "clsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock } from "lucide-react";

export default function HistoryPanel() {
  const { history, setSelected, selected } = useAppStore();

  if (history.length === 0) {
    return null;
  }

  const methodColors = {
    get: "bg-green-600 hover:bg-green-600/80 text-white",
    post: "bg-blue-600 hover:bg-blue-600/80 text-white",
    put: "bg-orange-600 hover:bg-orange-600/80 text-white",
    patch: "bg-yellow-700 hover:bg-yellow-600/80 text-white",
    delete: "bg-red-600 hover:bg-red-600/80 text-white",
    head: "bg-gray-600 hover:bg-gray-600/80 text-white",
    options: "bg-purple-600 hover:bg-purple-600/80 text-white",
  } as const;

  return (
    <div className="border-t pt-2 mt-auto">
      <div className="flex items-center gap-2 px-2 mb-2">
        <Clock className="w-3.5 h-3.5 ml-2 text-muted-foreground" />
      </div>
      <TooltipProvider delayDuration={0}>
        <div className="flex flex-col gap-1">
          {history.map((item) => {
            const op = item.operationRef;
            const isActive =
              selected &&
              selected.method === op.method &&
              selected.path === op.path;
            const methodColor =
              methodColors[
                op.method.toLowerCase() as keyof typeof methodColors
              ] || "bg-gray-500 hover:bg-gray-500/80 text-white";

            return (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSelected(op)}
                    className={clsx(
                      "flex items-center justify-center w-12 h-12 mx-auto rounded-lg transition-colors",
                      isActive
                        ? "bg-accent border-2 border-primary"
                        : "hover:bg-accent"
                    )}
                  >
                    <Badge
                      className={clsx(
                        methodColor,
                        "text-[10px] font-bold px-1.5 py-0.5 min-w-[42px] justify-center"
                      )}
                    >
                      {op.method.toUpperCase()}
                    </Badge>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="p-0 w-64 bg-background text-foreground border"
                >
                  <div
                    className={clsx(
                      "flex items-center gap-2 border rounded-md p-2 cursor-pointer hover:bg-muted transition-colors",
                      isActive && "bg-accent border-2 border-primary"
                    )}
                  >
                    <Badge
                      className={`${methodColor} w-14 justify-center flex-shrink-0`}
                    >
                      {op.method.toUpperCase()}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">
                        {op.op.summary || op.path}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        {op.op.summary ? op.path : op.tag}
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
