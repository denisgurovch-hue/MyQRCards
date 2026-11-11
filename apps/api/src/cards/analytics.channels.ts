export const CONTACT_CLICK_CHANNELS = [
  'phone',
  'email',
  'whatsapp',
  'telegram',
  'link',
] as const;

export type ContactClickChannel = (typeof CONTACT_CLICK_CHANNELS)[number];

export const ANALYTICS_PERIODS = ['7d', '30d'] as const;
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

export function isContactClickChannel(
  value: string,
): value is ContactClickChannel {
  return (CONTACT_CLICK_CHANNELS as readonly string[]).includes(value);
}

export function isAnalyticsPeriod(value: string): value is AnalyticsPeriod {
  return (ANALYTICS_PERIODS as readonly string[]).includes(value);
}

export function periodDays(period: AnalyticsPeriod): number {
  return period === '30d' ? 30 : 7;
}

/** UTC calendar date (YYYY-MM-DD) for aggregation. */
export function utcDayString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function utcDayDate(date: Date): Date {
  return new Date(`${utcDayString(date)}T00:00:00.000Z`);
}
