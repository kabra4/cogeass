import { Briefcase, Layers, MessageSquare, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import HistoryPanel from "@/components/HistoryPanel";

type NavItem = {
  id: "workspace" | "auth" | "envs" | "headers";
  label: string;
  icon: React.ElementType;
};

const navItems: NavItem[] = [
  { id: "workspace", label: "Workspace", icon: Briefcase },
  { id: "auth", label: "Authorization", icon: Shield },
  { id: "envs", label: "Environments", icon: Layers },
  { id: "headers", label: "Headers", icon: MessageSquare },
];

interface SidebarProps {
  activeItem: string;
  onItemClick: (id: NavItem["id"]) => void;
}

export default function Sidebar({ activeItem, onItemClick }: SidebarProps) {
  return (
    <nav className="flex flex-col items-center gap-y-2 p-2 w-16 bg-muted border-r h-full">
      <TooltipProvider delayDuration={0}>
        {navItems.map((item) => (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onItemClick(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center w-12 h-12 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                  activeItem === item.id && "bg-accent text-accent-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="sr-only">{item.label}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{item.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
      <HistoryPanel />
    </nav>
  );
}
