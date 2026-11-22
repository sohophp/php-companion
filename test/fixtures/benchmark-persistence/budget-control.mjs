import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { basename, dirname } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';

const target = process.env.SOPHP_PRIVATE_PERSISTENCE_BUDGET_TARGET;
const fault = process.env.SOPHP_PRIVATE_PERSISTENCE_BUDGET_FAULT;
if (!target || !['cold-time', 'cache-byte'].includes(fault)) throw new Error('Require a controlled benchmark target and fault');

if (fault === 'cold-time') {
  const originalNow = performance.now.bind(performance);
  Object.defineProperty(performance, 'now', { configurable: true, value() {
    const caller = new Error().stack.split('\n')[2];
    const actual = originalNow();
    // Scale only the benchmark's own load timestamps, leaving indexing deadlines unchanged.
    return caller.includes('at load (' + target + ':') ? actual * 100 : actual;
  } });
} else {
  const originalStat = fs.stat;
  fs.stat = async function (path, ...args) {
    const caller = new Error().stack.split('\n')[2];
    const actual = await originalStat(path, ...args);
    if (!caller.includes('at cacheVolume (' + target + ':')) return actual;
    const manifest = basename(dirname(String(path))) === '.cache' && /^[a-f0-9]{64}\.json$/.test(basename(String(path)));
    // Model exactly one byte above 64 MiB; rounded reporting still displays 64.00 MiB.
    Object.defineProperty(actual, 'size', { value: manifest ? 64 * 1024 * 1024 + 1 : 0 });
    return actual;
  };
  syncBuiltinESMExports();
}
