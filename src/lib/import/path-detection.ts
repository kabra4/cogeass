import type { DetectedPathParam } from "./types";

/**
 * Patterns for detecting dynamic path segments.
 */
const PATTERNS = {
  /** Numeric ID (e.g., 123, 456789) */
  numericId: /^\d+$/,
  /** UUID v4 (e.g., 550e8400-e29b-41d4-a716-446655440000) */
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  /** MongoDB ObjectId (24 hex chars) */
  objectId: /^[0-9a-f]{24}$/i,
  /** Short ID (6-12 chars with at least one digit, common in URL shorteners) */
  shortId: /^(?=.*\d)[0-9a-zA-Z]{6,12}$/,
  /** Slug with numbers (e.g., "my-post-123") */
  slugWithId: /^[\w-]+-\d+$/,
};

/**
 * Infer a parameter name from the preceding path segment.
 * e.g., /users/123 → userId, /posts/456 → postId
 */
function inferParamName(
  segments: string[],
  index: number,
  usedNames: Set<string>
): string {
  const prevSegment = segments[index - 1];

  if (prevSegment) {
    // Singularize simple plural forms
    let baseName = prevSegment;
    if (baseName.endsWith("ies")) {
      baseName = baseName.slice(0, -3) + "y";
    } else if (baseName.endsWith("sses") || baseName.endsWith("xes") ||
               baseName.endsWith("shes") || baseName.endsWith("ches")) {
      // boxes → box, matches → match, bushes → bush
      baseName = baseName.slice(0, -2);
    } else if (baseName.endsWith("s") && baseName.length > 2 && !baseName.endsWith("ss")) {
      // users → user, resources → resource, but not "class"
      baseName = baseName.slice(0, -1);
    }

    // Convert to camelCase and add "Id"
    const paramName = baseName.charAt(0).toLowerCase() + baseName.slice(1) + "Id";

    // Ensure unique name
    if (!usedNames.has(paramName)) {
      usedNames.add(paramName);
      return paramName;
    }

    // Add numeric suffix if needed
    let suffix = 2;
    while (usedNames.has(`${paramName}${suffix}`)) {
      suffix++;
    }
    const uniqueName = `${paramName}${suffix}`;
    usedNames.add(uniqueName);
    return uniqueName;
  }

  // Fallback to generic name
  const genericName = "id";
  if (!usedNames.has(genericName)) {
    usedNames.add(genericName);
    return genericName;
  }

  let suffix = 2;
  while (usedNames.has(`id${suffix}`)) {
    suffix++;
  }
  const uniqueName = `id${suffix}`;
  usedNames.add(uniqueName);
  return uniqueName;
}

/**
 * Calculate confidence score for a detected dynamic segment.
 */
function getConfidence(segment: string): number {
  if (PATTERNS.uuid.test(segment)) return 1.0;
  if (PATTERNS.objectId.test(segment)) return 0.95;
  if (PATTERNS.numericId.test(segment)) return 0.9;
  if (PATTERNS.slugWithId.test(segment)) return 0.7;
  if (PATTERNS.shortId.test(segment)) return 0.6;
  return 0;
}

/**
 * Check if a segment looks like a dynamic value.
 */
function isDynamicSegment(segment: string): boolean {
  return (
    PATTERNS.numericId.test(segment) ||
    PATTERNS.uuid.test(segment) ||
    PATTERNS.objectId.test(segment) ||
    PATTERNS.slugWithId.test(segment) ||
    PATTERNS.shortId.test(segment)
  );
}

/**
 * Parse a URL path, handling query strings.
 */
function parsePathFromUrl(urlOrPath: string): string {
  try {
    // Handle full URLs
    if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
      const url = new URL(urlOrPath);
      return url.pathname;
    }
    // Handle paths with query strings
    const queryIndex = urlOrPath.indexOf("?");
    if (queryIndex !== -1) {
      return urlOrPath.slice(0, queryIndex);
    }
    return urlOrPath;
  } catch {
    // If URL parsing fails, try to extract path
    const queryIndex = urlOrPath.indexOf("?");
    if (queryIndex !== -1) {
      return urlOrPath.slice(0, queryIndex);
    }
    return urlOrPath;
  }
}

