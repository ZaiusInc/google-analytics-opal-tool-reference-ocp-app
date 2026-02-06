import { ToolError } from '@optimizely-opal/opal-tool-ocp-sdk';
import { logger } from '@zaiusinc/app-sdk';
import { FilterExpression } from './types';

/**
 * Constructs a property resource name in the format required by APIs
 * @param propertyValue - Property ID as number or string
 * @returns Property resource name in format "properties/{propertyId}"
 */
export function constructPropertyResourceName(
  propertyValue: string | number
): string {
  let propertyNum: number | null = null;

  if (typeof propertyValue === 'number') {
    propertyNum = propertyValue;
  } else if (typeof propertyValue === 'string') {
    const trimmed = propertyValue.trim();
    if (/^\d+$/.test(trimmed)) {
      propertyNum = parseInt(trimmed, 10);
    } else if (trimmed.startsWith('properties/')) {
      const numericPart = trimmed.split('/').pop();
      if (numericPart && /^\d+$/.test(numericPart)) {
        propertyNum = parseInt(numericPart, 10);
      }
    }
  }

  if (propertyNum === null) {
    throw new ToolError(
      'Invalid Property ID',
      400,
      `Invalid property ID: ${propertyValue}. ` +
        'A valid property value is either a number or a string starting ' +
        'with "properties/" and followed by a number.'
    );
  }

  return `properties/${propertyNum}`;
}

/**
 * Creates a user agent string for API requests
 * @param customUserAgent - Optional custom user agent
 * @returns User agent string
 */
export function createUserAgent(customUserAgent?: string): string {
  const baseUserAgent = 'google-analytics-typescript-client/1.0.0';
  return customUserAgent
    ? `${customUserAgent} ${baseUserAgent}`
    : baseUserAgent;
}

/**
 * Converts snake_case to camelCase for API compatibility
 * @param obj - Object with snake_case keys
 * @returns Object with camelCase keys
 */
export function snakeToCamel(obj: any): any {
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel);
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) =>
      letter.toUpperCase()
    );
    result[camelKey] = snakeToCamel(value);
  }

  return result;
}

/**
 * Converts camelCase to snake_case for API requests
 * @param obj - Object with camelCase keys
 * @returns Object with snake_case keys
 */
export function camelToSnake(obj: any): any {
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(camelToSnake);
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(
      /[A-Z]/g,
      (letter) => `_${letter.toLowerCase()}`
    );
    result[snakeKey] = camelToSnake(value);
  }

  return result;
}

/**
 * Validates date range format
 * @param dateRange - Date range to validate
 */
export function validateDateRange(dateRange: {
  startDate: string;
  endDate: string;
}): void {
  const { startDate, endDate } = dateRange;

  // Check for relative date formats
  const relativeDates = ['today', 'yesterday', /^\d+daysAgo$/];
  const isStartRelative = relativeDates.some((pattern) =>
    typeof pattern === 'string'
      ? startDate === pattern
      : pattern.test(startDate)
  );
  const isEndRelative = relativeDates.some((pattern) =>
    typeof pattern === 'string' ? endDate === pattern : pattern.test(endDate)
  );

  // Check for absolute date format (YYYY-MM-DD)
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const isStartAbsolute = datePattern.test(startDate);
  const isEndAbsolute = datePattern.test(endDate);

  if (!isStartRelative && !isStartAbsolute) {
    throw new ToolError(
      'Invalid Date Format',
      400,
      `Invalid start date format: ${startDate}. Use YYYY-MM-DD or relative format like 'yesterday', '7daysAgo'`
    );
  }

  if (!isEndRelative && !isEndAbsolute) {
    throw new ToolError(
      'Invalid Date Format',
      400,
      `Invalid end date format: ${endDate}. Use YYYY-MM-DD or relative format like 'today', 'yesterday'`
    );
  }
}

/**
 * Validates currency code format
 * @param currencyCode - Currency code to validate
 */
