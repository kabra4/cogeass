import { useState, useMemo } from "react";
import type { FieldProps, RJSFSchema, StrictRJSFSchema } from "@rjsf/utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Helper to create a user-friendly title from a property name
const toTitle = (name: string) => {
  if (!name) return "Option";
  const withSpaces = name.replace(/([A-Z])/g, " $1");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

export default function CustomAnyOfField<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends object = any
>(props: FieldProps<T, S, F>) {
  const { schema, formData, idSchema, registry, onChange, required, name } =
    props;
  const { SchemaField } = registry.fields;

  // This logic correctly handles the pattern `{ required: ['propertyName'] }`
  const options = useMemo(() => {
    const subschemas = (schema.oneOf || schema.anyOf) as RJSFSchema[];
    return subschemas
      .map((s) => (Array.isArray(s.required) ? s.required[0] : null))
      .filter((s): s is string => s !== null && s in (schema.properties || {}));
  }, [schema.oneOf, schema.anyOf, schema.properties]);

  // Determine which property is currently active in the form data.
  const getInitialKey = () => {
    if (formData && typeof formData === "object") {
      const currentKey = Object.keys(formData)[0];
      if (options.includes(currentKey)) {
        return currentKey;
      }
    }
    return options[0] || "";
  };

  const [selectedKey, setSelectedKey] = useState(getInitialKey);

  const handleSelection = (key: string) => {
    if (key !== selectedKey) {
      onChange(undefined);
    }
    setSelectedKey(key);
  };

  const selectedSchema = (schema.properties as any)?.[selectedKey] as
    | RJSFSchema
    | undefined;
  const selectedFormData = formData
    ? (formData as any)[selectedKey]
    : undefined;

  const onSubChange = (newData: any) => {
    const newFormData =
      newData === undefined ? undefined : { [selectedKey]: newData };
    onChange(newFormData);
  };

  const title = schema.title || name;

  return (
    <div className="rounded-md border p-3 space-y-3 bg-muted/20">
      <div className="flex items-center gap-2">
        <Label htmlFor={`${idSchema.$id}-select`}>
          {toTitle(title || "")}
          {required ? <span className="text-destructive ml-0.5">*</span> : null}
        </Label>
      </div>

      <Select value={selectedKey} onValueChange={handleSelection}>
        <SelectTrigger id={`${idSchema.$id}-select`}>
          <SelectValue placeholder="Select an option..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((key) => (
            <SelectItem key={key} value={key}>
              {toTitle(key)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedSchema && (
        <div className="pl-1 pt-2">
          <SchemaField
            {...props}
            name={selectedKey} // Pass the name of the property
            schema={selectedSchema}
            idSchema={registry.schemaUtils.toIdSchema(
              selectedSchema,
              `${idSchema.$id}_${selectedKey}`,
              registry.rootSchema,
              formData,
              idSchema.root
            )}
            formData={selectedFormData}
            onChange={onSubChange}
            required={true} // The selected option is always considered required
          />
        </div>
      )}
    </div>
  );
}
