import { expect, it } from 'vitest';
import { probePhpRuntime } from '../src/index.js';
import { normalizeGetrusageRuntimeFacts } from '../../language-spec/src/getrusage.js';

const timingKeys = ['ru_stime.tv_sec', 'ru_stime.tv_usec', 'ru_utime.tv_sec', 'ru_utime.tv_usec'];
const frame = (getrusageRuntime: unknown): string => `PHP_COMPANION_RUNTIME_V1:${JSON.stringify({
  version: '8.5.11', versionId: 80511, sapi: 'cli', loadedExtensions: ['Core', 'standard'],
  getrusageRuntime, loadedConfigurationFile: null, scannedConfigurationFiles: [],
})}`;

it('preserves measured getrusage fields in the runtime returned to the client', async () => {
  const input = { selfKeys: [...timingKeys, 'ru_maxrss', 'ru_majflt'], childrenKeys: timingKeys };
  const runtime = await probePhpRuntime('php', {}, async () => frame(input), async () => '/php');
  expect(runtime?.getrusageRuntime).toEqual(normalizeGetrusageRuntimeFacts(input));
});

it('omits unavailable getrusage facts and rejects corrupted snapshots', async () => {
  const runtime = await probePhpRuntime('php', {}, async () => frame(null), async () => '/php');
  expect(runtime).toBeDefined(); expect(runtime?.getrusageRuntime).toBeUndefined();
  for (const bad of [[], {}, { selfKeys: timingKeys, childrenKeys: ['ru_maxrss'] },
    { selfKeys: [...timingKeys, 'ru_maxrss', 'ru_maxrss'], childrenKeys: timingKeys },
    { selfKeys: [...timingKeys, 'unknown'], childrenKeys: timingKeys }]) {
    expect(await probePhpRuntime('php', {}, async () => frame(bad), async () => '/php')).toBeUndefined();
  }
});
