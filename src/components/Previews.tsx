import Editor from "@monaco-editor/react";
import type { JSONSchema7 } from "json-schema";

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
}

function safeStringify(v: unknown, spaces = 2): string {
  try {
    return JSON.stringify(v, null, spaces);
  } catch {
    return "";
  }
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded">
      <div className="px-3 py-2 text-sm font-medium">{title}</div>
      <div>{children}</div>
    </div>
  );
}

export default function Previews({ bodyData, bodySchema, curl, resp }: PreviewsProps) {
  return (
    <div className="flex flex-col gap-4 h-full overflow-auto">
      {/* Body Preview */}
      <Panel title="Body JSON">
        <Editor
          height="200px"
          defaultLanguage="json"
          value={bodySchema.schema ? safeStringify(bodyData ?? {}, 2) : ""}
          options={{ readOnly: true, minimap: { enabled: false } }}
        />
      </Panel>

      {/* cURL */}
      <Panel title="cURL">
        <Editor
          height="140px"
          defaultLanguage="shell"
          value={curl}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            wordWrap: "on",
          }}
        />
      </Panel>

      {/* Response */}
      <Panel title="Response">
        <div className="text-xs px-2 py-1 text-muted-foreground">
          {resp ? `${resp.status} ${resp.statusText}` : "No response yet"}
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
        />
      </Panel>
    </div>
  );
}
