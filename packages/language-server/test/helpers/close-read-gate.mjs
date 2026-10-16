import promises from 'node:fs/promises';
import { existsSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { join } from 'node:path';
import process from 'node:process';
import { setTimeout } from 'node:timers';

const original = promises.readFile;
const root = process.env.SOPHP_CLOSE_WAIT_GATES;
const target = process.env.SOPHP_CLOSE_WAIT_SOURCE;
let sequence = 0;
promises.readFile = async function(path, ...args) {
  if (!root || String(path) !== target || !existsSync(join(root, 'active'))) return original.call(this, path, ...args);
  const caller = new Error().stack;
  const value = await original.call(this, path, ...args);
  const key = ++sequence;
  writeFileSync(join(root, `read-${key}.paused`), caller ?? '');
  while (!existsSync(join(root, 'release-all'))) await new Promise(done => setTimeout(done, 5));
  writeFileSync(join(root, `read-${key}.released`), '');
  return value;
};
syncBuiltinESMExports();
