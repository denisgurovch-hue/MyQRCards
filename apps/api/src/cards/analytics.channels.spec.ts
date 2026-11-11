import {
  isAnalyticsPeriod,
  isContactClickChannel,
  periodDays,
  utcDayDate,
  utcDayString,
} from './analytics.channels';

describe('analytics.channels', () => {
  it('validates click channels and periods', () => {
    expect(isContactClickChannel('phone')).toBe(true);
    expect(isContactClickChannel('vcard')).toBe(false);
    expect(isAnalyticsPeriod('7d')).toBe(true);
    expect(isAnalyticsPeriod('14d')).toBe(false);
    expect(periodDays('7d')).toBe(7);
    expect(periodDays('30d')).toBe(30);
  });

  it('normalizes UTC day without storing clock time', () => {
    const sample = new Date('2026-11-11T22:15:00.000Z');
    expect(utcDayString(sample)).toBe('2026-11-11');
    expect(utcDayDate(sample).toISOString()).toBe('2026-11-11T00:00:00.000Z');
  });
});
