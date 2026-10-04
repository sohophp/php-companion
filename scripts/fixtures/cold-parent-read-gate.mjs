import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import process from 'node:process';
const original = fs.readFile;
let target;
let release;
let holdAfterRead = false;
process.on('message', message => {
  if (message.kind === 'arm') { target = message.path; holdAfterRead = message.afterRead === true; process.send({ kind: 'armed' }); }
  if (message.kind === 'release') { release?.(); release = undefined; process.send({ kind: 'released' }); }
});
fs.readFile = async function(path, ...args) {
  if (String(path) === target) {
    target = undefined;
    const afterRead = holdAfterRead;
    const value = afterRead ? await original.call(this, path, ...args) : undefined;
    await new Promise(resolve => { release = resolve; process.send({ kind: 'held', path: String(path),
      phase: afterRead ? 'after-read' : 'before-read', capturedSource: afterRead ? String(value) : undefined }); });
    if (afterRead) return value;
  }
  return original.call(this, path, ...args);
};
syncBuiltinESMExports();
