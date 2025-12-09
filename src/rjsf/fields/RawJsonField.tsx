import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { type FieldProps } from "@rjsf/utils";
import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function RawJsonField(props: FieldProps) {
    const { idSchema, formData, readonly, disabled, onChange, name, schema, required } = props;

    const [text, setText] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Keep track of the last successfully processed JSON string
    const lastValidJson = useRef<string>("");

    useEffect(() => {
        // If formData is null/undefined, treat as undefined (empty)
        if (formData === undefined || formData === null) {
            if (lastValidJson.current !== "") {
                setText("");
                lastValidJson.current = "";
            }
            return;
        }

        const jsonString = JSON.stringify(formData, null, 2);

        if (jsonString !== lastValidJson.current) {
            setText(jsonString);
            lastValidJson.current = jsonString;
            setError(null);
        }
    }, [formData]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setText(newText);

        if (!newText.trim()) {
            onChange(undefined);
            lastValidJson.current = "";
            setError(null);
            return;
        }

        try {
            const parsed = JSON.parse(newText);
            onChange(parsed);
            // We don't update lastValidJson here to match newText because we want to allow reformatting on next sync?
            // Actually, if we send `parsed`, `formData` comes back as `parsed` (object).
            // `useEffect` will trigger and set `jsonString = stringify(parsed)`.
            // If `newText` != `stringify(parsed)`, we get a jump.
            // E.g. user typed `{ "a": 1 }` (compact). Stringify is expanded.
            // So we MUST update lastValidJson to what we expect useEffect to see.
            lastValidJson.current = JSON.stringify(parsed, null, 2);
            setError(null);
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const title = schema.title || name;

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                {title && (
                    <Label htmlFor={idSchema.$id}>
                        {title}
                        {required ? <span className="text-destructive ml-0.5">*</span> : null}
                    </Label>
                )}
            </div>
            <Textarea
                id={idSchema.$id}
                value={text}
                onChange={handleChange}
                disabled={disabled || readonly}
                placeholder="{}"
                className="font-mono text-xs min-h-[80px]"
                spellCheck={false}
            />
            {error && (
                <div className="flex items-center text-destructive text-xs gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>Invalid JSON: {error}</span>
                </div>
            )}
            {schema.description && (
                <p className="text-sm text-muted-foreground">{schema.description}</p>
            )}
        </div>
    );
}
