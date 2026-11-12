import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('deploy.sh release invariants', () => {
  const script = readFileSync(
    join(__dirname, '../../../deploy/scripts/deploy.sh'),
    'utf8',
  );

  it('always rebuilds and force-recreates api and web', () => {
    expect(script).toContain('compose build api web');
    expect(script).toContain('force-recreate --no-deps api web');
    expect(script).toContain('build-id.txt');
    expect(script).toContain('gitSha');
  });

  it('exports GIT_SHA for image build args', () => {
    expect(script).toMatch(/GIT_SHA="\$\(git rev-parse HEAD\)"/);
    expect(script).toContain('export GIT_SHA');
  });
});
