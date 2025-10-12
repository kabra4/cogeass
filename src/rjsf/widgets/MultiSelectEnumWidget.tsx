import * as React from "react";
import { type WidgetProps, type RJSFSchema } from "@rjsf/utils";
import { ChevronsUpDown, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type EnumOption = {
  value: any;
  label: string;
};

export default function MultiSelectEnumWidget({
  id,
  value,
  disabled,
  readonly,
  options,
  onChange,
  schema,
  placeholder,
}: WidgetProps) {
  const enumOptions: EnumOption[] = React.useMemo(() => {
    if (options.enumOptions && options.enumOptions.length > 0) {
      return options.enumOptions as EnumOption[];
    }
    const itemsSchema = schema.items as RJSFSchema;
    if (itemsSchema && Array.isArray(itemsSchema.enum)) {
      return itemsSchema.enum.map((val) => ({
        label: String(val),
        value: val,
      }));
    }
    return [];
  }, [options.enumOptions, schema.items]);

  const selectedValues = React.useMemo(
    () => new Set(Array.isArray(value) ? value : []),
    [value]
  );

  const handleSelect = (optionValue: any) => {
    const newSelected = new Set(selectedValues);
    if (newSelected.has(optionValue)) {
      newSelected.delete(optionValue);
    } else {
      newSelected.add(optionValue);
    }
    onChange(Array.from(newSelected));
  };

  const handleRemove = (
    e: React.PointerEvent | React.KeyboardEvent,
    optionValue: any
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const newSelected = new Set(selectedValues);
    newSelected.delete(optionValue);
    onChange(Array.from(newSelected));
  };

  const selectedOptions = enumOptions.filter((opt) =>
    selectedValues.has(opt.value)
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-auto min-h-9 justify-between"
          disabled={disabled || readonly}
          role="combobox"
        >
          <div className="flex-1 text-left font-normal truncate">
            {selectedOptions.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedOptions.map((option) => (
                  <Badge
                    key={option.value}
                    variant="secondary"
                    className="font-normal pl-2 pr-1"
                  >
                    <span>{option.label}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Remove ${option.label}`}
                      onPointerDown={(e) => handleRemove(e, option.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleRemove(e, option.value);
                        }
                      }}
                      className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-background/50"
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </span>
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">
                {placeholder ?? "Select one or more..."}
              </span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width]"
        align="end"
      >
        <DropdownMenuLabel>{schema.title || "Options"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-60 overflow-y-auto">
          {enumOptions.map((option) => {
            const isSelected = selectedValues.has(option.value);
            return (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={isSelected}
                onCheckedChange={() => handleSelect(option.value)}
                onSelect={(e) => e.preventDefault()}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