export function validateCurrencyCode(currencyCode: string): void {
  // ISO 4217 currency codes are 3 uppercase letters
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new ToolError(
      'Invalid Currency Code',
      400,
      `Invalid currency code: ${currencyCode}. Must be a 3-letter ISO 4217 code like 'USD', 'EUR', 'JPY'`
    );
  }
}

/**
 * Validates limit parameter
 * @param limit - Limit value to validate
 */
export function validateLimit(limit: number): void {
  if (limit <= 0 || limit > 250000) {
    throw new ToolError(
      'Invalid Limit Parameter',
      400,
      `Invalid limit: ${limit}. Must be a positive integer <= 250,000`
    );
  }
}

/**
 * Validates offset parameter
 * @param offset - Offset value to validate
 */
export function validateOffset(offset: number): void {
  if (offset < 0) {
    throw new ToolError(
      'Invalid Offset Parameter',
      400,
      `Invalid offset: ${offset}. Must be a non-negative integer`
    );
  }
}

export function getDateRangesHints(): string {
  const rangeJan = {
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    name: 'Jan2025',
  };
  const rangeFeb = {
    startDate: '2025-02-01',
    endDate: '2025-02-28',
    name: 'Feb2025',
  };
  const rangeLast2Days = {
    startDate: 'yesterday',
    endDate: 'today',
    name: 'YesterdayAndToday',
  };
  const rangePrev30Days = {
    startDate: '30daysAgo',
    endDate: 'yesterday',
    name: 'Previous30Days',
  };

  return `Example dateRange arguments:
  1. A single date range:

    [ ${JSON.stringify(rangeJan, null, 2)} ]

  2. A relative date range using 'yesterday' and 'today':
    [ ${JSON.stringify(rangeLast2Days, null, 2)} ]

  3. A relative date range using 'NdaysAgo' and 'today':
    [ ${JSON.stringify(rangePrev30Days, null, 2)} ]

  4. Multiple date ranges:
    [ ${JSON.stringify(rangeJan, null, 2)}, ${JSON.stringify(
  rangeFeb,
  null,
  2
)} ]
`;
}

const filterNotes = `
    Notes:
        The API applies the dimension_filter and metric_filter
    independently. As a result, some complex combinations of dimension and
    metric filters are not possible in a single report request.

    For example, you can't create a dimensionFilter and metricFilter
    combination for the following condition:

    (
      (eventName = "page_view" AND eventCount > 100)
      OR
      (eventName = "join_group" AND eventCount < 50)
    )

    This isn't possible because there's no way to apply the condition
    "eventCount > 100" only to the data with eventName of "page_view", and
    the condition "eventCount < 50" only to the data with eventName of
    "join_group".

    More generally, you can't define a dimension_filter and metric_filter
    for:

    (
      ((dimension condition D1) AND (metric condition M1))
      OR
      ((dimension condition D2) AND (metric condition M2))
    )

    If you have complex conditions like this, either:

    a)  Run a single report that applies a subset of the conditions that
        the API supports as well as the data needed to perform filtering of the
        API response on the client side. For example, for the condition:
        (
          (eventName = "page_view" AND eventCount > 100)
          OR
          (eventName = "join_group" AND eventCount < 50)
        )
        You could run a report that filters only on:
        eventName one of "page_view" or "join_group"
        and include the eventCount metric, then filter the API response on the
        client side to apply the different metric filters for the different
        events.

    or

    b)  Run a separate report for each combination of dimension condition and
        metric condition. For the example above, you'd run one report for the
        combination of (D1 AND M1), and another report for the combination of
        (D2 AND M2).

    Try to run fewer reports (option a) if possible. However, if running
    fewer reports results in excessive quota usage for the API, use option
    b. More information on quota usage is at
    https://developers.google.com/analytics/blog/2023/data-api-quota-management.
`;

