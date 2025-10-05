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

  const valStr = value == null ? "" : String(value);
  const handle = (v: string) => {
    // Coerce back to original enum type if possible
    const match = enumOptions.find((o) => String(o.value) === v);
    onChange(match ? match.value : v);
  };

  return (
    <Select
      value={valStr}
      onValueChange={handle}
      disabled={disabled || readonly}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder ?? "Select..."} />
      </SelectTrigger>
      <SelectContent>
        {enumOptions.map((opt) => {
          const val = String(opt.value);
          return (
            <SelectItem key={val} value={val}>
              {opt.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
