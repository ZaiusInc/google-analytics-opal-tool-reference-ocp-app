/**
 * Authentication helpers and utilities for Google Analytics client
 */

import { GoogleAuth } from 'google-auth-library';
import { analyticsdata_v1beta, google } from 'googleapis';
import {
  GoogleAnalyticsClientConfig,
  ServiceAccountCredentials,
  AuthorizedUserCredentials,
} from '../types';
import { createUserAgent } from '../utils';
import { AuthSection } from '../../data/data';

/**
 * Required OAuth scopes for Google Analytics API access
 */
export const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/analytics.readonly',
];

/**
 * Validates service account credentials object
 * @param credentials - Service account credentials to validate
 * @returns true if valid, throws error if invalid
 */
export function validateServiceAccountCredentials(
  credentials: any
): credentials is ServiceAccountCredentials {
  const required = [
    'type',
    'project_id',
    'private_key_id',
    'private_key',
    'client_email',
    'client_id',
    'auth_uri',
    'token_uri',
  ];

  if (!credentials || typeof credentials !== 'object') {
    throw new Error('Credentials must be an object');
  }

  if (credentials.type !== 'service_account') {
    throw new Error('Credentials type must be "service_account"');
  }

  const missing = required.filter((field) => !credentials[field]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required credential fields: ${missing.join(', ')}`
    );
  }

  return true;
}

/**
 * Creates a client configuration from app settings
 * @param settings - App settings object containing authentication configuration
 * @returns Configuration object
 */
export function createConfigFromSettings(
  settings: AuthSection
): GoogleAnalyticsClientConfig {
  if (!settings) {
    throw new Error('App settings are required for authentication');
  }

  const authMethod = settings.auth_method;
  const projectId = settings.project_id;

  if (!authMethod) {
    throw new Error('Authentication method must be specified in app settings');
  }

  if (!projectId) {
    throw new Error('Google Cloud Project ID is required in app settings');
  }

  switch (authMethod) {
  case 'service_account':
    if (!settings.service_account_json) {
      throw new Error(
        'Service Account JSON is required when using service account authentication'
      );
    }

    try {
      const credentials = JSON.parse(settings.service_account_json);
      validateServiceAccountCredentials(credentials);

      return {
        credentials,
        projectId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Invalid Service Account JSON: ${errorMessage}`);
    }

  case 'adc':
    // Use ADC credentials
    if (
      !settings.client_id ||
        !settings.client_secret ||
        !settings.refresh_token
    ) {
      throw new Error(
        'ADC credentials require client_id, client_secret, and refresh_token'
      );
    }

    // Create ADC credentials object
    const adcCredentials: AuthorizedUserCredentials = {
      type: 'authorized_user' as const,
      client_id: settings.client_id,
      client_secret: settings.client_secret,
      refresh_token: settings.refresh_token,
      quota_project_id: projectId,
    };

    return {
      credentials: adcCredentials,
      projectId,
    };

  default:
    throw new Error(`Unsupported authentication method: ${authMethod as string}`);
  }
}

export class AppAuth {
  private auth: GoogleAuth;
  private dataClient: analyticsdata_v1beta.Analyticsdata;
  private userAgent: string;

  public constructor(config: GoogleAnalyticsClientConfig = {}) {
    this.userAgent = createUserAgent(config.userAgent);

    // Initialize authentication with required scopes
    this.auth = new GoogleAuth({
      keyFilename: config.keyFilename,
      credentials: config.credentials,
      scopes: REQUIRED_SCOPES,
      projectId: config.projectId,
    });

    this.dataClient = google.analyticsdata({
      version: 'v1beta',
      auth: this.auth,
    });
  }

  /**
   * Creates AppAuth instance from app settings
   * @param settings - App settings containing authentication configuration
   * @returns AppAuth instance
   */
  public static fromSettings(settings: AuthSection): AppAuth {
    const config = createConfigFromSettings(settings);
    return new AppAuth(config);
  }

  /**
   * Validates that the credentials have the required OAuth scopes
   * @throws Error if required scopes are missing
   */
  public async validateScopes(): Promise<void> {
    try {
      // Get the auth client
      const client = await this.auth.getClient();

      // Get access token info to check scopes
      const tokenInfo = await client.getAccessToken();

      if (!tokenInfo.token) {
        throw new Error('Failed to obtain access token');
      }

      // Request token info from Google's OAuth2 API to get scopes
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${tokenInfo.token}`
      );

      if (!response.ok) {
        throw new Error(`Failed to verify token: ${response.statusText}`);
      }

      const tokenData = await response.json() as { scope?: string };
      const grantedScopes = tokenData.scope ? tokenData.scope.split(' ') : [];

      // Check if all required scopes are granted
      const missingScopes = REQUIRED_SCOPES.filter(
        (requiredScope) => !grantedScopes.includes(requiredScope)
      );

      if (missingScopes.length > 0) {
        throw new Error(
          `Missing required OAuth scopes: ${missingScopes.join(', ')}. ` +
          `Please ensure the credentials have the following scopes: ${REQUIRED_SCOPES.join(', ')}`
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Scope validation failed: ${String(error)}`);
    }
  }

  public getUserAgent(): string {
    return this.userAgent;
  }

  public getDataClient(): analyticsdata_v1beta.Analyticsdata {
    return this.dataClient;
  }

  public getAuth(): GoogleAuth {
    return this.auth;
  }
}
