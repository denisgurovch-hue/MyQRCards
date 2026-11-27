import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json';
import { APP_VERSION } from './app-version';

describe('APP_VERSION', () => {
  it('exposes the root package version', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    expect(APP_VERSION).toBe(packageJson.version);
    expect(APP_VERSION).toBe('2.0.0-beta.9');
  });
});
