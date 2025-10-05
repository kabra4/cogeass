import { type WidgetProps } from "@rjsf/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Simple multi-select using Radix Select opened repeatedly. For large sets, consider a
// dedicated combobox; for PoC, this toggles membership on selection.
export default function MultiSelectEnumWidget({
  id,
  value,
  required,
  disabled,
  readonly,
  options,
  onChange,
  placeholder,
}: WidgetProps) {
  const current: string[] = Array.isArray(value) ? value.map(String) : [];
  const enumOptions =
    (options.enumOptions as Array<{ value: any; label: string }>) || [];

  const toggle = (val: string) => {
    const has = current.includes(val);
    const next = has ? current.filter((v) => v !== val) : [...current, val];
    onChange(next);
  };

  const display = current.length
    ? enumOptions
        .filter((o) => current.includes(String(o.value)))
        .map((o) => o.label)
        .join(", ")
    : "";

  return (
    <div>
      <Select
        // Radix Select is single; we use it as a menu to toggle items.
        onValueChange={(v) => toggle(v)}
        disabled={disabled || readonly}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder ?? "Select one or more..."}>
            {display}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {enumOptions.map((opt) => {
            const val = String(opt.value);
            const selected = current.includes(val);
            return (
              <SelectItem key={val} value={val}>
                <span
                  className={
                    selected ? "font-medium underline underline-offset-2" : ""
                  }
                >
                  {opt.label}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {/* Note: A true checkbox list might be better for multi; this keeps UI compact. */}
    </div>
  );
}
