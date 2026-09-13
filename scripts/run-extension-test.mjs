import { spawn } from 'node:child_process';
import process from 'node:process';

const target = process.argv[2];
if (!target) throw new Error('Usage: run-extension-test.mjs <compiled test runner>');

const command = process.platform === 'linux' ? 'xvfb-run' : process.execPath;
const arguments_ = process.platform === 'linux' ? ['-a', process.execPath, target] : [target];
const child = spawn(command, arguments_, { cwd: process.cwd(), env: process.env, stdio: 'inherit' });
child.once('error', (error) => { throw error; });
child.once('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
