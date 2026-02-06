/**
 * JSON Parsing Utilities
 *
 * Comprehensive utilities for parsing JSON from various formats, including:
 * - Python-style JSON (single quotes, True/False/None)
 * - String arrays (JSON arrays, comma-separated, single values)
 * - Object arrays (JSON strings, objects with numeric keys)
 * - Deep recursive parsing
 *
 * These utilities are designed to handle Opal Tool parameters that must be
 * primitive types (String, Number, Boolean) but need to represent complex
 * structures like arrays or objects.
 *
 * @module JsonParsingUtils
 */

/**
 * Error class for JSON parsing failures
 */
export class JsonParseError extends Error {
  public constructor(message: string, public readonly value: any) {
    super(message);
    this.name = 'JsonParseError';
  }
}

/**
 * Parses a parameter that should be a string array, handling multiple input formats
 *
 * Supports:
 * - Already an array: returns as-is
 * - JSON string: `"['value1', 'value2']"` or `"[\"value1\", \"value2\"]"`
 * - Python-style JSON: `"['value1', 'value2']"` (single quotes)
 * - Comma-separated: `"value1, value2, value3"`
 * - Single value: `"value"`
 * - Object with numeric keys: `{"0": "value1", "1": "value2"}`
 *
 * @param value - Value to parse (array, string, or object)
 * @returns Array of strings
 * @throws {JsonParseError} If value cannot be parsed
 *
 * @example
 * ```typescript
 * parseStringArray(['a', 'b'])              // ['a', 'b']
 * parseStringArray("['a', 'b']")            // ['a', 'b']
 * parseStringArray('["a", "b"]')            // ['a', 'b']
 * parseStringArray('a, b, c')               // ['a', 'b', 'c']
 * parseStringArray('single')                // ['single']
 * parseStringArray({0: 'a', 1: 'b'})        // ['a', 'b']
 * ```
 */
