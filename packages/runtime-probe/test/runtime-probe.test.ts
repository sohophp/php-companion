import { describe, expect, it } from 'vitest';
import { discoverPhpRuntimes, phpMinor, probePhpRuntime } from '../src/index.js';

const payload = (overrides: Record<string, unknown> = {}): string => `noise\nPHP_COMPANION_RUNTIME_V1:${JSON.stringify({
  version: '8.5.3', versionId: 80503, sapi: 'cli', loadedExtensions: ['Core', 'PDO', 'pdo'],
  loadedConfigurationFile: '/etc/php.ini', scannedConfigurationFiles: ['/etc/php.d/pdo.ini'], ...overrides,
})}`;

describe('PHP runtime probe', () => {
  it('accepts a framed payload and normalizes extension identities', async () => {
    const runtime = await probePhpRuntime('php', {}, async () => payload(), async () => '/usr/bin/php');
    expect(runtime).toEqual({
      command: 'php', path: '/usr/bin/php', version: '8.5.3', versionId: 80503, minor: '8.5', sapi: 'cli',
      loadedExtensions: ['core', 'pdo'], loadedConfigurationFile: '/etc/php.ini', scannedConfigurationFiles: ['/etc/php.d/pdo.ini'],
    });
  });

  it('fails closed for unavailable executables and malformed payloads', async () => {
    expect(await probePhpRuntime('missing', {}, async () => payload(), async () => undefined)).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => '8.5.3', async () => '/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: 'pdo' }), async () => '/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ versionId: 80403 }), async () => '/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => { throw new Error('timeout'); }, async () => '/php')).toBeUndefined();
  });

  it('deduplicates aliases resolving to one executable', async () => {
    const runtimes = await discoverPhpRuntimes(['php85', 'php'], {}, async () => payload(), async () => '/usr/bin/php');
    expect(runtimes).toHaveLength(1);
    expect(runtimes[0]?.minor).toBe('8.5');
  });

  it('extracts only a numeric major/minor prefix', () => {
    expect(phpMinor('8.4.12')).toBe('8.4');
    expect(phpMinor('invalid')).toBeUndefined();
  });
});
