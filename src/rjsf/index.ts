// src/rjsf/index.ts
import type { ThemeProps } from "@rjsf/core";
import TextWidget from "./widgets/TextWidget";
import CheckboxWidget from "./widgets/CheckboxWidget";
import SelectWidget from "./widgets/SelectWidget";
import CompactFieldTemplate from "./templates/CompactFieldTemplate";
import CompactObjectFieldTemplate from "./templates/CompactObjectFieldTemplate";
import CompactArrayFieldTemplate from "./templates/CompactArrayFieldTemplate";
import ArrayStringWidget from "./widgets/ArrayStringWidget";
import MultiSelectEnumWidget from "./widgets/MultiSelectEnumWidget";

export const shadcnTheme: Partial<ThemeProps<any>> = {
  widgets: {
    TextWidget,
    SelectWidget,
    CheckboxWidget,
    // RJSF will pick widgets by schema; we can hint with uiSchema if needed.
    // For array of strings without enum
    ArrayStringWidget,
    // For array of enums
    MultiSelectEnumWidget,
  },
  templates: {
    FieldTemplate: CompactFieldTemplate as any,
    ObjectFieldTemplate: CompactObjectFieldTemplate as any,
    ArrayFieldTemplate: CompactArrayFieldTemplate as any,
  },
};
