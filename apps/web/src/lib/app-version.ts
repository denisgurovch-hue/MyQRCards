import packageJson from '../../package.json';

/**
 * Product version — keep in sync with root `package.json` (see
 * `.cursor/rules/010-versioning.mdc`).
 */
export const APP_VERSION: string =
  typeof packageJson.version === 'string' && packageJson.version
    ? packageJson.version
    : '0.0.0';
