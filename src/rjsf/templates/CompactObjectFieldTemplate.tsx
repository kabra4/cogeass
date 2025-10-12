import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ObjectFieldTemplateProps, RJSFSchema } from "@rjsf/utils";
import { cn } from "@/lib/utils";

/**
 * Recursively checks if a property's schema or any of its children match
 * the search query.
 * @param propName - The name of the property being checked.
 * @param propSchema - The JSON schema for the property.
 * @param query - The user's search string (in lowercase).
 * @returns `true` if a match is found, otherwise `false`.
 */
const propertyMatchesQuery = (
  propName: string,
  propSchema: RJSFSchema | boolean,
  query: string
): boolean => {
  // Base case: if schema is a boolean or falsy, it can't match.
  if (typeof propSchema !== "object") {
    return false;
  }

  // 1. Check the property's own name, title, and description
  if (propName.toLowerCase().includes(query)) return true;
  if (propSchema.title?.toLowerCase().includes(query)) return true;
  if (propSchema.description?.toLowerCase().includes(query)) return true;

  // 2. If it's an object, recurse into its children's properties
  if (propSchema.type === "object" && propSchema.properties) {
    for (const [key, value] of Object.entries(propSchema.properties)) {
      if (propertyMatchesQuery(key, value as RJSFSchema, query)) {
        return true;
      }
    }
  }

  // 3. If it's an array, check the schema of its items
  if (propSchema.type === "array" && propSchema.items) {
    const itemsSchema = Array.isArray(propSchema.items)
      ? propSchema.items[0]
      : propSchema.items;
    // We pass the parent's name to give context, as item schemas often lack their own name.
    if (propertyMatchesQuery(propName, itemsSchema, query)) {
      return true;
    }
  }

  // 4. Handle oneOf/anyOf by checking each sub-schema
  const subschemas = propSchema.oneOf || propSchema.anyOf;
  if (Array.isArray(subschemas)) {
    for (const subschema of subschemas) {
      if (propertyMatchesQuery(propName, subschema as RJSFSchema, query)) {
        return true;
      }
    }
  }

  return false;
};

export default function CompactObjectFieldTemplate(
  props: ObjectFieldTemplateProps<any, any, any>
) {
  const {
    title,
    description,
    properties,
    required,
    schema,
    formData,
    idSchema,
    formContext,
  } = props as ObjectFieldTemplateProps & {
    formContext?: {
      showDescriptions?: boolean;
      showOptional?: boolean;
      filterQ?: string;
    };
  };

  const isRoot = idSchema?.$id === "root";
  const [collapsed, setCollapsed] = useState<boolean>(!isRoot);

  const showDescriptions = !!formContext?.showDescriptions;
  const showOptional = !!formContext?.showOptional;
  const filterQ = (formContext?.filterQ || "").toLowerCase();

  const requiredKeys = useMemo(
    () =>
      Array.isArray(schema?.required) ? (schema.required as string[]) : [],
    [schema?.required]
  );

  const rawProps = properties.filter((p) => !p.hidden);

  const items = useMemo(() => {
    const filtered = rawProps
      .filter((p) => {
        if (!filterQ) return true;
        const propSchema = (p.content.props as any).schema as RJSFSchema;
        return propertyMatchesQuery(p.name, propSchema, filterQ);
      })
      .filter((p) => {
        const isReq = requiredKeys.includes(p.name);
        if (isReq) return true;
        if (showOptional) return true;
        const v = formData
          ? (formData as Record<string, unknown>)[p.name]
          : undefined;
        const hasValue =
          v !== undefined &&
          v !== null &&
          (typeof v !== "string" || v.trim() !== "");
        return hasValue;
      });

    if (requiredKeys.length === 0) return filtered;
    return filtered.sort((a, b) => {
      const aReq = requiredKeys.includes(a.name);
      const bReq = requiredKeys.includes(b.name);
      return aReq === bReq ? 0 : aReq ? -1 : 1;
    });
    // Only re-run when these truly change:
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawProps, filterQ, showOptional, formData, requiredKeys.join("|")]);
  // Compute a compact header status: required filled vs total required
  const requiredFilled = useMemo(() => {
    let n = 0;
    for (const key of requiredKeys) {
      const v = formData
        ? (formData as Record<string, unknown>)[key]
        : undefined;
      if (
        v !== undefined &&
        v !== null &&
        (typeof v !== "string" || v.trim() !== "")
      ) {
        n++;
      }
    }
    return n;
  }, [formData, requiredKeys]);

  const headerTitle = title || "";

  return (
    <div className="rounded-md border">
      {/* Header row */}
      {(headerTitle || description) && (
        <button
          type="button"
          className={cn(
            "w-full flex items-center justify-between px-3 py-2",
            "text-left"
          )}
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
        >
          <div className="min-w-0">
            {headerTitle ? (
              <div className="text-sm font-medium truncate" title={headerTitle}>
                {headerTitle}
                {required ? (
                  <span className="text-destructive ml-0.5">*</span>
                ) : null}
              </div>
            ) : null}
            {showDescriptions && description ? (
              <div className="text-xs text-muted-foreground line-clamp-2">
                {description}
              </div>
            ) : null}
            {requiredKeys.length > 0 ? (
              <div className="text-[11px] text-muted-foreground">
                {requiredFilled}/{requiredKeys.length} required filled
              </div>
            ) : null}
          </div>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 transition-transform",
              collapsed ? "" : "rotate-180"
            )}
          />
        </button>
      )}

      {/* Body */}
      {!collapsed && (
        <div className="px-3 py-2 space-y-2">
          {items.map((p) => (
            <div key={p.name}>{p.content}</div>
          ))}
        </div>
      )}
    </div>
  );
}
