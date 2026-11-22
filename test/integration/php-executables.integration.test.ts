import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { probePhp } from '../../src/php-version/executables.js';
import type { PhpVersion } from '../../src/php-version/types.js';
import { probePhpRuntime, runPhpRuntime } from '@php-companion/runtime-probe';

function configuredBinaries(): Array<[PhpVersion, string]> {
  const value = process.env.PHP_COMPANION_TEST_PHP_BINARIES;
  if (!value) return [];
  const parsed = JSON.parse(value) as Record<string, string>;
  return Object.entries(parsed) as Array<[PhpVersion, string]>;
}

const binaries = configuredBinaries();

describe.skipIf(binaries.length === 0)('real PHP executable integration', () => {
  it.each(binaries)('detects PHP %s using %s', async (expectedMinor, executable) => {
    const result = await probePhp(executable);
    expect(result, `Could not execute ${executable}`).toBeDefined();
    expect(result?.minor).toBe(expectedMinor);
    expect(result?.version.startsWith(`${expectedMinor}.`)).toBe(true);
    let probeOutput = '';
    const runtime = await probePhpRuntime(executable, process.env, async (path, env) => {
      try {
        probeOutput = await runPhpRuntime(path, env);
        return probeOutput;
      } catch (error) {
        probeOutput = error instanceof Error ? error.message : String(error);
        throw error;
      }
    });
    expect(runtime, `Could not inspect runtime ${executable}: ${probeOutput}`).toBeDefined();
    expect(runtime).toMatchObject({ minor: expectedMinor, sapi: 'cli' });
    expect(runtime?.loadedExtensions).toContain('core');
    if (expectedMinor === '8.6') {
      const output = execFileSync(result!.path, ['-r',
        'class Config { public readonly int $timeout = 30; } $length = strlen(?); echo json_encode([$length("abc"), (new Config())->timeout, clamp(11, 0, 10)]);',
      ], { encoding: 'utf8', timeout: 3000 });
      expect(JSON.parse(output)).toEqual([3, 30, 10]);
    }
  });
});
