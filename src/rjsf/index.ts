// src/rjsf/index.ts
import type { ThemeProps } from "@rjsf/core";
import TextWidget from "./widgets/TextWidget";
import CheckboxWidget from "./widgets/CheckboxWidget";
import SelectWidget from "./widgets/SelectWidget";

export const shadcnTheme: Partial<ThemeProps<any>> = {
  widgets: {
    TextWidget,
    SelectWidget,
    CheckboxWidget,
  },
  // You can add templates for Array/Object to control layout
};
