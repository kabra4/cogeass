import * as React from "react";
import { useAppStore } from "@/store/useAppStore";
import type { SecurityScheme } from "@/store/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// A component for a single security scheme
function AuthSchemeForm({
  schemeName,
  scheme,
}: {
  schemeName: string;
  scheme: SecurityScheme;
}) {
  // Select state and actions separately to ensure stable references.
  const values = useAppStore((s) => s.auth.values[schemeName]) || {};
  const setAuthValue = useAppStore((s) => s.setAuthValue);

  const handleChange = (field: string, value: string) => {
    setAuthValue(schemeName, { ...values, [field]: value });
  };

  const renderForm = () => {
    switch (scheme.type) {
      case "apiKey":
        return (
          <div className="space-y-2">
            <Label htmlFor={`${schemeName}-apiKey`}>API Key</Label>
            <Input
              id={`${schemeName}-apiKey`}
              placeholder="Your API Key"
              value={values.apiKey || ""}
              onChange={(e) => handleChange("apiKey", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This key will be sent in the <strong>{scheme.in}</strong> as{" "}
              <strong>{scheme.name}</strong>.
            </p>
          </div>
        );
      case "http":
        if (scheme.scheme === "bearer") {
          return (
            <div className="space-y-2">
              <Label htmlFor={`${schemeName}-token`}>Bearer Token</Label>
              <Input
                id={`${schemeName}-token`}
                placeholder="Your Bearer Token"
                value={values.token || ""}
                onChange={(e) => handleChange("token", e.target.value)}
              />
            </div>
          );
        }
        if (scheme.scheme === "basic") {
          return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${schemeName}-username`}>Username</Label>
                <Input
                  id={`${schemeName}-username`}
                  value={values.username || ""}
                  onChange={(e) => handleChange("username", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${schemeName}-password`}>Password</Label>
                <Input
                  id={`${schemeName}-password`}
                  type="password"
                  value={values.password || ""}
                  onChange={(e) => handleChange("password", e.target.value)}
                />
              </div>
            </div>
          );
        }
        return (
          <p className="text-sm text-muted-foreground">
            Unsupported HTTP scheme: {scheme.scheme}
          </p>
        );
      case "oauth2":
        return (
          <p className="text-sm text-muted-foreground">
            OAuth2 is defined but not yet supported.
          </p>
        );
      default:
        return (
          <p className="text-sm text-muted-foreground">
            Unsupported security scheme type: {scheme.type}
          </p>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{schemeName}</CardTitle>
        <CardDescription>
          {scheme.description || `Type: ${scheme.type}`}
        </CardDescription>
      </CardHeader>
      <CardContent>{renderForm()}</CardContent>
    </Card>
  );
}

export default function AuthPage() {
  const schemes = useAppStore((s) => s.auth.schemes);
  // Memoize the result of Object.entries to prevent re-creating the array on every render.
  const schemeEntries = React.useMemo(() => Object.entries(schemes), [schemes]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Authorization</h1>
          <p className="text-muted-foreground">
            Configure credentials for the security schemes defined in your
            specification.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            toast.success(
              "Credentials are automatically saved to IndexedDB and persist across page refreshes and spec reloads."
            )
          }
        >
          💾 Auto-Saved
        </Button>
      </div>

      {schemeEntries.length > 0 ? (
        <div className="space-y-4">
          {schemeEntries.map(([name, scheme]) => (
            <AuthSchemeForm key={name} schemeName={name} scheme={scheme} />
          ))}
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">
            No security schemes found in the specification.
          </p>
        </div>
      )}
    </div>
  );
}
