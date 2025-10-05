// src/rjsf/index.ts
import type { ThemeProps } from "@rjsf/core";
import TextWidget from "./widgets/TextWidget";
import CheckboxWidget from "./widgets/CheckboxWidget";
import SelectWidget from "./widgets/SelectWidget";
import CompactFieldTemplate from "./templates/CompactFieldTemplate";
import CompactObjectFieldTemplate from "./templates/CompactObjectFieldTemplate";

export const shadcnTheme: Partial<ThemeProps<any>> = {
  widgets: {
    TextWidget,
    SelectWidget,
    CheckboxWidget,
  },
  templates: {
    FieldTemplate: CompactFieldTemplate,
    ObjectFieldTemplate: CompactObjectFieldTemplate,
  },
};
