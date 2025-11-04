import Editor from "@monaco-editor/react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import type { JSONSchema7 } from "json-schema";
import { Button } from "@/components/ui/button";
import {
  Check,
  Copy,
  Loader2,
  FileJson,
  Terminal,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TabType = "body" | "curl" | "response";

interface PreviewsProps {
  bodyData: Record<string, unknown>;
  bodySchema: {
    schema: JSONSchema7 | null;
    mediaType: string | null;
  };
  curl: string;
  resp: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    bodyText: string;
    bodyJson: unknown;
    timestamp: number;
    responseTimeMs?: number;
  } | null;
  isLoading?: boolean;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

function safeStringify(v: unknown, spaces = 2): string {
  try {
    return JSON.stringify(v, null, spaces);
  } catch {
    return "";
  }
}

function formatResponseTime(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${ms}ms`;
}

export default function Previews({
  bodyData,
  bodySchema,
  curl,
  resp,
  isLoading = false,
  activeTab: controlledActiveTab,
  onTabChange,
}: PreviewsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<TabType>("body");

  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = (tab: TabType) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };
  const [copyBodySuccess, setCopyBodySuccess] = useState(false);
  const [copyCurlSuccess, setCopyCurlSuccess] = useState(false);
  const [copyResponseSuccess, setCopyResponseSuccess] = useState(false);

  const { resolvedTheme } = useTheme();

  const bodyValue = bodySchema.schema ? safeStringify(bodyData ?? {}, 2) : "";
  const responseValue = resp
    ? resp.bodyJson
      ? safeStringify(resp.bodyJson, 2)
      : resp.bodyText
    : "";

  useEffect(() => {
    if (copyBodySuccess) {
      const timer = setTimeout(() => setCopyBodySuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyBodySuccess]);

  useEffect(() => {
    if (copyCurlSuccess) {
      const timer = setTimeout(() => setCopyCurlSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyCurlSuccess]);

  useEffect(() => {
    if (copyResponseSuccess) {
      const timer = setTimeout(() => setCopyResponseSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyResponseSuccess]);

  const copyToClipboard = async (text: string, type: TabType) => {
    try {
      await navigator.clipboard.writeText(text);
      const label =
        type === "body" ? "Body" : type === "curl" ? "cURL" : "Response";
      toast.success(`${label} copied to clipboard`);
      if (type === "body") {
        setCopyBodySuccess(true);
      } else if (type === "curl") {
        setCopyCurlSuccess(true);
      } else {
        setCopyResponseSuccess(true);
      }
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const tabs = [
    {
      id: "body" as TabType,
      label: "Body JSON",
      icon: FileJson,
      content: bodyValue,
      language: "json",
      copySuccess: copyBodySuccess,
    },
    {
      id: "curl" as TabType,
      label: "cURL",
      icon: Terminal,
      content: curl,
      language: "shell",
      copySuccess: copyCurlSuccess,
    },
    {
      id: "response" as TabType,
      label: "Response",
      icon: ArrowLeftRight,
      content: responseValue,
      language: resp?.bodyJson ? "json" : "plaintext",
      copySuccess: copyResponseSuccess,
    },
  ];

  const currentTab = tabs.find((t) => t.id === activeTab)!;

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 border-l">
        {/* Tab header */}
        <div className="px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-medium">{currentTab.label}</h3>
            {activeTab === "response" && (
              <div className="text-xs flex items-center gap-3">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-muted-foreground">Sending...</span>
                  </div>
                ) : resp ? (
                  <>
                    <span
                      className={cn(
                        "font-semibold",
                        resp.status >= 200 && resp.status < 300
                          ? "text-green-600 dark:text-green-500"
                          : "text-red-600 dark:text-red-500"
                      )}
                    >
                      {resp.status} {resp.statusText}
                    </span>
                    {resp.responseTimeMs !== undefined && (
                      <span className="text-foreground">
                        • {formatResponseTime(resp.responseTimeMs)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">No response yet</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Editor area */}
        <div className="relative flex-1 min-h-0">
          <Editor
            height="100%"
            defaultLanguage={currentTab.language}
            value={currentTab.content}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              wordWrap: "on",
            }}
            theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 p-0"
            onClick={() => copyToClipboard(currentTab.content, activeTab)}
          >
            {currentTab.copySuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Right navbar with icons */}
      <div className="flex flex-col items-center gap-y-1 py-2 w-14 bg-black border-l">
        <TooltipProvider delayDuration={0}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative flex flex-col items-center justify-center w-10 h-10 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                      activeTab === tab.id && "bg-accent text-accent-foreground"
                    )}
                    aria-label={tab.label}
                    aria-current={activeTab === tab.id ? "page" : undefined}
                  >
                    {activeTab === tab.id && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r" />
                    )}
                    <Icon className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{tab.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
}
