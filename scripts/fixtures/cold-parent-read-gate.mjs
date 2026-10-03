import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import process from 'node:process';
const original = fs.readFile;
let target;
let release;
process.on('message', message => {
  if (message.kind === 'arm') { target = message.path; process.send({ kind: 'armed' }); }
  if (message.kind === 'release') { release?.(); release = undefined; process.send({ kind: 'released' }); }
});
fs.readFile = async function(path, ...args) {
  if (String(path) === target) {
    target = undefined;
    await new Promise(resolve => { release = resolve; process.send({ kind: 'held', path: String(path) }); });
  }
  return original.call(this, path, ...args);
};
syncBuiltinESMExports();
