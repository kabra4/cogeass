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
  const val = typeof value === "string" ? value : value ?? "";
  return (
    <Input
      id={id}
      value={val}
      required={required}
      disabled={disabled || readonly}
      placeholder={placeholder}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? undefined : v);
      }}
    />
  );
}
