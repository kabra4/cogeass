import { type WidgetProps } from "@rjsf/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export default function ArrayStringWidget({
  id,
  value,
  required,
  disabled,
  readonly,
  onChange,
  placeholder,
}: WidgetProps) {
  const vals: string[] = Array.isArray(value) ? value : [];

  const setAt = (i: number, v: string) => {
    const next = [...vals];
    next[i] = v;
    onChange(clean(next));
  };
  const add = () => onChange(clean([...(vals || []), ""]));
  const remove = (i: number) =>
    onChange(clean(vals.filter((_, idx) => idx !== i)));

  return (
    <div className="space-y-2">
      {vals.map((v, i) => (
        <div key={`${id}-${i}`} className="flex items-center gap-2">
          <Input
            id={`${id}-${i}`}
            value={v ?? ""}
            required={required}
            disabled={disabled || readonly}
            placeholder={placeholder}
            onChange={(e) => setAt(i, e.target.value)}
          />
          <Button
            type="button"
            size="icon-sm"
            variant="destructive"
            onClick={() => remove(i)}
            disabled={disabled || readonly}
            title="Remove"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={add}
        disabled={disabled || readonly}
      >
        <Plus className="size-4" />
        Add item
      </Button>
    </div>
  );
}

function clean(arr: string[]) {
  // normalize: drop trailing empties
  return arr.filter((s) => s != null);
}
