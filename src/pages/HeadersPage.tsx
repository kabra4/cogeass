import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HeadersPage() {
  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Global Headers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">
              Global headers management coming soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
