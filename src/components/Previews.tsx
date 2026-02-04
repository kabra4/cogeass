import Editor from "@monaco-editor/react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import type { JSONSchema7 } from "json-schema";
import type { ResponseHistoryEntry } from "@/store/types";
import type { ResponseTimings } from "@/lib/http/HttpClient";
import { Button } from "@/components/ui/button";
import ResponseRenderer from "@/components/response/ResponseRenderer";
import {
  Activity,
  Check,
  History,
  Copy,
  Loader2,
  FileJson,
  Terminal,
  ArrowLeftRight,
  List,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type TabType = "body" | "curl" | "response" | "headers" | "timeline" | "history";

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
    timings?: ResponseTimings;
    wireSizeBytes?: number;
    bodySizeBytes?: number;
    responseTimeMs?: number;
    responseSizeBytes?: number;
  } | null;
  isLoading?: boolean;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  responseHistory?: ResponseHistoryEntry[];
  onClearHistory?: () => void;
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
  return `${ms.toFixed(2)}ms`;
}

function formatResponseSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
}

function formatResponseHeaders(headers: Record<string, string>): string {
  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

function HeadersTable({ headers }: { headers: Record<string, string> }) {
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  const copyText = async (text: string, cellId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCell(cellId);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedCell(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const headerEntries = Object.entries(headers);

  if (headerEntries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No headers received
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10 border-b">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[35%] h-11 px-4 text-sm font-semibold">
              Key
            </TableHead>
            <TableHead className="h-11 px-4 text-sm font-semibold">
              Value
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {headerEntries.map(([key, value]) => (
            <TableRow key={key}>
              <TableCell
                className="px-4 py-3 align-middle font-mono text-sm cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => copyText(key, `key-${key}`)}
                title="Click to copy"
              >
                <div className="flex items-center gap-2">
                  <span className="flex-1">{key}</span>
                  {copiedCell === `key-${key}` && (
                    <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-500 flex-shrink-0" />
                  )}
                </div>
              </TableCell>
              <TableCell
                className="px-4 py-3 align-middle font-mono text-sm break-all cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => copyText(value, `value-${key}`)}
                title="Click to copy"
              >
                <div className="flex items-center gap-2">
                  <span className="flex-1">{value}</span>
                  {copiedCell === `value-${key}` && (
                    <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-500 flex-shrink-0" />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ResponseHistory({
  entries,
  onClear,
}: {
  entries: ResponseHistoryEntry[];
  onClear?: () => void;
}) {
  const { resolvedTheme } = useTheme();

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No response history yet. Send a request to start recording.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      {onClear && entries.length > 0 && (
        <div className="flex justify-end px-4 pt-2">
          <Button variant="ghost" size="sm" onClick={onClear}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        </div>
      )}
      <Accordion type="single" collapsible className="px-4">
        {entries.map((entry) => (
          <AccordionItem key={entry.id} value={String(entry.id)}>
            <AccordionTrigger className="py-3">
              <div className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    "font-semibold font-mono",
                    entry.response.status >= 200 &&
                      entry.response.status < 300
                      ? "text-green-600 dark:text-green-500"
                      : "text-red-600 dark:text-red-500"
                  )}
                >
                  {entry.response.status}
                </span>
                <span className="text-muted-foreground text-xs">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
                {(entry.response.timings?.totalMs ?? entry.response.responseTimeMs) !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {formatResponseTime(entry.response.timings?.totalMs ?? entry.response.responseTimeMs!)}
                  </span>
                )}
                {(entry.response.bodySizeBytes ?? entry.response.responseSizeBytes) !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {formatResponseSize(entry.response.bodySizeBytes ?? entry.response.responseSizeBytes!)}
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="border rounded-md overflow-hidden">
                <Editor
                  height="200px"
                  defaultLanguage="json"
                  value={
                    entry.response.bodyJson
                      ? safeStringify(entry.response.bodyJson, 2)
                      : entry.response.bodyText
                  }
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    wordWrap: "on",
                    scrollBeyondLastLine: false,
                  }}
                  theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function RequestTimeline({
  timings,
  wireSizeBytes,
  bodySizeBytes,
}: {
  timings: ResponseTimings;
  wireSizeBytes?: number;
  bodySizeBytes?: number;
}) {
  const phases = [
    { label: "Prepare", ms: timings.prepareMs, color: "bg-zinc-500" },
    { label: "DNS Lookup", ms: timings.dnsLookupMs, color: "bg-cyan-500" },
    { label: "TCP Handshake", ms: timings.tcpConnectMs, color: "bg-orange-500" },
    { label: "TLS Handshake", ms: timings.tlsHandshakeMs, color: "bg-purple-500" },
    { label: "Waiting (TTFB)", ms: timings.ttfbMs, color: "bg-yellow-500" },
    { label: "Download", ms: timings.downloadMs, color: "bg-green-500" },
    { label: "Process", ms: timings.processMs, color: "bg-zinc-500" },
  ];

  const totalMs = timings.totalMs;
  const maxMs = Math.max(...phases.map((p) => p.ms), 1);

  return (
    <div className="h-full overflow-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium">Response Time</span>
        <span className="text-sm font-semibold font-mono">
          {formatResponseTime(totalMs)}
        </span>
      </div>
      <div className="border-t" />
      <div className="mt-4 space-y-2">
        {phases.map((phase) => {
          const pct = totalMs > 0 ? (phase.ms / maxMs) * 100 : 0;
          return (
            <div key={phase.label} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-[140px] shrink-0 text-right">
                {phase.label}
              </span>
              <div className="flex-1 h-5 flex items-center">
                <div
                  className={cn("h-4 rounded-sm", phase.color)}
                  style={{ width: `${Math.max(pct, 0.5)}%` }}
                />
              </div>
              <span className="text-xs font-mono w-[80px] text-right shrink-0">
                {formatResponseTime(phase.ms)}
              </span>
            </div>
          );
        })}
      </div>
      {bodySizeBytes !== undefined && (
        <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
          Response Size: {formatResponseSize(bodySizeBytes)}
          {wireSizeBytes !== undefined && wireSizeBytes !== bodySizeBytes && (
            <span className="ml-1">
              ({formatResponseSize(wireSizeBytes)} on wire)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function Previews({
  bodyData,
  bodySchema,
  curl,
  resp,
  isLoading = false,
  activeTab: controlledActiveTab,
  onTabChange,
  responseHistory,
  onClearHistory,
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
  const [copyHeadersSuccess, setCopyHeadersSuccess] = useState(false);

  const { resolvedTheme } = useTheme();

  const bodyValue = bodySchema.schema ? safeStringify(bodyData ?? {}, 2) : "";
  const responseValue = resp
    ? resp.bodyJson
      ? safeStringify(resp.bodyJson, 2)
      : resp.bodyText
    : "";
  const headersValue = resp ? formatResponseHeaders(resp.headers) : "";

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

  useEffect(() => {
    if (copyHeadersSuccess) {
      const timer = setTimeout(() => setCopyHeadersSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyHeadersSuccess]);

  const copyToClipboard = async (text: string, type: TabType) => {
    try {
      await navigator.clipboard.writeText(text);
      const label =
        type === "body"
          ? "Body"
          : type === "curl"
            ? "cURL"
            : type === "headers"
              ? "Headers"
              : "Response";
      toast.success(`${label} copied to clipboard`);
      if (type === "body") {
        setCopyBodySuccess(true);
      } else if (type === "curl") {
        setCopyCurlSuccess(true);
      } else if (type === "headers") {
        setCopyHeadersSuccess(true);
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
    {
      id: "headers" as TabType,
      label: "Headers",
      icon: List,
      content: headersValue,
      language: "plaintext",
      copySuccess: copyHeadersSuccess,
    },
    {
      id: "timeline" as TabType,
      label: "Timeline",
      icon: Activity,
      content: "",
      language: "json",
      copySuccess: false,
    },
    {
      id: "history" as TabType,
      label: "Request History",
      icon: History,
      content: "",
      language: "json",
      copySuccess: false,
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
            {(activeTab === "response" || activeTab === "headers") && (
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
                    {(resp.timings?.totalMs ?? resp.responseTimeMs) !== undefined && (
                      <span className="text-foreground">
                        • {formatResponseTime(resp.timings?.totalMs ?? resp.responseTimeMs!)}
                      </span>
                    )}
                    {(resp.bodySizeBytes ?? resp.responseSizeBytes) !== undefined && (
                      <span className="text-foreground">
                        • {formatResponseSize(resp.bodySizeBytes ?? resp.responseSizeBytes!)}
                        {resp.wireSizeBytes !== undefined && resp.bodySizeBytes !== undefined && resp.wireSizeBytes !== resp.bodySizeBytes && (
                          <span className="text-muted-foreground ml-1">
                            ({formatResponseSize(resp.wireSizeBytes)} on wire)
                          </span>
                        )}
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

        {/* Content area */}
        <div className="relative flex-1 min-h-0">
          {activeTab === "history" ? (
            <ResponseHistory
              entries={responseHistory ?? []}
              onClear={onClearHistory}
            />
          ) : activeTab === "timeline" ? (
            resp?.timings ? (
              <RequestTimeline
                timings={resp.timings}
                wireSizeBytes={resp.wireSizeBytes}
                bodySizeBytes={resp.bodySizeBytes}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Send a request to see timeline
              </div>
            )
          ) : activeTab === "headers" ? (
            <div className="h-full relative">
              <HeadersTable headers={resp?.headers || {}} />
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
          ) : activeTab === "response" ? (
            <div className="relative h-full">
              {resp ? (
                <ResponseRenderer
                  resp={resp}
                  theme={resolvedTheme === "dark" ? "dark" : "light"}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  No response yet
                </div>
              )}
              {resp && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 z-10"
                  onClick={() => copyToClipboard(responseValue, activeTab)}
                >
                  {copyResponseSuccess ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="relative h-full">
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
          )}
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
