import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { CURL_STABLE_CONSTANTS } from '../packages/language-spec/dist/curl-catalog.js';

const phpCommands = process.argv.slice(2);
if (!phpCommands.length) throw new Error('Usage: node scripts/audit-phpstorm-curl-runtime.mjs PHP_COMMAND...');
for (const php of phpCommands) {
  const output = execFileSync(php, ['-r', 'echo json_encode([PHP_VERSION, get_defined_constants(true)["curl"] ?? []]);'], {
    encoding: 'utf8', timeout: 5_000, maxBuffer: 512 * 1024,
  });
  const [version, constants] = JSON.parse(output);
  const mismatches = Object.entries(CURL_STABLE_CONSTANTS).filter(([name, value]) => constants[name] !== value);
  if (mismatches.length) throw new Error(`${php} (${version}): ${mismatches.length} missing or mismatched cURL constants: ${mismatches.map(([name]) => name).join(', ')}`);
  process.stdout.write(`${php} ${version}: ${Object.keys(CURL_STABLE_CONSTANTS).length} selected cURL constants match\n`);
}
