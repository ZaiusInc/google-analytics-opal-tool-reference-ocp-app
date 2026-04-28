import {
  Lifecycle as AppLifecycle,
  AuthorizationGrantResult,
  LifecycleResult,
  LifecycleSettingsResult,
  logger,
  Request,
  storage,
  SubmittedFormData
} from '@zaiusinc/app-sdk';
import { AppAuth } from '../lib/api/GoogleAnalyticsApiClient';
import { constructPropertyResourceName } from '../lib/utils';
import { AuthSection } from '../data/data';

export class Lifecycle extends AppLifecycle {
  public async onInstall(): Promise<LifecycleResult> {
    try {
      logger.info('Performing Install');

      /* example: initialize Google oauth section
      await storage.settings.patch('oauth', {
        authorized: false
      });
      */

      return { success: true };
    } catch (error: any) {
      logger.error('Error during installation:', error);
      return {
        success: false,
        retryable: true,
        message: `Error during installation: ${error}`,
      };
    }
  }

  public async onSettingsForm(
    section: string,
    action: string,
    formData: SubmittedFormData
  ): Promise<LifecycleSettingsResult> {
    const result = new LifecycleSettingsResult();
    try {
      if (section === 'authentication') {
        // Validate Google API credentials before saving
        await this.validateGoogleCredentials(formData as AuthSection);
        await storage.settings.put(section, formData);
        return result.addToast(
          'success',
          'Credentials validated successfully!'
        );
      } else {
        await storage.settings.put(section, formData);
      }

      return result;
    } catch (error: any) {
      logger.error('Error validating credentials:', error);
      return result.addToast(
        'danger',
        `Authentication failed: ${error.message || 'Unknown error occurred'}`
      );
    }
  }

  /**
   * Validates Google Analytics API credentials by checking scopes and attempting to run a report
   */
  private async validateGoogleCredentials(
    formData: AuthSection
  ): Promise<void> {
    const authMethod = formData.auth_method;

    if (!authMethod) {
      throw new Error('Authentication method is required');
    }

    if (!formData.project_id) {
      throw new Error('Google Cloud Project ID is required');
    }

    // Validate required fields based on authentication method
    if (authMethod === 'service_account') {
      if (!formData.service_account_json) {
        throw new Error('Service Account JSON is required');
      }
    } else if (authMethod === 'adc') {
      if (
        !formData.client_id ||
        !formData.client_secret ||
        !formData.refresh_token
      ) {
        throw new Error(
          'ADC credentials require Client ID, Client Secret, and Refresh Token'
        );
      }
    } else {
      throw new Error(`Unsupported authentication method: ${authMethod as string}`);
    }

    try {
      // Create auth client and test API access
      const appAuth = AppAuth.fromSettings(formData);

      // Validate that the credentials have the required OAuth scopes
      logger.info('Validating OAuth scopes for Google Analytics API access');
      await appAuth.validateScopes();
      logger.info('OAuth scope validation successful');

      // Test API access by running the simplest possible report
      // This verifies both authentication and GA4 property access
      const dataClient = appAuth.getDataClient();

      const property = constructPropertyResourceName(
        formData.property_id || ''
      );

      // Build request object (property goes in the main params, not requestBody)
      const request = {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'activeUsers' }],
        limit: '1', // Must be string according to API schema
      };

      // Run the simplest possible report to verify access
      logger.info('Testing Google Analytics Data API access with run_report');
      const response = await dataClient.properties.runReport({
        property,
        requestBody: request,
      });

      if (!response.data) {
        throw new Error('Invalid response from Google Analytics Data API');
      }

      logger.info(
        'Google Analytics API validation successful with report test',
        {
          property,
          hasRows: (response.data.rows?.length || 0) > 0,
        }
      );
    } catch (error: any) {
      // Extract meaningful error message from Google API error
      let errorMessage = 'Failed to connect to Google Analytics API';

      if (error.code === 403 || error.code === '403') {
        errorMessage =
          'Access forbidden (403). This usually means the credentials lack required permissions or scopes. ' +
          'Please ensure your credentials have the following scopes: ' +
          'https://www.googleapis.com/auth/cloud-platform, ' +
          'https://www.googleapis.com/auth/analytics.readonly';
      } else if (error.code) {
        errorMessage += ` (${error.code})`;
      }

      if (error.message) {
        const message = error.message as string;
        if (message.includes('Missing required OAuth scopes')) {
          // Scope validation failed - pass through the detailed error
          errorMessage = error.message;
        } else if (message.includes('invalid_grant')) {
          errorMessage =
            'Invalid credentials. Please check your Client ID, Client Secret, and Refresh Token.';
        } else if (message.includes('invalid_client')) {
          errorMessage = 'Invalid Client ID or Client Secret.';
        } else if (message.includes('unauthorized_client')) {
          errorMessage =
            'ADC client is not authorized. Please check your ADC setup.';
        } else if (message.includes('access_denied')) {
          errorMessage =
            'Access denied. Please ensure your credentials have access to Google Analytics.';
        } else if (message.includes('quota')) {
          errorMessage =
            'Google Analytics API quota exceeded. Please try again later.';
        } else if (message.includes('Invalid JSON')) {
          errorMessage =
            'Invalid Service Account JSON format. Please check your JSON content.';
        } else if (!errorMessage.includes('403')) {
          // Only append the error message if we haven't already set a 403 message
          errorMessage += `: ${error.message}`;
        }
      }

      logger.error('Google Analytics API validation failed:', {
        errorMessage,
        errorCode: error.code,
        originalError: error.message,
      });

      throw new Error(errorMessage);
    }
  }

  public async onAuthorizationRequest(
    _section: string,
    _formData: SubmittedFormData
  ): Promise<LifecycleSettingsResult> {
    const result = new LifecycleSettingsResult();
    return result.addToast('danger', 'Sorry, OAuth is not supported.');
  }

  public async onAuthorizationGrant(
    _request: Request
  ): Promise<AuthorizationGrantResult> {

    return new AuthorizationGrantResult('').addToast(
      'danger',
      'Sorry, OAuth is not supported.'
    );
  }

  public async onUpgrade(_fromVersion: string): Promise<LifecycleResult> {
    // TODO: any logic required when upgrading from a previous version of the app
    // Note: `fromVersion` may not be the most recent version or could be a beta version
    // write the generated webhook to the swell settings form
    return { success: true };
  }

  public async onFinalizeUpgrade(
    _fromVersion: string
  ): Promise<LifecycleResult> {
    // TODO: any logic required when finalizing an upgrade from a previous version
    // At this point, new webhook URLs have been created for any new functions in this version
    return { success: true };
  }

  public async onAfterUpgrade(): Promise<LifecycleResult> {
    // TODO: any logic required after the upgrade has been completed.  This is the plugin point
    // for triggering one-time jobs against the upgraded installation
    return { success: true };
  }

  public async onUninstall(): Promise<LifecycleResult> {
    // TODO: any logic required to properly uninstall the app
    return { success: true };
  }
}
