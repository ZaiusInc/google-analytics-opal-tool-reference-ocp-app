import { tool } from '@optimizely-opal/opal-tool-ocp-sdk';
import { storage } from '@zaiusinc/app-sdk';
import { AuthSection } from '../../data/data';

export class GetPropertyIdTool {
  /**
   * Returns the configured Google Analytics property ID
   * @returns Property ID string
   */
  @tool({
    name: 'get_property_id',
    description: `
      Returns the Google Analytics 4 property ID that was configured during app authentication.

      **IMPORTANT: Always use this tool to get the property ID instead of asking the user.**

      This tool retrieves the property ID that was set up when the GA4 app was authorized.
      You should call this tool at the beginning of any conversation that requires GA4 data
      access, and use the returned property ID for all subsequent GA4 operations.

      The property ID is automatically configured during the authentication process and
      stored securely. There is no need to ask the user for it.

      No parameters required.

      Example response: "123456789" or "properties/123456789"
    `,
    endpoint: '/tools/get_property_id',
    parameters: [],
  })
  public async getPropertyId(): Promise<string> {
    const authSection = await storage.settings.get<AuthSection>('authentication');

    if (!authSection?.property_id) {
      throw new Error('Property ID not configured. Please authenticate first.');
    }

    return authSection.property_id;
  }

}
