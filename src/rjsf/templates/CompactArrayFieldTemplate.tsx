import { Plus, Trash2, ArrowUp, ArrowDown, List } from "lucide-react";
import type { ArrayFieldTemplateProps } from "@rjsf/utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CompactArrayFieldTemplate(
  props: ArrayFieldTemplateProps<any, any, any>
) {
  const {
    items,
    canAdd,
    onAddClick,
    title,
    description,
    schema,
    uiSchema,
    required,
  } = props;

  const headerTitle = title || schema.title || "";

  return (
    <div className="rounded-md border">
      {/* Header */}
      {headerTitle || description ? (
        <div className="px-3 py-2 flex items-center gap-2 justify-between">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate" title={headerTitle}>
              <span className="inline-flex items-center gap-1">
                <List className="size-4 text-muted-foreground" />
                {headerTitle}
                {required ? (
                  <span className="text-destructive ml-0.5">*</span>
                ) : null}
              </span>
            </div>
            {description ? (
              <div className="text-xs text-muted-foreground line-clamp-2">
                {typeof description === "string" ? description : null}
              </div>
            ) : null}
          </div>
          {canAdd ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onAddClick}
              title="Add item"
            >
              <Plus className="size-4" />
              Add
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Items */}
      <div className="px-3 pb-2 space-y-2">
        {items &&
          items.map((item) => (
            <div
              key={item.key}
              className={cn(
                "rounded-md border p-2",
                "flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3"
              )}
            >
              <div className="flex-1">{item.children}</div>
              <div className="flex items-center gap-1 self-end sm:self-start">
                {item.hasMoveUp && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    onClick={item.onReorderClick(item.index, item.index - 1)}
                    title="Move up"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                )}
                {item.hasMoveDown && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    onClick={item.onReorderClick(item.index, item.index + 1)}
                    title="Move down"
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                )}
                {item.hasRemove && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="destructive"
                    onClick={item.onDropIndexClick(item.index)}
                    title="Remove"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

        {/* Empty state with Add button */}
        {(!items || items.length === 0) && canAdd ? (
          <div className="py-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onAddClick}
            >
              <Plus className="size-4" />
              Add item
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
