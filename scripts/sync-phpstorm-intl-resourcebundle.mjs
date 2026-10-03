import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-intl-resourcebundle.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'intl/intl.php'), 'utf8');
const classSource = source.slice(source.indexOf('class ResourceBundle implements'), source.indexOf('class Transliterator\n'));
if (!classSource) throw new Error('Unexpected upstream ResourceBundle layout');
const functionMethods = {
  resourcebundle_create: 'create', resourcebundle_get: 'get', resourcebundle_count: 'count',
  resourcebundle_locales: 'getLocales', resourcebundle_get_error_code: 'getErrorCode',
  resourcebundle_get_error_message: 'getErrorMessage',
};
const upstreamFunctions = [...source.matchAll(/^function (resourcebundle_[a-z_]+)\s*\(/gm)].map((match) => match[1]);
if (upstreamFunctions.length !== 6 || upstreamFunctions.some((name) => !(name in functionMethods))) {
  throw new Error(`Unexpected upstream ResourceBundle function set: ${upstreamFunctions.join(', ')}`);
}
for (const method of Object.values(functionMethods)) {
  if (!new RegExp(`\\bpublic (?:static )?function ${method}\\s*\\(`).test(classSource)) {
    throw new Error(`Missing upstream ResourceBundle::${method}`);
  }
}
if (!/public function getIterator\s*\(/.test(classSource)) throw new Error('Missing upstream ResourceBundle::getIterator');
const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, intl/intl.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md.
export const RESOURCE_BUNDLE_FUNCTION_METHODS = ${JSON.stringify(functionMethods, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/intl-resourcebundle-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`ResourceBundle: ${upstreamFunctions.length} function/method pairs from ${revision}\n`);
