import Editor from "@monaco-editor/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Code, Eye, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { StreamEvent } from "@/lib/http/HttpClient";

function safeStringify(v: unknown, spaces = 2): string {
  try {
    return JSON.stringify(v, null, spaces);
  } catch {
    return "";
  }
}

function MonacoView({
  value,
  language,
  theme,
}: {
  value: string;
  language: string;
  theme: string;
}) {
  return (
    <Editor
      height="100%"
      defaultLanguage={language}
      value={value}
      options={{ readOnly: true, minimap: { enabled: false }, wordWrap: "on" }}
      theme={theme === "dark" ? "vs-dark" : "light"}
    />
  );
}

function HtmlResponseView({
  value,
  theme,
}: {
  value: string;
  theme: string;
}) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1 px-2 py-1 border-b bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-7 px-2 text-xs", !showPreview && "bg-accent")}
          onClick={() => setShowPreview(false)}
        >
          <Code className="h-3.5 w-3.5 mr-1" />
          Source
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-7 px-2 text-xs", showPreview && "bg-accent")}
          onClick={() => setShowPreview(true)}
        >
          <Eye className="h-3.5 w-3.5 mr-1" />
          Preview
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        {showPreview ? (
          <iframe
            srcDoc={value}
            sandbox="allow-same-origin"
            className="w-full h-full border-0 bg-white"
            title="HTML Preview"
          />
        ) : (
          <MonacoView value={value} language="html" theme={theme} />
        )}
      </div>
    </div>
  );
}

function ImageResponseView({
  bodyText,
  contentType,
}: {
  bodyText: string;
  contentType: string;
}) {
  const dataUrl = `data:${contentType};base64,${bodyText}`;

  return (
    <div className="h-full flex items-center justify-center p-4 overflow-auto">
      <img
        src={dataUrl}
        alt="Response"
        className="max-w-full max-h-full object-contain"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = "none";
          target.parentElement!.innerHTML =
            '<div class="text-sm text-muted-foreground">Unable to render image. The response may not be base64-encoded.</div>';
        }}
      />
    </div>
  );
}

export function SseResponseView({
  events,
  theme,
}: {
  events: StreamEvent[];
  theme: string;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const copyEventData = async (e: React.MouseEvent, data: string, eventId: number) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(data);
      setCopiedId(eventId);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No SSE events received
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="divide-y">
        {events.map((event) => {
          const isExpanded = expandedId === event.eventId;
          let formattedData = event.data;
          try {
            const parsed = JSON.parse(event.data);
            formattedData = safeStringify(parsed, 2);
          } catch {
            // not JSON, use raw
          }

          return (
            <div key={event.eventId}>
              <div
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-mono hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() =>
                  setExpandedId(isExpanded ? null : event.eventId)
                }
              >
                <span className="text-muted-foreground w-8 shrink-0 text-right">
                  #{event.eventId}
                </span>
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-xs font-semibold shrink-0",
                    event.eventType === "message"
                      ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                      : "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                  )}
                >
                  {event.eventType}
                </span>
                <span className="flex-1 truncate text-xs text-muted-foreground">
                  {event.data.length > 80
                    ? event.data.slice(0, 80) + "..."
                    : event.data}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  +{event.elapsedMs.toFixed(0)}ms
                </span>
                <button
                  className="shrink-0 p-1 rounded hover:bg-accent transition-colors"
                  onClick={(e) => copyEventData(e, formattedData, event.eventId)}
                  title="Copy event data"
                >
                  {copiedId === event.eventId ? (
                    <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>
              {isExpanded && (
                <div className="border-t bg-muted/20">
                  <Editor
                    height={`${Math.min(Math.max(formattedData.split("\n").length, 3), 20) * 20 + 16}px`}
                    defaultLanguage={
                      formattedData.startsWith("{") ||
                        formattedData.startsWith("[")
                        ? "json"
                        : "plaintext"
                    }
                    value={formattedData}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      wordWrap: "on",
                      scrollBeyondLastLine: false,
                      lineNumbers: "off",
                      folding: false,
                      padding: { top: 8, bottom: 8 },
                    }}
                    theme={theme === "dark" ? "vs-dark" : "light"}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ResponseRendererProps {
  resp: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    bodyText: string;
    bodyJson: unknown;
    streamEvents?: StreamEvent[];
  };
  theme: string;
}

export default function ResponseRenderer({
  resp,
  theme,
}: ResponseRendererProps) {
  const contentType = (resp.headers["content-type"] || "").toLowerCase();
  const displayText = resp.bodyJson
    ? safeStringify(resp.bodyJson, 2)
    : resp.bodyText;

  if (contentType.includes("text/event-stream") && resp.streamEvents && resp.streamEvents.length > 0) {
    return <SseResponseView events={resp.streamEvents} theme={theme} />;
  }
  if (contentType.includes("application/json")) {
    return <MonacoView value={displayText} language="json" theme={theme} />;
  }
  if (contentType.includes("text/html")) {
    return <HtmlResponseView value={resp.bodyText} theme={theme} />;
  }
  if (contentType.startsWith("image/")) {
    return (
      <ImageResponseView bodyText={resp.bodyText} contentType={contentType} />
    );
  }
  if (contentType.includes("xml")) {
    return <MonacoView value={displayText} language="xml" theme={theme} />;
  }
  return <MonacoView value={displayText} language="plaintext" theme={theme} />;
}
