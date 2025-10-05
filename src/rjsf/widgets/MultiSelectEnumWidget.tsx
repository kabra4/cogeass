import { type WidgetProps, type RJSFSchema } from "@rjsf/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MultiSelectEnumWidget({
  id,
  value,
  disabled,
  readonly,
  options,
  onChange,
  placeholder,
  schema, // <-- Destructure 'schema' from props
}: WidgetProps) {
  const current: string[] = Array.isArray(value) ? value.map(String) : [];

  const getEnumOptions = () => {
    if (options.enumOptions && options.enumOptions.length > 0) {
      return options.enumOptions as Array<{ value: any; label: string }>;
    }
    // Fallback for array-of-enum schemas
    const itemsSchema = schema.items as RJSFSchema;
    if (itemsSchema && Array.isArray(itemsSchema.enum)) {
      return itemsSchema.enum.map((val) => ({
        label: String(val),
        value: val,
      }));
    }
    return [];
  };

  const enumOptions = getEnumOptions();

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
            {display || <span>&nbsp;</span>}
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
