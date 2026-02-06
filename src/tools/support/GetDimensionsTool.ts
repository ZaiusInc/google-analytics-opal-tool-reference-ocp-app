import { tool } from '@optimizely-opal/opal-tool-ocp-sdk';
import { ToolError } from '@optimizely-opal/opal-tool-ocp-sdk';
import { storage } from '@zaiusinc/app-sdk';
import { AuthSection } from '../../data/data';
import { Dimensions } from '../../lib/types';
import { constructPropertyResourceName, snakeToCamel } from '../../lib/utils';
import { AppAuth } from '../../lib/api/GoogleAnalyticsApiClient';

export class GetDimensionsTool {
  /**
   * Returns the property's standard dimensions
   * @returns Standard dimensions
   */
  @tool({
    name: 'get_dimensions',
    description: `
      Get the list of all standard dimensions available in Google Analytics 4.

      Dimensions are attributes that describe your data, such as:
      - Geographic: country, city, region
      - Technology: deviceCategory, browser, operatingSystem
      - Traffic: sessionSource, sessionMedium, campaignName
      - Content: pagePath, pageTitle, eventName
      - User: newVsReturning, userAgeBracket, userGender

      Use this to see all available dimensions before building reports.

      No parameters.
    `,
    endpoint: '/tools/get_dimensions',
    parameters: [],
  })
  public async getDimensions(): Promise<Dimensions> {
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
      const dimensions = (metadata.dimensions || [])
        .filter((dimension) => !dimension.customDefinition)
        .map((dimension) => snakeToCamel(dimension));

      return {
        dimensions,
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
