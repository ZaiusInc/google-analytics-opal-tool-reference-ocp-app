// Authentication types
export interface ServiceAccountCredentials {
  type: 'service_account';
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain?: string;
}

export interface AuthorizedUserCredentials {
  type: 'authorized_user';
  client_id: string;
  client_secret: string;
  refresh_token: string;
  quota_project_id?: string;
}

export type GoogleCredentials =
  | ServiceAccountCredentials
  | AuthorizedUserCredentials;

// Client configuration
export interface GoogleAnalyticsClientConfig {
  /**
   * Path to service account key file.
   * If not provided, uses Application Default Credentials (ADC).
   * ADC checks in order: GOOGLE_APPLICATION_CREDENTIALS env var,
   * gcloud user credentials, Google Cloud metadata service.
   */
  keyFilename?: string;

  /**
   * Service account or authorized user credentials object.
   * Alternative to keyFilename - useful for serverless environments.
   */
  credentials?: GoogleCredentials;

  /**
   * Google Cloud Project ID.
   * Optional - can usually be inferred from credentials or environment.
   */
  projectId?: string;

  /**
   * Custom user agent string to identify your application in API requests.
   * Useful for debugging and usage tracking.
   */
  userAgent?: string;
}
