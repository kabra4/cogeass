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
import CustomAnyOfField from "./fields/CustomAnyOfField"; // <-- IMPORT THE NEW FIELD

export const shadcnTheme: Partial<ThemeProps<any>> = {
  // Add the 'fields' property to the theme
  fields: {
    AnyOfField: CustomAnyOfField as any,
    OneOfField: CustomAnyOfField as any,
  },
  widgets: {
    TextWidget,
    SelectWidget,
    CheckboxWidget,
    ArrayStringWidget,
    MultiSelectEnumWidget,
  },
  templates: {
    FieldTemplate: CompactFieldTemplate as any,
    ObjectFieldTemplate: CompactObjectFieldTemplate as any,
    ArrayFieldTemplate: CompactArrayFieldTemplate as any,
  },
};
