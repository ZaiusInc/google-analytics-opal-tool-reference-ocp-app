import { ParameterType, tool, ToolError } from '@optimizely-opal/opal-tool-ocp-sdk';
import { storage, logger } from '@zaiusinc/app-sdk';
import { AuthSection, DefaultFiltersSection } from '../data/data';
import { deepParseJson } from '../lib/json_parsing_utilities';
import {
  RunReportParams,
  RunReportResponse,
  DateRange,
  OrderBy
} from '../lib/types';
import {
  constructPropertyResourceName,
  validateDateRange,
  validateCurrencyCode,
  validateLimit,
  validateOffset,
  validateDimensions,
  camelToSnake,
  snakeToCamel,
  parseStringArray,
  parseObjectArray,
  mergeDefaultFilters,
} from '../lib/utils';
import { AppAuth } from '../lib/api/GoogleAnalyticsApiClient';

/**
 * Tool class for Google Analytics reporting operations
 */
export class RunReportTool {
  /**
   * Runs a Google Analytics Data API report
   * @param params - Report parameters
   * @returns Report response
   */
  @tool({
    name: 'run_report',
    description: `
      Query Google Analytics 4 data for a specific time period with dimensions and metrics.

      **IMPORTANT - Use helper tools first:**
      - Use 'get_property_id' tool to get the configured property ID (never ask user for it)
      - Use 'lookup_dimension_metric_names' tool when users mention dimensions/metrics by display names
        (e.g., "Active Users" → "activeUsers", "Session Source" → "sessionSource")

      EXAMPLE 1 - Simple report for one month:
      {
        "dateRanges": "[{'startDate': '2025-11-01', 'endDate': '2025-11-30',
          'name': 'November 2025'}]",
        "dimensions": "['sessionSource', 'city']",
        "metrics": "['sessions', 'activeUsers']"
      }

      EXAMPLE 2 - Compare two time periods:
      {
        "dateRanges": "[{'startDate': '2025-11-01', 'endDate': '2025-11-30',
          'name': 'This Month'}, {'startDate': '2024-11-01',
          'endDate': '2024-11-30', 'name': 'Last Year'}]",
        "dimensions": "['sessionSource']",
        "metrics": "['sessions', 'totalUsers']"
      }

      EXAMPLE 3 - Filter by specific traffic sources:
      {
        "dateRanges": "[{'startDate': '2025-11-01', 'endDate': '2025-11-30'}]",
        "dimensions": "['sessionSource']",
        "metrics": "['sessions']",
        "dimensionFilter": "{'filter': {'fieldName': 'sessionSource',
          'inListFilter': {'values': ['google', 'facebook', 'instagram'],
          'caseSensitive': false}}}"
      }

      EXAMPLE 4 - Order results by sessions descending:
      {
        "dateRanges": "[{'startDate': '2025-11-01', 'endDate': '2025-11-30'}]",
        "dimensions": "['pagePath']",
        "metrics": "['sessions']",
        "orderBys": "[{'desc': true, 'metric': {'metricName': 'sessions'}}]",
        "limit": 10
      }
    `,
    endpoint: '/tools/run_report',
    parameters: [
      {
        name: 'dateRanges',
        type: ParameterType.String,
        description: `
          JSON string array of date range objects. Maximum 4 ranges allowed.

          Single date range:
          "[{'startDate': '2025-11-01', 'endDate': '2025-11-30', 'name': 'November'}]"

          Compare two periods:
          "[{'startDate': '2025-11-01', 'endDate': '2025-11-30', 'name': 'This Year'},
            {'startDate': '2024-11-01', 'endDate': '2024-11-30', 'name': 'Last Year'}]"

          Last 7 days:
          "[{'startDate': '7daysAgo', 'endDate': 'today'}]"

          Yesterday vs today:
          "[{'startDate': 'yesterday', 'endDate': 'yesterday'},
            {'startDate': 'today', 'endDate': 'today'}]"
        `,
        required: true,
      },
      {
        name: 'dimensions',
        type: ParameterType.String,
        description: `
          JSON string array of dimension names to group data by.

          Traffic source breakdown:
          "['sessionSource', 'sessionMedium']"

          Geographic analysis:
          "['country', 'city']"

          Device breakdown:
          "['deviceCategory', 'browser']"

          Page performance:
          "['pagePath', 'pageTitle']"

          Event tracking:
          "['eventName']"

          Single dimension:
          "['sessionSource']"

          Common dimensions: sessionSource, country, city, deviceCategory, browser,
          pagePath, eventName, sessionMedium, campaignName
        `,
        required: true,
      },
      {
        name: 'metrics',
        type: ParameterType.String,
        description: `
          JSON string array of metric names to measure.

          User metrics:
          "['activeUsers', 'totalUsers', 'newUsers']"

          Session metrics:
          "['sessions', 'bounceRate', 'averageSessionDuration']"

          Engagement metrics:
          "['screenPageViews', 'eventCount']"

          Conversion metrics:
          "['conversions', 'totalRevenue']"

          Combined example:
          "['sessions', 'activeUsers', 'bounceRate']"

          Common metrics: sessions, activeUsers, totalUsers, screenPageViews, eventCount,
          conversions, bounceRate, averageSessionDuration
        `,
        required: true,
      },
      {
        name: 'dimensionFilter',
        type: ParameterType.String,
        description: `
          Filter to include only specific dimension values. Optional.

          Provide as a JSON string (Python-style with single quotes is supported).

          Filter by single value (exact match):
          "{'filter': {'fieldName': 'country', 'stringFilter':
            {'value': 'United States', 'matchType': 'EXACT'}}}"

          Filter by multiple values (OR):
          "{'filter': {'fieldName': 'sessionSource', 'inListFilter':
            {'values': ['google', 'facebook', 'instagram'],
            'caseSensitive': false}}}"

          Filter by pattern (contains):
          "{'filter': {'fieldName': 'pagePath', 'stringFilter':
            {'value': '/blog', 'matchType': 'CONTAINS'}}}"

          Exclude values (NOT):
          "{'notExpression': {'filter': {'fieldName': 'sessionSource',
            'stringFilter': {'value': '(not set)'}}}}"

          Multiple conditions (AND):
          "{'andGroup': {'expressions': [
            {'filter': {'fieldName': 'country',
              'stringFilter': {'value': 'United States'}}},
            {'filter': {'fieldName': 'deviceCategory',
              'stringFilter': {'value': 'mobile'}}}]}}"
        `,
        required: false,
      },
      {
        name: 'metricsFilter',
        type: ParameterType.String,
        description: `
          Filter to include only rows where metrics meet certain criteria. Optional.

          Provide as a JSON string (Python-style with single quotes is supported).

          Sessions greater than 100:
          "{'filter': {'fieldName': 'sessions', 'numericFilter':
            {'operation': 'GREATER_THAN', 'value': {'int64Value': '100'}}}}"

          Active users at least 50:
          "{'filter': {'fieldName': 'activeUsers', 'numericFilter':
            {'operation': 'GREATER_THAN_OR_EQUAL',
            'value': {'int64Value': '50'}}}}"

          Bounce rate less than 50%:
          "{'filter': {'fieldName': 'bounceRate', 'numericFilter':
            {'operation': 'LESS_THAN', 'value': {'doubleValue': 0.5}}}}"

          Revenue between 100 and 1000:
          "{'filter': {'fieldName': 'totalRevenue', 'betweenFilter':
            {'fromValue': {'doubleValue': 100.0},
            'toValue': {'doubleValue': 1000.0}}}}"

          Operations: EQUAL, LESS_THAN, LESS_THAN_OR_EQUAL, GREATER_THAN, GREATER_THAN_OR_EQUAL
        `,
        required: false,
      },
      {
        name: 'orderBys',
        type: ParameterType.String,
        description: `
          JSON string array specifying how to sort results. Optional.

          Sort by sessions descending (highest first):
          "[{'desc': true, 'metric': {'metricName': 'sessions'}}]"

          Sort by sessions ascending (lowest first):
          "[{'desc': false, 'metric': {'metricName': 'sessions'}}]"

          Sort by dimension alphabetically:
          "[{'desc': false, 'dimension': {'dimensionName': 'sessionSource',
            'orderType': 'ALPHANUMERIC'}}]"

          Multiple sort criteria (sessions desc, then activeUsers desc):
          "[{'desc': true, 'metric': {'metricName': 'sessions'}},
            {'desc': true, 'metric': {'metricName': 'activeUsers'}}]"
        `,
        required: false,
      },
      {
        name: 'limit',
        type: ParameterType.Number,
        description: 'Maximum rows to return. Default unlimited. Example: 100',
        required: false,
      },
      {
        name: 'offset',
        type: ParameterType.Number,
        description: 'Number of rows to skip. Default 0. Example: 50',
        required: false,
      },
      {
        name: 'currencyCode',
        type: ParameterType.String,
        description: 'Currency for revenue metrics. ISO 4217 format. Examples: "USD", "EUR", "JPY"',
        required: false,
      },
      {
        name: 'returnPropertyQuota',
        type: ParameterType.Boolean,
        description: 'Return API quota information. Default false.',
        required: false,
      },
    ],
  })
  public async runReport(params: RunReportParams): Promise<RunReportResponse> {
    try {
      // Parse and validate date ranges
      const dateRangesArray = parseObjectArray<DateRange>(params.dateRanges);

      // Validate maximum of 4 date ranges
      if (dateRangesArray.length > 4) {
        throw new ToolError(
          'Invalid Date Ranges',
          400,
          `Maximum of 4 date ranges allowed, but ${dateRangesArray.length} were provided. ` +
          'If date ranges are consecutive (e.g., Oct 1-31, Nov 1-30, Dec 1-31), ' +
          'combine them into a single range (e.g., Oct 1-Dec 31).'
        );
      }

      dateRangesArray.forEach(validateDateRange);

      // Parse and validate dimensions and metrics
      const dimensionsArray = parseStringArray(params.dimensions);
      const metricsArray = parseStringArray(params.metrics);

      validateDimensions(dimensionsArray, 'standard');

      // Validate optional parameters
      if (params.currencyCode) {
        validateCurrencyCode(params.currencyCode);
      }
      if (params.limit !== undefined) {
        validateLimit(params.limit);
      }
      if (params.offset !== undefined) {
        validateOffset(params.offset);
      }

      const authSection = await storage.settings.get<AuthSection>(
        'authentication'
      );
      const property = constructPropertyResourceName(
        authSection.property_id || ''
      );

      // Get default hostname filter from settings
      const defaultFiltersSection: DefaultFiltersSection = await storage.settings.get(
        'default_filters'
      );

      // Apply default hostname filter if configured
      let finalDimensionFilter = params.dimensionFilter;
      if (defaultFiltersSection?.domain) {
        finalDimensionFilter = mergeDefaultFilters(
          params.dimensionFilter,
          defaultFiltersSection.domain,
          'standard'
        );
      }

      // Build request body
      const request: any = {
        property,
        dateRanges: dateRangesArray.map((dr) => ({
          startDate: dr.startDate,
          endDate: dr.endDate,
          name: dr.name,
        })),
        dimensions: dimensionsArray.map((name) => ({ name })),
        metrics: metricsArray.map((name) => ({ name })),
        returnPropertyQuota: params.returnPropertyQuota,
      };

      if (finalDimensionFilter) {
        // Deep parse to handle any stringified JSON in filter objects
        logger.info('[DEBUG] Raw dimensionFilter:', JSON.stringify(finalDimensionFilter, null, 2));
        const parsedDimensionFilter = deepParseJson(finalDimensionFilter);
        logger.info('[DEBUG] Parsed dimensionFilter:', JSON.stringify(parsedDimensionFilter, null, 2));
        const snakeCaseFilter = camelToSnake(parsedDimensionFilter);
        logger.info('[DEBUG] Snake case dimensionFilter:', JSON.stringify(snakeCaseFilter, null, 2));
        request.dimensionFilter = snakeCaseFilter;
      }

      if (params.metricFilter) {
        // Deep parse to handle any stringified JSON in filter objects
        const parsedMetricFilter = deepParseJson(params.metricFilter);
        request.metricFilter = camelToSnake(parsedMetricFilter);
      }

      if (params.orderBys) {
        const orderBysArray = parseObjectArray<OrderBy>(params.orderBys);
        request.orderBys = orderBysArray.map((orderBy) => camelToSnake(orderBy));
      }

      if (params.limit !== undefined) {
        request.limit = params.limit;
      }

      if (params.offset !== undefined) {
        request.offset = params.offset;
      }

      if (params.currencyCode) {
        request.currencyCode = params.currencyCode;
      }

      const response = await AppAuth.fromSettings(authSection)
        .getDataClient()
        .properties.runReport({
          property,
          requestBody: request,
        });

      const result = snakeToCamel(response.data) as RunReportResponse;
      return result;
    } catch (error) {
      // Extract error information from GaxiosError and throw ToolError
      if ((error as any).response?.data?.error) {
        const googleError = (error as any).response.data.error;
        const statusCode = (error as any).status || googleError.code || 500;
        const errorTitle = googleError.status || 'Google Analytics API Error';
        const errorDetail = googleError.message || (error as Error).message || 'Unknown error';

        throw new ToolError(errorTitle, statusCode, errorDetail);
      }

      // Handle non-GaxiosError cases
      throw error;
    }
  }

}