export function getDimensionFilterHints(): string {
  const beginsWith = {
    fieldName: 'eventName',
    stringFilter: {
      matchType: 'BEGINS_WITH',
      value: 'add',
    },
  };
  const notFilter = { notExpression: { filter: beginsWith } };
  const emptyFilter = {
    fieldName: 'source',
    emptyFilter: {},
  };
  const sourceMediumFilter = {
    fieldName: 'sourceMedium',
    stringFilter: {
      matchType: 'EXACT',
      value: 'google / cpc',
    },
  };
  const eventListFilter = {
    fieldName: 'eventName',
    inListFilter: {
      caseSensitive: true,
      values: ['first_visit', 'purchase', 'add_to_cart'],
    },
  };
  const andFilter = {
    andGroup: {
      expressions: [sourceMediumFilter, eventListFilter],
    },
  };
  const orFilter = {
    orGroup: {
      expressions: [sourceMediumFilter, eventListFilter],
    },
  };
  return `Example dimensionFilter arguments:
    1. A simple filter:
        ${JSON.stringify({ filter: beginsWith }, null, 2)}
    2. A NOT filter:
        ${JSON.stringify(notFilter, null, 2)}
    3. An empty value filter:
        ${JSON.stringify({ filter: emptyFilter }, null, 2)}
    4. An AND group filter:
        ${JSON.stringify(andFilter, null, 2)}
    5. An OR group filter:
        ${JSON.stringify(orFilter, null, 2)}

${filterNotes}`;
}

/**
 * Generates example hints for metric_filter arguments for reporting tools.
 */
export function getMetricFilterHints(): string {
  const eventCountGt10Filter = {
    fieldName: 'eventCount',
    numericFilter: {
      operation: 'GREATER_THAN',
      value: { int64Value: 10 },
    },
  };
  const notFilter = { notExpression: { filter: eventCountGt10Filter } };
  const emptyFilter = {
    fieldName: 'purchaseRevenue',
    emptyFilter: {},
  };
  const revenueBetweenFilter = {
    fieldName: 'purchaseRevenue',
    betweenFilter: {
      fromValue: { doubleValue: 10.0 },
      toValue: { doubleValue: 25.0 },
    },
  };
  const andFilter = {
    andGroup: {
      expressions: [
        { filter: eventCountGt10Filter },
        { filter: revenueBetweenFilter },
      ],
    },
  };
  const orFilter = {
    orGroup: {
      expressions: [
        { filter: eventCountGt10Filter },
        { filter: revenueBetweenFilter },
      ],
    },
  };

  return `Example metricFilter arguments:
  1. A simple filter:
    ${JSON.stringify({ filter: eventCountGt10Filter }, null, 2)}

  2. A NOT filter:
    ${JSON.stringify(notFilter, null, 2)}

  3. An empty value filter:
    ${JSON.stringify({ filter: emptyFilter }, null, 2)}

  4. An AND group filter:
    ${JSON.stringify(andFilter, null, 2)}

  5. An OR group filter:
    ${JSON.stringify(orFilter, null, 2)}

${filterNotes}`;
}

/**
 * Generates example hints for order_bys arguments for reporting tools.
 */
