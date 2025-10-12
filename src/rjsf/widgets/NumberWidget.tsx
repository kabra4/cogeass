import { Input } from "@/components/ui/input";
import { type WidgetProps } from "@rjsf/utils";

/**
 * Coerces a value to a number, but allows partial inputs like "3." or "-"
 * for a better user experience during typing.
 *
 * @param value - The value to coerce
 * @returns A number, the original string for partial inputs, or undefined
 */
function asNumber(value: string | number | null | undefined) {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  // Allow typing of partial numbers without them being erased
  if (typeof value === "string" && (/\.$/.test(value) || /^-$/.test(value))) {
    return value;
  }
  const n = Number(value);
  // Return the original string if it's not a valid number. This allows the
  // validator to catch it and show a proper error message.
  return isNaN(n) ? value : n;
}

export default function NumberWidget({
  id,
  value,
  required,
  disabled,
  readonly,
  onChange,
  placeholder,
  schema,
}: WidgetProps) {
  const handleChange = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    const { value: inputValue } = target;

    // If the input is cleared, update the form data to undefined
    if (inputValue === "") {
      onChange(undefined);
      return;
    }

    // Define a regex based on the schema type (integer or number)
    const regex =
      schema.type === "integer"
        ? /^-?\d*$/ // Allows an optional minus sign followed by digits
        : /^-?\d*\.?\d*$/; // Allows an optional minus sign, digits, and an optional single decimal point

    // Test if the input value matches the allowed numeric pattern.
    // If it does, we update the form state.
    // If it doesn't (e.g., contains letters), we do nothing, effectively
    // ignoring the invalid character and preventing it from being rendered.
    if (regex.test(inputValue)) {
      onChange(asNumber(inputValue));
    }
  };

  return (
    <Input
      id={id}
      // Use type="text" to gain full control over the input, overriding
      // inconsistent browser behaviors with type="number".
      type="text"
      // Use inputMode to show the correct keyboard on mobile devices.
      inputMode={schema.type === "integer" ? "numeric" : "decimal"}
      value={value ?? ""}
      required={required}
      disabled={disabled || readonly}
      placeholder={placeholder}
      onChange={handleChange}
    />
  );
}
