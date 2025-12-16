import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { WorkspaceCreationForm } from "./WorkspaceCreationForm";

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateWorkspaceDialog({ open, onOpenChange }: CreateWorkspaceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription>
            Enter a name and provide an OpenAPI specification to create a workspace.
          </DialogDescription>
        </DialogHeader>
        <WorkspaceCreationForm
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
            showCancel
        />
      </DialogContent>
    </Dialog>
  );
}
