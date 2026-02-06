import { ToolFunction, ReadyResponse } from '@optimizely-opal/opal-tool-ocp-sdk';
import { storage } from '@zaiusinc/app-sdk';
import { AuthSection } from '../data/data';
import { constructPropertyResourceName } from '../lib/utils';
import { AppAuth } from '../lib/api/GoogleAnalyticsApiClient';

// Tool registration: The @tool decorator automatically registers tools when
// the module is imported. Each tool class must be imported here to register
// its tools with the function. See SDK docs for details.
import '../tools/RunReportTool';
import '../tools/RunRuntimeReportTool';
import '../tools/support/GetCustomDimensionsAndMetricsTool';
import '../tools/support/GetDimensionsTool';
import '../tools/support/GetMetricsTool';
import '../tools/support/GetPropertyIdTool';
import '../tools/support/LookupDimentionMetricNamesTool';

/**
 * Class that implements the Opal tool functions.
 */
export class OpalToolFunction extends ToolFunction {

  protected override async ready(): Promise<ReadyResponse> {
    const authSection = await storage.settings.get<AuthSection>(
      'authentication'
    );
    if (authSection == null || !authSection.auth_method) {
      return { ready: false, reason: 'Authenticate to Google Analytics first.' };
    }
    try {
      const property = constructPropertyResourceName(
        authSection.property_id || ''
      );

      const name = `${property}/metadata`;
      await AppAuth.fromSettings(authSection).getDataClient().properties.getMetadata({name});
      return { ready: true };
    } catch (error: any) {
      console.error('Error fetching metadata:', error);
      return { ready: false, reason: 'Authentication not configured correctly: ' + error.message };
    }
  }

}
