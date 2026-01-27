import { ParameterType, tool, ToolError } from '@optimizely-opal/opal-tool-ocp-sdk';
import * as App from '@zaiusinc/app-sdk';
import { DefaultSettings } from '../data/data';

interface TodayDateToolParameters {
  locale?: string;
  timezone?: string;
}

interface TodayDate {
  date: string;
  locale: string;
  timezone: string;
}

/**
 * Sample Opal tool - returns today's date formatted for specified locale and timezone
 * Uses default locale/timezone from app settings if not provided in parameters
 * Demonstrates: ToolError handling, app settings integration
 */
export class TodayDateTool {

  @tool({
    name: 'todays-date',
    description: `
        Returns today's date for specified locale and timezone.
        If locale/timezone are not provided, defaults from app settings are used.
    `,
    endpoint: '/tools/todays-date',
    parameters: [
      {
        name: 'locale',
        type: ParameterType.String,
        description: 'Locale for date formatting (defaults to en-US)',
        required: false
      },
      {
        name: 'timezone',
        type: ParameterType.String,
        description: 'Timezone for date formatting (defaults to UTC)',
        required: false
      }
    ]
  })
  public async todaysDate(parameters: TodayDateToolParameters): Promise<TodayDate> {
    const defaults = await App.storage.settings.get<DefaultSettings>('defaults');

    const locale = parameters.locale || defaults?.locale || 'en-US';
    const timezone = parameters.timezone || defaults?.timezone || 'UTC';

    // Validate timezone - demonstrate ToolError usage
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      throw new ToolError(
        'Invalid timezone',
        400,
        `Timezone "${timezone}" is not recognized. Use IANA timezone format (e.g., "America/New_York", "UTC").`
      );
    }

    const today = new Date();
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: timezone
    });

    return {
      date: formatter.format(today),
      locale,
      timezone
    };
  }
}
