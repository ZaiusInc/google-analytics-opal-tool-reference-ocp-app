import { tool } from '@optimizely-opal/opal-tool-ocp-sdk';
import { ToolError } from '@optimizely-opal/opal-tool-ocp-sdk';
import { storage } from '@zaiusinc/app-sdk';
import { AuthSection } from '../../data/data';
import { CustomDimensionsAndMetrics } from '../../lib/types';
import { constructPropertyResourceName, snakeToCamel } from '../../lib/utils';
import { AppAuth } from '../../lib/api/GoogleAnalyticsApiClient';

/**
 * Tool class for Google Analytics metadata operations
 */
export class GetCustomDimensionsAndMetricsTool {

  /**
   * Returns the property's custom dimensions and metrics
   * @returns Custom dimensions and metrics
   */
  @tool({
    name: 'get_custom_dimensions_and_metrics',
    description: `
      Get the list of custom dimensions and custom metrics configured for this GA4 property.

      Use this to discover what custom dimensions and metrics are available before using them
      in run_report or run_realtime_report.

      Returns two arrays:
      - customDimensions: Your property's custom dimensions (e.g., user_type, membership_level)
      - customMetrics: Your property's custom metrics (e.g., cart_value, engagement_score)

      No parameters.
    `,
    endpoint: '/tools/get_custom_dimensions_and_metrics',
    parameters: [],
  })
  public async getCustomDimensionsAndMetrics(): Promise<CustomDimensionsAndMetrics> {
    try {
      const authSection = await storage.settings.get<AuthSection>(
        'authentication'
      );
      const property = constructPropertyResourceName(
        authSection.property_id || ''
      );

      const name = `${property}/metadata`;
      const response = await AppAuth.fromSettings(authSection)
        .getDataClient()
        .properties.getMetadata({
          name,
        });

      const metadata = response.data;
      const customMetrics = (metadata.metrics || [])
        .filter((metric) => metric.customDefinition)
        .map((metric) => snakeToCamel(metric));

      const customDimensions = (metadata.dimensions || [])
        .filter((dimension) => dimension.customDefinition)
        .map((dimension) => snakeToCamel(dimension));

      return {
        customDimensions,
        customMetrics,
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
