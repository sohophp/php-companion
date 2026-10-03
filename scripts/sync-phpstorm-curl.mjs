import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-curl.mjs --source PATH [--write]');
const source = resolve(sourceRoot);
const revision = requirePinnedPhpstormStubs(source);
const upstream = await readFile(resolve(source, 'curl/curl.php'), 'utf8');
const constantsSource = await readFile(resolve(source, 'curl/curl_d.php'), 'utf8');
const names = [...new Set([...upstream.matchAll(/^function\s+(curl_[a-z_]+)\s*\(/gm)].map((match) => match[1]))];
if (names.length !== 35 || !names.includes('curl_init') || !names.includes('curl_share_init_persistent')) {
  throw new Error('Unexpected cURL function catalog; review upstream before syncing');
}
const constantNames = [...new Set([...constantsSource.matchAll(/^\s*define\((['"])([A-Za-z_][A-Za-z0-9_]*)\1,/gm)]
  .map((match) => match[2]))].sort();
if (constantNames.length !== 701 || !constantNames.includes('CURLOPT_URL')
  || !constantNames.includes('CURL_SSLVERSION_TLSv1_2')) {
  throw new Error('Unexpected cURL constant catalog; review upstream before syncing');
}
const selectedConstants = [
  'CURLOPT_URL', 'CURLOPT_RETURNTRANSFER', 'CURLOPT_TIMEOUT', 'CURLOPT_TIMEOUT_MS', 'CURLOPT_CONNECTTIMEOUT',
  'CURLOPT_POST', 'CURLOPT_POSTFIELDS', 'CURLOPT_HTTPHEADER', 'CURLOPT_FOLLOWLOCATION', 'CURLOPT_CUSTOMREQUEST',
  'CURLOPT_HTTPGET', 'CURLOPT_NOBODY', 'CURLINFO_HTTP_CODE', 'CURLINFO_RESPONSE_CODE', 'CURLINFO_EFFECTIVE_URL',
  'CURLE_OK', 'CURLM_OK', 'CURLMSG_DONE', 'CURLSHOPT_SHARE', 'CURLSHOPT_UNSHARE',
  'CURL_LOCK_DATA_COOKIE', 'CURL_LOCK_DATA_DNS', 'CURL_LOCK_DATA_SSL_SESSION',
  'CURLOPT_SSL_VERIFYPEER', 'CURLOPT_SSL_VERIFYHOST', 'CURLOPT_USERAGENT', 'CURLOPT_HEADER', 'CURLOPT_HTTP_VERSION',
  'CURL_HTTP_VERSION_1_1', 'CURL_HTTP_VERSION_2_0', 'CURLOPT_CONNECTTIMEOUT_MS', 'CURLOPT_ENCODING', 'CURLOPT_CAINFO',
  'CURLOPT_COOKIE', 'CURLOPT_COOKIEFILE', 'CURLOPT_COOKIEJAR', 'CURLOPT_MAXREDIRS', 'CURLOPT_PROXY',
  'CURLOPT_PROXYUSERPWD', 'CURLOPT_HTTPAUTH', 'CURLAUTH_BASIC', 'CURLOPT_USERPWD', 'CURLOPT_UPLOAD',
  'CURLOPT_INFILE', 'CURLOPT_INFILESIZE', 'CURLOPT_READFUNCTION', 'CURLOPT_WRITEFUNCTION', 'CURLOPT_SSLVERSION',
  'CURL_SSLVERSION_TLSv1_2', 'CURLINFO_TOTAL_TIME', 'CURLINFO_CONTENT_TYPE', 'CURLINFO_REDIRECT_COUNT',
  'CURLOPT_POSTREDIR', 'CURLOPT_VERBOSE', 'CURLOPT_FAILONERROR', 'CURLOPT_FRESH_CONNECT', 'CURLOPT_FORBID_REUSE',
  'CURLOPT_TCP_KEEPALIVE', 'CURLOPT_TCP_KEEPIDLE', 'CURLOPT_TCP_KEEPINTVL', 'CURLOPT_SSH_AUTH_TYPES',
  'CURLSSH_AUTH_PASSWORD', 'CURLSSH_AUTH_PUBLICKEY', 'CURLINFO_PRIMARY_IP', 'CURLINFO_PRIMARY_PORT',
  'CURLINFO_LOCAL_IP', 'CURLINFO_LOCAL_PORT', 'CURLOPT_IPRESOLVE', 'CURL_IPRESOLVE_V4', 'CURL_IPRESOLVE_V6',
  'CURLOPT_PRIVATE', 'CURLINFO_PRIVATE',
];
const constants = Object.fromEntries(selectedConstants.map((name) => {
  const matches = [...constantsSource.matchAll(new RegExp(`^define\\((['"])${name}\\1,\\s*(-?\\d+)\\);`, 'gm'))];
  if (matches.length !== 1) throw new Error(`Unexpected cURL constant ${name}; review upstream before syncing`);
  return [name, Number(matches[0][2])];
}));
const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, curl/curl.php and curl/curl_d.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Runtime signatures and availability are audited separately.
export const CURL_FUNCTIONS = ${JSON.stringify(names, null, 2)} as const;
export const CURL_CONSTANT_NAMES = ${JSON.stringify(constantNames, null, 2)} as const;
export const CURL_STABLE_CONSTANTS = ${JSON.stringify(constants, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/curl-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`curl: ${names.length} functions, ${constantNames.length} constant names, ${selectedConstants.length} selected fallback values from ${revision}\n`);
