import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function EnvironmentsPage() {
  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Environments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">
              Environments management coming soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
