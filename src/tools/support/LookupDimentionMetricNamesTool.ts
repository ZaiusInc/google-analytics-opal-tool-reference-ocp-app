import { ParameterType, tool } from '@optimizely-opal/opal-tool-ocp-sdk';
import { ToolError } from '@optimizely-opal/opal-tool-ocp-sdk';
import { storage } from '@zaiusinc/app-sdk';
import { AuthSection } from '../../data/data';
import { constructPropertyResourceName, snakeToCamel } from '../../lib/utils';
import { AppAuth } from '../../lib/api/GoogleAnalyticsApiClient';

export interface LookupNamesParams {
  displayNames: string;
}

export interface NameMapping {
  displayName: string;
  apiName: string;
  type: 'dimension' | 'metric';
  description?: string;
}

export interface LookupNamesResponse {
  mappings: NameMapping[];
  notFound: string[];
}

export class LookupDimensionMetricNames {

  /**
   * Looks up API names for dimensions and metrics based on their display names
   * @param params - Parameters containing display names to look up
   * @returns Mappings of display names to API names
   */
  @tool({
    name: 'lookup_dimension_metric_names',
    description: `
      Converts user-friendly display names to GA4 API names for dimensions and metrics.

      **IMPORTANT: Always use this tool when users mention dimensions or metrics by their display names.**

      Users often refer to dimensions and metrics using their display names (e.g., "Session Source",
      "Active Users", "Form Success") instead of the API names required by GA4 (e.g., "sessionSource",
      "activeUsers", "form_success"). This tool translates between the two formats.

      **When to use this tool:**
      - User asks for metrics like "Active Users", "Total Users", "Sessions", "Bounce Rate"
      - User asks for dimensions like "Session Source", "Country", "Device Category", "Page Path"
      - User refers to custom dimensions/metrics by their friendly names
      - You need to verify what the correct API name is for a display name

      **How it works:**
      1. Pass the display names the user mentioned (comma-separated or as JSON array)
      2. Tool returns the corresponding API names to use in report queries
      3. Use the API names in subsequent calls to run_report or other GA4 tools

      **Example 1 - Single name lookup:**
      {
        "displayNames": "Active Users"
      }
      Returns: {
        "mappings": [{"displayName": "Active Users", "apiName": "activeUsers", "type": "metric"}], "notFound": []
      }

      **Example 2 - Multiple names:**
      {
        "displayNames": "Session Source, Active Users, Device Category"
      }

      **Example 3 - JSON array format:**
      {
        "displayNames": "['Total Users', 'Sessions', 'Country']"
      }

      **Response format:**
      - mappings: Array of {displayName, apiName, type, description}
      - notFound: Array of display names that couldn't be found

      **Best practice:**
      When a user mentions dimension or metric names in natural language, always use this tool
      first to convert them to API names before constructing GA4 queries.
    `,
    endpoint: '/tools/lookup_dimension_metric_names',
    parameters: [
      {
        name: 'displayNames',
        type: ParameterType.String,
        description: `
          Display names to look up, either as comma-separated values or JSON array.

          Comma-separated format:
          "Active Users, Session Source, Country"

          JSON array format:
          "['Total Users', 'Sessions', 'Bounce Rate']"

          Case-insensitive matching is supported, so "active users", "Active Users",
          and "ACTIVE USERS" will all match correctly.
        `,
        required: true,
      },
    ],
  })
  public async lookupDimensionMetricNames(params: LookupNamesParams): Promise<LookupNamesResponse> {
    try {
      const authSection = await storage.settings.get<AuthSection>('authentication');
      const property = constructPropertyResourceName(authSection.property_id || '');

      // Parse input display names
      let displayNames: string[];
      const input = params.displayNames.trim();

      if (input.startsWith('[')) {
        // JSON array format
        try {
          const parsed = JSON.parse(input.replace(/'/g, '"'));
          displayNames = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          throw new ToolError(
            'Invalid Format',
            400,
            'Display names must be a comma-separated string or JSON array'
          );
        }
      } else {
        // Comma-separated format
        displayNames = input.split(',').map((n) => n.trim()).filter((n) => n.length > 0);
      }

      // Fetch metadata
      const metadataName = `${property}/metadata`;
      const response = await AppAuth.fromSettings(authSection)
        .getDataClient()
        .properties.getMetadata({ name: metadataName });

      const metadata = response.data;
      const allDimensions = (metadata.dimensions || []).map((d) => snakeToCamel(d));
      const allMetrics = (metadata.metrics || []).map((m) => snakeToCamel(m));

      // Create lookup maps (case-insensitive)
      const dimensionMap = new Map<string, Record<string, unknown>>();
      const metricMap = new Map<string, Record<string, unknown>>();

      allDimensions.forEach((dim: Record<string, unknown>) => {
        if (dim.uiName) {
          dimensionMap.set((dim.uiName as string).toLowerCase(), dim);
        }
      });

      allMetrics.forEach((metric: Record<string, unknown>) => {
        if (metric.uiName) {
          metricMap.set((metric.uiName as string).toLowerCase(), metric);
        }
      });

      // Look up each display name
      const mappings: NameMapping[] = [];
      const notFound: string[] = [];

      for (const displayName of displayNames) {
        const lowerName = displayName.toLowerCase();

        if (dimensionMap.has(lowerName)) {
          const dim = dimensionMap.get(lowerName)!;
          mappings.push({
            displayName,
            apiName: dim.apiName as string,
            type: 'dimension',
            description: dim.description as string | undefined,
          });
        } else if (metricMap.has(lowerName)) {
          const metric = metricMap.get(lowerName)!;
          mappings.push({
            displayName,
            apiName: metric.apiName as string,
            type: 'metric',
            description: metric.description as string | undefined,
          });
        } else {
          notFound.push(displayName);
        }
      }

      return {
        mappings,
        notFound,
      };
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
