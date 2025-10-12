import type { ThemeProps } from "@rjsf/core";
import TextWidget from "./widgets/TextWidget";
import NumberWidget from "./widgets/NumberWidget";
import CheckboxWidget from "./widgets/CheckboxWidget";
import SelectWidget from "./widgets/SelectWidget";
import CompactFieldTemplate from "./templates/CompactFieldTemplate";
import CompactObjectFieldTemplate from "./templates/CompactObjectFieldTemplate";
import CompactArrayFieldTemplate from "./templates/CompactArrayFieldTemplate";
import ArrayStringWidget from "./widgets/ArrayStringWidget";
import MultiSelectEnumWidget from "./widgets/MultiSelectEnumWidget";
import CustomAnyOfField from "./fields/CustomAnyOfField";

export const shadcnTheme: Partial<ThemeProps<any>> = {
  fields: {
    AnyOfField: CustomAnyOfField as any,
    OneOfField: CustomAnyOfField as any,
  },
  widgets: {
    TextWidget,
    NumberWidget,
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
