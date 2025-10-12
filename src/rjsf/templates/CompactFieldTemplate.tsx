import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { FieldTemplateProps } from "@rjsf/utils";

export default function CompactFieldTemplate(
  props: FieldTemplateProps<any, any, any>
) {
  const {
    id,
    classNames,
    label,
    required,

    errors,
    help,
    children,
    hidden,
    displayLabel,
    rawDescription,
    formContext,
  } = props as FieldTemplateProps & {
    formContext?: {
      showDescriptions?: boolean;
    };
  };

  if (hidden) {
    return <div style={{ display: "none" }}>{children}</div>;
  }

  const showDescriptions = !!formContext?.showDescriptions;

  return (
    <div className={cn("space-y-1", classNames)}>
      {displayLabel && label && (
        <div className="flex items-center gap-2 min-h-5">
          <label
            htmlFor={id}
            className="text-sm font-medium truncate"
            title={label}
          >
            {label}
            {required ? (
              <span className="text-destructive ml-0.5" aria-hidden="true">
                *
              </span>
            ) : null}
          </label>
          {rawDescription ? (
            showDescriptions ? (
              <div className="text-xs text-muted-foreground line-clamp-2">
                {rawDescription}
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger aria-label="Field description" asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    <Info className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{rawDescription}</TooltipContent>
              </Tooltip>
            )
          ) : null}
        </div>
      )}

      {/* Field input */}
      <div>{children}</div>

      {/* Errors */}
      {errors ? <div className="text-destructive text-xs">{errors}</div> : null}

      {/* Help (rarely used) */}
      {help ? (
        <div className="text-xs text-muted-foreground">{help}</div>
      ) : null}
    </div>
  );
}