/**
 * Detect dynamic path parameters in a single path.
 */
export function detectPathParametersInPath(path: string): DetectedPathParam | null {
  const cleanPath = parsePathFromUrl(path);
  const segments = cleanPath.split("/").filter(Boolean);
  const usedNames = new Set<string>();

  const parameters: DetectedPathParam["parameters"] = [];
  const newSegments: string[] = [];
  let totalConfidence = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const confidence = getConfidence(segment);

    if (isDynamicSegment(segment)) {
      const paramName = inferParamName(segments, i, usedNames);
      parameters.push({
        name: paramName,
        exampleValue: segment,
        segmentIndex: i,
      });
      newSegments.push(`{${paramName}}`);
      totalConfidence += confidence;
    } else {
      newSegments.push(segment);
    }
  }

  // Only return if we found dynamic segments
  if (parameters.length === 0) {
    return null;
  }

  const avgConfidence = totalConfidence / parameters.length;

  return {
    originalPath: cleanPath.startsWith("/") ? cleanPath : "/" + cleanPath,
    parameterizedPath: "/" + newSegments.join("/"),
    parameters,
    confidence: Math.round(avgConfidence * 100) / 100,
  };
}

/**
 * Group paths by their parameterized pattern.
 * This helps identify common patterns across multiple requests.
 */
function groupPathsByPattern(
  paths: string[]
): Map<string, { paths: string[]; detection: DetectedPathParam }> {
  const groups = new Map<string, { paths: string[]; detection: DetectedPathParam }>();

  for (const path of paths) {
    const detection = detectPathParametersInPath(path);
    if (detection) {
      const key = detection.parameterizedPath;
      const existing = groups.get(key);
      if (existing) {
        existing.paths.push(path);
        // Increase confidence when multiple paths match the same pattern
        existing.detection.confidence = Math.min(
          1.0,
          existing.detection.confidence + 0.1
        );
      } else {
        groups.set(key, { paths: [path], detection });
      }
    }
  }

  return groups;
}

/**
 * Detect path parameters across multiple paths.
 * Returns a deduplicated list of detected patterns.
 */
export function detectPathParameters(paths: string[]): DetectedPathParam[] {
  const uniquePaths = [...new Set(paths.map(parsePathFromUrl))];
  const groups = groupPathsByPattern(uniquePaths);

  return Array.from(groups.values())
    .map((g) => g.detection)
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Apply detected path patterns to a list of paths.
 * Returns a map from original path to parameterized path.
 */
export function applyPathPatterns(
  paths: string[],
  patterns: DetectedPathParam[]
): Map<string, string> {
  const result = new Map<string, string>();

  for (const path of paths) {
    const cleanPath = parsePathFromUrl(path);
    // Check if this path matches any pattern
    for (const pattern of patterns) {
      if (pathMatchesPattern(cleanPath, pattern)) {
        result.set(path, pattern.parameterizedPath);
        break;
      }
    }
    // If no pattern matched, use original
    if (!result.has(path)) {
      result.set(path, cleanPath.startsWith("/") ? cleanPath : "/" + cleanPath);
    }
  }

  return result;
}

/**
 * Check if a concrete path matches a parameterized pattern.
 */
function pathMatchesPattern(path: string, pattern: DetectedPathParam): boolean {
  const pathSegments = path.split("/").filter(Boolean);
  const patternSegments = pattern.parameterizedPath.split("/").filter(Boolean);

  if (pathSegments.length !== patternSegments.length) {
    return false;
  }

  for (let i = 0; i < pathSegments.length; i++) {
    const pathSeg = pathSegments[i];
    const patternSeg = patternSegments[i];

    // If pattern segment is a parameter, check if path segment is dynamic
    if (patternSeg.startsWith("{") && patternSeg.endsWith("}")) {
      if (!isDynamicSegment(pathSeg)) {
        return false;
      }
    } else if (pathSeg !== patternSeg) {
      return false;
    }
  }

  return true;
}

/**
 * Extract path parameters from a path that already has {param} placeholders.
 */
export function extractExistingPathParams(path: string): string[] {
  const matches = path.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(1, -1));
}
