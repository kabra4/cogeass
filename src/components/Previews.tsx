import Editor from "@monaco-editor/react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import type { JSONSchema7 } from "json-schema";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2 } from "lucide-react";
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

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded">
      <div className="px-3 py-2 text-sm font-medium">{title}</div>
      <div>{children}</div>
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
    <div className="flex flex-col gap-4 h-full overflow-auto">
      {/* Body Preview */}
      <Panel title="Body JSON">
        <div className="relative">
          <Editor
            height="200px"
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
        <div className="relative">
          <Editor
            height="140px"
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
        <div
          className={`text-xs px-2 py-1 ${
            isLoading ? "flex items-center gap-2" : ""
          }`}
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
        <Editor
          height="260px"
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
      </Panel>
    </div>
  );
}
