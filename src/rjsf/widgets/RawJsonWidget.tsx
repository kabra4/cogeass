import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { type WidgetProps } from "@rjsf/utils";
import { AlertCircle } from "lucide-react";

export default function RawJsonWidget({
    id,
    value,
    readonly,
    disabled,
    onChange,
    placeholder,
}: WidgetProps) {
    const [text, setText] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Keep track of the last successfully processed JSON string to avoid cursor jumps/re-renders
    // when the parent updates the value with what we just sent it.
    const lastValidJson = useRef<string>("");

    useEffect(() => {
        // If value is null/undefined, treat as empty object or undefined
        if (value === undefined || value === null) {
            if (lastValidJson.current !== "") {
                setText("");
                lastValidJson.current = "";
            }
            return;
        }

        const jsonString = JSON.stringify(value, null, 2);

        // Only update local text if the incoming value is different from what we last thought was valid.
        // This allows the user to type (e.g. adding a comma) without the text being reformatted immediately
        // or the cursor jumping, AS LONG AS the structural value hasn't changed effectively (or we ignore it).
        // Actually, if we send new data, 'value' will change.
        // If we parse "{"foo": 1}" and send it, back comes {foo: 1}. Stringify is same.
        // If we type "{"foo": 1, "  -> invalid. We don't send. 'value' prop processing:
        // 'value' prop remains {foo: 1}. Stringify is same. Text is different.
        // We should NOT overwrite text if it's currently invalid but the prop hasn't changed meaningfully.

        if (jsonString !== lastValidJson.current) {
            setText(jsonString);
            lastValidJson.current = jsonString;
            setError(null);
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setText(newText);

        if (!newText.trim()) {
            // Empty string -> undefined or empty object? 
            // RJSF usually prefers undefined for "no value".
            onChange(undefined);
            lastValidJson.current = "";
            setError(null);
            return;
        }

        try {
            const parsed = JSON.parse(newText);
            // If valid, send it up.
            // We also update lastValidJson to the *stringified* version of what we parsed,
            // because that's what will come back from props.
            // Note: This might cause a reformat on the next render cycle if the user's formatting 
            // differs from JSON.stringify(null, 2). 
            // E.g. user types `{"a":1}`, stringify makes it `{\n  "a": 1\n}`.
            // This is annoying. 
            // improved logic: don't update from props if parse(newText) deepEquals value.
            // But we don't have deepEqual easily.
            // Simple fix: Just accept the reformat for now, or use a better comparison.
            // For this task, standard functionality is acceptable.

            // Let's try to be slightly smarter: update lastValidJson to match the string we just parsed
            // SO THAT useEffect doesn't trigger if the prop comes back matching it.
            // BUT Prop comes back normalized.
            // So if I type `{"a": 1}`, send `{a:1}`. Prop comes back `{a:1}`.
            // Effect: `jsonString` is `{\n "a": 1 \n}`. `lastValidJson` (old) is diff.
            // It WILL overwrite my compact JSON with expanded JSON.
            // This is expected behavior for a "Raw JSON" widget that validates and formats.

            onChange(parsed);
            lastValidJson.current = JSON.stringify(parsed, null, 2);
            setError(null);
        } catch (err) {
            setError((err as Error).message);
            // Do NOT call onChange. Keep the old valid value in the form state.
        }
    };

    return (
        <div className="space-y-1">
            <Textarea
                id={id}
                value={text}
                onChange={handleChange}
                disabled={disabled || readonly}
                placeholder={placeholder}
                className="font-mono text-xs min-h-[200px]"
                spellCheck={false}
            />
            {error && (
                <div className="flex items-center text-destructive text-xs gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>Invalid JSON: {error}</span>
                </div>
            )}
        </div>
    );
}
