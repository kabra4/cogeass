import { useAppStore } from "@/store/useAppStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Server, ChevronDown } from "lucide-react";

export default function BaseUrlSelector() {
  const { baseUrl, setBaseUrl, spec } = useAppStore();

  // Extract servers from OpenAPI V3 spec
  type Server = { url: string; description?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const servers: Server[] = (spec as any)?.servers || [];

  return (
    <div className="relative w-full max-w-xl flex gap-1">
      <div className="relative flex-1">
        <Server className="absolute top-2.5 left-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Base URL"
          value={baseUrl || ""}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {servers.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              title="Select Base URL from Spec"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[400px]">
            {servers.map((server: Server, idx: number) => (
              <DropdownMenuItem
                key={idx}
                onClick={() => setBaseUrl(server.url)}
                className="flex flex-col items-start gap-1 cursor-pointer"
              >
                <span className="font-medium text-sm">{server.url}</span>
                {server.description && (
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {server.description}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
