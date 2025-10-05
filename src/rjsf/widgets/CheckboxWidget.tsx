import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { type WidgetProps } from "@rjsf/utils";

export default function CheckboxWidget({
  id,
  value,
  required,
  disabled,
  readonly,
  label,
  onChange,
}: WidgetProps) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={!!value}
        disabled={disabled || readonly}
        onCheckedChange={(v) => onChange(Boolean(v))}
      />
      {label && (
        <Label htmlFor={id}>
          {label} {required ? "*" : ""}
        </Label>
      )}
    </div>
  );
}
