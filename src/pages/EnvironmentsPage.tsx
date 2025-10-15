import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Edit3, Settings } from "lucide-react";
import VariableEditor from "@/components/VariableEditor";

export default function EnvironmentsPage() {
  const {
    environments,
    environmentKeys,
    activeEnvironmentId,
    addEnvironment,
    removeEnvironment,
    setActiveEnvironment,
    setVariableValue,
    addVariableKey,
    removeVariableKey,
    updateEnvironmentName,
  } = useAppStore();

  const [newEnvironmentName, setNewEnvironmentName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEnvironmentId, setEditingEnvironmentId] = useState<
    string | null
  >(null);
  const [editingEnvironmentName, setEditingEnvironmentName] = useState("");

  const environmentsList = Object.values(environments);
  const activeEnvironment = activeEnvironmentId
    ? environments[activeEnvironmentId]
    : null;

  const handleCreateEnvironment = () => {
    if (newEnvironmentName.trim()) {
      const id = addEnvironment(newEnvironmentName.trim());
      setActiveEnvironment(id);
      setNewEnvironmentName("");
      setIsCreateDialogOpen(false);
    }
  };

  const handleDeleteEnvironment = (id: string) => {
    removeEnvironment(id);
  };

  const handleVariablesChange = (
    environmentId: string,
    variables: Record<string, string>
  ) => {
    const newKeys = Object.keys(variables);
    const currentKeys = environmentKeys;

    // Keys created in editor (not in global keys yet)
    const added = newKeys.filter((k) => !currentKeys.includes(k));
    // Keys removed in editor (present globally but removed here)
    const removed = currentKeys.filter((k) => !newKeys.includes(k));

    // Apply key-level changes globally
    added.forEach((k) => addVariableKey(k));
    removed.forEach((k) => removeVariableKey(k));

    // Update values for this environment
    Object.entries(variables).forEach(([k, v]) => {
      setVariableValue(environmentId, k, v);
    });
  };

  const handleRenameEnvironment = () => {
    if (editingEnvironmentId && editingEnvironmentName.trim()) {
      updateEnvironmentName(
        editingEnvironmentId,
        editingEnvironmentName.trim()
      );
      setEditingEnvironmentId(null);
      setEditingEnvironmentName("");
    }
  };

  const startRenaming = (id: string, currentName: string) => {
    setEditingEnvironmentId(id);
    setEditingEnvironmentName(currentName);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header with environment selector and actions */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Environments
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage environment variables for your API requests
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Environment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Environment</DialogTitle>
              <DialogDescription>
                Create a new environment to organize your variables.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newEnvironmentName}
                  onChange={(e) => setNewEnvironmentName(e.target.value)}
                  className="col-span-3"
                  placeholder="Production, Staging, Development..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateEnvironment();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                onClick={handleCreateEnvironment}
                disabled={!newEnvironmentName.trim()}
              >
                Create Environment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active environment selector */}
      {environmentsList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Environment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select
                  value={activeEnvironmentId || "none"}
                  onValueChange={(value) =>
                    setActiveEnvironment(value === "none" ? null : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Environment</SelectItem>
                    {environmentsList.map((env) => (
                      <SelectItem key={env.id} value={env.id}>
                        {env.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {activeEnvironment && (
                <Badge variant="secondary">
                  {environmentKeys.length} variables
                </Badge>
              )}
            </div>
            {!activeEnvironmentId && (
              <p className="text-sm text-muted-foreground mt-2">
                No environment selected. Variables will not be resolved in
                requests.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Environment management */}
      {environmentsList.length > 0 ? (
        <div className="grid gap-4">
          {environmentsList.map((env) => (
            <Card
              key={env.id}
              className={`${
                env.id === activeEnvironmentId ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{env.name}</CardTitle>
                    {env.id === activeEnvironmentId && <Badge>Active</Badge>}
                    <Badge variant="outline">
                      {environmentKeys.length} variables
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startRenaming(env.id, env.name)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete Environment
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the "{env.name}"
                            environment? This action cannot be undone and all
                            variables will be lost.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteEnvironment(env.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Environment
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/*
                  Render all global keys for this environment, supplying
                  empty string when not set (should already be normalized
                  by merge, but this keeps UI robust).
                */}
                {(() => {
                  const displayVars: Record<string, string> = {};
                  environmentKeys.forEach((k) => {
                    displayVars[k] = env.variables[k] ?? "";
                  });
                  return (
                    <VariableEditor
                      variables={displayVars}
                      onChange={(variables) =>
                        handleVariablesChange(env.id, variables)
                      }
                      placeholder={{
                        key: "API_URL",
                        value: "https://api.example.com",
                      }}
                    />
                  );
                })()}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Settings className="h-12 w-12 mx-auto text-muted-foreground" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">No environments yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Create your first environment to start organizing your
                  variables. Use variables like{" "}
                  <code className="bg-muted px-1 py-0.5 rounded text-sm">
                    {"{{API_URL}}"}
                  </code>{" "}
                  in your requests.
                </p>
              </div>
              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Environment
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create Environment</DialogTitle>
                    <DialogDescription>
                      Create a new environment to organize your variables.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="name"
                        value={newEnvironmentName}
                        onChange={(e) => setNewEnvironmentName(e.target.value)}
                        className="col-span-3"
                        placeholder="Production, Staging, Development..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCreateEnvironment();
                          }
                        }}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="submit"
                      onClick={handleCreateEnvironment}
                      disabled={!newEnvironmentName.trim()}
                    >
                      Create Environment
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rename Environment Dialog */}
      <Dialog
        open={!!editingEnvironmentId}
        onOpenChange={(open) => {
          if (!open) {
            setEditingEnvironmentId(null);
            setEditingEnvironmentName("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Environment</DialogTitle>
            <DialogDescription>
              Enter a new name for this environment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={editingEnvironmentName}
                onChange={(e) => setEditingEnvironmentName(e.target.value)}
                className="col-span-3"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRenameEnvironment();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleRenameEnvironment}
              disabled={!editingEnvironmentName.trim()}
            >
              Rename Environment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
