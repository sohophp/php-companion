import promises from 'node:fs/promises';
import { existsSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { join } from 'node:path';
import process from 'node:process';
import { setImmediate, setTimeout } from 'node:timers';

// Keep real reads and their bytes. Only this child process and the selected
// source file have their completion order controlled by the parent test.
const original = promises.readFile;
const root = process.env.SOPHP_RENAME_GATES;
const target = process.env.SOPHP_RENAME_SOURCE;
const counters = { open: 0, scan: 0 };
promises.readFile = async function(path, ...args) {
  if (!root || String(path) !== target || !existsSync(join(root, 'active'))) return original.call(this, path, ...args);
  const caller = new Error().stack?.split('\n')[2] ?? '';
  const kind = caller.includes('/dist/server.js:') ? 'open' : 'scan';
  const key = `${kind}-${++counters[kind]}`;
  writeFileSync(join(root, `${key}.paused`), caller);
  const value = await original.call(this, path, ...args);
  while (!existsSync(join(root, `${key}.release`)) && !existsSync(join(root, 'release-all'))) await new Promise(resolve => setTimeout(resolve, 5));
  setImmediate(() => writeFileSync(join(root, `${key}.delivered`), ''));
  return value;
};
syncBuiltinESMExports();
