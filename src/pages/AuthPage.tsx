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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

// A component for a single security scheme
function AuthSchemeForm({
  schemeName,
  scheme,
  environmentId,
}: {
  schemeName: string;
  scheme: SecurityScheme;
  environmentId?: string | null;
}) {
  // Select state and actions separately to ensure stable references.
  const globalValues = useAppStore((s) => s.auth.values[schemeName]) || {};
  const envValues =
    useAppStore((s) =>
      environmentId && s.auth.environmentValues
        ? s.auth.environmentValues[environmentId]?.[schemeName]
        : undefined
    ) || {};
  const setAuthValue = useAppStore((s) => s.setAuthValue);
  const setAuthValueForEnvironment = useAppStore(
    (s) => s.setAuthValueForEnvironment
  );

  // Use environment-specific values if environment is selected, otherwise global
  const values = environmentId ? envValues : globalValues;

  const handleChange = (field: string, value: string) => {
    if (environmentId) {
      setAuthValueForEnvironment(environmentId, schemeName, {
        ...values,
        [field]: value,
      });
    } else {
      setAuthValue(schemeName, { ...values, [field]: value });
    }
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
  const environments = useAppStore((s) => s.environments);
  const activeEnvironmentId = useAppStore((s) => s.activeEnvironmentId);

  // Memoize the result of Object.entries to prevent re-creating the array on every render.
  const schemeEntries = React.useMemo(() => Object.entries(schemes), [schemes]);
  const envList = React.useMemo(
    () => Object.values(environments),
    [environments]
  );

  // Default to active environment or global if no active environment
  const [selectedTab, setSelectedTab] = React.useState<string>("global");

  React.useEffect(() => {
    if (activeEnvironmentId && environments[activeEnvironmentId]) {
      setSelectedTab(activeEnvironmentId);
    }
  }, [activeEnvironmentId, environments]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Authorization</h1>
          <p className="text-muted-foreground">
            Configure credentials per environment. Each environment can have
            different authorization values.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            toast.success(
              "Credentials are automatically saved and persist across page refreshes and spec reloads."
            )
          }
        >
          💾 Auto-Saved
        </Button>
      </div>

      {schemeEntries.length > 0 ? (
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="global">Global (No Environment)</TabsTrigger>
            {envList.map((env) => (
              <TabsTrigger key={env.id} value={env.id}>
                {env.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="global" className="space-y-4 mt-4">
            {schemeEntries.map(([name, scheme]) => (
              <AuthSchemeForm
                key={name}
                schemeName={name}
                scheme={scheme}
                environmentId={null}
              />
            ))}
          </TabsContent>

          {envList.map((env) => (
            <TabsContent key={env.id} value={env.id} className="space-y-4 mt-4">
              {schemeEntries.map(([name, scheme]) => (
                <AuthSchemeForm
                  key={name}
                  schemeName={name}
                  scheme={scheme}
                  environmentId={env.id}
                />
              ))}
            </TabsContent>
          ))}
        </Tabs>
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