export function getOrderBysHints(): string {
  const dimensionAlphanumericAscending = {
    dimension: {
      dimensionName: 'eventName',
      orderType: 'ALPHANUMERIC',
    },
    desc: false,
  };
  const dimensionAlphanumericNoCaseDescending = {
    dimension: {
      dimensionName: 'campaignName',
      orderType: 'CASE_INSENSITIVE_ALPHANUMERIC',
    },
    desc: true,
  };
  const dimensionNumericAscending = {
    dimension: {
      dimensionName: 'audienceId',
      orderType: 'NUMERIC',
    },
    desc: false,
  };
  const metricAscending = {
    metric: {
      metricName: 'eventCount',
    },
    desc: false,
  };
  const metricDescending = {
    metric: {
      metricName: 'eventValue',
    },
    desc: true,
  };
  return `Example orderBys arguments:

  1.  Order by ascending 'eventName':
      [ ${JSON.stringify(dimensionAlphanumericAscending, null, 2)} ]

  2.  Order by descending 'eventName', ignoring case:
      [ ${JSON.stringify(dimensionAlphanumericNoCaseDescending, null, 2)} ]

  3.  Order by ascending 'audienceId':
      [ ${JSON.stringify(dimensionNumericAscending, null, 2)} ]

  4.  Order by descending 'eventCount':
      [ ${JSON.stringify(metricDescending, null, 2)} ]

  5.  Order by ascending 'eventCount':
      [ ${JSON.stringify(metricAscending, null, 2)} ]

  6.  Combination of dimension and metric order bys:
      [
        ${JSON.stringify(dimensionAlphanumericAscending, null, 2)},
        ${JSON.stringify(metricDescending, null, 2)},
      ]

  7.  Order by multiple dimensions and metrics:
      [
        ${JSON.stringify(dimensionAlphanumericAscending, null, 2)},
        ${JSON.stringify(dimensionNumericAscending, null, 2)},
        ${JSON.stringify(metricDescending, null, 2)},
      ]

  The dimensions and metrics in orderBys must also be present in the report
  request's "dimensions" and "metrics" arguments, respectively.
`;
}

/**
 * List of dimensions supported by the Realtime API
 * Based on: https://developers.google.com/analytics/devguides/reporting/data/v1/realtime-api-schema
 */
const REALTIME_SUPPORTED_DIMENSIONS = new Set([
  'appVersion',
  'audienceId',
  'audienceName',
  'audienceResourceName',
  'city',
  'cityId',
  'country',
  'countryId',
  'deviceCategory',
  'eventName',
  'minutesAgo',
  'platform',
  'streamId',
  'streamName',
  'unifiedScreenName',
  // Custom user dimensions are also supported in format: customUser:{parameter_name}
]);

/**
 * Validates dimension names and filters out invalid ones
 * @param dimensions - Array of dimension names
 * @param reportType - Type of report ('standard' or 'realtime')
 * @throws Error if invalid dimensions are found
 */
export function validateDimensions(dimensions: string[], reportType: 'standard' | 'realtime' = 'standard'): void {
  // Check for 'dateRange' which is never valid
  const dateRangeDims = dimensions.filter((dim) => dim === 'dateRange');

  if (dateRangeDims.length > 0) {
    if (reportType === 'realtime') {
      throw new ToolError(
        'Invalid Dimension',
        400,
        `Invalid dimension(s): ${dateRangeDims.join(', ')}. ` +
        '\'dateRange\' is not a valid dimension for realtime reports. ' +
        'Realtime reports do not support multiple date ranges, so \'dateRange\' ' +
        'should never be included in the dimensions array.'
      );
    } else {
      throw new ToolError(
        'Invalid Dimension',
        400,
        `Invalid dimension(s): ${dateRangeDims.join(', ')}. ` +
        '\'dateRange\' is not a valid dimension. When using multiple date ranges (max 4), ' +
        'the date range information is automatically included in the response. ' +
        'Remove \'dateRange\' from the dimensions array. ' +
        'If you need to distinguish between date ranges in your analysis, ' +
        'use descriptive names for each date range in the \'name\' field. '
      );
    }
  }

  // Additional validation for realtime reports
  if (reportType === 'realtime') {
    const unsupportedDims = dimensions.filter((dim) => {
      // Allow custom user dimensions (customUser:*)
      if (dim.startsWith('customUser:')) {
        return false;
      }
      // Check if dimension is in supported list
      return !REALTIME_SUPPORTED_DIMENSIONS.has(dim);
    });

    if (unsupportedDims.length > 0) {
      const commonMistakes = unsupportedDims.filter((dim) =>
        dim.includes('session') || dim.includes('Source') || dim.includes('Medium') || dim.includes('Campaign')
      );

      let errorMessage = `Unsupported dimension(s) for realtime reports: ${unsupportedDims.join(', ')}.\n\n`;

      if (commonMistakes.length > 0) {
        errorMessage +=
          'Traffic source dimensions (sessionSource, sessionMedium, firstUserSource, etc.) ' +
          'are NOT supported in realtime reports.\n\n';
      }

      errorMessage += `Supported realtime dimensions: ${Array.from(REALTIME_SUPPORTED_DIMENSIONS).sort().join(', ')}\n`;
      errorMessage += '\nYou can also use custom user dimensions in the format: customUser:{parameter_name}';

      throw new ToolError(
        'Unsupported Realtime Dimension',
        400,
        errorMessage
      );
    }
  }
}

