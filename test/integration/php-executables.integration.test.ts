import { describe, expect, it } from 'vitest';
import { probePhp } from '../../src/php-version/executables.js';
import type { PhpVersion } from '../../src/php-version/types.js';

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
  });
});
