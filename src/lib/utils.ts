import { ToolError } from '@optimizely-opal/opal-tool-ocp-sdk';

/**
 * Constructs a property resource name in the format required by APIs
 * @param propertyValue - Property ID as number or string
 * @returns Property resource name in format "properties/{propertyId}"
 */
export function constructPropertyResourceName(
  propertyValue: string | number
): string {
  let propertyNum: number | null = null;

  if (typeof propertyValue === 'number') {
    propertyNum = propertyValue;
  } else if (typeof propertyValue === 'string') {
    const trimmed = propertyValue.trim();
    if (/^\d+$/.test(trimmed)) {
      propertyNum = parseInt(trimmed, 10);
    } else if (trimmed.startsWith('properties/')) {
      const numericPart = trimmed.split('/').pop();
      if (numericPart && /^\d+$/.test(numericPart)) {
        propertyNum = parseInt(numericPart, 10);
      }
    }
  }

  if (propertyNum === null) {
    throw new ToolError(
      'Invalid Property ID',
      400,
      `Invalid property ID: ${propertyValue}. ` +
        'A valid property value is either a number or a string starting ' +
        'with "properties/" and followed by a number.'
    );
  }

  return `properties/${propertyNum}`;
}

/**
 * Creates a user agent string for API requests
 * @param customUserAgent - Optional custom user agent
 * @returns User agent string
 */
export function createUserAgent(customUserAgent?: string): string {
  const baseUserAgent = 'google-analytics-typescript-client/1.0.0';
  return customUserAgent
    ? `${customUserAgent} ${baseUserAgent}`
    : baseUserAgent;
}
