import Editor from "@monaco-editor/react";
import { useEffect, useId, useState } from "react";
import { useTheme } from "next-themes";
import type { JSONSchema7 } from "json-schema";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, ChevronRight, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
    bodyJson: any;
  } | null;
  isLoading?: boolean;
}

function safeStringify(v: unknown, spaces = 2): string {
  try {
    return JSON.stringify(v, null, spaces);
  } catch {
    return "";
  }
}

function Panel(props: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const { title, children, defaultOpen = true } = props;
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const panelId = useId();
  const rootBase = "border rounded-lg overflow-hidden flex flex-col";
  const sizeClass = open ? "flex-1 min-h-0" : "flex-none";
  return (
    <div className={`${rootBase} ${sizeClass}`}>
      <div className="px-3 py-2 text-sm font-medium bg-muted/30 border-b">
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 hover:opacity-90 transition"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
        >
          <div className="flex items-center gap-2">
            {open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="text-left">{title}</span>
          </div>
        </button>
      </div>
      {open && (
        <div id={panelId} className="flex-1 min-h-0">
          {children}
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
}: PreviewsProps) {
  const bodyValue = bodySchema.schema ? safeStringify(bodyData ?? {}, 2) : "";
  const [copyBodySuccess, setCopyBodySuccess] = useState(false);
  const [copyCurlSuccess, setCopyCurlSuccess] = useState(false);

  const { resolvedTheme } = useTheme();

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

  const copyToClipboard = async (text: string, type: "body" | "curl") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type === "body" ? "Body" : "cURL"} copied to clipboard`);
      if (type === "body") {
        setCopyBodySuccess(true);
      } else {
        setCopyCurlSuccess(true);
      }
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 border-l pl-3 overflow-hidden">
      {/* Body Preview */}
      <Panel title="Body JSON">
        <div className="relative h-full min-h-[160px]">
          <Editor
            height="100%"
            defaultLanguage="json"
            value={bodyValue}
            options={{ readOnly: true, minimap: { enabled: false } }}
            theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-7 w-7 p-0"
            onClick={() => copyToClipboard(bodyValue, "body")}
          >
            {copyBodySuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </Panel>

      {/* cURL */}
      <Panel title="cURL">
        <div className="relative h-full min-h-[120px]">
          <Editor
            height="100%"
            defaultLanguage="shell"
            value={curl}
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
            className="absolute top-2 right-2 h-7 w-7 p-0"
            onClick={() => copyToClipboard(curl, "curl")}
          >
            {copyCurlSuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </Panel>

      {/* Response */}
      <Panel title="Response">
        <div className="flex h-full min-h-[200px] flex-col">
          <div
            className={`text-xs px-2 py-1 ${
              isLoading ? "flex items-center gap-2" : ""
            } flex-none`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : resp ? (
              <span
                className={`font-semibold ${
                  resp.status >= 200 && resp.status < 300
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {resp.status} {resp.statusText}
              </span>
            ) : (
              <span className="text-muted-foreground">No response yet</span>
            )}
          </div>
          <div className="relative flex-1 min-h-0">
            <Editor
              height="100%"
              defaultLanguage={resp?.bodyJson ? "json" : "plaintext"}
              value={
                resp
                  ? resp.bodyJson
                    ? safeStringify(resp.bodyJson, 2)
                    : resp.bodyText
                  : ""
              }
              options={{
                readOnly: true,
                minimap: { enabled: false },
                wordWrap: "on",
              }}
              theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
            />
          </div>
        </div>
      </Panel>
    </div>
  );
}
