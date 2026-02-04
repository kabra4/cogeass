import Editor from "@monaco-editor/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Code, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ResponseRendererProps {
  resp: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    bodyText: string;
    bodyJson: unknown;
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
