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
      if (section === 'defaults') {
        // any necessary validation
        try {
          Intl.DateTimeFormat(undefined, { timeZone: formData.timezone as string });
        } catch {
          return result.addToast(
            'warning',
            `Timezone "${formData.timezone as string}" is not recognized.` +
              'Use IANA timezone format (e.g., "America/New_York", "UTC").'
          );
        }

        await storage.settings.put(section, formData);
      } else {
        await storage.settings.put(section, formData);
      }

      return result;
    } catch {
      return result.addToast(
        'danger',
        'Sorry, an unexpected error occurred. Please try again in a moment.'
      );
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
