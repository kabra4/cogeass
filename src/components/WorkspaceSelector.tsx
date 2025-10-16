import { ChevronDown, Edit3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/store/useAppStore";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export function WorkspaceSelector() {
  const {
    workspaces,
    workspaceOrder,
    activeWorkspaceId,
    setActiveWorkspace,
    createWorkspace,
    renameWorkspace,
    removeWorkspace,
  } = useAppStore();

  const active = activeWorkspaceId ? workspaces[activeWorkspaceId] : null;
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      renameWorkspace(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-3 font-medium">
          <span className="truncate max-w-[160px]">
            {active ? active.name : "No Workspace"}
          </span>
          <ChevronDown className="ml-2 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[260px]">
        {workspaceOrder.map((id) => {
          const ws = workspaces[id];
          const isActive = id === activeWorkspaceId;
          return (
            <DropdownMenuItem
              key={id}
              className="flex items-center justify-between gap-2 cursor-pointer"
              onClick={() => setActiveWorkspace(id)}
            >
              <div className="flex items-center gap-2 flex-1">
                <span className="truncate">{ws.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  startRename(ws.id, ws.name);
                }}
                title="Rename"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
              {!isActive && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeWorkspace(ws.id);
                  }}
                  title="Delete workspace"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => createWorkspace()}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Workspace
        </DropdownMenuItem>

        {renamingId && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <div className="text-xs mb-2 text-muted-foreground">Rename</div>
              <div className="flex gap-2">
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  className="h-8"
                  autoFocus
                />
                <Button size="sm" onClick={commitRename}>
                  Save
                </Button>
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
