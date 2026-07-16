import { describe, expect, it } from 'vitest';
import { discoverPhpExecutables, probePhp } from '../../src/php-version/executables.js';

describe('PHP executable probing', () => {
  it.each([
    ['php72', '7.2'],
    ['php81', '8.1'],
    ['php82', '8.2'],
    ['php84', '8.4'],
    ['php85', '8.5'],
  ])('probes %s with injected process dependencies', async (command, minor) => {
    const result = await probePhp(
      command,
      {},
      async () => `${minor}.34`,
      async (candidate) => `/virtual/bin/${candidate}`,
    );
    expect(result?.minor).toBe(minor);
    expect(result?.version.startsWith(`${minor}.`)).toBe(true);
  });

  it('ignores invalid output and unavailable commands', async () => {
    expect(await probePhp('missing', {}, async () => '8.2.0', async () => undefined)).toBeUndefined();
    expect(await probePhp('php', {}, async () => 'not php', async () => '/virtual/php')).toBeUndefined();
  });

  it('deduplicates commands resolving to the same executable', async () => {
    const results = await discoverPhpExecutables(
      undefined,
      {},
      async () => '8.2.32',
      async () => '/virtual/bin/php',
    );
    expect(results).toHaveLength(1);
    expect(results[0]?.minor).toBe('8.2');
  });
});
