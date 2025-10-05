import { type WidgetProps } from "@rjsf/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SelectWidget({
  id,
  value,
  required,
  disabled,
  readonly,
  options,
  onChange,
  placeholder,
}: WidgetProps) {
  const enumOptions =
    (options.enumOptions as Array<{ value: any; label: string }>) || [];
  return (
    <Select
      value={value ?? ""}
      onValueChange={(v) => onChange(v)}
      disabled={disabled || readonly}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder ?? "Select..."} />
      </SelectTrigger>
      <SelectContent>
        {enumOptions.map((opt) => (
          <SelectItem key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
