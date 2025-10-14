// src/lib/templating.ts

/**
 * Recursively resolves template variables in the format {{variable}} with values from a context object.
 * Supports strings, objects, arrays, and primitive values.
 *
 * @param value - The value to process (can be string, object, array, or primitive)
 * @param context - Object containing variable key-value pairs
 * @returns The value with all template variables resolved
 */
export function resolveVariables<T>(
  value: T,
  context: Record<string, string>
): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return resolveStringVariables(value, context) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveVariables(item, context)) as T;
  }

  if (typeof value === "object") {
    const resolved: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      // Resolve variables in both keys and values
      const resolvedKey = resolveStringVariables(key, context);
      resolved[resolvedKey] = resolveVariables(val, context);
    }
    return resolved as T;
  }

  // For primitives (number, boolean, etc.), return as-is
  return value;
}

/**
 * Resolves template variables in a string using the format {{variable}}.
 * Variables that don't exist in the context are left unchanged.
 *
 * @param text - The string to process
 * @param context - Object containing variable key-value pairs
 * @returns String with resolved variables
 */
function resolveStringVariables(
  text: string,
  context: Record<string, string>
): string {
  // Match {{variableName}} patterns, allowing spaces around the variable name
  return text.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, variableName) => {
    const trimmedName = variableName.trim();
    if (trimmedName in context) {
      return context[trimmedName];
    }
    // Return the original placeholder if variable not found
    return match;
  });
}

/**
 * Extracts all unique variable names from a string in the format {{variable}}.
 *
 * @param text - The string to analyze
 * @returns Array of unique variable names found in the text
 */
export function extractVariables(text: string): string[] {
  const variables = new Set<string>();
  const regex = /\{\{\s*([^}]+)\s*\}\}/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const variableName = match[1].trim();
    if (variableName) {
      variables.add(variableName);
    }
  }

  return Array.from(variables);
}

/**
 * Recursively extracts all unique variable names from any value (string, object, array).
 *
 * @param value - The value to analyze (can be string, object, array, or primitive)
 * @returns Array of unique variable names found
 */
export function extractAllVariables(value: unknown): string[] {
  const variables = new Set<string>();

  function collect(val: unknown) {
    if (val === null || val === undefined) {
      return;
    }

    if (typeof val === "string") {
      extractVariables(val).forEach((v) => variables.add(v));
    } else if (Array.isArray(val)) {
      val.forEach(collect);
    } else if (typeof val === "object") {
      Object.entries(val).forEach(([key, value]) => {
        // Check variables in both keys and values
        extractVariables(key).forEach((v) => variables.add(v));
        collect(value);
      });
    }
  }

  collect(value);
  return Array.from(variables);
}

/**
 * Validates if all variables in a template can be resolved with the given context.
 *
 * @param template - The template to validate (string, object, or array)
 * @param context - Object containing variable key-value pairs
 * @returns Object with validation result and list of missing variables
 */
export function validateTemplate(
  template: unknown,
  context: Record<string, string>
): { isValid: boolean; missingVariables: string[] } {
  const allVariables = extractAllVariables(template);
  const missingVariables = allVariables.filter(
    (variable) => !(variable in context)
  );

  return {
    isValid: missingVariables.length === 0,
    missingVariables,
  };
}
