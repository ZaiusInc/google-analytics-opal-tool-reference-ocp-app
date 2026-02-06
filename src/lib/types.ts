import { ValueHash } from '@zaiusinc/app-sdk';

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

// Date Range types
export interface DateRange {
  /** Start date in YYYY-MM-DD format or relative format like '7daysAgo', 'yesterday' */
  startDate: string;
  /** End date in YYYY-MM-DD format or relative format like 'today', 'yesterday' */
  endDate: string;
  /** Optional name for the date range */
  name?: string;
}

// Filter types
export interface NumericValue {
  int64Value?: number;
  doubleValue?: number;
}

export interface StringFilter {
  matchType:
    | 'MATCH_TYPE_UNSPECIFIED'
    | 'EXACT'
    | 'BEGINS_WITH'
    | 'ENDS_WITH'
    | 'CONTAINS'
    | 'FULL_REGEXP'
    | 'PARTIAL_REGEXP';
  value: string;
  caseSensitive?: boolean;
}

export interface InListFilter {
  values: string[];
  caseSensitive?: boolean;
}

export interface NumericFilter {
  operation:
    | 'OPERATION_UNSPECIFIED'
    | 'EQUAL'
    | 'LESS_THAN'
    | 'LESS_THAN_OR_EQUAL'
    | 'GREATER_THAN'
    | 'GREATER_THAN_OR_EQUAL';
  value: NumericValue;
}

export interface BetweenFilter {
  fromValue: NumericValue;
  toValue: NumericValue;
}

export interface Filter {
  fieldName: string;
  stringFilter?: StringFilter;
  inListFilter?: InListFilter;
  numericFilter?: NumericFilter;
  betweenFilter?: BetweenFilter;
  emptyFilter?: any;
}

export interface FilterExpressionList {
  expressions: FilterExpression[];
}

export interface FilterExpression {
  filter?: Filter;
  andGroup?: FilterExpressionList;
  orGroup?: FilterExpressionList;
  notExpression?: FilterExpression;
}

// Order By types
export interface DimensionOrderBy {
  dimensionName: string;
  orderType:
    | 'ORDER_TYPE_UNSPECIFIED'
    | 'ALPHANUMERIC'
    | 'CASE_INSENSITIVE_ALPHANUMERIC'
    | 'NUMERIC';
}

export interface MetricOrderBy {
  metricName: string;
}

export interface OrderBy {
  metric?: MetricOrderBy;
  dimension?: DimensionOrderBy;
  desc?: boolean;
}

// Admin API types
export interface AccountSummary {
  account?: string;
  displayName?: string;
  propertySummaries?: PropertySummary[];
}

export interface PropertySummary {
  property?: string;
  displayName?: string;
  propertyType?: string;
  parent?: string;
}

export interface GoogleAdsLink {
  name?: string;
  customerId?: string;
  canManageClients?: boolean;
  adsPersonalizationEnabled?: boolean;
  emailAddress?: string;
  createTime?: string;
  updateTime?: string;
  creatorEmailAddress?: string;
}

export interface PropertyDetails {
  name?: string;
  propertyType?: string;
  createTime?: string;
  updateTime?: string;
  parent?: string;
  displayName?: string;
  industryCategory?: string;
  timeZone?: string;
  currencyCode?: string;
  serviceLevel?: string;
  deleteTime?: string;
  expireTime?: string;
  account?: string;
}

// Reporting API types
export interface Dimension {
  name: string;
}

export interface Metric {
  name: string;
  expression?: string;
  invisible?: boolean;
}

export interface DimensionHeader {
  name?: string;
}

export interface MetricHeader {
  name?: string;
  type?: string;
}

export interface DimensionValue {
  value?: string;
}

export interface MetricValue {
  value?: string;
}

export interface Row {
  dimensionValues?: DimensionValue[];
  metricValues?: MetricValue[];
}

export interface ResponseMetaData {
  dataLossFromOtherRow?: boolean;
  samplingMetadatas?: any[];
  schemaRestrictionResponse?: any;
  currencyCode?: string;
  timeZone?: string;
}

export interface PropertyQuota {
  tokensPerDay?: any;
  tokensPerHour?: any;
  concurrentRequests?: any;
  serverErrorsPerProjectPerHour?: any;
  potentiallyThresholdedRequestsPerHour?: any;
}

export interface RunReportResponse {
  dimensionHeaders?: DimensionHeader[];
  metricHeaders?: MetricHeader[];
  rows?: Row[];
  totals?: Row[];
  maximums?: Row[];
  minimums?: Row[];
  rowCount?: number;
  metadata?: ResponseMetaData;
  propertyQuota?: PropertyQuota;
  kind?: string;
}

export interface RunRealtimeReportResponse {
  dimensionHeaders?: DimensionHeader[];
  metricHeaders?: MetricHeader[];
  rows?: Row[];
  totals?: Row[];
  maximums?: Row[];
  minimums?: Row[];
  rowCount?: number;
  propertyQuota?: PropertyQuota;
  kind?: string;
}

// Custom dimensions and metrics types
export interface CustomDefinition {
  parameterName?: string;
  displayName?: string;
  description?: string;
  scope?: string;
}

export interface Dimension {
  apiName: string;
  uiName: string;
  description: string;
  category: string;
  deprecatedApiNames: string[];
}

export interface Metric {
  apiName: string;
  uiName: string;
  description: string;
  category: string;
  type: string;
  deprecatedApiNames: string[];
}

export interface Dimensions {
  dimensions: Dimension[];
}

export interface Metrics {
  metrics: Metric[];
}

export interface CustomDimension extends Dimension{
  customDefinition: boolean;
}

export interface CustomMetric extends Metric{
  customDefinition: boolean;
}

export interface CustomDimensionsAndMetrics {
  customDimensions: CustomDimension[];
  customMetrics: CustomMetric[];
}

export interface CustomDimensionsAndMetrics {
  customDimensions: CustomDimension[];
  customMetrics: CustomMetric[];
}

// Method parameter types
export interface RunReportParams {
  dateRanges: DateRange[] | string | Record<string, DateRange>;
  dimensions: string[] | string | Record<string, string>;
  metrics: string[] | string | Record<string, string>;
  dimensionFilter?: FilterExpression | string;
  metricFilter?: FilterExpression | string;
  orderBys?: OrderBy[] | string | Record<string, OrderBy>;
  limit?: number;
  offset?: number;
  currencyCode?: string;
  returnPropertyQuota?: boolean;
}

export interface RunRealtimeReportParams {
  dimensions: string[] | string | Record<string, string>;
  metrics: string[] | string | Record<string, string>;
  dimensionFilter?: FilterExpression | string;
  metricFilter?: FilterExpression | string;
  orderBys?: OrderBy[] | string | Record<string, OrderBy>;
  limit?: number;
  returnPropertyQuota?: boolean;
}

export interface Token extends ValueHash {
  value: string;
  refresh: string;
  exp: number;
}

