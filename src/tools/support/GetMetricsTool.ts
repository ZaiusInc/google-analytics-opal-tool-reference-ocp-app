import { tool } from '@optimizely-opal/opal-tool-ocp-sdk';
import { ToolError } from '@optimizely-opal/opal-tool-ocp-sdk';
import { storage } from '@zaiusinc/app-sdk';
import { AuthSection } from '../../data/data';
import { constructPropertyResourceName, snakeToCamel } from '../../lib/utils';
import { AppAuth } from '../../lib/api/GoogleAnalyticsApiClient';
import {
  Metrics
} from '../../lib/types';

export class GetMetricsTool {

  /**
   * Returns the property's standard metrics
   * @returns Standard metrics
   */
  @tool({
    name: 'get_metrics',
    description: `
      Get the list of all standard metrics available in Google Analytics 4.

      Metrics are quantitative measurements, such as:
      - Users: activeUsers, totalUsers, newUsers
      - Sessions: sessions, sessionsPerUser, averageSessionDuration
      - Engagement: screenPageViews, eventCount, engagementRate, bounceRate
      - Conversions: conversions, eventValue
      - Revenue: totalRevenue, averagePurchaseRevenue

      Use this to see all available metrics before building reports.

      No parameters.
    `,
    endpoint: '/tools/get_metrics',
    parameters: [],
  })
  public async getMetrics(): Promise<Metrics> {
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
      const metrics = (metadata.metrics || [])
        .filter((metric) => !metric.customDefinition)
        .map((metric) => snakeToCamel(metric));

      return {
        metrics,
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
