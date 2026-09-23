import { describe, expect, it } from 'vitest';
import { discoverPhpExecutables, probePhp } from '../../src/php-version/executables.js';
import { resolvePhpVersion } from '../../src/php-version/resolver.js';

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

  it('does not start PHP when Composer already determines the target version', async () => {
    let probes = 0;
    const resolution = await resolvePhpVersion({
      setting: 'auto',
      composer: { root: '/project', composerPath: '/project/composer.json', requiredPhp: '^8.1', disabledExtensions: [], psr4: [], psr0: [], classmap: [], files: [], excludeFromClassmap: [], dependencies: [], warnings: [] },
      processRunner: async () => { probes += 1; return '8.5.0'; },
      executableResolver: async (command) => `/usr/bin/${command}`,
    });
    expect(resolution.target).toBe('8.1');
    expect(probes).toBe(0);
  });

  it('uses the PHP command on PATH before a different installed versioned command', async () => {
    const resolution = await resolvePhpVersion({
      setting: 'auto',
      executableResolver: async (command) => ({ php: '/runtime/php', php85: '/runtime/php85' })[command],
      processRunner: async (path) => path.endsWith('php85') ? '8.5.9' : '7.2.34',
    });
    expect(resolution).toMatchObject({
      target: '7.2', source: 'discovered-executable', sourceDetail: '/runtime/php',
      executable: { command: 'php', path: '/runtime/php', version: '7.2.34' },
    });
  });

  it('uses an installed versioned command when PHP is absent from PATH', async () => {
    const resolution = await resolvePhpVersion({
      setting: 'auto',
      executableResolver: async (command) => command === 'php85' ? '/runtime/php85' : undefined,
      processRunner: async () => '8.5.9',
    });
    expect(resolution).toMatchObject({ target: '8.5', source: 'discovered-executable', sourceDetail: '/runtime/php85' });
  });
});