export function parseStringArray(value: string[] | string | Record<string, string>): string[] {
  // Already an array
  if (Array.isArray(value)) {
    return value;
  }

  // String - could be comma-separated or single value
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Try parsing as JSON first (handles valid JSON arrays)
    if (trimmed.startsWith('[')) {
      try {
        // First try parsing as-is (valid JSON)
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // If JSON parsing fails, try converting Python-style to JSON
        // Replace single quotes with double quotes for JSON compatibility
        try {
          const jsonCompatible = trimmed.replace(/'/g, '"');
          const parsed = JSON.parse(jsonCompatible);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch {
          // Not valid JSON even after conversion, continue to comma-separated handling
        }
      }
    }

    // Handle comma-separated values
    if (trimmed.includes(',')) {
      return trimmed.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    }

    // Single value
    return [trimmed];
  }

  // Object with numeric keys (e.g., {"0": "value1", "1": "value2"})
  if (typeof value === 'object' && value !== null) {
    const keys = Object.keys(value).sort((a, b) => parseInt(a) - parseInt(b));
    return keys.map((key) => value[key]);
  }

  throw new JsonParseError(
    `Unable to parse string array from value: ${JSON.stringify(value)}`,
    value
  );
}

/**
 * Parses a parameter that should be an object array, handling multiple input formats
 *
 * Supports:
 * - Already an array: returns as-is
 * - JSON string: `"[{'key': 'value'}]"` or `"[{\"key\": \"value\"}]"`
 * - Python-style JSON: `"[{'key': 'value', 'bool': True}]"` (single quotes, True/False/None)
 * - Single object: `"{'key': 'value'}"` -> wrapped in array
 * - Object with numeric keys: `{"0": {...}, "1": {...}}`
 *
 * @param value - Value to parse (array, string, or object)
 * @returns Array of objects
 * @throws {JsonParseError} If value cannot be parsed as valid JSON
 *
 * @example
 * ```typescript
 * parseObjectArray([{id: 1}])                           // [{id: 1}]
 * parseObjectArray("[{'id': 1}, {'id': 2}]")            // [{id: 1}, {id: 2}]
 * parseObjectArray("{'id': 1}")                         // [{id: 1}]
 * parseObjectArray("{'active': True, 'count': None}")   // [{active: true, count: null}]
 * parseObjectArray({0: {id: 1}, 1: {id: 2}})            // [{id: 1}, {id: 2}]
 * ```
 */
export function parseObjectArray<T>(value: T[] | string | Record<string, T>): T[] {
  // Already an array
  if (Array.isArray(value)) {
    return value;
  }

  // String - parse as JSON
  if (typeof value === 'string') {
    try {
      // First try parsing as-is (valid JSON)
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      // Single object
      return [parsed];
    } catch (error) {
      // If JSON parsing fails, try converting Python-style to JSON
      // Replace single quotes with double quotes, handle Python's True/False/None
      try {
        const jsonCompatible = value
          .replace(/'/g, '"')           // Single quotes to double quotes
          .replace(/\bTrue\b/g, 'true')  // Python True to JSON true
          .replace(/\bFalse\b/g, 'false') // Python False to JSON false
          .replace(/\bNone\b/g, 'null');  // Python None to JSON null

        const parsed = JSON.parse(jsonCompatible);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        // Single object
        return [parsed];
      } catch {
        throw new JsonParseError(
          `Unable to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
          value
        );
      }
    }
  }

  // Object with numeric keys (e.g., {"0": {...}, "1": {...}})
  if (typeof value === 'object' && value !== null) {
    const keys = Object.keys(value).sort((a, b) => parseInt(a) - parseInt(b));
    return keys.map((key) => value[key]);
  }

  throw new JsonParseError(
    `Unable to parse object array from value: ${JSON.stringify(value)}`,
    value
  );
}

/**
 * Recursively parses any stringified JSON values in an object
 *
 * This function handles Python-style JSON syntax including:
 * - Single quotes: `'string'` -> `"string"`
 * - Boolean values: `True`/`False` -> `true`/`false`
 * - Null values: `None` -> `null`
 * - Unquoted object keys: `{key: value}` -> `{"key": value}`
 * - Comma-separated values: `[item1, item2, item3]` -> `["item1", "item2", "item3"]`
 *
 * Recursively processes:
 * - String values that look like JSON (start with `{` or `[`)
 * - Array elements
 * - Object properties
 *
 * Fallback behavior:
 * - If JSON parsing fails for array-like strings, attempts to parse as comma-separated values
 *
 * @param value - Value to parse (can be any type)
 * @returns Parsed value with all stringified JSON converted to objects
 *
 * @example
 * ```typescript
 * deepParseJson({
 *   data: "{'name': 'John', 'active': True}",
 *   items: "['a', 'b', 'c']",
 *   unquoted: "[item1, item2, item3]",  // Unquoted comma-separated
 *   nested: {
 *     config: "{'enabled': False, 'count': None}"
 *   }
 * })
 * // Returns:
 * // {
 * //   data: {name: 'John', active: true},
 * //   items: ['a', 'b', 'c'],
 * //   unquoted: ['item1', 'item2', 'item3'],
 * //   nested: {
 * //     config: {enabled: false, count: null}
 * //   }
 * // }
 * ```
 */
export function deepParseJson(value: any): any {
  // Null or undefined - return as-is
  if (value == null) {
    return value;
  }

  // String - try to parse if it looks like JSON
  if (typeof value === 'string') {
    const trimmed = value.trim();
    // Check if it looks like JSON (starts with { or [)
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length > 1) {
      try {
        // Convert Python-style to valid JSON
        const jsonStr = trimmed
          .replace(/'/g, '"')                           // 'quotes' -> "quotes"
          .replace(/\bTrue\b/g, 'true')                 // True -> true
          .replace(/\bFalse\b/g, 'false')               // False -> false
          .replace(/\bNone\b/g, 'null')                 // None -> null
          .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'); // {key:...} -> {"key":...}

        const parsed = JSON.parse(jsonStr);
        // Recursively parse the result
        return deepParseJson(parsed);
      } catch {
        // If JSON parsing fails, try parsing as comma-separated values
        // Handle formats like "[item1, item2, item3]" without quotes
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          const content = trimmed.slice(1, -1).trim();
          if (content.length > 0) {
            // Split by comma and trim each item
            const items = content.split(',').map((item) => item.trim()).filter((item) => item.length > 0);
            if (items.length > 0) {
              return items;
            }
          }
        }
        // Invalid JSON, return string as-is
        return value;
      }
    }
    return value;
  }

  // Array - recursively parse each element
  if (Array.isArray(value)) {
    return value.map(deepParseJson);
  }

  // Object - recursively parse each property
  if (typeof value === 'object') {
    const result: any = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = deepParseJson(val);
    }
    return result;
  }

  // Primitive (number, boolean) - return as-is
  return value;
}

/**
 * Safely parses JSON with detailed error information
 *
 * Unlike `JSON.parse()`, this function:
 * - Returns `null` instead of throwing on invalid JSON (if `throwOnError` is false)
 * - Provides detailed error messages
 * - Handles Python-style JSON syntax
 *
 * @param value - String to parse
 * @param throwOnError - Whether to throw on parse error (default: false)
 * @returns Parsed JSON or null if parsing fails
 * @throws {JsonParseError} If `throwOnError` is true and parsing fails
 *
 * @example
 * ```typescript
 * safeJsonParse('{"valid": "json"}')              // {valid: "json"}
 * safeJsonParse("{'python': 'style'}")            // {python: "style"}
 * safeJsonParse('invalid json')                   // null
 * safeJsonParse('invalid', true)                  // throws JsonParseError
 * ```
 */
export function safeJsonParse<T = any>(value: string, throwOnError = false): T | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  try {
    // First try standard JSON.parse
    return JSON.parse(trimmed) as T;
  } catch (error) {
    // Try converting Python-style to JSON
    try {
      const jsonCompatible = trimmed
        .replace(/'/g, '"')
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/\bNone\b/g, 'null')
        .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');

      return JSON.parse(jsonCompatible) as T;
    } catch {
      if (throwOnError) {
        throw new JsonParseError(
          `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
          value
        );
      }
      return null;
    }
  }
}
