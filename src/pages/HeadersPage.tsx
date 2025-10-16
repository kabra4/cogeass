import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import HeaderEditor from "@/components/HeaderEditor";
import { useAppStore } from "@/store/useAppStore";

export default function HeadersPage() {
  const globalHeaders = useAppStore((s) => s.globalHeaders);
  const setGlobalHeaders = useAppStore((s) => s.setGlobalHeaders);

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Global Headers</CardTitle>
          <CardDescription>
            These headers will be sent with every request in this workspace.
            They can be overridden by headers defined in individual requests.
            You can use environment variables here, e.g.,{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-sm">
              Authorization: Bearer {`{{API_TOKEN}}`}
            </code>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HeaderEditor headers={globalHeaders} onChange={setGlobalHeaders} />
        </CardContent>
      </Card>
    </div>
  );
}
