import { ChevronDown, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

const environmentColors = [
  {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
  { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
  { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
  { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-200" },
  { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" },
  { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
  { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-200" },
];

const darkEnvironmentColors = [
  {
    bg: "dark:bg-emerald-900/20",
    text: "dark:text-emerald-300",
    border: "dark:border-emerald-800",
  },
  {
    bg: "dark:bg-blue-900/20",
    text: "dark:text-blue-300",
    border: "dark:border-blue-800",
  },
  {
    bg: "dark:bg-purple-900/20",
    text: "dark:text-purple-300",
    border: "dark:border-purple-800",
  },
  {
    bg: "dark:bg-orange-900/20",
    text: "dark:text-orange-300",
    border: "dark:border-orange-800",
  },
  {
    bg: "dark:bg-pink-900/20",
    text: "dark:text-pink-300",
    border: "dark:border-pink-800",
  },
  {
    bg: "dark:bg-yellow-900/20",
    text: "dark:text-yellow-300",
    border: "dark:border-yellow-800",
  },
  {
    bg: "dark:bg-red-900/20",
    text: "dark:text-red-300",
    border: "dark:border-red-800",
  },
  {
    bg: "dark:bg-indigo-900/20",
    text: "dark:text-indigo-300",
    border: "dark:border-indigo-800",
  },
];

function getEnvironmentColor(index: number) {
  const colorIndex = index % environmentColors.length;
  const lightColors = environmentColors[colorIndex];
  const darkColors = darkEnvironmentColors[colorIndex];

  return {
    bg: cn(lightColors.bg, darkColors.bg),
    text: cn(lightColors.text, darkColors.text),
    border: cn(lightColors.border, darkColors.border),
  };
}

interface EnvironmentSelectorProps {
  onManageEnvironments: () => void;
}

export function EnvironmentSelector({
  onManageEnvironments,
}: EnvironmentSelectorProps) {
  const {
    environments,
    environmentKeys,
    activeEnvironmentId,
    setActiveEnvironment,
    addEnvironment,
  } = useAppStore();

  const environmentsList = Object.values(environments);
  const activeEnvironment = activeEnvironmentId
    ? environments[activeEnvironmentId]
    : null;
  const activeEnvironmentIndex = environmentsList.findIndex(
    (env) => env.id === activeEnvironmentId
  );

  const handleCreateQuickEnvironment = () => {
    const name = `Environment ${environmentsList.length + 1}`;
    const id = addEnvironment(name);
    setActiveEnvironment(id);
  };

  const activeColors = activeEnvironment
    ? getEnvironmentColor(activeEnvironmentIndex)
    : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 px-3 font-medium transition-colors",
            activeColors && [
              activeColors.bg,
              activeColors.text,
              activeColors.border,
              "hover:opacity-80",
            ]
          )}
        >
          <span className="truncate max-w-[120px]">
            {activeEnvironment ? activeEnvironment.name : "No Environment"}
          </span>
          <ChevronDown className="ml-2 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuItem
          onClick={() => setActiveEnvironment(null)}
          className={cn("cursor-pointer", !activeEnvironmentId && "bg-accent")}
        >
          <span className="flex-1">No Environment</span>
        </DropdownMenuItem>

        {environmentsList.length > 0 && <DropdownMenuSeparator />}

        {environmentsList.map((env, index) => {
          const colors = getEnvironmentColor(index);
          const isActive = env.id === activeEnvironmentId;

          return (
            <DropdownMenuItem
              key={env.id}
              onClick={() => setActiveEnvironment(env.id)}
              className={cn("cursor-pointer", isActive && "bg-accent")}
            >
              <div className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    "w-3 h-3 rounded-full border",
                    colors.bg,
                    colors.border
                  )}
                />
                <span className="truncate">{env.name}</span>
              </div>
              {environmentKeys.length > 0 && (
                <span className="text-xs text-muted-foreground ml-2">
                  {environmentKeys.length} vars
                </span>
              )}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleCreateQuickEnvironment}
          className="cursor-pointer"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span>Create Environment</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={onManageEnvironments}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Manage Environments</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