/**
 * Parses a parameter that should be a string array, handling multiple input formats
 * @param value - Value to parse (array, string, or object)
 * @returns Array of strings
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

  throw new ToolError(
    'Invalid Parameter Format',
    400,
    `Unable to parse parameter value: ${JSON.stringify(value)}`
  );
}

/**
 * Parses a parameter that should be an object array, handling multiple input formats
 * @param value - Value to parse (array, string, or object)
 * @returns Array of objects
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
        throw new ToolError(
          'Invalid JSON Format',
          400,
          `Unable to parse JSON: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  // Object with numeric keys (e.g., {"0": {...}, "1": {...}})
  if (typeof value === 'object' && value !== null) {
    const keys = Object.keys(value).sort((a, b) => parseInt(a) - parseInt(b));
    return keys.map((key) => value[key]);
  }

  throw new ToolError(
    'Invalid Parameter Format',
    400,
    `Unable to parse parameter value: ${JSON.stringify(value)}`
  );
}

/**
 * Creates a hostname filter expression for a hostname
 * @param domain - Hostname to filter by (e.g., "www.optimizely.com")
 * @returns FilterExpression for hostname exact match
 */
function createDomainFilter(domain: string): FilterExpression {
  return {
    filter: {
      fieldName: 'hostname',
      stringFilter: {
        matchType: 'EXACT',
        value: domain,
        caseSensitive: false,
      },
    },
  };
}

/**
 * Merges default hostname filter with user-provided dimension filter
 * @param userFilter - User-provided dimension filter (optional)
 * @param domain - Hostname to filter by from settings (e.g., "www.optimizely.com")
 * @param reportType - Type of report ('standard' or 'realtime')
 * @returns Combined filter expression
 */
export function mergeDefaultFilters(
  userFilter: FilterExpression | string | undefined,
  domain: string | undefined,
  reportType: 'standard' | 'realtime' = 'standard'
): FilterExpression | undefined {
  // No hostname filter configured
  if (!domain || domain.trim() === '') {
    if (typeof userFilter === 'string') {
      return JSON.parse(userFilter);
    }
    return userFilter;
  }

  // Hostname dimension is NOT supported in realtime reports
  // See: https://developers.google.com/analytics/devguides/reporting/data/v1/realtime-api-schema
  if (reportType === 'realtime') {
    logger.warn(
      `Hostname filter "${domain}" configured but cannot be applied to realtime reports. ` +
      'Hostname is not a supported dimension for GA4 realtime reports. ' +
      'Only the user-provided filter will be applied.'
    );
    if (typeof userFilter === 'string') {
      return JSON.parse(userFilter);
    }
    return userFilter;
  }

  const domainFilterExpression = createDomainFilter(domain.trim());

  // No user filter - return domain filter only
  if (!userFilter) {
    return domainFilterExpression;
  }

  // Parse user filter if it's a string
  const parsedUserFilter: FilterExpression =
    typeof userFilter === 'string' ? JSON.parse(userFilter) : userFilter;

  // Combine both filters with AND
  return {
    andGroup: {
      expressions: [
        domainFilterExpression,
        parsedUserFilter,
      ],
    },
  };
}
