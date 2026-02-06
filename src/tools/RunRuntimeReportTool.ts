import { ParameterType, tool, ToolError } from '@optimizely-opal/opal-tool-ocp-sdk';
import { storage, logger } from '@zaiusinc/app-sdk';
import { AuthSection, DefaultFiltersSection } from '../data/data';
import { deepParseJson } from '../lib/json_parsing_utilities';
import {
  RunRealtimeReportParams,
  RunRealtimeReportResponse,
  OrderBy
} from '../lib/types';
import {
  constructPropertyResourceName,
  validateLimit,
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
    name: 'run_realtime_report',
    description: `
      Query live Google Analytics 4 data from the last 30 minutes.

      **IMPORTANT  Realtime reports support a LIMITED set of dimensions.
      Traffic source dimensions (sessionSource, sessionMedium, firstUserSource, etc.) are NOT supported.
      
      **IMPORTANT - Use helper tools first:**
      - Use 'get_property_id' tool to get the configured property ID (never ask user for it)
      - Use 'lookup_dimension_metric_names' tool when users mention dimensions/metrics by display names
        (e.g., "Active Users" → "activeUsers", "Session Source" → "sessionSource")

      EXAMPLE 1 - Current active users by country:
      {
        "dimensions": "['country']",
        "metrics": "['activeUsers']"
      }

      EXAMPLE 2 - Real-time users by device and platform:
      {
        "dimensions": "['deviceCategory', 'platform']",
        "metrics": "['activeUsers', 'screenPageViews']"
      }

      EXAMPLE 3 - Filter for specific countries:
      {
        "dimensions": "['city']",
        "metrics": "['activeUsers']",
        "dimensionFilter": "{'filter': {'fieldName': 'country',
          'inListFilter': {'values': ['United States', 'Canada'],
          'caseSensitive': false}}}"
      }

      EXAMPLE 4 - Top pages by active users:
      {
        "dimensions": "['unifiedScreenName']",
        "metrics": "['activeUsers']",
        "orderBys": "[{'desc': true, 'metric': {'metricName': 'activeUsers'}}]",
        "limit": 10
      }

      EXAMPLE 5 - Active users by event name:
      {
        "dimensions": "['eventName']",
        "metrics": "['activeUsers', 'eventCount']",
        "limit": 20
      }
    `,
    endpoint: '/tools/run_realtime_report',
    parameters: [
      {
        name: 'dimensions',
        type: ParameterType.String,
        description: `
          JSON string array of realtime dimension names.

          IMPORTANT: Only specific dimensions are supported for realtime reports.
          Traffic source dimensions (sessionSource, sessionMedium, etc.) are NOT available.

          Geographic dimensions:
          "['country', 'city']"

          Device dimensions:
          "['deviceCategory', 'platform']"

          Content dimensions:
          "['unifiedScreenName', 'eventName']"

          Audience dimensions:
          "['audienceId', 'audienceName']"

          App dimensions:
          "['appVersion', 'streamName']"

          Time dimension:
          "['minutesAgo']"

          Complete list of supported realtime dimensions:
          appVersion, audienceId, audienceName, audienceResourceName, city, cityId,
          country, countryId, deviceCategory, eventName, minutesAgo, platform,
          streamId, streamName, unifiedScreenName

          Custom user dimensions are also supported: customUser:{parameter_name}
        `,
        required: true,
      },
      {
        name: 'metrics',
        type: ParameterType.String,
        description: `
          JSON string array of realtime metric names.

          Active users:
          "['activeUsers']"

          Engagement:
          "['screenPageViews', 'eventCount']"

          Combined:
          "['activeUsers', 'screenPageViews', 'eventCount']"

          Common realtime metrics: activeUsers, screenPageViews, eventCount, conversions

          Note: Realtime reports only support standard metrics, not custom metrics.
        `,
        required: true,
      },
      {
        name: 'dimensionFilter',
        type: ParameterType.String,
        description: `
          Filter to include only specific dimension values. Optional.

          Provide as a JSON string (Python-style with single quotes is supported).

          Filter by country:
          "{'filter': {'fieldName': 'country',
            'stringFilter': {'value': 'United States'}}}"

          Filter by multiple countries:
          "{'filter': {'fieldName': 'country', 'inListFilter':
            {'values': ['United States', 'Canada', 'United Kingdom'],
            'caseSensitive': false}}}"

          Filter by device category:
          "{'filter': {'fieldName': 'deviceCategory', 'inListFilter':
            {'values': ['mobile', 'desktop'],
            'caseSensitive': false}}}"
        `,
        required: false,
      },
      {
        name: 'metricsFilter',
        type: ParameterType.String,
        description: `
          Filter to include only rows where metrics meet criteria. Optional.

          Provide as a JSON string (Python-style with single quotes is supported).

          Active users greater than 10:
          "{'filter': {'fieldName': 'activeUsers', 'numericFilter':
            {'operation': 'GREATER_THAN', 'value': {'int64Value': '10'}}}}"
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
        name: 'currencyCode',
        type: ParameterType.String,
        description: `
          The currency code to use for currency values. Must be in
            ISO4217 format, such as "AED", "USD", "JPY". If the field is empty, the
            report uses the property's default currency.
        `,
        required: false,
      },
      {
        name: 'returnPropertyQuota',
        type: ParameterType.Boolean,
        description: 'Whether to return property quota in the response.',
        required: false,
      },
    ],
  })
  public async runRealtimeReport(
    params: RunRealtimeReportParams
  ): Promise<RunRealtimeReportResponse> {
    try {
      // Parse and validate dimensions and metrics
      const dimensionsArray = parseStringArray(params.dimensions);
      const metricsArray = parseStringArray(params.metrics);

      validateDimensions(dimensionsArray, 'realtime');

      // Validate optional parameters
      if (params.limit !== undefined) {
        validateLimit(params.limit);
      }

      const authSection = await storage.settings.get<AuthSection>(
        'authentication'
      );
      const property = constructPropertyResourceName(
        authSection.property_id || ''
      );

      // Get default hostname filter from settings
      const defaultFiltersSection = await storage.settings.get(
        'default_filters'
      ) as DefaultFiltersSection | null;

      // Apply default hostname filter if configured
      // Note: hostname dimension is NOT supported in realtime reports, so it will be skipped
      let finalDimensionFilter = params.dimensionFilter;
      if (defaultFiltersSection?.domain) {
        finalDimensionFilter = mergeDefaultFilters(
          params.dimensionFilter,
          defaultFiltersSection.domain,
          'realtime'
        );
      }

      // Build request body
      const request: any = {
        property,
        dimensions: dimensionsArray.map((name) => ({ name })),
        metrics: metricsArray.map((name) => ({ name })),
        returnPropertyQuota: params.returnPropertyQuota,
      };

      if (finalDimensionFilter) {
        // Deep parse to handle any stringified JSON in filter objects
        logger.debug('[DEBUG] Raw dimensionFilter:', JSON.stringify(finalDimensionFilter, null, 2));
        const parsedDimensionFilter = deepParseJson(finalDimensionFilter);
        logger.debug('[DEBUG] Parsed dimensionFilter:', JSON.stringify(parsedDimensionFilter, null, 2));
        const snakeCaseFilter = camelToSnake(parsedDimensionFilter);
        logger.debug('[DEBUG] Snake case dimensionFilter:', JSON.stringify(snakeCaseFilter, null, 2));
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

      const response = await AppAuth.fromSettings(authSection)
        .getDataClient()
        .properties.runRealtimeReport({
          property,
          requestBody: request,
        });

      const result = snakeToCamel(response.data) as RunRealtimeReportResponse;
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
