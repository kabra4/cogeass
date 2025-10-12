import Editor from "@monaco-editor/react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import type { JSONSchema7 } from "json-schema";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  const [copyRespSuccess, setCopyRespSuccess] = useState(false);
  const [copyHeadersSuccess, setCopyHeadersSuccess] = useState(false);

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

  useEffect(() => {
    if (copyRespSuccess) {
      const timer = setTimeout(() => setCopyRespSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyRespSuccess]);

  useEffect(() => {
    if (copyHeadersSuccess) {
      const timer = setTimeout(() => setCopyHeadersSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyHeadersSuccess]);

  const copyToClipboard = async (text: string, type: "body" | "curl") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type === "body" ? "Body" : "cURL"} copied to clipboard`);
      if (type === "body") {
        setCopyBodySuccess(true);
      } else {
        setCopyCurlSuccess(true);
      }
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const copyResponseBody = async () => {
    try {
      const text = resp
        ? resp.bodyJson
          ? safeStringify(resp.bodyJson, 2)
          : resp.bodyText
        : "";
      await navigator.clipboard.writeText(text || "");
      setCopyRespSuccess(true);
      toast.success("Response body copied to clipboard");
    } catch {
      toast.error("Failed to copy response body");
    }
  };

  const copyHeaders = async () => {
    try {
      const text = resp?.headers
        ? Object.entries(resp.headers)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n")
        : "";
      await navigator.clipboard.writeText(text);
      setCopyHeadersSuccess(true);
      toast.success("Response headers copied to clipboard");
    } catch {
      toast.error("Failed to copy headers");
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
        <Tabs defaultValue="body" className="px-2">
          <TabsList>
            <TabsTrigger value="body">Body</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
          </TabsList>
          <TabsContent value="body" className="mt-2">
            <div className="relative">
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
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-7 w-7 p-0"
                onClick={copyResponseBody}
              >
                {copyRespSuccess ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="headers" className="mt-2">
            <div className="relative border-t">
              <div className="text-xs text-muted-foreground px-2 py-2">
                Response headers
              </div>
              <div className="px-2 pb-10">
                {resp?.headers ? (
                  <div className="space-y-1 text-sm">
                    {Object.entries(resp.headers).map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-start gap-2 border-b py-1"
                      >
                        <div className="w-44 font-mono text-muted-foreground">
                          {k}
                        </div>
                        <div className="flex-1 break-all">{String(v)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No headers
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-7 w-7 p-0"
                onClick={copyHeaders}
                title="Copy headers"
              >
                {copyHeadersSuccess ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Panel>
    </div>
  );
}
