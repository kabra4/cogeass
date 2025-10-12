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

  // *** MODIFIED LOGIC START ***
  const handleSelection = (key: string) => {
    setSelectedKey(key); // Always update the state to reflect dropdown selection

    const schemaForSelected = (schema.properties as any)?.[key];
    const isEmptyObjectSchema =
      schemaForSelected?.type === "object" &&
      !Object.keys(schemaForSelected.properties || {}).length;

    // If the new selection corresponds to an empty object (like 'open'),
    // set its value immediately to satisfy the schema.
    if (isEmptyObjectSchema) {
      onChange({ [key]: {} } as T);
    } else {
      // Otherwise, if the user is switching to a different, non-empty option,
      // clear the form data to avoid carrying over old values.
      if (key !== selectedKey) {
        onChange(undefined);
      }
    }
  };

  const selectedSchema = (schema.properties as any)?.[selectedKey];

  // A flag to determine if we should render a sub-form.
  const isEffectivelyEmpty =
    selectedSchema?.type === "object" &&
    !Object.keys(selectedSchema.properties || {}).length;
  // *** MODIFIED LOGIC END ***

  const selectedFormData = formData
    ? (formData as any)[selectedKey]
    : undefined;

  const onSubChange = (newData: any) => {
    const newFormData =
      newData === undefined ? undefined : { [selectedKey]: newData };
    onChange(newFormData as T);
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

      {/* *** MODIFIED RENDERING LOGIC *** */}
      {/* Only render the SchemaField if the selected option is NOT an empty object */}
      {!isEffectivelyEmpty && selectedSchema && (
        <div className="pl-1 pt-2">
          <SchemaField
            {...props}
            name={selectedKey}
            schema={selectedSchema}
            idSchema={registry.schemaUtils.toIdSchema(
              selectedSchema,
              `${idSchema.$id}_${selectedKey}`,
              registry.rootSchema as any,
              formData as any,
              (idSchema as any).root
            )}
            formData={selectedFormData}
            onChange={onSubChange}
            required={true}
          />
        </div>
      )}
    </div>
  );
}
