import { Input } from "@/components/ui/input";
import { type WidgetProps } from "@rjsf/utils";

export default function TextWidget({
  id,
  value,
  required,
  disabled,
  readonly,
  onChange,
  placeholder,
}: WidgetProps) {
  return (
    <Input
      id={id}
      value={value ?? ""}
      required={required}
      disabled={disabled || readonly}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
