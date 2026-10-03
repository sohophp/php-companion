import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';
import { PhpSyntaxParser } from '../packages/parser/dist/index.js';
import { builtinPhpExtensionStub, builtinPhpStub } from '../packages/language-spec/dist/index.js';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const args = process.argv.slice(2);
const check = args.includes('--check');
const sourceIndex = args.indexOf('--source');
const phpIndex = args.indexOf('--php');
const sourceRoot = sourceIndex >= 0 ? args[sourceIndex + 1] : undefined;
const phpCommand = phpIndex >= 0 ? args[phpIndex + 1] : undefined;
const modules = args.filter((value, index) => value !== '--check' && !(sourceIndex >= 0 && (index === sourceIndex || index === sourceIndex + 1))
  && !(phpIndex >= 0 && (index === phpIndex || index === phpIndex + 1)));
if (!sourceRoot || !modules.length || phpIndex >= 0 && !phpCommand)
  throw new Error('Usage: node scripts/audit-phpstorm-stubs.mjs --source PATH [--php PHP_COMMAND] [--check] MODULE...');
const source = resolve(sourceRoot);
const revision = requirePinnedPhpstormStubs(source);
const builtins = new Set([...builtinPhpStub('8.5').matchAll(/\bfunction\s+([a-z_][a-z\d_]*)\s*\(/gi)]
  .map((match) => match[1].toLowerCase()));
const legacyBuiltins = new Set([...builtinPhpStub('7.4').matchAll(/\bfunction\s+([a-z_][a-z\d_]*)\s*\(/gi)]
  .map((match) => match[1].toLowerCase()));
const parser = await PhpSyntaxParser.createDefault();
let qualifiedBuiltins;
try {
  qualifiedBuiltins = new Set(parser.parse(builtinPhpStub('8.5')).callables
    .filter((item) => item.kind === 'function')
    .map((item) => item.fqcn.replace(/^\\/, '').toLowerCase()));
} finally { parser.dispose(); }
// Explicitly reviewed names absent from the PHP 8.5 function-declaration stub.
// Special names include syntax keywords and platform-only or invalid upstream entries.
const AUDITED_NONRUNTIME = {
  pgsql: new Set(['pg_enter_pipeline_mode', 'pg_exit_pipeline_mode', 'pg_pipeline_status', 'pg_pipeline_sync']), // Absent from official PHP 8.3/8.5 pgsql.stub.php.
  Core: new Set(['clone', 'die', 'exit']), // Reserved syntax; callable in PHP 8.4/8.5, but not legal userland declarations.
  mcrypt: new Set(['mcrypt_cbc', 'mcrypt_cfb', 'mcrypt_ecb', 'mcrypt_ofb', 'mcrypt_generic_end']), // Removed APIs; absent from all six audited Mcrypt 1.0.9 runtimes.
  gd: new Set(['imagegrabscreen', 'imagegrabwindow', 'imagepsbbox', 'imagepsencodefont',
    'imagepsextendfont', 'imagepsfreefont', 'imagepsloadfont', 'imagepsslantfont', 'imagepstext']),
  intl: new Set([
    'datefmt_set_timezone_id', 'grapheme_strrev', 'intcal_get_maximum', 'intl_get',
    'intlcal_greates_minimum', 'intltz_getgmt', 'intlz_create_default',
    'locale_get_display_keyword', 'locale_get_display_keyword_value',
  ]),
  mysqli: new Set(['mysqli_bind_param', 'mysqli_bind_result', 'mysqli_client_encoding', 'mysqli_fetch',
    'mysqli_get_cache_stats', 'mysqli_get_metadata', 'mysqli_param_count', 'mysqli_quote_string',
    'mysqli_send_long_data', 'mysqli_set_local_infile_default', 'mysqli_set_local_infile_handler']),
  PDO: new Set(['confirm_pdo_ibm_compiled']), // PDO_IBM build helper; not a generic PDO function.
  session: new Set(['session_is_registered', 'session_register', 'session_unregister']), // Removed before PHP 7.2.
  sodium: new Set([
    'sodium_crypto_kx', 'sodium_randombytes_buf', 'sodium_randombytes_random16', 'sodium_randombytes_uniform',
    'sodium_library_version_major', 'sodium_library_version_minor', 'sodium_version_string',
    'sodium_bin2ip', 'sodium_ip2bin',
    'sodium_crypto_ipcrypt_encrypt', 'sodium_crypto_ipcrypt_decrypt', 'sodium_crypto_ipcrypt_keygen',
    'sodium_crypto_ipcrypt_nd_encrypt', 'sodium_crypto_ipcrypt_nd_decrypt', 'sodium_crypto_ipcrypt_nd_keygen',
    'sodium_crypto_ipcrypt_ndx_encrypt', 'sodium_crypto_ipcrypt_ndx_decrypt', 'sodium_crypto_ipcrypt_ndx_keygen',
    'sodium_crypto_ipcrypt_pfx_encrypt', 'sodium_crypto_ipcrypt_pfx_decrypt', 'sodium_crypto_ipcrypt_pfx_keygen',
    'sodium_crypto_xof_shake128', 'sodium_crypto_xof_shake128_init', 'sodium_crypto_xof_shake128_squeeze', 'sodium_crypto_xof_shake128_update',
    'sodium_crypto_xof_shake256', 'sodium_crypto_xof_shake256_init', 'sodium_crypto_xof_shake256_squeeze', 'sodium_crypto_xof_shake256_update',
    'sodium_crypto_xof_turboshake128', 'sodium_crypto_xof_turboshake128_init', 'sodium_crypto_xof_turboshake128_squeeze', 'sodium_crypto_xof_turboshake128_update',
    'sodium_crypto_xof_turboshake256', 'sodium_crypto_xof_turboshake256_init', 'sodium_crypto_xof_turboshake256_squeeze', 'sodium_crypto_xof_turboshake256_update',
  ]), // Seven legacy aliases plus thirty upstream PHP 8.6 declarations.
  sockets: new Set(['socket_wsaprotocol_info_export', 'socket_wsaprotocol_info_import',
    'socket_wsaprotocol_info_release']), // Windows-only; included when that runtime exports them.
  standard: new Set([
    'apache_request_headers', 'getallheaders', // HTTP SAPI-dependent; absent from the six local CLI runtimes.
    'call_user_method', 'call_user_method_array', 'define_syslog_variables', 'import_request_variables',
    'magic_quotes_runtime', 'set_magic_quotes_runtime', 'set_socket_blocking',
    'php_egg_logo_guid', 'php_logo_guid', 'php_real_logo_guid', 'zend_logo_guid', // Removed legacy entries.
    'clamp', 'stream_clear_errors', 'stream_last_errors', 'stream_socket_get_crypto_status', // Upstream marks PHP 8.6.
    'getdir', // Present upstream but absent from all six local PHP 7.2–8.5 runtimes.
    'ps_unreserve_prefix___halt_compiler', 'ps_unreserve_prefix_array', 'ps_unreserve_prefix_die',
    'ps_unreserve_prefix_empty', 'ps_unreserve_prefix_eval', 'ps_unreserve_prefix_exit',
    'ps_unreserve_prefix_isset', 'ps_unreserve_prefix_list', 'ps_unreserve_prefix_unset', // Upstream parser placeholders.
    'sapi_windows_cp_conv', 'sapi_windows_cp_get', 'sapi_windows_cp_is_utf8', 'sapi_windows_cp_set',
    'sapi_windows_generate_ctrl_event', 'sapi_windows_set_ctrl_handler', 'sapi_windows_vt100_support',
  ]),
};
const AUDITED_LEGACY = {
  Core: new Set(['create_function', 'each']),
  exif: new Set(['read_exif_data']),
  gd: new Set(['image2wbmp', 'jpeg2wbmp', 'png2wbmp']),
  mbstring: new Set(['mbereg', 'mbereg_match', 'mbereg_replace', 'mbereg_search', 'mbereg_search_getpos',
    'mbereg_search_getregs', 'mbereg_search_init', 'mbereg_search_pos', 'mbereg_search_regs',
    'mbereg_search_setpos', 'mberegi', 'mberegi_replace', 'mbregex_encoding', 'mbsplit']),
  zlib: new Set(['gzgetss']),
  standard: new Set(['convert_cyr_string', 'ezmlm_hash', 'fgetss', 'get_magic_quotes_gpc',
    'get_magic_quotes_runtime', 'hebrevc', 'is_real', 'money_format', 'restore_include_path']),
};
const NONDECLARABLE_RUNTIME = new Set(['clone', 'die', 'exit']);
// Reviewed in phpstorm-stubs-pgsql-catalog-2026-10-01.md. The local libpq
// build does not export these entries; their signatures still need a capable
// runtime. Never exempt an entry from the runtimeUncovered check below.
const AUDITED_BUILD_DEPENDENT = {
  pgsql: new Set(['pg_close_stmt', 'pg_set_chunked_rows_size']),
};

const results = [];
for (const module of modules) {
  if (!/^[a-z][a-z\d_]*$/i.test(module)) throw new Error(`Invalid module: ${module}`);
  const names = new Set();
  // Read the pinned Git tree so a sparse checkout can audit a new extension.
  const files = execFileSync('git', ['-C', source, 'ls-tree', '-r', '--name-only', 'HEAD', '--', module], { encoding: 'utf8' })
    .trim().split('\n').filter((file) => file.endsWith('.php'));
  if (!files.length) throw new Error(`No upstream PHP source found for ${module}`);
  for (const file of files) {
    const content = execFileSync('git', ['-C', source, 'show', `HEAD:${file}`], { encoding: 'utf8' });
    for (const match of content.matchAll(/^\s*function\s+([a-z_][a-z\d_]*)\s*\(/gmi)) names.add(match[1].toLowerCase());
  }
  const missing = [...names].filter((name) => !builtins.has(name)).sort();
  const legacy = missing.filter((name) => AUDITED_LEGACY[module]?.has(name) && legacyBuiltins.has(name));
  const buildDependent = missing.filter((name) => AUDITED_BUILD_DEPENDENT[module]?.has(name));
  const unreviewed = missing.filter((name) => !AUDITED_NONRUNTIME[module]?.has(name) && !legacy.includes(name)
    && !buildDependent.includes(name)
    && !(module === 'apcu' && name.startsWith('apc_'))); // Legacy APC opcode-cache API, absent from APCu 5.
  let runtime;
  if (phpCommand) {
    const script = `$name = $argv[1];
if (!extension_loaded($name)) { echo json_encode(['versionId' => PHP_VERSION_ID, 'available' => false]); exit; }
$extension = new ReflectionExtension($name);
echo json_encode(['versionId' => PHP_VERSION_ID, 'available' => true,
  'functions' => array_values(array_map('strtolower', array_keys($extension->getFunctions())))]);`;
    runtime = JSON.parse(execFileSync(phpCommand, ['-r', script, module], { encoding: 'utf8' }));
    if (Math.floor(runtime.versionId / 100) !== 805) throw new Error(`--php must be a PHP 8.5 runtime: ${phpCommand}`);
  }
  const runtimeFunctions = runtime?.available ? runtime.functions : undefined;
  // Conditional libpq entries are deliberately absent from the default catalog.
  // Audit against the same runtime-gated declaration generator the project uses.
  const runtimeBuiltins = module === 'pgsql' && runtimeFunctions
    ? new Set([...builtinPhpExtensionStub('8.5', 'pgsql', { pgsqlRuntime: { functions: runtimeFunctions, constants: {} } })
      .matchAll(/\bfunction\s+([a-z_][a-z\d_]*)\s*\(/gi)].map(match => match[1].toLowerCase()))
    : qualifiedBuiltins;
  const runtimeOutsideUpstream = runtimeFunctions?.filter((name) => !names.has(name.split('\\').at(-1))).sort();
  const runtimeUncovered = runtimeFunctions?.filter((name) => !runtimeBuiltins.has(name)
    && !(module === 'Core' && NONDECLARABLE_RUNTIME.has(name))).sort();
  results.push({ module, upstreamFunctions: names.size, absentAtPhp85: missing.length,
    auditedSpecial: missing.length - unreviewed.length - legacy.length - buildDependent.length, auditedLegacy: legacy.length,
    auditedBuildDependent: buildDependent.length, buildDependentNames: buildDependent,
    unreviewedAbsences: unreviewed.length,
    examples: missing.slice(0, 12), unreviewedExamples: unreviewed.slice(0, 12),
    unreviewedNames: unreviewed,
    ...(runtime ? { runtimeAvailable: runtime.available,
      ...(runtimeFunctions ? { runtimeFunctions: runtimeFunctions.length,
        runtimeOutsideUpstream, runtimeUncovered } : {}) } : {}) });
}
process.stdout.write(`${JSON.stringify({ revision, targetPhpVersion: '8.5', results }, null, 2)}\n`);
if (check) {
  const failures = results.filter(result => result.unreviewedAbsences > 0 || result.runtimeUncovered?.length);
  if (failures.length) {
    process.stderr.write(`Unreviewed phpstorm-stubs coverage gaps: ${failures.map(result => result.module).join(', ')}\n`);
    process.exitCode = 1;
  }
}
