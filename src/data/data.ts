import * as App from '@zaiusinc/app-sdk';

export interface AuthSection extends App.ValueHash {
  auth_method: 'service_account' | 'adc';
  service_account_json?: string;
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
  project_id?: string;
  property_id?: string;
}

// Default Filters types
export interface DefaultFiltersSection {
  // Hostname to filter all queries by (e.g., "www.optimizely.com")
  domain?: string;
}

export interface DefaultSettings extends App.ValueHash {
  locale?: string;
  timezone?: string;
}
