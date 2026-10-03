import { describe, expect, it } from 'vitest';
import { bcmathNumberDocumentUri, bcmathNumberPhpStub, filterClassesDocumentUri, filterClassesPhpStub, builtinDocumentUri, builtinPhpExtensionStub, builtinPhpStub, CONFIGURABLE_PHP_EXTENSIONS, isBuiltinDocumentUri, isSyntaxAvailable, lowestSupportedVersion, normalizeApcuRuntimeFacts, normalizeCurlRuntimeFacts, normalizeGdRuntimeFacts, normalizePcntlRuntimeFacts, normalizePgsqlRuntimeFacts, normalizeReadlineLib, normalizeTokenizerRuntimeFacts, normalizeMysqliRuntimeFacts, normalizeOpenSslRuntimeFacts, normalizePcreRuntimeConstants, normalizePdoRuntimeFacts, normalizeSocketsRuntimeFacts, normalizeSodiumRuntimeFacts, normalizeZipRuntimeFacts, normalizeZlibRuntimeFacts, parseBcmathNumberDocumentUri, parseBuiltinDocumentUri, parseFilterClassesDocumentUri, parsePdoDriverDocumentUri, parseRandomClassesDocumentUri, pdoDriverDocumentUri, pdoDriverPhpStub, randomClassesDocumentUri, randomClassesPhpStub, SUPPORTED_PHP_VERSIONS, unsupportedSyntax } from '../src/index.js';
describe('PHP language specification', () => {
  it('describes SimpleXML factories with bounded class-string witnesses and explicit failures', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of ['simplexml_load_string', 'simplexml_load_file']) {
        expect(stub).toContain(`@return ($class_name is null ? SimpleXMLElement|false : T|false) */ function ${name}(`);
      }
      expect(stub).toContain('@return ($class_name is null ? SimpleXMLElement|null : T|null) */ function simplexml_import_dom(');
      expect(stub).toContain('@template T of SimpleXMLElement\n * @param class-string<T>|null $class_name');
    }
  });
  it('keeps stat and lstat shape declarations compatible with the native failure branch', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      for (const name of ['stat', 'lstat']) {
        expect(builtinPhpStub(version)).toMatch(new RegExp(`@return array\\{[^}]+\\}\\|false[^/]*\\*/ function ${name}\\(`));
      }
    }
  });
  it('preserves pathinfo flag-dependent shapes and absent path fields across PHP versions', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const parameter = version.startsWith('7.') ? 'options' : 'flags';
      expect(builtinPhpStub(version).includes('const PATHINFO_ALL = 15;')).toBe(!version.startsWith('7.'));
      expect(builtinPhpStub(version)).toContain(`@return ($${parameter} is 15 ? array{dirname?:string, basename:string, extension?:string, filename:string} : string)`);
    }
  });
  it('retains string list results and the PHP 7 failure branch for string splitting', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const source = builtinPhpStub(version);
      const result = version.startsWith('7.') ? 'list<string>|false' : 'list<string>';
      expect(source).toContain(`/** @return ${result} */ function explode(`);
      expect(source).toContain(`/** @return ${result} */ function str_split(`);
    }
  });
  it('gives every built-in declaration snapshot a stable version and extension URI', () => {
    const uri = builtinDocumentUri('7.2', { disabledExtensions: ['pdo', 'dom', 'pdo'] });
    expect(uri).toBe('php-companion-builtin:/common-core.php?php=7.2&disabled=dom%2Cpdo');
    expect(parseBuiltinDocumentUri(uri)).toEqual({ version: '7.2', disabledExtensions: ['dom', 'pdo'] });
    expect(parseBuiltinDocumentUri(`php-companion-builtin:/common-core.php?${encodeURIComponent(uri.split('?')[1]!)}`))
      .toEqual({ version: '7.2', disabledExtensions: ['dom', 'pdo'] });
    const vscodeRoundTrip = `php-companion-builtin:/common-core.php?${encodeURIComponent(decodeURIComponent(uri.split('?')[1]!))}`;
    expect(parseBuiltinDocumentUri(vscodeRoundTrip)).toEqual({ version: '7.2', disabledExtensions: ['dom', 'pdo'] });
    expect(parseBuiltinDocumentUri(`${vscodeRoundTrip}%26unexpected%3D1`)).toBeUndefined();
    expect(isBuiltinDocumentUri(uri)).toBe(true);
    expect(builtinDocumentUri('8.5')).not.toBe(uri);
    expect(parseBuiltinDocumentUri('php-companion-builtin:/common-core.php?php=8.6')).toBeUndefined();
    expect(parseBuiltinDocumentUri('php-companion-builtin:/common-core.php?php=7.2&disabled=unknown')).toBeUndefined();
    const conditional = builtinDocumentUri('8.5', { unavailableFunctions: ['curl_upkeep'] });
    expect(parseBuiltinDocumentUri(conditional)).toEqual({ version: '8.5', disabledExtensions: [], unavailableFunctions: ['curl_upkeep'] });
    expect(parseBuiltinDocumentUri('php-companion-builtin:/common-core.php?php=8.5&unavailable=unknown')).toBeUndefined();
  });
  it('removes only explicitly disabled, independently audited extension stubs', () => {
    const markers = new Map([
      ['apcu', 'function apcu_store'],
      ['bcmath', 'function bcadd'],
      ['bz2', 'function bzopen'],
      ['calendar', 'function jdtogregorian'],
      ['ctype', 'function ctype_digit'], ['curl', 'function curl_init'],
      ['dom', 'class DOMDocument'], ['exif', 'function exif_read_data'], ['fileinfo', 'function finfo_open'], ['filter', 'function filter_has_var'], ['ftp', 'function ftp_connect'], ['gd', 'function imagecreatetruecolor'], ['gettext', 'function gettext('], ['iconv', 'function iconv('], ['igbinary', 'function igbinary_serialize('], ['imagick', 'class Imagick implements Iterator, Countable'], ['intl', 'class Locale'], ['mbstring', 'function mb_strlen'], ['mcrypt', 'function mcrypt_encrypt('], ['msgpack', 'function msgpack_pack('], ['mysqli', 'function mysqli_query'], ['openssl', 'function openssl_encrypt'], ['pcntl', 'function pcntl_fork('], ['pdo', 'class PDO '], ['pgsql', 'function pg_connect('], ['phar', 'class Phar extends RecursiveDirectoryIterator'],
      ['posix', 'function posix_getpid('], ['readline', 'function readline('], ['redis', 'class Redis {'], ['session', 'function session_start('], ['shmop', 'function shmop_open('], ['simplexml', 'class SimpleXMLElement'], ['sockets', 'function socket_create'], ['sodium', 'function sodium_crypto_secretbox('], ['sqlite3', 'class SQLite3 {'], ['sysvmsg', 'function msg_get_queue('], ['sysvsem', 'function sem_get('], ['sysvshm', 'function shm_attach('], ['tokenizer', 'function token_get_all('], ['xml', 'function xml_parser_create'], ['xmlreader', 'class XMLReader'], ['xmlwriter', 'class XMLWriter'], ['xsl', 'class XSLTProcessor'], ['yaml', 'function yaml_parse('], ['zip', 'class ZipArchive'], ['zlib', 'function gzencode'],
    ] as const);
    const complete = builtinPhpStub('8.5');
    expect(builtinPhpStub('8.5', { disabledExtensions: [] })).toBe(complete);
    expect([...markers.keys()]).toEqual([...CONFIGURABLE_PHP_EXTENSIONS]);
    for (const extension of CONFIGURABLE_PHP_EXTENSIONS) {
      const filtered = builtinPhpStub('8.5', { disabledExtensions: [extension] });
      expect(complete).toContain(markers.get(extension));
      expect(filtered).not.toContain(markers.get(extension));
      expect(builtinPhpExtensionStub('8.5', extension)).toContain(markers.get(extension));
      for (const [other, marker] of markers) if (other !== extension) expect(filtered).toContain(marker);
    }
    expect(builtinPhpStub('8.5', { disabledExtensions: [...CONFIGURABLE_PHP_EXTENSIONS] })).toContain('function libxml_use_internal_errors');
  });
  it('provides the five YAML functions and 25 stable constants across supported PHP versions', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpExtensionStub(version, 'yaml');
      expect([...stub.matchAll(/\bfunction (yaml_\w+)\(/g)].map((match) => match[1]).sort()).toEqual([
        'yaml_emit', 'yaml_emit_file', 'yaml_parse', 'yaml_parse_file', 'yaml_parse_url',
      ]);
      expect([...stub.matchAll(/\bconst YAML_\w+ =/g)]).toHaveLength(25);
      expect(stub).toContain('function yaml_parse($input, $pos = 0, &$ndocs = null, array $callbacks = [])');
      expect(stub).toContain("const YAML_MERGE_TAG = 'tag:yaml.org,2002:merge';");
    }
    expect(builtinPhpStub('8.5', { disabledExtensions: ['yaml'] })).not.toContain('function yaml_parse(');
  });
  it('provides both igbinary functions and retracts them with the extension', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpExtensionStub(version, 'igbinary');
      expect([...stub.matchAll(/\bfunction (igbinary_\w+)\(/g)].map((match) => match[1]))
        .toEqual(['igbinary_serialize', 'igbinary_unserialize']);
      expect(stub).toContain('function igbinary_unserialize($str)');
    }
    expect(builtinPhpStub('8.5', { disabledExtensions: ['igbinary'] })).not.toContain('function igbinary_serialize(');
  });
  it('provides Msgpack functions, classes and constants only while the extension is available', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpExtensionStub(version, 'msgpack');
      expect([...stub.matchAll(/\bfunction (msgpack_\w+)\(/g)].map((match) => match[1]))
        .toEqual(['msgpack_serialize', 'msgpack_unserialize', 'msgpack_pack', 'msgpack_unpack']);
      expect(stub).toContain('class MessagePackUnpacker');
      expect(stub).toContain('function execute($str = null, &$offset = null)');
      expect(stub).toContain('const MESSAGEPACK_OPT_ASSOC = -1002;');
    }
    const disabled = builtinPhpStub('8.5', { disabledExtensions: ['msgpack'] });
    expect(disabled).not.toContain('function msgpack_pack(');
    expect(disabled).not.toContain('class MessagePackUnpacker');
    expect(disabled).not.toContain('MESSAGEPACK_OPT_ASSOC');
  });
  it('selects Shmop resource and object declarations by PHP version and extension availability', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpExtensionStub(version, 'shmop');
      expect([...stub.matchAll(/\bfunction (shmop_\w+)\(/g)].map((match) => match[1]))
        .toEqual(['shmop_open', 'shmop_read', 'shmop_close', 'shmop_size', 'shmop_write', 'shmop_delete']);
      if (Number(version.replace('.', '')) >= 80) {
        expect(stub).toContain('final class Shmop {}');
        expect(stub).toContain('function shmop_open(int $key, string $mode, int $permissions, int $size): Shmop|false');
        expect(stub).toContain('function shmop_read(Shmop $shmop, int $offset, int $size): string');
        expect(stub).toContain('@deprecated PHP 8.0');
      } else {
        expect(stub).not.toContain('class Shmop');
        expect(stub).toContain('@return resource|false */ function shmop_open(');
        expect(stub).toContain('@return string|false */ function shmop_read(');
        expect(stub).not.toContain('@deprecated PHP 8.0');
      }
    }
    const disabled = builtinPhpStub('8.5', { disabledExtensions: ['shmop'] });
    expect(disabled).not.toContain('function shmop_open(');
    expect(disabled).not.toContain('final class Shmop {}');
  });
  it('models System V IPC handles separately for each extension and PHP version', () => {
    const names = new Map([
      ['sysvmsg', ['msg_get_queue', 'msg_send', 'msg_receive', 'msg_remove_queue', 'msg_stat_queue', 'msg_set_queue', 'msg_queue_exists']],
      ['sysvsem', ['sem_get', 'sem_acquire', 'sem_release', 'sem_remove']],
      ['sysvshm', ['shm_attach', 'shm_detach', 'shm_has_var', 'shm_remove', 'shm_put_var', 'shm_get_var', 'shm_remove_var']],
    ] as const);
    for (const version of SUPPORTED_PHP_VERSIONS) {
      for (const [extension, expected] of names) {
        const stub = builtinPhpExtensionStub(version, extension);
        expect([...stub.matchAll(/\bfunction (\w+)\(/g)].map((match) => match[1]).filter((name) => name !== '__construct')).toEqual(expected);
      }
    }
    const legacy = builtinPhpExtensionStub('7.2', 'sysvmsg');
    expect(legacy).toContain('@return resource|false */ function msg_get_queue(');
    expect(legacy).not.toContain('class SysvMessageQueue');
    expect(builtinPhpExtensionStub('8.1', 'sysvmsg')).toContain('function msg_get_queue(int $key, int $permissions = 0666): SysvMessageQueue|false');
    expect(builtinPhpExtensionStub('8.5', 'sysvshm')).toContain('function shm_detach(SysvSharedMemory $shm): true');
    expect(builtinPhpExtensionStub('8.1', 'sysvshm')).toContain('function shm_detach(SysvSharedMemory $shm): bool');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['sysvmsg'] })).not.toContain('function msg_get_queue(');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['sysvmsg'] })).toContain('function sem_get(');
  });
  it('separates POSIX PHP 8.3 functions and getrlimit parameters from older declarations', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpExtensionStub(version, 'posix');
      const modern = Number(version.replace('.', '')) >= 83;
      expect([...stub.matchAll(/\bfunction posix_\w+\(/g)]).toHaveLength(modern ? 41 : 37);
      expect(stub.includes('function posix_sysconf(')).toBe(modern);
      expect(stub.includes('function posix_eaccess(')).toBe(modern);
      expect(stub.includes('function posix_pathconf(')).toBe(modern);
      expect(stub.includes('function posix_fpathconf(')).toBe(modern);
      expect(stub).toContain(modern ? 'function posix_getrlimit(?int $resource = NULL)' : 'function posix_getrlimit()');
    }
    expect(builtinPhpExtensionStub('7.2', 'posix')).toContain('@param int $process_id');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['posix'] })).not.toContain('function posix_getpid(');
  });
  it('provides audited PECL Mcrypt declarations without removed APIs', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpExtensionStub(version, 'mcrypt');
      expect([...stub.matchAll(/\bfunction (?:mcrypt_\w+|mdecrypt_generic)\(/g)]).toHaveLength(32);
      expect([...stub.matchAll(/\bconst MCRYPT_\w+ =/g)]).toHaveLength(41);
      expect(stub).toContain('function mcrypt_create_iv($size, $source = MCRYPT_DEV_URANDOM)');
      expect(stub).toContain("const MCRYPT_RIJNDAEL_128 = 'rijndael-128';");
      expect(stub).toContain('@deprecated');
      for (const removed of ['mcrypt_cbc', 'mcrypt_cfb', 'mcrypt_ecb', 'mcrypt_ofb', 'mcrypt_generic_end']) expect(stub).not.toContain(`function ${removed}(`);
    }
    expect(builtinPhpStub('8.5', { disabledExtensions: ['mcrypt'] })).not.toContain('function mcrypt_encrypt(');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['mcrypt'] })).not.toContain('const MCRYPT_MODE_CBC');
  });
  it('preserves platform POSIX integers and their versioned declaration snapshots', () => {
    const posixConstants = { POSIX_RLIMIT_INFINITY: '9223372036854775807', POSIX_RLIMIT_AS: '9', POSIX_SC_CHILD_MAX: '1', POSIX_SC_OPEN_MAX: '4' };
    const uri = builtinDocumentUri('8.5', { posixConstants });
    expect(parseBuiltinDocumentUri(uri)?.posixConstants).toEqual(posixConstants);
    expect(builtinPhpStub('8.5', { posixConstants })).toContain('const POSIX_RLIMIT_INFINITY = 9223372036854775807;');
    expect(builtinPhpStub('8.5', { posixConstants })).toContain('const POSIX_RLIMIT_AS = 9;');
    expect(builtinPhpExtensionStub('8.3', 'posix', { posixConstants })).not.toContain('const POSIX_SC_CHILD_MAX');
    expect(builtinPhpExtensionStub('8.3', 'posix', { posixConstants })).toContain('const POSIX_SC_OPEN_MAX');
    expect(builtinPhpExtensionStub('8.2', 'posix', { posixConstants })).not.toContain('const POSIX_SC_OPEN_MAX');
    expect(builtinPhpStub('8.5', { posixConstants, disabledExtensions: ['posix'] })).not.toContain('const POSIX_RLIMIT_INFINITY');
    expect(builtinPhpStub('8.5')).not.toContain('const POSIX_RLIMIT_INFINITY');
    const negative = builtinPhpExtensionStub('8.5', 'posix', { posixConstants: { POSIX_RLIMIT_INFINITY: '-1' } });
    expect(negative).toContain('const POSIX_RLIMIT_INFINITY = -1;');
    for (const value of ['9223372036854775808', '-9223372036854775809', '1; exit;', '01']) {
      expect(parseBuiltinDocumentUri(`php-companion-builtin:/common-core.php?php=8.5&posix=${encodeURIComponent(JSON.stringify({ POSIX_RLIMIT_INFINITY: value }))}`)).toBeUndefined();
    }
  });
  it('keeps SysV errno values in versioned runtime snapshots', () => {
    const sysvMsgConstants = { MSG_EAGAIN: 35, MSG_ENOMSG: 91 };
    const uri = builtinDocumentUri('8.5', { sysvMsgConstants });
    expect(parseBuiltinDocumentUri(uri)?.sysvMsgConstants).toEqual(sysvMsgConstants);
    expect(builtinPhpStub('8.5', { sysvMsgConstants })).toContain('const MSG_EAGAIN = 35;');
    expect(builtinPhpStub('8.5', { sysvMsgConstants })).toContain('const MSG_ENOMSG = 91;');
    expect(builtinPhpStub('8.5')).not.toContain('const MSG_ENOMSG =');
    expect(builtinPhpStub('8.5', { sysvMsgConstants, disabledExtensions: ['sysvmsg'] })).not.toContain('const MSG_ENOMSG =');
    expect(parseBuiltinDocumentUri('php-companion-builtin:/common-core.php?php=8.5&sysvmsg=%7B%22MSG_ENOMSG%22%3A%22invalid%22%7D')).toBeUndefined();
  });
  it('selects Redis members by phpredis build and keeps RedisArray proxy methods', () => {
    const older = builtinPhpExtensionStub('7.2', 'redis', { redisRuntime: { version: '4.3.0' } });
    const middle = builtinPhpExtensionStub('8.1', 'redis', { redisRuntime: { version: '5.3.7' } });
    const recent = builtinPhpExtensionStub('8.5', 'redis', { redisRuntime: { version: '6.3.0' } });
    const unknown = builtinPhpExtensionStub('8.5', 'redis', { redisRuntime: { version: '7.0.0' } });
    expect(older).toContain('class Redis {');
    expect(older).toContain('function getMultiple(');
    expect(older).not.toContain('function acl(');
    expect(older).not.toContain('class RedisSentinel');
    expect(older).toContain('class RedisException extends Exception {}');
    expect(middle).toContain('class RedisSentinel');
    expect(middle).toContain('function getMultiple(');
    expect(recent).toContain('function acl(');
    expect(recent).toContain('class RedisException extends RuntimeException {}');
    expect(recent).not.toContain('function getMultiple(');
    expect(recent).not.toContain('function gcra(');
    expect(recent).toMatch(/class RedisArray \{[\s\S]*function get\(/);
    expect(unknown).toContain('function get(');
    expect(unknown).not.toContain('function acl(');
    expect(parseBuiltinDocumentUri(builtinDocumentUri('8.5', { redisRuntime: { version: '6.3.0' } }))?.redisRuntime)
      .toEqual({ version: '6.3.0' });
    expect(builtinPhpStub('8.5', { disabledExtensions: ['redis'] })).not.toContain('class Redis {');
  });
  it('selects Imagick methods and constant values by the linked ImageMagick build', () => {
    const oldFacts = { version: '3.8.1', imageMagickVersionNumber: 1693,
      fingerprint: 'c435598c111d0a46c1c37bd0d255acf51cc86c724be6ff133dc08c53e679b8da' };
    const newFacts = { version: '3.8.1', imageMagickVersionNumber: 1810,
      fingerprint: 'a504d4fd8d3a95d075258ec356860d888e647122698c41640a5d79aa3efe3450' };
    const oldStub = builtinPhpExtensionStub('8.1', 'imagick', { imagickRuntime: oldFacts });
    const newStub = builtinPhpExtensionStub('8.5', 'imagick', { imagickRuntime: newFacts });
    const unknown = builtinPhpExtensionStub('8.5', 'imagick', { imagickRuntime: { ...newFacts, fingerprint: '0'.repeat(64) } });
    expect([...oldStub.matchAll(/\bpublic (?:static )?function \w+\(/g)]).toHaveLength(556);
    expect([...newStub.matchAll(/\bpublic (?:static )?function \w+\(/g)]).toHaveLength(581);
    expect(oldStub).not.toContain('function autoThresholdImage(');
    expect(newStub).toContain('function autoThresholdImage(');
    expect(oldStub).not.toContain('const AUTO_THRESHOLD_OTSU =');
    expect(newStub).toContain('const AUTO_THRESHOLD_OTSU =');
    expect(unknown).toContain('function resizeImage(');
    expect(unknown).not.toContain('function autoThresholdImage(');
    expect(parseBuiltinDocumentUri(builtinDocumentUri('8.5', { imagickRuntime: newFacts }))?.imagickRuntime).toEqual(newFacts);
    expect(builtinPhpStub('8.5', { disabledExtensions: ['imagick'] })).not.toContain('class Imagick implements Iterator, Countable');
  });
  it('uses audited gettext names, PHP 8.4 optionality, and removable extension declarations', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'gettext');
    const php80 = builtinPhpExtensionStub('8.0', 'gettext');
    const php81 = builtinPhpExtensionStub('8.1', 'gettext');
    const php83 = builtinPhpExtensionStub('8.3', 'gettext');
    const php84 = builtinPhpExtensionStub('8.4', 'gettext');
    const php85 = builtinPhpExtensionStub('8.5', 'gettext');
    const names = ['textdomain', 'gettext', '_', 'dgettext', 'dcgettext', 'bindtextdomain',
      'ngettext', 'dngettext', 'dcngettext', 'bind_textdomain_codeset'];
    for (const stub of [php72, php80, php81, php83, php84, php85]) {
      expect([...stub.matchAll(/\bfunction ([\w]+)\(/g)].map((match) => match[1])).toEqual(names);
    }
    expect(php72).toContain('function bindtextdomain($domain_name, $dir)');
    expect(php80).toContain('function bindtextdomain(string $domain, string $directory): string|false');
    expect(php81).toContain('function bindtextdomain(string $domain, ?string $directory): string|false');
    expect(php83).toContain('function textdomain(?string $domain): string');
    expect(php84).toContain('function textdomain(?string $domain = null): string');
    expect(php84).toContain('function bind_textdomain_codeset(string $domain, ?string $codeset = null): string|false');
    expect(php85).toContain('function bindtextdomain(string $domain, ?string $directory = null): string|false');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['gettext'] })).not.toContain('function gettext(');
  });
  it('uses audited Bzip2 names and PHP 7/PHP 8 signature boundaries', () => {
    const names = ['bzopen', 'bzread', 'bzwrite', 'bzflush', 'bzclose', 'bzerrno', 'bzerrstr',
      'bzerror', 'bzcompress', 'bzdecompress'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpExtensionStub(version, 'bz2');
      expect([...stub.matchAll(/\bfunction ([\w]+)\(/g)].map((match) => match[1])).toEqual(names);
      expect(builtinPhpStub(version, { disabledExtensions: ['bz2'] })).not.toContain('function bzopen(');
    }
    expect(builtinPhpExtensionStub('7.2', 'bz2')).toContain('function bzwrite($fp, $str, $length = null)');
    expect(builtinPhpExtensionStub('7.4', 'bz2')).toContain('function bzcompress($source, $blocksize = 4, $workfactor = 0)');
    expect(builtinPhpExtensionStub('8.0', 'bz2')).toContain('function bzerrno($bz): int|false');
    expect(builtinPhpExtensionStub('8.1', 'bz2')).toContain('function bzerrno($bz): int');
    expect(builtinPhpExtensionStub('8.5', 'bz2')).toContain('function bzcompress(string $data, int $block_size = 4, int $work_factor = 0): string|int');
  });
  it('uses Calendar declarations and only exposes them when the extension is enabled', () => {
    const names = ['jdtogregorian', 'gregoriantojd', 'jdtojulian', 'juliantojd', 'jdtojewish', 'jewishtojd',
      'jdtofrench', 'frenchtojd', 'jddayofweek', 'jdmonthname', 'easter_date', 'easter_days',
      'unixtojd', 'jdtounix', 'cal_to_jd', 'cal_from_jd', 'cal_days_in_month', 'cal_info'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpExtensionStub(version, 'calendar');
      expect([...stub.matchAll(/\bfunction ([\w]+)\(/g)].map((match) => match[1])).toEqual(names);
      expect([...stub.matchAll(/\bconst (CAL_[A-Z_]+) =/g)]).toHaveLength(21);
      expect(builtinPhpStub(version, { disabledExtensions: ['calendar'] })).not.toContain('function jdtogregorian(');
      expect(builtinPhpStub(version, { disabledExtensions: ['calendar'] })).not.toContain('const CAL_GREGORIAN =');
    }
    expect(builtinPhpExtensionStub('7.2', 'calendar')).toContain('function easter_date($year = null)');
    expect(builtinPhpExtensionStub('7.4', 'calendar')).toContain('function jdtojewish($juliandaycount, $hebrew = false, $fl = 0)');
    expect(builtinPhpExtensionStub('8.0', 'calendar')).toContain('function easter_date(?int $year = null, int $mode = CAL_EASTER_DEFAULT): int');
    expect(builtinPhpExtensionStub('8.5', 'calendar')).toContain('function cal_from_jd(int $julian_day, int $calendar): array');
    expect(builtinDocumentUri('8.5', { disabledExtensions: ['calendar'] })).toContain('calendar');
  });
  it('uses Readline signatures, library-specific function availability and actual library constant', () => {
    const names = ['readline', 'readline_info', 'readline_add_history', 'readline_clear_history',
      'readline_list_history', 'readline_read_history', 'readline_write_history',
      'readline_completion_function', 'readline_callback_handler_install',
      'readline_callback_read_char', 'readline_callback_handler_remove',
      'readline_redisplay', 'readline_on_new_line'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpExtensionStub(version, 'readline');
      expect([...stub.matchAll(/\bfunction ([\w]+)\(/g)].map((match) => match[1])).toEqual(names);
      expect(stub).not.toContain('const READLINE_LIB =');
      expect(builtinPhpStub(version, { disabledExtensions: ['readline'] })).not.toContain('function readline(');
    }
    expect(builtinPhpExtensionStub('7.2', 'readline')).toContain('function readline_info($varname = null, $newvalue = null)');
    expect(builtinPhpExtensionStub('8.5', 'readline')).toContain('function readline_add_history(string $prompt): true');
    expect(builtinPhpExtensionStub('8.5', 'readline')).toContain('function readline_callback_handler_install(string $prompt, callable $callback): true');
    const libedit = builtinPhpExtensionStub('7.2', 'readline', { readlineLib: 'libedit', unavailableFunctions: ['readline_list_history'] });
    expect(libedit).toContain('const READLINE_LIB = "libedit";');
    expect(libedit).not.toContain('function readline_list_history(');
    expect(normalizeReadlineLib('libedit')).toBe('libedit');
    expect(normalizeReadlineLib('readline')).toBe('readline');
    expect(normalizeReadlineLib('bad";')).toBeUndefined();
    const uri = builtinDocumentUri('7.2', { readlineLib: 'libedit', unavailableFunctions: ['readline_list_history'] });
    expect(parseBuiltinDocumentUri(uri)).toEqual({ version: '7.2', disabledExtensions: [], readlineLib: 'libedit',
      unavailableFunctions: ['readline_list_history'] });
    expect(parseBuiltinDocumentUri('php-companion-builtin:/common-core.php?php=8.5&readlineLib=bad%22')).toBeUndefined();
  });
  it('uses FTP signatures, the PHP 7.3 transfer default and PHP 8.1 connection objects', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpExtensionStub(version, 'ftp');
      expect([...stub.matchAll(/\bfunction (ftp_\w+)\(/g)]).toHaveLength(36);
      expect([...stub.matchAll(/\bconst (FTP_[A-Z_]+) =/g)]).toHaveLength(11);
      expect(builtinPhpStub(version, { disabledExtensions: ['ftp'] })).not.toContain('function ftp_connect(');
      expect(builtinPhpStub(version, { disabledExtensions: ['ftp'] })).not.toContain('const FTP_BINARY =');
    }
    expect(builtinPhpExtensionStub('7.2', 'ftp')).toContain('function ftp_get($ftp, $local_file, $remote_file, $mode, $resume_pos = 0)');
    expect(builtinPhpExtensionStub('7.3', 'ftp')).toContain('function ftp_get($ftp, $local_file, $remote_file, $mode = FTP_BINARY, $resume_pos = 0)');
    expect(builtinPhpExtensionStub('8.0', 'ftp')).not.toContain('class Connection');
    expect(builtinPhpExtensionStub('8.1', 'ftp')).toContain('function ftp_connect(string $hostname, int $port = 21, int $timeout = 90): \\FTP\\Connection|false');
    expect(builtinPhpExtensionStub('8.1', 'ftp')).toContain('namespace FTP { final class Connection {} }');
    expect(builtinPhpExtensionStub('8.5', 'ftp')).toContain('function ftp_set_option(\\FTP\\Connection $ftp, int $option, $value): true');
  });
  it('removes the complete Session declaration group when the project lacks the extension', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpExtensionStub(version, 'session');
      const without = builtinPhpStub(version, { disabledExtensions: ['session'] });
      expect([...stub.matchAll(/\bfunction (session_\w+)\(/g)].map((match) => match[1])).toHaveLength(version === '7.2' ? 24 : 25);
      for (const marker of ['function session_start(', 'function session_set_save_handler(',
        'interface SessionHandlerInterface', 'interface SessionIdInterface',
        'interface SessionUpdateTimestampHandlerInterface', 'class SessionHandler implements',
        'const PHP_SESSION_DISABLED = 0', 'const PHP_SESSION_ACTIVE = 2']) {
        expect(stub).toContain(marker);
        expect(without).not.toContain(marker);
      }
    }
  });
  it('uses versioned XSLTProcessor methods, properties, and runtime libxslt values', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'xsl');
    const php81 = builtinPhpExtensionStub('8.1', 'xsl');
    const php84 = builtinPhpExtensionStub('8.4', 'xsl');
    expect([...php72.matchAll(/public function (\w+)\(/g)]).toHaveLength(12);
    expect([...php84.matchAll(/public function (\w+)\(/g)]).toHaveLength(13);
    expect(php72).not.toContain('registerPHPFunctionNS');
    expect(php72).not.toContain('public bool $cloneDocument;');
    expect(php72).toContain('public function transformToDoc($doc)');
    expect(php81).toContain('public function transformToDoc(object $document, ?string $returnClass = null)');
    expect(php84).toContain('public function registerPHPFunctionNS(string $namespaceURI, string $name, callable $callable): void');
    expect(php84).toContain('public bool $cloneDocument;');
    expect(php84).toContain('public int $maxTemplateDepth;');
    expect(php84).not.toContain('const LIBXSLT_DOTTED_VERSION =');
    const runtime = { constants: { LIBXSLT_DOTTED_VERSION: '1.1.32', LIBXSLT_VERSION: 10132 } };
    expect(builtinPhpExtensionStub('8.5', 'xsl', { xslRuntime: runtime })).toContain("const LIBXSLT_DOTTED_VERSION = '1.1.32';");
    expect(parseBuiltinDocumentUri(builtinDocumentUri('8.5', { xslRuntime: runtime }))?.xslRuntime).toEqual(runtime);
    expect(builtinPhpStub('8.5', { disabledExtensions: ['xsl'] })).not.toContain('class XSLTProcessor');
  });
  it('uses versioned PostgreSQL signatures and omits unsupported future symbols', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'pgsql');
    const php74 = builtinPhpExtensionStub('7.4', 'pgsql');
    const php81 = builtinPhpExtensionStub('8.1', 'pgsql');
    const php83 = builtinPhpExtensionStub('8.3', 'pgsql');
    const php85 = builtinPhpExtensionStub('8.5', 'pgsql');
    expect([...php72.matchAll(/\bfunction (pg_\w+)\(/g)]).toHaveLength(114);
    expect([...php74.matchAll(/\bfunction (pg_\w+)\(/g)]).toHaveLength(114);
    expect([...php81.matchAll(/\bfunction (pg_\w+)\(/g)]).toHaveLength(114);
    expect([...php85.matchAll(/\bfunction (pg_\w+)\(/g)]).toHaveLength(121);
    expect(php72).toContain('/** @return resource|false */ function pg_connect($connection_string, $flags = 0)');
    expect(php72).not.toContain('class Connection');
    expect(php81).toContain('function pg_connect(string $connection_string, int $flags = 0): PgSql\\Connection|false');
    expect(php81).toContain('namespace PgSql { final class Connection {} final class Result {} final class Lob {} }');
    expect(php81).not.toContain('function pg_jit(');
    expect(php83).toContain('function pg_set_error_context_visibility(');
    expect(php83).toContain('const PGSQL_SHOW_CONTEXT_NEVER = 0;');
    expect(php83).not.toContain('function pg_socket_poll(');
    expect(php85).toContain('function pg_socket_poll(');
    expect(php85).not.toContain('function pg_close_stmt(');
    expect(php85).not.toContain('const PGSQL_LIBPQ_VERSION =');
    expect(php85).not.toContain('const PGSQL_ERRORS_SQLSTATE =');
    expect(php85).not.toContain('const PGSQL_TRACE_SUPPRESS_TIMESTAMPS =');
    const runtime = { functions: ['pg_connect'], constants: { PGSQL_LIBPQ_VERSION: '13.23', PGSQL_ERRORS_SQLSTATE: 3 } };
    expect(normalizePgsqlRuntimeFacts({ functions: [...runtime.functions, 'pg_future'],
      constants: { ...runtime.constants, PGSQL_FUTURE_FLAG: 12 } })).toEqual(runtime);
    expect(builtinPhpExtensionStub('8.1', 'pgsql', { pgsqlRuntime: runtime })).toContain("const PGSQL_LIBPQ_VERSION = '13.23';");
    expect(builtinPhpExtensionStub('8.1', 'pgsql', { pgsqlRuntime: runtime })).toContain('const PGSQL_ERRORS_SQLSTATE = 3;');
    expect(builtinPhpExtensionStub('8.1', 'pgsql', { pgsqlRuntime: runtime })).not.toContain('function pg_query(');
    expect(parseBuiltinDocumentUri(builtinDocumentUri('8.1', { pgsqlRuntime: runtime }))?.pgsqlRuntime).toEqual(runtime);
    expect(builtinPhpStub('8.5', { disabledExtensions: ['pgsql'] })).not.toContain('function pg_connect(');
  });
  it('provides conditional PgSQL signatures only for a matching version and exported runtime function', () => {
    const names = ['pg_close_stmt', 'pg_set_chunked_rows_size', 'pg_enter_pipeline_mode', 'pg_exit_pipeline_mode',
      'pg_pipeline_status', 'pg_pipeline_sync'];
    const runtime = { functions: names, constants: {} };
    for (const version of ['7.2', '8.1', '8.3'] as const) {
      const source = builtinPhpExtensionStub(version, 'pgsql', { pgsqlRuntime: runtime });
      for (const name of names) expect(source, `${version}: ${name}`).not.toContain(`function ${name}(`);
    }
    const php84 = builtinPhpExtensionStub('8.4', 'pgsql', { pgsqlRuntime: runtime });
    expect(php84).toContain('function pg_set_chunked_rows_size(PgSql\\Connection $connection, int $size): bool {}');
    expect(php84).not.toContain('function pg_close_stmt(');
    const php85 = builtinPhpExtensionStub('8.5', 'pgsql', { pgsqlRuntime: runtime });
    expect(php85).toContain('function pg_close_stmt(Pgsql\\Connection $connection, string $statement_name): PgSql\\Result|false {}');
    expect(php85).toContain('function pg_set_chunked_rows_size(');
    for (const name of names.slice(2)) expect(php85).not.toContain(`function ${name}(`);
    for (const name of names.slice(0, 2)) {
      expect(builtinPhpExtensionStub('8.5', 'pgsql')).not.toContain(`function ${name}(`);
      expect(builtinPhpExtensionStub('8.5', 'pgsql', { pgsqlRuntime: { functions: [], constants: {} } }))
        .not.toContain(`function ${name}(`);
      expect(builtinPhpStub('8.5', { disabledExtensions: ['pgsql'], pgsqlRuntime: runtime })).not.toContain(`function ${name}(`);
    }
    expect(parseBuiltinDocumentUri(builtinDocumentUri('8.5', { pgsqlRuntime: runtime }))?.pgsqlRuntime).toEqual(normalizePgsqlRuntimeFacts(runtime));
  });
  it('uses PCNTL versioned signatures and runtime signal values without fixed upstream guesses', () => {
    expect([...builtinPhpExtensionStub('7.2', 'pcntl').matchAll(/\bfunction (pcntl_\w+)\(/g)]).toHaveLength(24);
    expect([...builtinPhpExtensionStub('7.4', 'pcntl').matchAll(/\bfunction (pcntl_\w+)\(/g)]).toHaveLength(25);
    expect([...builtinPhpExtensionStub('8.5', 'pcntl').matchAll(/\bfunction (pcntl_\w+)\(/g)]).toHaveLength(29);
    expect(builtinPhpExtensionStub('7.3', 'pcntl')).not.toContain('function pcntl_unshare(');
    expect(builtinPhpExtensionStub('8.3', 'pcntl')).not.toContain('function pcntl_waitid(');
    expect(builtinPhpExtensionStub('8.4', 'pcntl')).toContain('namespace Pcntl { enum QosClass');
    expect(builtinPhpExtensionStub('8.4', 'pcntl')).not.toContain('const SIGRTMIN =');
    expect(builtinPhpExtensionStub('8.4', 'pcntl')).toContain('function pcntl_waitid(int $idtype = P_ALL, ?int $id = null, &$info = [], int $flags = WEXITED): bool');
    expect(builtinPhpExtensionStub('8.5', 'pcntl')).toContain('function pcntl_exec(string $path, array $args = [], array $env_vars = []): false');
    const runtime = normalizePcntlRuntimeFacts({ functions: ['pcntl_fork', 'pcntl_waitid'],
      constants: { SIGTERM: 15, SIGRTMIN: 34, WEXITED: 4 }, qosClass: true });
    expect(runtime?.functions).toEqual(['pcntl_fork', 'pcntl_waitid']);
    expect(normalizePcntlRuntimeFacts({ functions: ['pcntl_getqos_class', 'pcntl_fork'], constants: {}, qosClass: true })?.functions)
      .toEqual(['pcntl_fork', 'pcntl_getqos_class']);
    expect(builtinPhpExtensionStub('8.5', 'pcntl', { pcntlRuntime: normalizePcntlRuntimeFacts({
      functions: ['pcntl_getqos_class', 'pcntl_setqos_class', 'pcntl_setns'], constants: { CLONE_NEWNET: 1073741824 }, qosClass: true,
    }) })).toContain('function pcntl_setqos_class(\\Pcntl\\QosClass $qos_class = \\Pcntl\\QosClass::Default): void');
    expect(normalizePcntlRuntimeFacts({ functions: [], constants: { SIGRTMIN: '34' }, qosClass: true })).toBeUndefined();
    expect(normalizePcntlRuntimeFacts({ functions: [], constants: {}, qosClass: 'true' })).toBeUndefined();
    const stub = builtinPhpExtensionStub('8.5', 'pcntl', { pcntlRuntime: runtime });
    expect(stub).toContain('const SIGRTMIN = 34;');
    expect(stub).toContain('function pcntl_waitid(');
    expect(stub).not.toContain('function pcntl_signal(');
    const uri = builtinDocumentUri('8.5', { pcntlRuntime: runtime });
    expect(parseBuiltinDocumentUri(uri)?.pcntlRuntime).toEqual(runtime);
    expect(builtinPhpStub('8.5', { disabledExtensions: ['pcntl'], pcntlRuntime: runtime })).not.toContain('const SIGRTMIN = 34;');
  });
  it('uses audited Tokenizer functions and gates PhpToken to PHP 8', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'tokenizer');
    const php74 = builtinPhpExtensionStub('7.4', 'tokenizer');
    const php80 = builtinPhpExtensionStub('8.0', 'tokenizer');
    const php85 = builtinPhpExtensionStub('8.5', 'tokenizer');
    for (const stub of [php72, php74, php80, php85]) {
      expect(stub).toContain('const TOKEN_PARSE = 1;');
      expect([...stub.matchAll(/\bfunction (token_get_all|token_name)\(/g)].map((match) => match[1]))
        .toEqual(['token_get_all', 'token_name']);
      expect(stub).not.toContain('const T_STRING =');
    }
    expect(php72).toContain('function token_get_all($source, $flags = 0)');
    expect(php74).not.toContain('class PhpToken');
    expect(php80).toContain('class PhpToken implements Stringable');
    expect(php85).toContain('function token_get_all(string $code, int $flags = 0): array');
    expect(php85).toContain('public static function tokenize(string $code, int $flags = 0): array');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['tokenizer'] })).not.toContain('class PhpToken');
    const tokenizerRuntime = normalizeTokenizerRuntimeFacts({ constants: { T_STRING: 262, T_MATCH: 306 } });
    expect(tokenizerRuntime?.constants).toEqual({ T_MATCH: 306, T_STRING: 262 });
    expect(normalizeTokenizerRuntimeFacts({ constants: { T_FAKE: 999 } })).toBeUndefined();
    expect(normalizeTokenizerRuntimeFacts({ constants: { T_STRING: 262 }, injected: true })).toBeUndefined();
    expect(normalizeTokenizerRuntimeFacts({ constants: { T_STRING: -1 } })).toBeUndefined();
    const uri = builtinDocumentUri('8.5', { tokenizerRuntime });
    expect(parseBuiltinDocumentUri(uri)?.tokenizerRuntime).toEqual(tokenizerRuntime);
    expect(builtinPhpStub('8.5', { tokenizerRuntime })).toContain('const T_STRING = 262;');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['tokenizer'], tokenizerRuntime })).not.toContain('const T_STRING = 262;');
  });
  it('uses APCu-only declarations and actual runtime availability and constant values', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'apcu');
    expect(php72).toContain('class APCUIterator implements Iterator');
    expect(php72).not.toContain('function apcu_entry(');
    expect(php72).not.toContain('function apc_store(');
    const apcuRuntime = normalizeApcuRuntimeFacts({ functions: ['apcu_store', 'apcu_fetch', 'apcu_entry'],
      constants: { APC_ITER_ALL: 4294967295, APC_ITER_VALUE: 4, APC_LIST_ACTIVE: 1 }, iteratorAvailable: true });
    expect(apcuRuntime?.functions).toEqual(['apcu_entry', 'apcu_fetch', 'apcu_store']);
    expect(normalizeApcuRuntimeFacts({ functions: ['apc_store'], constants: {}, iteratorAvailable: true })).toBeUndefined();
    expect(normalizeApcuRuntimeFacts({ functions: ['apcu_store'], constants: { APC_ITER_ALL: '4294967295' }, iteratorAvailable: true })).toBeUndefined();
    const stub = builtinPhpExtensionStub('8.5', 'apcu', { apcuRuntime });
    expect(stub).toContain('const APC_ITER_ALL = 4294967295;');
    expect(stub).toContain('const APC_ITER_VALUE = 4;');
    expect(stub).toContain('function apcu_entry(string $key, callable $callback, int $ttl = 0): mixed');
    expect(stub).not.toContain('function apcu_cas(');
    expect(stub).toContain('class APCUIterator implements Iterator');
    const uri = builtinDocumentUri('8.5', { apcuRuntime });
    expect(parseBuiltinDocumentUri(uri)?.apcuRuntime).toEqual(apcuRuntime);
    expect(builtinPhpStub('8.5', { disabledExtensions: ['apcu'], apcuRuntime })).not.toContain('function apcu_store(');
    const withoutIterator = normalizeApcuRuntimeFacts({ functions: ['apcu_store'], constants: {}, iteratorAvailable: false });
    expect(builtinPhpExtensionStub('8.5', 'apcu', { apcuRuntime: withoutIterator })).not.toContain('class APCUIterator');
  });
  it('uses verified Sodium names and conservative version boundaries', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'sodium');
    const php80 = builtinPhpExtensionStub('8.0', 'sodium');
    const php81 = builtinPhpExtensionStub('8.1', 'sodium');
    const php82 = builtinPhpExtensionStub('8.2', 'sodium');
    const php85 = builtinPhpExtensionStub('8.5', 'sodium');
    for (const stub of [php72, php80, php81, php82, php85]) {
      expect(stub).toContain('class SodiumException extends Exception');
      expect(stub).toContain('function sodium_crypto_secretbox(');
      expect(stub).toContain('const SODIUM_CRYPTO_SECRETBOX_KEYBYTES = 32;');
      expect(stub).not.toContain('SODIUM_LIBRARY_VERSION');
      expect(stub).not.toContain('PASSWORD_ARGON2_PROVIDER');
      expect(stub).not.toContain('function sodium_crypto_ipcrypt_encrypt(');
      expect(stub).not.toContain('function sodium_randombytes_buf(');
    }
    expect(php72).not.toContain('function sodium_crypto_core_ristretto255_add(');
    expect(php80).not.toContain('function sodium_crypto_stream_xchacha20(');
    expect(php81).toContain('function sodium_crypto_core_ristretto255_add(');
    expect(php81).not.toContain('function sodium_crypto_stream_xchacha20_xor_ic(');
    expect(php82).toContain('function sodium_crypto_stream_xchacha20_xor_ic(');
    expect(php85).not.toContain('SODIUM_CRYPTO_IPCRYPT_BYTES');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['sodium'] })).not.toContain('function sodium_crypto_secretbox(');
  });
  it('filters Sodium by the detected runtime and preserves its library version', () => {
    const sodiumRuntime = normalizeSodiumRuntimeFacts({ functions: ['sodium_crypto_secretbox', 'sodium_crypto_secretbox'],
      constants: { SODIUM_CRYPTO_SECRETBOX_KEYBYTES: 32, SODIUM_LIBRARY_VERSION: '1.0.22',
        SODIUM_LIBRARY_MAJOR_VERSION: 26, SODIUM_LIBRARY_MINOR_VERSION: 2, PASSWORD_ARGON2_PROVIDER: 'sodium' } });
    expect(sodiumRuntime).toBeDefined();
    expect(sodiumRuntime?.functions).toEqual(['sodium_crypto_secretbox']);
    expect(sodiumRuntime?.constants).not.toHaveProperty('PASSWORD_ARGON2_PROVIDER');
    const uri = builtinDocumentUri('8.5', { sodiumRuntime });
    expect(parseBuiltinDocumentUri(uri)?.sodiumRuntime).toEqual(sodiumRuntime);
    const stub = builtinPhpExtensionStub('8.5', 'sodium', { sodiumRuntime });
    expect(stub).toContain('function sodium_crypto_secretbox(');
    expect(stub).not.toContain('function sodium_crypto_secretbox_open(');
    expect(stub).toContain("const SODIUM_LIBRARY_VERSION = '1.0.22';");
    expect(stub).not.toContain('SODIUM_CRYPTO_AUTH_KEYBYTES');
    const complete = builtinPhpStub('8.5', { sodiumRuntime });
    expect(complete).not.toContain('function sodium_crypto_secretbox_open(');
    expect(complete).toContain("const SODIUM_LIBRARY_VERSION = '1.0.22';");
    expect(normalizeSodiumRuntimeFacts({ functions: ['sodium_crypto_secretbox'],
      constants: { SODIUM_LIBRARY_VERSION: [] } })).toBeUndefined();
    expect(parseBuiltinDocumentUri(`${uri}&sodium=bad`)).toBeUndefined();
  });
  it('uses runtime PCRE values without inventing constants absent from older PHP', () => {
    const pcreRuntime = normalizePcreRuntimeConstants({ PCRE_VERSION: '10.32 2018-09-10',
      PCRE_VERSION_MAJOR: 10, PCRE_VERSION_MINOR: 32, PCRE_JIT_SUPPORT: true });
    expect(pcreRuntime).toBeDefined();
    const uri = builtinDocumentUri('8.5', { pcreRuntime });
    expect(parseBuiltinDocumentUri(uri)?.pcreRuntime).toEqual(pcreRuntime);
    const stub = builtinPhpStub('8.5', { pcreRuntime });
    expect(stub).toContain("const PCRE_VERSION = '10.32 2018-09-10';");
    expect(stub).toContain('const PCRE_VERSION_MAJOR = 10;');
    expect(stub).toContain('const PCRE_VERSION_MINOR = 32;');
    expect(stub).toContain('const PCRE_JIT_SUPPORT = true;');
    expect(builtinPhpStub('8.5')).not.toContain('const PCRE_VERSION =');
    const php72 = builtinPhpStub('7.2', { pcreRuntime: { PCRE_VERSION: '8.42 2018-03-20' } });
    expect(php72).toContain("const PCRE_VERSION = '8.42 2018-03-20';");
    expect(php72).not.toContain('const PCRE_VERSION_MAJOR =');
    expect(php72).not.toContain('const PCRE_JIT_SUPPORT =');
    expect(normalizePcreRuntimeConstants({ PCRE_JIT_SUPPORT: 1 })).toBeUndefined();
    expect(parseBuiltinDocumentUri(`${uri}&pcre=bad`)).toBeUndefined();
  });
  it('keeps Phar inheritance and versioned signature constants', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'phar');
    const php80 = builtinPhpExtensionStub('8.0', 'phar');
    const php81 = builtinPhpExtensionStub('8.1', 'phar');
    const php85 = builtinPhpExtensionStub('8.5', 'phar');
    for (const stub of [php72, php80, php81, php85]) {
      expect(stub).toContain('class Phar extends RecursiveDirectoryIterator implements Countable, ArrayAccess, SeekableIterator');
      expect(stub).toContain('class PharData extends RecursiveDirectoryIterator implements Countable, ArrayAccess, SeekableIterator');
      expect(stub).toContain('class PharFileInfo extends SplFileInfo');
      expect(stub).toContain('class PharException extends Exception');
      expect(stub).toContain('function buildFromDirectory(');
      expect(stub).toContain('function getPath(');
      expect(stub).toContain('public const GZ = 4096;');
    }
    expect(php72).not.toContain('OPENSSL_SHA256');
    expect(php80).not.toContain('OPENSSL_SHA256');
    expect(php81).toContain('public const OPENSSL_SHA256 = 17;');
    expect(php85).toContain('public const OPENSSL_SHA512 = 18;');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['phar'] })).not.toContain('class PharData');
  });
  it('uses versioned SQLite3 declarations and hides the extension when unavailable', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'sqlite3');
    const php74 = builtinPhpExtensionStub('7.4', 'sqlite3');
    const php80 = builtinPhpExtensionStub('8.0', 'sqlite3');
    const php82 = builtinPhpExtensionStub('8.2', 'sqlite3');
    const php83 = builtinPhpExtensionStub('8.3', 'sqlite3');
    const php85 = builtinPhpExtensionStub('8.5', 'sqlite3');
    for (const stub of [php72, php74, php82, php83, php85]) {
      expect(stub).toContain('class SQLite3 {');
      expect(stub).toContain('class SQLite3Stmt {');
      expect(stub).toContain('class SQLite3Result {');
      expect(stub).toContain('const SQLITE3_OPEN_CREATE = 4;');
      expect(stub).toContain('function prepare(');
    }
    expect(php72).not.toContain('function backup(');
    expect(php74).toContain('function backup(');
    expect(php80).toContain('function setAuthorizer(');
    expect(php80).toContain('public const CREATE_TABLE = 2;');
    expect(php82).toContain('function setAuthorizer(');
    expect(php82).not.toContain('class SQLite3Exception');
    expect(php83).toContain('class SQLite3Exception extends Exception');
    expect(php82).not.toContain('function busy(');
    expect(php85).toContain('function busy(');
    expect(php85).toContain('function fetchAll(');
    expect(php85).not.toContain('function explain(');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['sqlite3'] })).not.toContain('class SQLite3 {');
  });
  it('exposes the Ctype catalog with PHP 7 and PHP 8 compatible call signatures', () => {
    const names = ['alnum', 'alpha', 'cntrl', 'digit', 'graph', 'lower', 'print', 'punct', 'space', 'upper', 'xdigit'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const ctype = builtinPhpExtensionStub(version, 'ctype');
      for (const name of names) expect(ctype).toContain(`function ctype_${name}(`);
      expect(ctype.match(/function ctype_\w+\(/g)).toHaveLength(names.length);
    }
    expect(builtinPhpExtensionStub('7.2', 'ctype')).toContain('function ctype_digit($text): bool');
    expect(builtinPhpExtensionStub('8.5', 'ctype')).toContain('function ctype_digit(mixed $text): bool');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['ctype'] })).not.toContain('function ctype_digit(');
  });
  it('versions Fileinfo handles, methods, and constants from the audited catalog', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'fileinfo');
    const php81 = builtinPhpExtensionStub('8.1', 'fileinfo');
    const php82 = builtinPhpExtensionStub('8.2', 'fileinfo');
    const php84 = builtinPhpExtensionStub('8.4', 'fileinfo');
    const php85 = builtinPhpExtensionStub('8.5', 'fileinfo');
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpExtensionStub(version, 'fileinfo');
      expect(stub.match(/\bfunction (?:finfo_[a-z_]+|mime_content_type)\(/g)).toHaveLength(6);
      expect(stub).toContain('const FILEINFO_EXTENSION = 16777216;');
      expect(stub).toContain('class finfo {');
    }
    expect(php72).toContain('@return resource|false */ function finfo_open(');
    expect(php72).toContain('public function finfo(');
    expect(php72).not.toContain('public function __construct(');
    expect(php81).toContain('function finfo_open(int $flags = FILEINFO_NONE, ?string $magic_database = null): finfo|false');
    expect(php81).toContain('function finfo_file(finfo $finfo, string $filename');
    expect(php81).toContain('public function __construct(');
    expect(php81).not.toContain('public function finfo(');
    expect(php81).not.toContain('FILEINFO_APPLE');
    expect(php82).toContain('const FILEINFO_APPLE = 2048;');
    expect(php84).toContain('function finfo_set_flags(finfo $finfo, int $flags): true');
    expect(php85).toContain('function finfo_close(finfo $finfo): true');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['fileinfo'] })).not.toContain('function finfo_open(');
  });
  it('versions Exif functions and removes the PHP 7 alias from PHP 8', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'exif');
    const php74 = builtinPhpExtensionStub('7.4', 'exif');
    const php80 = builtinPhpExtensionStub('8.0', 'exif');
    const php85 = builtinPhpExtensionStub('8.5', 'exif');
    expect(php72).toContain('const EXIF_USE_MBSTRING = 1;');
    expect(php72).toContain('function exif_read_data($filename, $sections_needed = null, $sub_arrays = false, $read_thumbnail = false)');
    expect(php72).toContain('function read_exif_data($filename, $sections_needed = null, $sub_arrays = false, $read_thumbnail = false)');
    expect(php74.match(/function (?:exif_[a-z_]+|read_exif_data)\(/g)).toHaveLength(5);
    expect(php80).not.toContain('function read_exif_data(');
    expect(php85).toContain('function exif_read_data($file, ?string $required_sections = null, bool $as_arrays = false, bool $read_thumbnail = false): array|false');
    expect(php85).toContain('function exif_thumbnail($file, &$width = null, &$height = null, &$image_type = null): string|false');
    expect(php85.match(/function exif_[a-z_]+\(/g)).toHaveLength(4);
    expect(builtinPhpStub('8.5', { disabledExtensions: ['exif'] })).not.toContain('function exif_read_data(');
  });
  it('covers the Hash catalog with versioned contexts, mhash flags, and failure returns', () => {
    const php72 = builtinPhpStub('7.2');
    const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0');
    const php81 = builtinPhpStub('8.1');
    const php84 = builtinPhpStub('8.4');
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      expect(stub.match(/\bfunction (?:hash(?:_[a-z_0-9]+)?|mhash(?:_[a-z_0-9]+)?)\(/g)).toHaveLength(20);
      expect(stub).toContain('final class HashContext {');
      expect(stub).toContain('const HASH_HMAC = 1;');
    }
    expect(php72).toContain('@return HashContext|false */ function hash_init(');
    expect(php72).toContain('function mhash(int $hash, string $data, $key = null)');
    expect(php72).toContain('function mhash_keygen_s2k(int $hash, string $input_password, string $salt, int $bytes)');
    expect(php72).toContain('function hash_hkdf(string $algo, string $key');
    expect(php72).toContain('@return string|false */ function hash_hkdf(');
    expect(php72).not.toContain('const MHASH_CRC32C');
    expect(php72).not.toContain('function __serialize(');
    expect(php74).toContain('const MHASH_CRC32C = 34;');
    expect(php74).not.toContain('const MHASH_XXH32');
    expect(php80).toContain('function hash_init(string $algo, int $flags = 0, string $key = \'\'): HashContext');
    expect(php80).toContain('public function __serialize(): array');
    expect(php80).not.toContain('array $options = []): HashContext');
    expect(php81).toContain('function hash_init(string $algo, int $flags = 0, string $key = \'\', array $options = []): HashContext');
    expect(php81).toContain('const MHASH_XXH32 = 38;');
    expect(php84).toContain('function hash_update(HashContext $context, string $data): true');
    expect(php84).toContain('public function __debugInfo(): array');
    const noMhash = builtinPhpStub('8.5', { unavailableFunctions: ['mhash', 'mhash_count', 'mhash_get_block_size', 'mhash_get_hash_name', 'mhash_keygen_s2k'] });
    expect(noMhash).not.toContain('function mhash(');
    expect(noMhash).not.toContain('function mhash_count(');
    expect(noMhash).toContain('function hash_init(');
  });
  it('models ZipArchive and procedural Zip with audited runtime boundaries', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'zip');
    const php85 = builtinPhpExtensionStub('8.5', 'zip');
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpExtensionStub(version, 'zip');
      expect(stub.match(/public (?:static )?function [A-Za-z_][A-Za-z0-9_]*\(/g)).toHaveLength(52);
      expect(stub.match(/\bfunction zip_[a-z_]+\(/g)).toHaveLength(10);
      expect(stub).toContain('class ZipArchive implements Countable');
      expect(stub).toContain('public const CREATE = 1;');
      expect(stub).not.toContain('function openString(');
    }
    expect(php72).toContain('function addFile($filepath, $entryname = null');
    expect(php72).toContain('function zip_entry_close($zip_ent)');
    expect(php72).toContain('public const OPSYS_Z_CPM = 9;');
    expect(php72).not.toContain('LIBZIP_VERSION');
    expect(php85).toContain('function addFile(string $filepath, string $entryname = \'\'');
    expect(php85).toContain('function open(string $filename, int $flags = 0)');
    expect(php85).not.toContain('OPSYS_Z_CPM');
    expect(php85).not.toContain('LIBZIP_VERSION');
    expect(php85).not.toContain('ER_TRUNCATED_ZIP');
    const zipRuntime = normalizeZipRuntimeFacts({ methods: ['open', 'addFile', 'extractTo'],
      constants: { CREATE: 1, ER_NOENT: 9, LIBZIP_VERSION: '1.11.4', ER_TRUNCATED_ZIP: 35 } });
    expect(zipRuntime).toBeDefined();
    const uri = builtinDocumentUri('8.5', { zipRuntime });
    expect(uri.length).toBeLessThan(4096);
    expect(parseBuiltinDocumentUri(uri)?.zipRuntime).toEqual(zipRuntime);
    const filtered = builtinPhpExtensionStub('8.5', 'zip', { zipRuntime });
    expect(filtered).toContain('function addFile(');
    expect(filtered).not.toContain('function addFromString(');
    expect(filtered).toContain("public const LIBZIP_VERSION = '1.11.4';");
    expect(filtered).toContain('public const ER_TRUNCATED_ZIP = 35;');
    expect(filtered).not.toContain('public const EXCL');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['zip'] })).not.toContain('class ZipArchive');
    expect(normalizeZipRuntimeFacts({ methods: ['open'], constants: { CREATE: 2 } })).toBeUndefined();
    expect(normalizeZipRuntimeFacts({ methods: ['open', 'openString'], constants: { CREATE: 1, FUTURE_ZIP_FLAG: 42 } }))
      .toEqual({ methods: ['open'], constants: { CREATE: 1 } });
  });
  it('versions Zlib streams, incremental contexts, and runtime-dependent constants', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'zlib');
    const php80 = builtinPhpExtensionStub('8.0', 'zlib');
    const php82 = builtinPhpExtensionStub('8.2', 'zlib');
    const php83 = builtinPhpExtensionStub('8.3', 'zlib');
    const php85 = builtinPhpExtensionStub('8.5', 'zlib');
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpExtensionStub(version, 'zlib');
      expect(stub.match(/^\/\*\* @return [^\n]+ \*\/ function [a-z_]+\(/gm)).toHaveLength(Number(version.replace('.', '')) < 80 ? 31 : 30);
      expect(stub).toContain('const ZLIB_ENCODING_GZIP = 31;');
      expect(stub).not.toContain('const ZLIB_VERSION =');
      expect(stub).not.toContain('const ZLIB_VERNUM =');
    }
    expect(php72).toContain('@return resource|false */ function deflate_init(');
    expect(php72).toContain('function gzgetss(');
    expect(php72).toContain('function gzwrite($fp, string $str, ?int $length = null)');
    expect(php72).toContain('function deflate_add($resource, string $add, int $flush_behavior = ZLIB_SYNC_FLUSH)');
    expect(php72).toContain('function gzuncompress(string $data, int $max_decoded_len = 0)');
    expect(php72).not.toContain('class InflateContext');
    expect(php80).toContain('final class InflateContext');
    expect(php80).toContain('final class DeflateContext');
    expect(php80).not.toContain('function gzgetss(');
    expect(php80).toContain('function deflate_add(DeflateContext $context');
    expect(php80).toContain('function gzwrite($stream, string $data, ?int $length = null)');
    expect(php82).toContain('function inflate_init(int $encoding, array $options = []): InflateContext|false');
    expect(php83).toContain('function inflate_init(int $encoding, array|object $options = []): InflateContext|false');
    expect(php85).toContain('function gzopen(string $filename, string $mode, bool $use_include_path = false)');
    expect(php85).toContain('function gzencode(string $data, int $level = -1, int $encoding = FORCE_GZIP): string|false');
    const zlibRuntime = normalizeZlibRuntimeFacts({ version: '1.2.11', vernum: 4784 });
    expect(zlibRuntime).toBeDefined();
    expect(parseBuiltinDocumentUri(builtinDocumentUri('8.5', { zlibRuntime }))?.zlibRuntime).toEqual(zlibRuntime);
    const runtimeStub = builtinPhpExtensionStub('8.5', 'zlib', { zlibRuntime });
    expect(runtimeStub).toContain("const ZLIB_VERSION = '1.2.11';");
    expect(runtimeStub).toContain('const ZLIB_VERNUM = 4784;');
    expect(normalizeZlibRuntimeFacts({ version: "1.2.11';die();", vernum: 4784 })).toBeUndefined();
    expect(builtinPhpStub('8.5', { disabledExtensions: ['zlib'], zlibRuntime })).not.toContain('function gzencode(');
  });
  it('keeps Socket resources, objects, and platform-dependent constants aligned with the runtime', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'sockets');
    const php80 = builtinPhpExtensionStub('8.0', 'sockets');
    const php82 = builtinPhpExtensionStub('8.2', 'sockets');
    const php83 = builtinPhpExtensionStub('8.3', 'sockets');
    const php85 = builtinPhpExtensionStub('8.5', 'sockets');
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpExtensionStub(version, 'sockets');
      expect(stub).toContain('function socket_create(');
      expect(stub).toContain('const AF_INET = 2;');
      expect(stub).not.toContain('const AF_INET6 =');
      expect(stub).not.toContain('function socket_wsaprotocol_info_export(');
      expect(stub.match(/\bfunction socket_[a-z_]+\(/g)).toHaveLength(Number(version.replace('.', '')) >= 83 ? 37 : 36);
    }
    expect(php72).toContain('@return resource|false */ function socket_create(');
    expect(php72).not.toContain('class Socket');
    expect(php72).toContain('function socket_sendmsg($socket, $msghdr, $flags)');
    expect(php72).toContain('function socket_select(&$read_fds, &$write_fds, &$except_fds, $tv_sec, $tv_usec = 0)');
    expect(php72).toContain('function socket_recvfrom($socket, &$buf, $len, $flags, &$name, &$port = null)');
    expect(php80).toContain('final class Socket');
    expect(php80).toContain('final class AddressInfo');
    expect(php80).toContain('function socket_create(int $domain, int $type, int $protocol): Socket|false');
    expect(php82).not.toContain('function socket_atmark(');
    expect(php83).toContain('function socket_atmark(Socket $socket): bool');
    expect(php85).toContain('function socket_create_listen(int $port, int $backlog = 128): Socket|false');
    const socketsRuntime = normalizeSocketsRuntimeFacts({ functions: ['socket_create', 'socket_read', 'socket_atmark'],
      constants: { AF_INET: 2, AF_INET6: 10, SOL_SOCKET: 1, AI_IDN: 64, UNKNOWN_FUTURE: 7 } });
    expect(socketsRuntime).toBeDefined();
    expect(socketsRuntime?.constants).not.toHaveProperty('UNKNOWN_FUTURE');
    const uri = builtinDocumentUri('8.5', { socketsRuntime });
    expect(parseBuiltinDocumentUri(uri)?.socketsRuntime).toEqual(socketsRuntime);
    const filtered = builtinPhpExtensionStub('8.5', 'sockets', { socketsRuntime });
    expect(filtered).toContain('function socket_create(');
    expect(filtered).not.toContain('function socket_write(');
    expect(filtered).toContain('const AF_INET6 = 10;');
    expect(filtered).toContain('const AI_IDN = 64;');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['sockets'], socketsRuntime })).not.toContain('function socket_create(');
    expect(normalizeSocketsRuntimeFacts({ functions: ['socket_create'], constants: { AF_INET: 'bad' } })).toBeUndefined();
  });
  it('versions OpenSSL resource handles, CMS functions, and runtime-dependent constants', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'openssl');
    const php73 = builtinPhpExtensionStub('7.3', 'openssl');
    const php74 = builtinPhpExtensionStub('7.4', 'openssl');
    const php80 = builtinPhpExtensionStub('8.0', 'openssl');
    const php81 = builtinPhpExtensionStub('8.1', 'openssl');
    const php82 = builtinPhpExtensionStub('8.2', 'openssl');
    const php85 = builtinPhpExtensionStub('8.5', 'openssl');
    const counts: Record<string, number> = { '7.2': 56, '7.3': 57, '7.4': 58, '8.0': 63,
      '8.1': 63, '8.2': 64, '8.3': 64, '8.4': 64, '8.5': 64 };
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpExtensionStub(version, 'openssl');
      expect(stub.match(/\bfunction openssl_[a-z_0-9]+\(/g)).toHaveLength(counts[version]);
      expect(stub).toContain('const OPENSSL_RAW_DATA = 1;');
      expect(stub).not.toContain('const OPENSSL_VERSION_NUMBER =');
      expect(stub).not.toContain('const OPENSSL_VERSION_TEXT =');
      expect(stub).not.toContain('CURLOPT_INFILESIZE_LARGE');
    }
    expect(php72).toContain('@return resource|false */ function openssl_pkey_new(');
    expect(php72).not.toContain('class OpenSSLAsymmetricKey');
    expect(php72).not.toContain('function openssl_pkey_derive(');
    expect(php73).toContain('function openssl_pkey_derive(');
    expect(php73).not.toContain('function openssl_x509_verify(');
    expect(php74).toContain('function openssl_x509_verify(');
    expect(php74).not.toContain('function openssl_cms_encrypt(');
    expect(php80).toContain('final class OpenSSLAsymmetricKey');
    expect(php80).toContain('final class OpenSSLCertificateSigningRequest');
    expect(php80).toContain('function openssl_pkey_new(?array $options = null): OpenSSLAsymmetricKey|false');
    expect(php80).toContain('int $cipher_algo = 0): bool');
    expect(php81).toContain('int $cipher_algo = 5): bool');
    expect(php81).not.toContain('function openssl_cipher_key_length(');
    expect(php82).toContain('function openssl_cipher_key_length(string $cipher_algo): int|false');
    expect(php85).toContain('string|int $cipher_algo = 5): bool');
    const openSslRuntime = normalizeOpenSslRuntimeFacts({ functions: ['openssl_encrypt', 'openssl_pkey_new'],
      constants: { OPENSSL_RAW_DATA: 1, OPENSSL_VERSION_NUMBER: 269488319,
        OPENSSL_VERSION_TEXT: 'OpenSSL 1.1.1k', OPENSSL_DEFAULT_STREAM_CIPHERS: 'ECDHE-RSA-AES128-GCM-SHA256', FUTURE_OPENSSL: 7 } });
    expect(openSslRuntime).toBeDefined();
    expect(openSslRuntime?.constants).not.toHaveProperty('FUTURE_OPENSSL');
    expect(parseBuiltinDocumentUri(builtinDocumentUri('8.5', { openSslRuntime }))?.openSslRuntime).toEqual(openSslRuntime);
    const filtered = builtinPhpExtensionStub('8.5', 'openssl', { openSslRuntime });
    expect(filtered).toContain('function openssl_encrypt(');
    expect(filtered).not.toContain('function openssl_decrypt(');
    expect(filtered).toContain('const OPENSSL_VERSION_NUMBER = 269488319;');
    expect(filtered).toContain("const OPENSSL_VERSION_TEXT = 'OpenSSL 1.1.1k';");
    expect(builtinPhpStub('8.5', { disabledExtensions: ['openssl'], openSslRuntime })).not.toContain('function openssl_encrypt(');
    expect(normalizeOpenSslRuntimeFacts({ functions: ['openssl_encrypt'], constants: { OPENSSL_VERSION_TEXT: 123 } })).toBeUndefined();
  });
  it('versions MySQLi APIs and filters conditional client symbols from runtime reflection', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'mysqli');
    const php80 = builtinPhpExtensionStub('8.0', 'mysqli');
    const php81 = builtinPhpExtensionStub('8.1', 'mysqli');
    const php82 = builtinPhpExtensionStub('8.2', 'mysqli');
    const php85 = builtinPhpExtensionStub('8.5', 'mysqli');
    expect(php72).toContain('function mysqli_query(');
    expect(php72).toContain('function mysqli_stmt_bind_param($stmt, $types, &$var, &...$vars)');
    expect(php72).toContain('function mysqli_stmt_bind_result($stmt, &$var, &...$vars)');
    expect(php72).toContain('public function bind_param($types, &$var, &...$vars)');
    expect(php85).toContain('function mysqli_stmt_bind_param(mysqli_stmt $statement, string $types, &...$vars)');
    expect(php72).toContain('class mysqli_result {');
    expect(php72).not.toContain('function mysqli_fetch_column(');
    expect(php80).not.toContain('function mysqli_fetch_column(');
    expect(php80).not.toContain('function getSqlState(');
    expect(php80).toContain('class mysqli_result implements IteratorAggregate');
    expect(php80).toContain('function getIterator(');
    expect(php80).toContain('function mysqli_stmt_execute(mysqli_stmt $statement)');
    expect(php80).toContain('function execute()');
    expect(php80).not.toContain('MYSQLI_OPT_LOAD_DATA_LOCAL_DIR');
    expect(php80).not.toContain('MYSQLI_REFRESH_REPLICA');
    expect(php81).toContain('function mysqli_fetch_column(');
    expect(php81).toContain('function getSqlState(');
    expect(php81).not.toContain('function mysqli_execute_query(');
    expect(php82).toContain('function mysqli_execute_query(');
    expect(php85).toContain('function execute_query(');
    expect(php85).toContain('@return array|false|null */ public function fetch_assoc()');
    expect(php85).toContain('@return bool */ public function execute(?array $params = null)');
    expect(php85).not.toContain('function mysqli_quote_string(');
    expect(php85).not.toContain('const MYSQLI_OPT_COMPRESS =');
    const mysqliRuntime = normalizeMysqliRuntimeFacts({ functions: ['mysqli_query', 'mysqli_connect', 'mysqli_quote_string'],
      constants: { MYSQLI_ASSOC: 1, MYSQLI_IS_MARIADB: false, MYSQLI_FUTURE: 9 },
      methods: { mysqli_sql_exception: [], mysqli_driver: [], mysqli: ['query'], mysqli_warning: [],
        mysqli_result: ['fetch_assoc'], mysqli_stmt: ['execute'] }, executeParams: 0 });
    expect(mysqliRuntime?.functions).not.toContain('mysqli_quote_string');
    expect(mysqliRuntime?.constants).not.toHaveProperty('MYSQLI_FUTURE');
    expect(parseBuiltinDocumentUri(builtinDocumentUri('8.5', { mysqliRuntime }))?.mysqliRuntime).toEqual(mysqliRuntime);
    const filtered = builtinPhpExtensionStub('8.5', 'mysqli', { mysqliRuntime });
    expect(filtered).toContain('function mysqli_query(');
    expect(filtered).not.toContain('function mysqli_execute_query(');
    expect(filtered).not.toContain('function mysqli_quote_string(');
    expect(filtered).toContain('const MYSQLI_IS_MARIADB = false;');
    expect(filtered).not.toContain('function execute_query(');
    expect(filtered).toContain('function fetch_assoc(');
    expect(filtered).not.toContain('function fetch_column(');
    expect(filtered).toContain('function execute()');
    expect(filtered).not.toContain('function execute(?array $params');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['mysqli'], mysqliRuntime })).not.toContain('function mysqli_query(');
    expect(normalizeMysqliRuntimeFacts({ functions: ['mysqli_query'], constants: { MYSQLI_ASSOC: '1' }, methods: {} })).toBeUndefined();
  });
  it('keeps BCMath function availability and failure returns tied to PHP versions', () => {
    const earlier = builtinPhpExtensionStub('7.2', 'bcmath');
    expect(earlier.match(/function bc\w+\(/g)).toHaveLength(10);
    expect(earlier).toContain('function bcscale(int $scale): bool');
    expect(earlier).toContain('function bcdiv(string $num1, string $num2, int $scale = 0): ?string');
    expect(earlier).toContain('@return string|false */ function bcpowmod(');
    expect(earlier).not.toContain('function bcround(');
    const php73 = builtinPhpExtensionStub('7.3', 'bcmath');
    expect(php73).toContain('function bcscale(int $scale = null): int');
    const php80 = builtinPhpExtensionStub('8.0', 'bcmath');
    expect(php80).toContain('function bcdiv(string $num1, string $num2, ?int $scale = null): string');
    expect(php80).not.toContain('function bcdivmod(');
    const php84 = builtinPhpExtensionStub('8.4', 'bcmath');
    expect(php84.match(/function bc\w+\(/g)).toHaveLength(14);
    expect(php84).toContain('function bcround(string $num, int $precision = 0, RoundingMode $mode = RoundingMode::HalfAwayFromZero): string');
    expect(php84).toContain('@return array{0:string, 1:string} */ function bcdivmod(');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['bcmath'] })).not.toContain('function bcadd(');
  });
  it('exposes BcMath Number through a versioned and extension-filtered namespace document', () => {
    const uri = bcmathNumberDocumentUri('8.4', { disabledExtensions: ['ctype'] });
    expect(parseBcmathNumberDocumentUri(uri)).toEqual({ version: '8.4', disabledExtensions: ['ctype'] });
    expect(parseBuiltinDocumentUri(uri)).toBeUndefined();
    expect(isBuiltinDocumentUri(uri)).toBe(true);
    expect(bcmathNumberPhpStub('8.3')).toBe('');
    expect(bcmathNumberPhpStub('8.4', { disabledExtensions: ['bcmath'] })).toBe('');
    const number = bcmathNumberPhpStub('8.4');
    expect(number).toContain('namespace BcMath;');
    expect(number).toContain('final readonly class Number');
    for (const method of ['add', 'sub', 'mul', 'div', 'mod', 'divmod', 'powmod', 'pow', 'sqrt', 'floor', 'ceil', 'round', 'compare']) {
      expect(number).toContain(`function ${method}(`);
    }
  });
  it('exposes the complete iconv catalog with PHP 7 and 8 nullable parameters and failure returns', () => {
    const older = builtinPhpExtensionStub('7.2', 'iconv');
    const newer = builtinPhpExtensionStub('8.5', 'iconv');
    expect(older.match(/function (?:iconv\w*|ob_iconv_handler)\(/g)).toHaveLength(11);
    expect(newer.match(/function (?:iconv\w*|ob_iconv_handler)\(/g)).toHaveLength(11);
    expect(older).toContain('function iconv_substr(string $str, int $offset, int $length = null, string $charset = null)');
    expect(older).toContain('function iconv(string $in_charset, string $out_charset, string $str)');
    expect(older).toContain('function iconv_mime_decode(string $encoded_string, int $mode = 0, string $charset = null)');
    expect(newer).toContain('function iconv_substr(string $string, int $offset, ?int $length = null, ?string $encoding = null): string|false');
    expect(older).toContain('@return array<string, string|list<string>>|false');
    expect(newer).toContain('function iconv_mime_decode_headers(string $headers, int $mode = 0, ?string $encoding = null): array|false');
    expect(newer).toContain('const ICONV_MIME_DECODE_STRICT = 1;');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['iconv'] })).not.toContain('function iconv(');
  });
  it('versions cURL resource and object handles, newer functions, and common options', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'curl');
    const php80 = builtinPhpExtensionStub('8.0', 'curl');
    const php81 = builtinPhpExtensionStub('8.1', 'curl');
    const php82 = builtinPhpExtensionStub('8.2', 'curl');
    const php85 = builtinPhpExtensionStub('8.5', 'curl');
    expect(php72.match(/function curl_[a-z_]+\(/g)).toHaveLength(32);
    expect(php85.match(/function curl_[a-z_]+\(/g)).toHaveLength(35);
    expect(php72).toContain('@return resource|false */ function curl_init(');
    expect(php72).not.toContain('class CurlHandle');
    expect(php72).toContain('function curl_version($version = null)');
    expect(php72).toContain('function curl_setopt($ch, $option, $value)');
    expect(php72).toContain('function curl_multi_add_handle($mh, $ch)');
    expect(php72).toContain('function curl_multi_setopt($sh, int $option, $value)');
    expect(php72).toContain('function __construct(string $filename, ?string $mimetype = null, ?string $postname = null)');
    expect(php72).toContain('function setMimeType(string $name): void');
    expect(php80).toContain('function curl_init(?string $url = null): CurlHandle|false');
    expect(php80).toContain('function __construct(string $filename, ?string $mime_type = null, ?string $posted_filename = null)');
    expect(php80).toContain('final class CurlHandle');
    expect(php80).toContain('function curl_version(): array|false');
    expect(php80).not.toContain('class CURLStringFile');
    expect(php81).toContain('class CURLStringFile');
    expect(php81).not.toContain('function curl_upkeep(');
    expect(php82).toContain('function curl_upkeep(CurlHandle $handle): bool');
    expect(builtinPhpStub('8.2', { unavailableFunctions: ['curl_upkeep'] })).not.toContain('function curl_upkeep(');
    expect(builtinPhpStub('8.2', { unavailableFunctions: ['curl_upkeep'] })).toContain('function curl_init(');
    expect(php82).not.toContain('function curl_multi_get_handles(');
    expect(php85).toContain('function curl_multi_get_handles(CurlMultiHandle $multi_handle): array');
    expect(php85).toContain('class CurlSharePersistentHandle');
    expect(php85).toContain('@deprecated PHP 8.5 */ function curl_close(');
    expect(php85).toContain('const CURLOPT_RETURNTRANSFER = 19913;');
    expect(php85).toContain('const CURLOPT_SSL_VERIFYPEER = 64;');
    expect(php85).toContain('const CURLINFO_PRIMARY_IP = 1048608;');
    expect(php85).not.toContain('CURLINFO_SIZE_DELIVERED');
    const curlRuntime = normalizeCurlRuntimeFacts({ constants: { CURLOPT_URL: 10002,
      CURLINFO_REDIRECT_URL: 1048607, CURLOPT_INFILESIZE_LARGE: 30115, CURLOPT_NOT_UPSTREAM: 99 } });
    expect(curlRuntime?.constants).not.toHaveProperty('CURLOPT_NOT_UPSTREAM');
    expect(parseBuiltinDocumentUri(builtinDocumentUri('8.5', { curlRuntime }))?.curlRuntime).toEqual(curlRuntime);
    const runtimeStub = builtinPhpExtensionStub('8.5', 'curl', { curlRuntime });
    expect(runtimeStub).toContain('const CURLINFO_REDIRECT_URL = 1048607;');
    expect(runtimeStub).toContain('const CURLOPT_INFILESIZE_LARGE = 30115;');
    expect(runtimeStub).not.toContain('const CURLOPT_RETURNTRANSFER =');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['curl'], curlRuntime })).not.toContain('const CURLINFO_REDIRECT_URL =');
    expect(normalizeCurlRuntimeFacts({ constants: { CURLOPT_URL: '10002' } })).toBeUndefined();
    expect(parseBuiltinDocumentUri(`${builtinDocumentUri('8.5')}&curl=bad`)).toBeUndefined();
    expect(builtinPhpStub('8.5', { disabledExtensions: ['curl'] })).not.toContain('function curl_init(');
  });
  it('versions the common GD image pipeline and filters optional AVIF support', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'gd');
    const php74 = builtinPhpExtensionStub('7.4', 'gd');
    const php80 = builtinPhpExtensionStub('8.0', 'gd');
    const php81 = builtinPhpExtensionStub('8.1', 'gd');
    const php85 = builtinPhpExtensionStub('8.5', 'gd');
    expect(php72).toContain('@return resource|false */ function imagecreatetruecolor(');
    expect(php72).not.toContain('class GdImage');
    expect(php72).not.toContain('class GdFont');
    expect(php72).toContain('function imagerotate($im, float $angle, int $bgdcolor, int $ignoretransparent = 0)');
    expect(php72).toContain('function imagettftext($im, float $size, float $angle, int $x, int $y, int $col, string $font_file, string $text)');
    expect(php72).toContain('function imagepng($im, $to = null, int $quality = -1, int $filters = -1)');
    expect(php72).toContain('function image2wbmp($im, string $filename = null, int $threshold = null)');
    expect(php72).toContain('@return int|false */ function imageloadfont(');
    expect(php72).toContain('function image2wbmp(');
    expect(php72).toContain('function jpeg2wbmp(');
    expect(php72).toContain('function jpeg2wbmp(string $f_org, string $f_dest, int $d_height, int $d_width, int $d_threshold)');
    expect(php72).not.toContain('function imagegetinterpolation(');
    expect(php72).not.toContain('imagecreatefromtga');
    expect(php74).toContain('function imagecreatefromtga(');
    expect(php74).toContain('function image2wbmp($im, string $filename = null, int $foreground = null)');
    expect(php74).not.toContain('imagecreatefromavif');
    expect(php80).toContain('final class GdImage');
    expect(php80).not.toContain('class GdFont');
    expect(php80).toContain('function imagepng(GdImage $image, $file = null, int $quality = -1, int $filters = -1): bool');
    expect(php80).toContain('function imagescale(GdImage $image, int $width, int $height = -1, int $mode = IMG_BILINEAR_FIXED): GdImage|false');
    expect(php80).toContain('function imagefilter(GdImage $image, int $filter, ...$args): bool');
    expect(php80).toContain('function imageloadfont(string $filename): int|false');
    expect(php80).not.toContain('function image2wbmp(');
    expect(php80).toContain('function imagegetinterpolation(GdImage $image): int');
    expect(php81).toContain('final class GdFont');
    expect(php81).toContain('function imageloadfont(string $filename): GdFont|false');
    expect(php81).toContain('function imagefontwidth(GdFont|int $font): int');
    expect(php81).toContain('function imagerotate(GdImage $image, float $angle, int $background_color, bool $ignore_transparent = false)');
    expect(builtinPhpExtensionStub('8.3', 'gd')).toContain('function imagerotate(GdImage $image, float $angle, int $background_color): GdImage|false');
    expect(php81).toContain('function imagecreatefromavif(string $filename): GdImage|false');
    expect(php81).toContain('const IMG_AVIF = 256;');
    expect(php85).toContain('@deprecated PHP 8.5 */ function imagedestroy(GdImage $image): true');
    expect(php85).toContain('function imagerotate(GdImage $image, float $angle, int $background_color): GdImage|false');
    expect(php85).toContain('function imagefilledrectangle(GdImage $image, int $x1, int $y1, int $x2, int $y2, int $color): true');
    expect(php85).toContain('const IMG_FILTER_BRIGHTNESS = 2;');
    expect(php85).toContain('const IMG_FLIP_HORIZONTAL = 1;');
    expect(php85).toContain('const IMG_AFFINE_ROTATE = 2;');
    expect(php85).toContain('function imagecolorset(GdImage $image, int $color, int $red, int $green, int $blue, int $alpha = 0): false|null');
    expect(php85).toContain('function imageresolution(GdImage $image, ?int $resolution_x = null, ?int $resolution_y = null): array|true');
    expect(php72.match(/function (?:gd_info|image[a-z0-9]+|jpeg2wbmp|png2wbmp)\(/g)).toHaveLength(105);
    expect(php85.match(/function (?:gd_info|image[a-z0-9]+)\(/g)).toHaveLength(106);
    expect(php85).not.toContain('const IMG_WEBP_LOSSLESS =');
    const gdRuntime = normalizeGdRuntimeFacts({ constants: { IMG_PNG: 4, IMG_WEBP_LOSSLESS: 101,
      GD_VERSION: '2.3.3', GD_EXTRA_VERSION: '', GD_NOT_UPSTREAM: 7 } });
    expect(gdRuntime?.constants).not.toHaveProperty('GD_NOT_UPSTREAM');
    expect(parseBuiltinDocumentUri(builtinDocumentUri('8.5', { gdRuntime }))?.gdRuntime).toEqual(gdRuntime);
    const gdRuntimeStub = builtinPhpExtensionStub('8.5', 'gd', { gdRuntime });
    expect(gdRuntimeStub).toContain('const IMG_WEBP_LOSSLESS = 101;');
    expect(gdRuntimeStub).toContain('const GD_VERSION = "2.3.3";');
    expect(gdRuntimeStub).not.toContain('const IMG_FILTER_BRIGHTNESS =');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['gd'], gdRuntime })).not.toContain('const IMG_WEBP_LOSSLESS =');
    expect(normalizeGdRuntimeFacts({ constants: { GD_VERSION: [] } })).toBeUndefined();
    expect(parseBuiltinDocumentUri(`${builtinDocumentUri('8.5')}&gd=bad`)).toBeUndefined();
    const withoutAvif = builtinPhpStub('8.5', { unavailableFunctions: ['imageavif', 'imagecreatefromavif'] });
    expect(withoutAvif).not.toContain('function imageavif(');
    expect(withoutAvif).not.toContain('function imagecreatefromavif(');
    expect(withoutAvif).toContain('function imagepng(');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['gd'] })).not.toContain('function imagepng(');
  });
  it('versions Intl Locale and Normalizer functions, static methods, and constants', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'intl');
    const php73 = builtinPhpExtensionStub('7.3', 'intl');
    const php81 = builtinPhpExtensionStub('8.1', 'intl');
    const php84 = builtinPhpExtensionStub('8.4', 'intl');
    const php85 = builtinPhpExtensionStub('8.5', 'intl');
    expect(php72).toContain('class Locale {');
    expect(php72).toContain('public static function canonicalize(string $locale) {}');
    expect(php72).toContain('function locale_canonicalize(string $arg1) {}');
    expect(php72).toContain('public static function getDisplayName(string $locale, ?string $in_locale = null) {}');
    expect(php72).toContain('function locale_get_display_name(string $locale, ?string $in_locale = null) {}');
    expect(php72).toContain('public static function lookup(array $langtag, string $locale, bool $canonicalize = false, ?string $default = null) {}');
    expect(php72).toContain('function locale_lookup(array $langtag, string $locale, bool $canonicalize = false, ?string $def = null) {}');
    expect(php72).toContain('public static function normalize(string $input, int $form = Normalizer::FORM_C) {}');
    expect(php72).toContain('function normalizer_is_normalized(string $input, int $form = Normalizer::FORM_C) {}');
    expect(php72).toContain('public const NONE = 1;');
    expect(php72).toContain('public const FORM_C = 4;');
    expect(php72).not.toContain('normalizer_get_raw_decomposition');
    expect(php73).toContain('function normalizer_get_raw_decomposition(string $string) {}');
    expect(php81).toContain('public const FORM_C = 16;');
    expect(php81).toContain('public const FORM_KC_CF = 48;');
    expect(php81).not.toContain('public const NONE = 1;');
    expect(php81).toContain('function normalizer_get_raw_decomposition(string $string, int $form = Normalizer::FORM_C): ?string');
    expect(php84).not.toContain('locale_add_likely_subtags');
    expect(php85).toContain('function locale_add_likely_subtags(string $locale): string|false');
    expect(php85).toContain('function locale_lookup(array $languageTag, string $locale, bool $canonicalize = false, ?string $defaultLocale = null): ?string');
    expect(php85).toContain('function normalizer_normalize(string $string, int $form = Normalizer::FORM_C): string|false');
    expect(php85).toContain('public static function isRightToLeft(string $locale): bool');
    expect(php85).not.toContain('getDisplayKeyword');
    expect(php85.match(/^function (?:locale_|normalizer_)[a-z_]+\(/gm)).toHaveLength(24);
    expect(builtinPhpStub('8.5', { disabledExtensions: ['intl'] })).not.toContain('class Locale {');
  });
  it('versions Intl grapheme and IDN APIs using runtime constant values', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'intl');
    const php81 = builtinPhpExtensionStub('8.1', 'intl');
    const php84 = builtinPhpExtensionStub('8.4', 'intl');
    const php85 = builtinPhpExtensionStub('8.5', 'intl');
    expect(php72).toContain('function grapheme_strpos(string $haystack, string $needle, int $offset = 0)');
    expect(php72).toContain('function grapheme_substr(string $string, int $start, int $length = null)');
    expect(php72).toContain('function grapheme_strstr(string $haystack, string $needle, bool $before_needle = false)');
    expect(php72).toContain('function grapheme_extract(string $arg1, int $arg2, int $arg3 = GRAPHEME_EXTR_COUNT, int $arg4 = 0, &$arg5 = null)');
    expect(php72).toContain('function idn_to_ascii(string $domain, int $option = IDNA_DEFAULT, int $variant = INTL_IDNA_VARIANT_UTS46, &$idn_info = null)');
    expect(php72).toContain('function intl_is_failure(int $arg1)');
    expect(php72).toContain('const INTL_IDNA_VARIANT_2003 = 0;');
    expect(php72).not.toContain('grapheme_str_split');
    expect(php81).not.toContain('INTL_IDNA_VARIANT_2003');
    expect(php84).toContain('function grapheme_str_split(string $string, int $length = 1): array|false');
    expect(php84).not.toContain('grapheme_levenshtein');
    expect(php85).toContain('function grapheme_strpos(string $haystack, string $needle, int $offset = 0, string $locale = ""): int|false');
    expect(php85).toContain('function grapheme_levenshtein(string $string1, string $string2');
    expect(php85).toContain('function idn_to_ascii(string $domain, int $flags = IDNA_DEFAULT');
    expect(php85).toContain('const IDNA_DEFAULT = 0;');
    expect(php85).not.toContain('grapheme_strrev');
    expect(php85.match(/^function (?:grapheme_|idn_)[a-z0-9_]+\(/gm)).toHaveLength(13);
    expect(builtinPhpStub('8.5', { disabledExtensions: ['intl'] })).not.toContain('function grapheme_strlen(');
  });
  it('exposes the complete Collator method and procedural catalog with versioned strength returns', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'intl');
    const php81 = builtinPhpExtensionStub('8.1', 'intl');
    const php84 = builtinPhpExtensionStub('8.4', 'intl');
    expect(php72).toContain('class Collator {');
    expect(php72).toContain('public const NUMERIC_COLLATION = 7;');
    expect(php72).toContain('public const SORT_REGULAR = 0;');
    expect(php72).toContain('/** @return ?Collator */ public static function create(string $arg1)');
    expect(php72).toContain('/** @return bool */ function collator_set_strength(Collator $object, int $arg1)');
    expect(php72).toContain('function collator_sort_with_sort_keys(Collator $coll, array &$arr)');
    expect(php81).toContain('function collator_set_strength(Collator $object, int $strength): bool');
    expect(php84).toContain('function collator_set_strength(Collator $object, int $strength): true');
    expect(php84).toContain('/** @return true */ public function setStrength(int $strength)');
    expect(php84).toContain('function collator_sort_with_sort_keys(Collator $object, array &$array): bool');
    expect(php84.match(/^function collator_[a-z_]+\(/gm)).toHaveLength(13);
    expect(builtinPhpStub('8.5', { disabledExtensions: ['intl'] })).not.toContain('class Collator {');
  });
  it('versions the complete NumberFormatter callable catalog and ICU-dependent class constants', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'intl');
    const php74 = builtinPhpExtensionStub('7.4', 'intl');
    const php81 = builtinPhpExtensionStub('8.1', 'intl');
    const php83 = builtinPhpExtensionStub('8.3', 'intl');
    const php84 = builtinPhpExtensionStub('8.4', 'intl');
    const php85 = builtinPhpExtensionStub('8.5', 'intl');
    expect(php72).toContain('class NumberFormatter {');
    expect(php72).toContain('/** @return ?NumberFormatter */ public static function create(string $locale, int $style, string $pattern = null)');
    expect(php72).toContain('function numfmt_parse_currency(NumberFormatter $formatter, string $string, &$currency, &$position = null)');
    expect(php72).toContain('function numfmt_set_symbol(NumberFormatter $nf, int $attr, string $symbol)');
    expect(php72).toContain('function setSymbol(int $attr, string $symbol)');
    expect(php72).not.toContain('public const CURRENCY_ACCOUNTING');
    expect(php74).not.toContain('public const CURRENCY_ACCOUNTING');
    expect(php81).toContain('public const CURRENCY_ACCOUNTING = 12;');
    const withCurrencyAccounting = builtinPhpExtensionStub('7.4', 'intl', { intlCurrencyAccountingAvailable: true });
    expect(withCurrencyAccounting).toContain('public const CURRENCY_ACCOUNTING = 12;');
    expect(builtinPhpExtensionStub('8.5', 'intl', { intlCurrencyAccountingAvailable: false }))
      .not.toContain('public const CURRENCY_ACCOUNTING');
    const accountingUri = builtinDocumentUri('7.4', { intlCurrencyAccountingAvailable: true });
    expect(parseBuiltinDocumentUri(accountingUri)?.intlCurrencyAccountingAvailable).toBe(true);
    expect(parseBuiltinDocumentUri(builtinDocumentUri('7.4', { intlCurrencyAccountingAvailable: false }))
      ?.intlCurrencyAccountingAvailable).toBe(false);
    expect(parseBuiltinDocumentUri(`${builtinDocumentUri('7.4')}&intlCurrencyAccounting=yes`)).toBeUndefined();
    expect(php81).toContain('function numfmt_format(NumberFormatter $formatter, int|float $num, int $type = NumberFormatter::TYPE_DEFAULT): string|false');
    expect(php81).toContain('function numfmt_parse(NumberFormatter $formatter, string $string, int $type = NumberFormatter::TYPE_DOUBLE, &$offset = null): int|float|false');
    expect(php83).toContain('/** @deprecated PHP 8.3 */ public const TYPE_CURRENCY = 4;');
    expect(php83).not.toContain('public const ROUND_HALFODD');
    expect(php84).toContain('public const ROUND_HALFODD = 8;');
    expect(php84).not.toContain('public const CURRENCY_ISO');
    expect(php85).toContain('public const CURRENCY_ISO = 10;');
    expect(php85).toContain('public const DECIMAL_COMPACT_SHORT = 14;');
    expect(php85.match(/\bfunction numfmt_[a-z_]+\(/g)).toHaveLength(16);
    expect(builtinPhpStub('8.5', { disabledExtensions: ['intl'] })).not.toContain('class NumberFormatter {');
  });
  it('versions IntlDateFormatter methods, functions, constants, and removed aliases', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'intl');
    const php81 = builtinPhpExtensionStub('8.1', 'intl');
    const php82 = builtinPhpExtensionStub('8.2', 'intl');
    const php83 = builtinPhpExtensionStub('8.3', 'intl');
    const php84 = builtinPhpExtensionStub('8.4', 'intl');
    const php85 = builtinPhpExtensionStub('8.5', 'intl');
    expect(php72).toContain('class IntlDateFormatter {');
    expect(php72).toContain('public function __construct(string $locale, int $datetype, int $timetype');
    expect(php72).toContain('public static function create(string $locale, int $datetype, int $timetype, $timezone = null');
    expect(php72).toContain('function datefmt_create(string $locale, int $date_type, int $time_type, $timezone_str = null');
    expect(php72).toContain('function datefmt_get_datetype(IntlDateFormatter $mf)');
    expect(php72).toContain('function datefmt_get_error_code(IntlDateFormatter $nf)');
    expect(php72).toContain('public function setCalendar($which)');
    expect(php72).toContain('public function parse(string $string, &$position = null)');
    expect(php72).toContain('function datefmt_parse(IntlDateFormatter $formatter, string $string, &$position = null)');
    expect(php72).toContain('function datefmt_format(IntlDateFormatter $formatter, $datetime)');
    expect(php72).not.toContain('public const RELATIVE_FULL');
    expect(php81).toContain('public const RELATIVE_FULL = 128;');
    expect(php81).toContain('function datefmt_create(?string $locale, int $dateType = IntlDateFormatter::FULL');
    expect(php81).toContain('function datefmt_set_timezone(IntlDateFormatter $formatter, $timezone): bool|null');
    expect(php82).not.toContain('function datefmt_set_timezone(IntlDateFormatter $formatter, $timezone): bool {');
    expect(php83).toContain('function datefmt_set_timezone(IntlDateFormatter $formatter, $timezone): bool {');
    expect(php84).toContain('public const PATTERN = -2;');
    expect(php83).not.toContain('function parseToCalendar(');
    expect(php84).toContain('public function parseToCalendar(string $string, &$offset = null): int|float|false');
    expect(php85).toContain('function datefmt_set_timezone(IntlDateFormatter $formatter, IntlTimeZone|DateTimeZone|string|null $timezone): bool');
    expect(php85.match(/\bfunction datefmt_[a-z_]+\(/g)).toHaveLength(20);
    expect(php85).not.toContain('datefmt_set_timezone_id');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['intl'] })).not.toContain('class IntlDateFormatter {');
  });
  it('exposes the four Intl global error functions only when Intl is enabled', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'intl');
    const php85 = builtinPhpExtensionStub('8.5', 'intl');
    expect(php72).toContain('/** @return int */ function intl_get_error_code() {}');
    expect(php72).toContain('/** @return bool */ function intl_is_failure(int $arg1) {}');
    expect(php85).toContain('function intl_error_name(int $errorCode): string {}');
    expect(php85).toContain('function intl_get_error_message(): string {}');
    expect(php85.match(/\bfunction intl_(?:error_name|get_error_code|get_error_message|is_failure)\(/g)).toHaveLength(4);
    expect(builtinPhpStub('8.5', { disabledExtensions: ['intl'] })).not.toContain('function intl_is_failure(');
  });
  it('versions ResourceBundle procedural functions, methods, and collection interfaces', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'intl');
    const php74 = builtinPhpExtensionStub('7.4', 'intl');
    const php81 = builtinPhpExtensionStub('8.1', 'intl');
    const php84 = builtinPhpExtensionStub('8.4', 'intl');
    expect(php72).toContain('class ResourceBundle implements Traversable {');
    expect(php72).toContain('public function __construct(string $locale, string $bundlename, bool $fallback = true)');
    expect(php72).toContain('function resourcebundle_create(string $locale, string $bundlename, bool $fallback = true)');
    expect(php72).toContain('function resourcebundle_locales(string $bundlename)');
    expect(php72).toContain('function resourcebundle_get(ResourceBundle $bundle, $index, bool $fallback = true)');
    expect(php72).not.toContain('function getIterator(): Iterator');
    expect(php74).toContain('class ResourceBundle implements Traversable, Countable {');
    expect(php81).toContain('class ResourceBundle implements IteratorAggregate, Countable {');
    expect(php81).toContain('function getIterator(): Iterator');
    expect(php81).toContain('function resourcebundle_get(ResourceBundle $bundle, $index, bool $fallback = true): mixed');
    expect(php84).toContain('function resourcebundle_get(ResourceBundle $bundle, string|int $index, bool $fallback = true): ResourceBundle|array|string|int|null');
    expect(php84).toContain('function resourcebundle_create(?string $locale, ?string $bundle, bool $fallback = true): ?ResourceBundle');
    expect(php84.match(/\bfunction resourcebundle_[a-z_]+\(/g)).toHaveLength(6);
    expect(builtinPhpStub('8.5', { disabledExtensions: ['intl'] })).not.toContain('class ResourceBundle implements');
  });
  it('versions Transliterator procedural functions, methods, constants, and id property', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'intl');
    const php81 = builtinPhpExtensionStub('8.1', 'intl');
    const php82 = builtinPhpExtensionStub('8.2', 'intl');
    const php84 = builtinPhpExtensionStub('8.4', 'intl');
    const php85 = builtinPhpExtensionStub('8.5', 'intl');
    expect(php72).toContain('class Transliterator {');
    expect(php72).toContain('public const FORWARD = 0;');
    expect(php72).toContain('public $id;');
    expect(php72).toContain('final private function __construct()');
    expect(php72).toContain('function transliterator_transliterate($trans, string $subject, int $start = 0, int $end = -1)');
    expect(php81).toContain('public string $id;');
    expect(php81).toContain('function transliterator_get_error_code(Transliterator $transliterator): int|false');
    expect(php82).toContain('public readonly string $id;');
    expect(php84).toContain('public const int FORWARD = 0;');
    expect(php84).toContain('/** @return int|false */ public function getErrorCode()');
    expect(php85).toContain('function transliterator_transliterate(Transliterator|string $transliterator, string $string, int $start = 0, int $end = -1): string|false');
    expect(php85).toContain('function transliterator_get_error_code(Transliterator $transliterator): int');
    expect(php85).toContain('/** @return string */ public function getErrorMessage()');
    expect(php85.match(/\bfunction transliterator_[a-z_]+\(/g)).toHaveLength(7);
    expect(builtinPhpStub('8.5', { disabledExtensions: ['intl'] })).not.toContain('class Transliterator {');
  });
  it('versions MessageFormatter methods, procedural functions, and failure returns', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'intl');
    const php85 = builtinPhpExtensionStub('8.5', 'intl');
    expect(php72).toContain('class MessageFormatter {');
    expect(php72).toContain('/** @return string|false */ public function format(array $args)');
    expect(php72).toContain('function msgfmt_parse(MessageFormatter $nf, string $source)');
    expect(php72).toContain('function msgfmt_parse_message(string $locale, string $pattern, string $source)');
    expect(php85).toContain('/** @return ?MessageFormatter */ public static function create(string $locale, string $pattern)');
    expect(php85).toContain('function msgfmt_format(MessageFormatter $formatter, array $values): string|false');
    expect(php85).toContain('function msgfmt_parse_message(string $locale, string $pattern, string $message): array|false');
    expect(php85).toContain('function msgfmt_get_error_code(MessageFormatter $formatter): int');
    expect(php85.match(/\bfunction msgfmt_[a-z_]+\(/g)).toHaveLength(10);
    expect(builtinPhpStub('8.5', { disabledExtensions: ['intl'] })).not.toContain('class MessageFormatter {');
  });
  it('versions IntlTimeZone methods, functions, constants, and ICU-gated IANA IDs', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'intl');
    const php81 = builtinPhpExtensionStub('8.1', 'intl');
    const php84 = builtinPhpExtensionStub('8.4', 'intl');
    const php85 = builtinPhpExtensionStub('8.5', 'intl');
    expect(php72).toContain('class IntlTimeZone {');
    expect(php72).toContain('class IntlIterator implements Iterator {');
    expect(php72).toContain('class IntlException extends Exception {}');
    expect(php72).toContain('public const DISPLAY_LONG = 2;');
    expect(php72).toContain('public static function getWindowsID(string $timezone)');
    expect(php72).toContain('public static function fromDateTimeZone(DateTimeZone $zoneId)');
    expect(php72).toContain('function intltz_from_date_time_zone(DateTimeZone $dateTimeZone)');
    expect(php72).toContain('public static function getCanonicalID(string $zoneId, &$isSystemID = null)');
    expect(php72).toContain('function intltz_get_offset(IntlTimeZone $timeZone, float $date, bool $local, &$rawOffset, &$dstOffset)');
    expect(php72).not.toContain('function intltz_get_windows_id(');
    expect(php72).not.toContain('getIanaID(');
    expect(php72.match(/\bfunction intltz_[a-z_]+\(/g)).toHaveLength(22);
    expect(php81).toContain('function intltz_get_windows_id(string $timezoneId): string|false');
    expect(php81).toContain('function intltz_get_id_for_windows_id(string $timezoneId, ?string $region = null): string|false');
    expect(php81.match(/\bfunction intltz_[a-z_]+\(/g)).toHaveLength(24);
    expect(php84).toContain('public const int DISPLAY_LONG = 2;');
    expect(php84).toContain('public static function getIanaID(string $timezoneId): string|false');
    expect(php84).toContain('function intltz_get_iana_id(string $timezoneId): string|false');
    expect(php85).toContain('function intltz_create_enumeration(string|int|null $countryOrRawOffset = null): IntlIterator|false');
    expect(php85.match(/\bfunction intltz_[a-z_]+\(/g)).toHaveLength(25);
    expect(php85).not.toContain('intltz_getGMT');
    const oldIcu = builtinPhpStub('8.5', { unavailableFunctions: ['intltz_get_iana_id'] });
    expect(oldIcu).not.toContain('function intltz_get_iana_id(');
    expect(oldIcu).not.toContain('function getIanaID(');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['intl'] })).not.toContain('class IntlTimeZone {');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['intl'] })).not.toContain('class IntlIterator implements Iterator {');
  });
  it('exposes the runtime IntlCalendar and Gregorian calendars without upstream typo aliases', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'intl');
    const php81 = builtinPhpExtensionStub('8.1', 'intl');
    const php83 = builtinPhpExtensionStub('8.3', 'intl');
    const php84 = builtinPhpExtensionStub('8.4', 'intl');
    const php85 = builtinPhpExtensionStub('8.5', 'intl');
    expect(php72).toContain('class IntlCalendar {');
    expect(php72).toContain('class IntlGregorianCalendar extends IntlCalendar {');
    expect(php72).not.toContain('FIELD_FIELD_COUNT =');
    expect(builtinPhpExtensionStub('7.2', 'intl', { intlCalendarFieldCount: 23 })).toContain('public const FIELD_FIELD_COUNT = 23;');
    expect(php72).toContain('function intlcal_get_time(IntlCalendar $calendar)');
    expect(php72).toContain('/** @return bool */ public function set($fieldOrYear, $valueOrMonth');
    expect(php72).toContain('function intlgregcal_is_leap_year(IntlGregorianCalendar $calendar, $year)');
    expect(php72).not.toContain('function setDate(');
    expect(php81).toContain('function intlcal_get_time(IntlCalendar $calendar): float|false');
    expect(php83).toContain('function setDate(int $year, int $month, int $dayOfMonth): void');
    expect(php83).toContain('function createFromDate(int $year, int $month, int $dayOfMonth): static');
    expect(php83).not.toContain('FIELD_FIELD_COUNT =');
    expect(builtinPhpExtensionStub('8.3', 'intl', { intlCalendarFieldCount: 24 })).toContain('public const FIELD_FIELD_COUNT = 24;');
    expect(php83).not.toContain('public const int FIELD_FIELD_COUNT');
    expect(php84).not.toContain('FIELD_FIELD_COUNT =');
    expect(builtinPhpExtensionStub('8.4', 'intl', { intlCalendarFieldCount: 24 })).toContain('public const int FIELD_FIELD_COUNT = 24;');
    expect(parseBuiltinDocumentUri(builtinDocumentUri('8.5', { intlCalendarFieldCount: 24 }))).toEqual({
      version: '8.5', disabledExtensions: [], intlCalendarFieldCount: 24,
    });
    expect(php84).toContain('function setDate(int $year, int $month, int $dayOfMonth): void');
    expect(php84).toContain('function createFromDate(int $year, int $month, int $dayOfMonth): static');
    expect(php85).toContain('function intlcal_set(IntlCalendar $calendar, int $year, int $month, ?int $dayOfMonth = null');
    expect(php85).toContain('/** @return true */ public function set(int $year, int $month');
    expect(php85).toContain('function intlcal_get_keyword_values_for_locale(string $keyword, string $locale, bool $onlyCommon): IntlIterator|false');
    expect(php85.match(/\bfunction (?:intlcal_|intlgregcal_)[a-z_]+\(/g)).toHaveLength(49);
    for (const typo of ['intcal_get_maximum', 'intlcal_greates_minimum']) expect(php85).not.toContain(`function ${typo}(`);
    expect(builtinPhpStub('8.5', { disabledExtensions: ['intl'] })).not.toContain('class IntlCalendar {');
  });
  it('versions Spoofchecker checks, restriction levels, and allowed-character APIs', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'intl');
    const php73 = builtinPhpExtensionStub('7.3', 'intl');
    const php81 = builtinPhpExtensionStub('8.1', 'intl');
    const php84 = builtinPhpExtensionStub('8.4', 'intl');
    expect(php72).toContain('class Spoofchecker {');
    expect(php72).toContain('public const SINGLE_SCRIPT_CONFUSABLE = 1;');
    expect(php72).toContain('function isSuspicious($text, &$error = null)');
    expect(php72).not.toContain('function setRestrictionLevel(');
    expect(php72).not.toContain('public const ASCII');
    expect(php73).toContain('public const ASCII = 268435456;');
    expect(php73).toContain('function setRestrictionLevel($level)');
    expect(php81).toContain('function isSuspicious(string $string, &$errorCode = null)');
    expect(php81).not.toContain('function setAllowedChars(');
    expect(php84).toContain('public const int IGNORE_SPACE = 1;');
    expect(php84).toContain('public function setAllowedChars(string $pattern, int $patternOptions = 0): void');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['intl'] })).not.toContain('class Spoofchecker {');
  });
  it('versions IntlDatePatternGenerator and the PHP 8.5 IntlListFormatter', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'intl');
    const php80 = builtinPhpExtensionStub('8.0', 'intl');
    const php81 = builtinPhpExtensionStub('8.1', 'intl');
    const php84 = builtinPhpExtensionStub('8.4', 'intl');
    const php85 = builtinPhpExtensionStub('8.5', 'intl');
    expect(php72).not.toContain('class IntlDatePatternGenerator {');
    expect(php80).not.toContain('class IntlDatePatternGenerator {');
    expect(php81).toContain('class IntlDatePatternGenerator {');
    expect(php81).toContain('public static function create(?string $locale = null): ?IntlDatePatternGenerator');
    expect(php81).toContain('public function getBestPattern(string $skeleton): string|false');
    expect(php84).not.toContain('class IntlListFormatter {');
    expect(php85).toContain('final class IntlListFormatter {');
    expect(php85).toContain('public const int TYPE_AND = 0;');
    expect(php85).toContain('public const int WIDTH_NARROW = 2;');
    expect(php85).toContain('public function format(array $strings): string|false');
    expect(php85).toContain('public function getErrorCode(): int');
    expect(php85).toContain('@throws IntlException when the locale or ICU version is unsupported');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['intl'] })).not.toContain('class IntlListFormatter {');
  });
  it('versions the Intl break iterator hierarchy, constants, and iterator interfaces', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'intl');
    const php81 = builtinPhpExtensionStub('8.1', 'intl');
    const php85 = builtinPhpExtensionStub('8.5', 'intl');
    expect(php72).toContain('class IntlBreakIterator implements Traversable {');
    expect(php72).toContain('public const WORD_LETTER = 200;');
    expect(php72).toContain('function getPartsIterator($key_type = IntlPartsIterator::KEY_SEQUENTIAL)');
    expect(php72).toContain('function __construct($rules, $areCompiled = false)');
    expect(php72).toContain('class IntlPartsIterator extends IntlIterator {');
    expect(php72).toContain('class IntlCodePointBreakIterator extends IntlBreakIterator {');
    expect(php72).not.toContain('function getIterator(): Iterator');
    const parts72 = php72.slice(php72.indexOf('class IntlPartsIterator'), php72.indexOf('class IntlCodePointBreakIterator'));
    expect(parts72).not.toContain('getRuleStatus');
    expect(php81).toContain('class IntlBreakIterator implements IteratorAggregate {');
    expect(php81).toContain('function getIterator(): Iterator');
    expect(php81).toContain('function getPartsIterator(string $type = IntlPartsIterator::KEY_SEQUENTIAL)');
    const parts81 = php81.slice(php81.indexOf('class IntlPartsIterator'), php81.indexOf('class IntlCodePointBreakIterator'));
    expect(parts81).toContain('function getRuleStatus()');
    expect(php81).toContain('/** @return ?bool */ public function setText(string $text)');
    expect(php85).toContain('public const int WORD_LETTER = 200;');
    expect(php85).toContain('public const int KEY_LEFT = 1;');
    expect(php85).toContain('/** @return bool */ public function setText(string $text)');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['intl'] })).not.toContain('class IntlBreakIterator implements');
  });
  it('versions UConverter signatures and constants without dropping callback error references', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'intl');
    const php85 = builtinPhpExtensionStub('8.5', 'intl');
    expect(php72).toContain('class UConverter {');
    expect(php72).toContain('public const UTF8 = 4;');
    expect(php72).toContain('function convert($str, $reverse = false)');
    expect(php72).toContain('function reasonText($reason = 0)');
    expect(php72).toContain('function toUCallback($reason, $source, $codeUnits, &$error)');
    expect(php85).toContain('public const int UTF8 = 4;');
    expect(php85).toContain('function transcode(string $str, string $toEncoding, string $fromEncoding, ?array $options = null)');
    expect(php85).toContain('function fromUCallback(int $reason, array $source, int $codePoint, &$error)');
    expect(php85).toContain('/** @return string|false */ public static function transcode(');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['intl'] })).not.toContain('class UConverter {');
  });
  it('uses runtime ICU values for IntlChar and keeps unknown dynamic values out of builtins', () => {
    const php72 = builtinPhpExtensionStub('7.2', 'intl');
    const php85 = builtinPhpExtensionStub('8.5', 'intl');
    expect(php72).toContain('class IntlChar {');
    expect(php72).toContain('public const CODEPOINT_MAX = 1114111;');
    expect(php72).toContain('public const NO_NUMERIC_VALUE = -123456789.0;');
    expect(php72).toContain('function charName($codepoint, $nameChoice = IntlChar::UNICODE_CHAR_NAME)');
    expect(php72).not.toContain('PROPERTY_IDS_UNARY_OPERATOR');
    expect(php72).not.toContain('UNICODE_VERSION =');
    expect(php85).toContain('public const int PROPERTY_IDS_UNARY_OPERATOR = 72;');
    expect(php85).toContain('public const float NO_NUMERIC_VALUE = -123456789.0;');
    expect(php85).toContain('/** @return ?string */ public static function chr(string|int $codepoint)');
    expect(php85).not.toContain('UNICODE_VERSION =');
    expect(builtinPhpExtensionStub('8.2', 'intl')).toContain('/** @return ?bool */ public static function enumCharNames(');
    expect(builtinPhpExtensionStub('8.3', 'intl')).toContain('/** @return bool */ public static function enumCharNames(');
    const values = { UNICODE_VERSION: '15.1', JG_COUNT: 104, BLOCK_CODE_COUNT: 329 };
    const actual = builtinPhpExtensionStub('8.5', 'intl', { intlCharConstants: values });
    expect(actual).toContain('public const string UNICODE_VERSION = "15.1";');
    expect(actual).toContain('public const int JG_COUNT = 104;');
    expect(actual).toContain('public const int BLOCK_CODE_COUNT = 329;');
    const uri = builtinDocumentUri('8.5', { intlCharConstants: values });
    expect(parseBuiltinDocumentUri(uri)).toEqual({ version: '8.5', disabledExtensions: [], intlCharConstants: {
      BLOCK_CODE_COUNT: 329, JG_COUNT: 104, UNICODE_VERSION: '15.1',
    } });
    expect(parseBuiltinDocumentUri(`${uri}&intlChar=malformed`)).toBeUndefined();
    expect(builtinPhpStub('8.5', { disabledExtensions: ['intl'], intlCharConstants: values })).not.toContain('class IntlChar {');
  });
  it('declares the complete configured target-version set', () => { expect(SUPPORTED_PHP_VERSIONS).toEqual(['7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5']); });
  it('returns the audited core and versioned reference signatures for every target version', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      expect(builtinPhpStub(version)).toContain('class DateTimeImmutable');
      expect(builtinPhpStub(version)).toContain(`function array_pop(array &$${version.startsWith('7.') ? 'stack' : 'array'})`);
    }
    expect(builtinPhpStub('7.4')).toContain('function sort(array &$arg, int $sort_flags = 0): bool');
    expect(builtinPhpStub('8.2')).toContain('function sort(array &$array, int $flags = 0): true');
    expect(builtinPhpStub('8.0')).toContain('@return TValue|null */ function array_pop(array &$array): mixed');
    expect(builtinPhpStub('7.4')).toContain('@return TValue|null */ function array_shift(array &$stack) {}');
    expect(builtinPhpStub('8.0')).toContain('@return list<TValue> */ function array_splice');
    expect(builtinPhpStub('8.0')).toContain('@param callable(TValue, TValue):int $callback');
    expect(builtinPhpStub('7.4')).toContain('function parse_str(string $encoded_string, array &$result = null): void');
    expect(builtinPhpStub('8.0')).toContain('function parse_str(string $string, array &$result): void');
    expect(builtinPhpStub('8.0')).toContain('array &$matches = null');
    expect(builtinPhpStub('7.2')).toContain('function array_push(array &$stack, $value, ...$values): int');
    expect(builtinPhpStub('7.3')).toContain('function array_push(array &$stack, ...$values): int');
    expect(builtinPhpStub('8.0')).toContain('function array_unshift(array &$array, mixed ...$values): int');
    expect(builtinPhpStub('7.4')).toContain('function array_splice(array &$arg, int $offset, int $length = null, $replacement = []): array');
    expect(builtinPhpStub('8.0')).toContain('function array_splice(array &$array, int $offset, ?int $length = null, mixed $replacement = []): array');
    expect(builtinPhpStub('7.4')).toContain('function usort(array &$arg, callable $cmp_function): bool');
    expect(builtinPhpStub('8.2')).toContain('function usort(array &$array, callable $callback): true');
    expect(builtinPhpStub('7.2')).toContain('function uasort(array &$arg, callable $cmp_function): bool');
    expect(builtinPhpStub('7.2')).toContain('function uksort(array &$arg, callable $cmp_function): bool');
    expect(builtinPhpStub('8.5')).toContain('function uasort(array &$array, callable $callback): true');
    expect(builtinPhpStub('8.5')).toContain('function uksort(array &$array, callable $callback): true');
    expect(builtinPhpStub('8.5')).toContain('@param callable(TKey, TKey):int $callback */ function uksort');
  });
  it('models the complete PCRE API, precise subject returns, and versioned callback flags', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      expect(stub).toContain('const PREG_UNMATCHED_AS_NULL = 512');
      expect(stub).toContain('const PREG_JIT_STACKLIMIT_ERROR = 6');
      expect(stub).toContain(`function preg_match_all(string $pattern, string $subject, array &$${Number(version) < 8 ? 'subpatterns' : 'matches'} = null`);
      expect(stub).toContain('function preg_filter(');
      expect(stub).toContain('function preg_grep(');
      expect(stub).toContain('function preg_replace_callback_array(');
      expect(stub).toContain('function preg_split(');
    }
    expect(builtinPhpStub('7.2')).toContain('@return int|false */ function preg_match(');
    expect(builtinPhpStub('7.2')).toContain('function preg_quote(string $str, string $delim_char = null)');
    expect(builtinPhpStub('7.2')).toContain('function preg_grep(string $regex, array $input, int $flags = 0)');
    expect(builtinPhpStub('7.2')).toContain('function preg_filter($regex, $replace, $subject, int $limit = -1');
    expect(builtinPhpStub('7.2')).toContain('function preg_replace($regex, $replace, $subject, int $limit = -1');
    expect(builtinPhpStub('7.2')).toContain('function preg_replace_callback($regex, callable $callback, $subject, int $limit = -1');
    expect(builtinPhpStub('8.0')).toContain('function preg_replace(array|string $pattern, array|string $replacement');
    expect(builtinPhpStub('7.2')).not.toContain('function preg_last_error_msg');
    expect(builtinPhpStub('8.0')).toContain('function preg_last_error_msg(): string');
    expect(builtinPhpStub('7.2')).not.toContain('int $flags = 0): array|string|null');
    expect(builtinPhpStub('7.4')).toContain('int &$count = null, int $flags = 0)');
    expect(builtinPhpStub('8.0')).toContain('string $subject, int $limit = -1, ?int &$count = null): string|null');
    expect(builtinPhpStub('8.0')).toContain('@return array<TKey, TValue>|false */ function preg_grep');
  });
  it('models the complete Error Handling API and PHP 8.2–8.5 boundaries', () => {
    const functions = ['debug_backtrace', 'debug_print_backtrace', 'error_clear_last', 'error_get_last', 'error_log',
      'error_reporting', 'restore_error_handler', 'restore_exception_handler', 'set_error_handler',
      'set_exception_handler', 'trigger_error', 'user_error'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of functions) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('const DEBUG_BACKTRACE_PROVIDE_OBJECT = 1; const DEBUG_BACKTRACE_IGNORE_ARGS = 2;');
      expect(stub).toContain('const E_USER_ERROR = 256; const E_USER_WARNING = 512; const E_USER_NOTICE = 1024;');
      expect(stub).toContain('array{type:int, message:string, file:string, line:int}|null');
      expect(stub).toContain('type?:string, args?:list<mixed>, object?:object');
    }
    const php72 = builtinPhpStub('7.2'); const php80 = builtinPhpStub('8.0');
    const php81 = builtinPhpStub('8.1'); const php82 = builtinPhpStub('8.2');
    const php83 = builtinPhpStub('8.3'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('function error_reporting($new_error_level = null)');
    expect(php72).toContain('function set_error_handler($error_handler, $error_types = E_ALL)');
    expect(php72).toContain('function error_log($message, $message_type = 0, $destination = null, $extra_headers = null)');
    expect(php72).not.toContain('function get_error_handler(');
    expect(php80).toContain('function error_reporting(?int $error_level = null): int');
    expect(php80).toContain('function set_error_handler(?callable $callback, int $error_levels = E_ALL)');
    expect(php80).toContain('function error_log(string $message, int $message_type = 0, ?string $destination = null, ?string $additional_headers = null): bool');
    expect(php81).toContain('function restore_error_handler(): bool');
    expect(php82).toContain('function restore_error_handler(): true');
    expect(php83).toContain('function trigger_error(string $message, int $error_level = E_USER_NOTICE): bool');
    expect(php84).toContain('function trigger_error(string $message, int $error_level = E_USER_NOTICE): true');
    expect(php83).toContain('const E_ALL = 32767;');
    expect(php84).toContain('/** @deprecated PHP 8.4. */ const E_STRICT = 2048;');
    expect(php84).toContain('const E_ALL = 30719;');
    expect(php84).not.toContain('function get_error_handler(');
    expect(php85).toContain('function get_error_handler(): ?callable');
    expect(php85).toContain('function get_exception_handler(): ?callable');
  });
  it('models the complete Output Control API, status shapes, and PHP 8.4 status flag', () => {
    const functions = ['flush', 'ob_clean', 'ob_end_clean', 'ob_end_flush', 'ob_flush', 'ob_get_clean',
      'ob_get_contents', 'ob_get_flush', 'ob_get_length', 'ob_get_level', 'ob_get_status', 'ob_implicit_flush',
      'ob_list_handlers', 'ob_start', 'output_add_rewrite_var', 'output_reset_rewrite_vars'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of functions) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('const PHP_OUTPUT_HANDLER_STDFLAGS = 112;');
      expect(stub).toContain('const PHP_OUTPUT_HANDLER_STARTED = 4096; const PHP_OUTPUT_HANDLER_DISABLED = 8192;');
      expect(stub).toContain('@return ($full_status is true ? list<array{name:string, type:int, flags:int, level:int, chunk_size:int, buffer_size:int, buffer_used:int}>');
      expect(stub).toContain('@return list<string> */ function ob_list_handlers()');
      expect(stub).toContain('@param (callable(string, int):string|false)|null');
    }
    const php72 = builtinPhpStub('7.2'); const php80 = builtinPhpStub('8.0');
    const php83 = builtinPhpStub('8.3'); const php84 = builtinPhpStub('8.4');
    expect(php72).toContain('function ob_implicit_flush($flag = true)');
    expect(php72).toContain('function ob_start($user_function = null, $chunk_size = 0, $flags = PHP_OUTPUT_HANDLER_STDFLAGS)');
    expect(php80).toContain('function ob_implicit_flush(bool $enable = true): void');
    expect(php80).toContain('function ob_start($callback = null, int $chunk_size = 0, int $flags = PHP_OUTPUT_HANDLER_STDFLAGS): bool');
    expect(php80).toContain('function ob_get_clean(): string|false');
    expect(php83).not.toContain('PHP_OUTPUT_HANDLER_PROCESSED');
    expect(php84).toContain('const PHP_OUTPUT_HANDLER_PROCESSED = 16384;');
  });
  it('models the complete Function Handling catalog and PHP 7.2–8.2 boundaries', () => {
    const functions = ['call_user_func', 'call_user_func_array', 'forward_static_call', 'forward_static_call_array',
      'func_get_arg', 'func_get_args', 'func_num_args', 'function_exists', 'get_defined_functions',
      'register_shutdown_function', 'register_tick_function', 'unregister_tick_function'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of functions) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('@return list<mixed> */ function func_get_args()');
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1'); const php82 = builtinPhpStub('8.2');
    expect(php72).toContain('@deprecated PHP 7.2; removed in PHP 8.0.');
    expect(php74).toContain('function create_function($args, $code)');
    expect(php80).not.toContain('function create_function(');
    expect(php74).toContain('function each(&$arr)');
    expect(php80).not.toContain('function each(');
    expect(php72).toContain('function call_user_func($function_name, ...$parameters)');
    expect(php80).toContain('function call_user_func(callable $callback, mixed ...$args): mixed');
    expect(php80).toContain('function func_get_arg(int $position): mixed');
    expect(php80).toContain('function register_shutdown_function(callable $callback, mixed ...$args): ?bool');
    expect(php81).toContain('function register_shutdown_function(callable $callback, mixed ...$args): ?bool');
    expect(php82).toContain('function register_shutdown_function(callable $callback, mixed ...$args): void');
  });
  it('models the complete Session catalog, handler contracts, and PHP 7.3/8.5 cookie boundaries', () => {
    const functions = ['session_abort', 'session_cache_expire', 'session_cache_limiter', 'session_commit',
      'session_create_id', 'session_decode', 'session_destroy', 'session_encode', 'session_gc',
      'session_get_cookie_params', 'session_id', 'session_module_name', 'session_name', 'session_regenerate_id',
      'session_register_shutdown', 'session_reset', 'session_save_path', 'session_set_cookie_params',
      'session_set_save_handler', 'session_start', 'session_status', 'session_unset', 'session_write_close'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of functions) expect(stub).toContain(`function ${name}(`);
      for (const name of ['SessionHandlerInterface', 'SessionIdInterface', 'SessionUpdateTimestampHandlerInterface']) {
        expect(stub).toContain(`interface ${name}`);
      }
      expect(stub).toContain('class SessionHandler implements SessionHandlerInterface, SessionIdInterface');
      expect(stub).toContain('const PHP_SESSION_DISABLED = 0; const PHP_SESSION_NONE = 1; const PHP_SESSION_ACTIVE = 2;');
      expect(stub).toContain('@return 0|1|2 */ function session_status()');
    }
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3');
    const php80 = builtinPhpStub('8.0'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('function session_set_cookie_params($lifetime, $path = \'\', $domain = \'\', $secure = false, $httponly = false)');
    expect(php72).not.toContain('samesite:string');
    expect(php73).toContain('array{lifetime:int, path:string, domain:string, secure:bool, httponly:bool, samesite:string}');
    expect(php80).toContain('function session_set_save_handler(SessionHandlerInterface $sessionhandler, bool $register_shutdown = true): bool');
    expect(php80).toContain('?callable $create_sid = null, ?callable $validate_sid = null, ?callable $update_timestamp = null');
    expect(php84).toContain('function session_set_cookie_params(array $lifetime_or_options): bool');
    expect(php84).not.toContain('partitioned:bool');
    expect(php85).toContain('secure:bool, partitioned:bool, httponly:bool, samesite:string');
    expect(php85).toContain('partitioned?:bool');
  });
  it('models the complete Network catalog and PHP 7.3–8.5 boundaries', () => {
    const commonFunctions = ['checkdnsrr', 'closelog', 'dns_check_record', 'dns_get_mx', 'dns_get_record',
      'fsockopen', 'gethostbyaddr', 'gethostbynamel', 'gethostbyname', 'gethostname', 'getmxrr',
      'getprotobyname', 'getprotobynumber', 'getservbyname', 'getservbyport', 'header',
      'header_register_callback', 'header_remove', 'headers_list', 'headers_sent', 'http_response_code',
      'inet_ntop', 'inet_pton', 'ip2long', 'long2ip', 'openlog', 'pfsockopen', 'setcookie',
      'setrawcookie', 'socket_get_status', 'socket_set_blocking', 'socket_set_timeout', 'syslog'];
    const dnsConstants = ['DNS_A', 'DNS_NS', 'DNS_CNAME', 'DNS_SOA', 'DNS_PTR', 'DNS_HINFO', 'DNS_CAA',
      'DNS_MX', 'DNS_TXT', 'DNS_SRV', 'DNS_NAPTR', 'DNS_AAAA', 'DNS_A6', 'DNS_ANY', 'DNS_ALL'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of commonFunctions) expect(stub).toContain(`function ${name}(`);
      for (const name of dnsConstants) expect(stub).toContain(`const ${name} =`);
      expect(stub).toContain('@return list<string> */ function headers_list()');
      expect(stub).toContain('@return list<string>|false */ function gethostbynamel(');
      expect(stub).toContain('@return resource|false */ function fsockopen(');
    }
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3');
    const php81 = builtinPhpStub('8.1'); const php82 = builtinPhpStub('8.2');
    const php83 = builtinPhpStub('8.3'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php72).not.toContain('function net_get_interfaces(');
    expect(php73).toContain('function net_get_interfaces()');
    expect(php73).toContain('unicast:list<array{flags:int, family:int, address?:string, netmask?:string, broadcast?:string}>');
    expect(php72).toContain("function setcookie($name, $value = '', $expires = 0");
    expect(php73).toContain("function setcookie($name, $value = '', $expires_or_options = 0");
    expect(php73).toContain('samesite?:string');
    expect(php81).toContain('function closelog(): bool');
    expect(php82).toContain('function closelog(): true');
    expect(php82).toContain('function openlog(string $prefix, int $flags, int $facility): true');
    expect(php82).toContain('function syslog(int $priority, string $message): true');
    for (const name of ['http_clear_last_response_headers', 'http_get_last_response_headers', 'request_parse_body']) {
      expect(php83).not.toContain(`function ${name}(`);
      expect(php84).toContain(`function ${name}(`);
    }
    expect(php83).toContain('function long2ip(int $ip): string|false');
    expect(php84).toContain('function long2ip(int $ip): string');
    expect(php84).toContain('@return array{0:array<string, mixed>, 1:array<string, mixed>}');
    expect(php84).not.toContain('partitioned?:bool');
    expect(php85).toContain('partitioned?:bool');
    expect(php84).not.toContain('@deprecated PHP 8.5; use stream_set_timeout().');
    expect(php85).toContain('@deprecated PHP 8.5; use stream_set_timeout().');
  });
  it('models the complete core math API, generic extrema, and PHP 8.4 rounding boundaries', () => {
    const functions = ['abs', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh', 'base_convert', 'bindec',
      'ceil', 'cos', 'cosh', 'decbin', 'dechex', 'decoct', 'deg2rad', 'exp', 'expm1', 'floor', 'fmod', 'hexdec',
      'hypot', 'intdiv', 'is_finite', 'is_infinite', 'is_nan', 'log', 'log10', 'log1p', 'max', 'min', 'octdec',
      'pi', 'pow', 'rad2deg', 'round', 'sin', 'sinh', 'sqrt', 'tan', 'tanh'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of functions) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('const M_PI = 3.141592653589793');
      expect(stub).toContain('const INF = 1.0e999; const NAN = 0.0 / 0.0');
      expect(stub).toContain('const PHP_ROUND_HALF_ODD = 4');
      expect(stub).toContain('@param array<array-key, TValue> $value_array');
      expect(stub).toContain('@param TValue ...$values');
    }
    expect(builtinPhpStub('7.4')).not.toContain('function fdiv(');
    expect(builtinPhpStub('8.0')).toContain('function fdiv(float $num1, float $num2): float');
    expect(builtinPhpStub('8.3')).not.toContain('function fpow(');
    expect(builtinPhpStub('8.4')).toContain('function fpow(float $num, float $exponent): float');
    expect(builtinPhpStub('8.3')).not.toContain('enum RoundingMode');
    expect(builtinPhpStub('8.4')).toContain('enum RoundingMode');
    expect(builtinPhpStub('8.4')).toContain('RoundingMode|int $mode = RoundingMode::HalfAwayFromZero');
    expect(builtinPhpStub('7.4')).toContain('@return TValue|false */ function max(array $value_array)');
    expect(builtinPhpStub('7.4')).toContain('function bindec(string $binary_number)');
    expect(builtinPhpStub('7.4')).toContain('function hypot(float $num1, float $num2)');
    expect(builtinPhpStub('7.4')).toContain('function round($number, int $precision = 0');
    expect(builtinPhpStub('8.0')).toContain('function bindec(string $binary_string): int|float');
    expect(builtinPhpStub('8.0')).toContain('@return TValue */ function max(array $value_array): mixed');
  });
  it('models the complete variable-handling API and its PHP 8 boundaries', () => {
    const shared = ['boolval', 'debug_zval_dump', 'doubleval', 'floatval', 'get_defined_vars', 'get_resource_type',
      'gettype', 'intval', 'print_r', 'settype', 'strval', 'var_dump', 'var_export'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of shared) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('@return ($return is true ? string : true)');
      expect(stub).toContain('@return ($return is true ? string : null)');
    }
    expect(builtinPhpStub('7.4')).not.toContain('function get_debug_type(');
    expect(builtinPhpStub('7.4')).not.toContain('function get_resource_id(');
    expect(builtinPhpStub('8.0')).toContain('function get_debug_type(mixed $value): string');
    expect(builtinPhpStub('8.0')).toContain('function get_resource_id($resource): int');
    expect(builtinPhpStub('8.3')).toContain('function print_r(mixed $value, bool $return = false): string|bool');
    expect(builtinPhpStub('8.4')).toContain('function print_r(mixed $value, bool $return = false): string|true');
    expect(builtinPhpStub('8.0')).toContain('function var_export(mixed $value, bool $return = false): ?string');
  });
  it('models runtime symbol and extension introspection with precise collection shapes', () => {
    const functions = ['define', 'defined', 'constant', 'function_exists', 'get_defined_functions',
      'get_defined_constants', 'get_loaded_extensions', 'extension_loaded', 'get_extension_funcs'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of functions) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('@return array{internal:list<string>, user:list<string>}');
      expect(stub).toContain('@return ($categorize is true ? array<string, array<string, mixed>> : array<string, mixed>)');
      expect(stub).toContain('@return list<string> */ function get_loaded_extensions');
      expect(stub).toContain('@return list<string>|false */ function get_extension_funcs');
    }
    expect(builtinPhpStub('7.4')).toContain('function get_defined_functions($exclude_disabled = false)');
    expect(builtinPhpStub('7.4')).toContain('function constant($const_name)');
    expect(builtinPhpStub('7.4')).toContain('@param bool|int|float|string|array|null|resource $value');
    expect(builtinPhpStub('8.0')).toContain('function get_defined_functions(bool $exclude_disabled = true): array');
    expect(builtinPhpStub('8.0')).toContain('function define(string $constant_name, $value, bool $case_insensitive = false): bool');
    expect(builtinPhpStub('8.0')).not.toContain('function define(string $constant_name, mixed $value');
    expect(builtinPhpStub('8.1')).toContain('function define(string $constant_name, mixed $value, bool $case_insensitive = false): bool');
    expect(builtinPhpStub('8.0')).toContain('function constant(string $name): mixed');
    expect(builtinPhpStub('8.0')).toContain('function get_extension_funcs(string $extension): array|false');
  });
  it('models runtime configuration and information APIs across PHP 7.2–8.5', () => {
    const shared = ['get_cfg_var', 'ini_get', 'ini_get_all', 'ini_set', 'ini_alter', 'ini_restore', 'get_include_path',
      'set_include_path', 'phpversion', 'php_sapi_name', 'php_uname', 'php_ini_scanned_files', 'php_ini_loaded_file',
      'memory_get_usage', 'memory_get_peak_usage'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of shared) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('const PHP_INI_USER = 1; const PHP_INI_PERDIR = 2; const PHP_INI_SYSTEM = 4; const PHP_INI_ALL = 7');
      expect(stub).toContain('@return ($details is true ? array<string, array{global_value:string|null, local_value:string|null, access:int}>|false : array<string, string|null>|false)');
    }
    expect(builtinPhpStub('7.3')).toContain('function restore_include_path()');
    expect(builtinPhpStub('7.4')).toContain('@deprecated PHP 7.4; removed in PHP 8.0.');
    expect(builtinPhpStub('8.0')).not.toContain('function restore_include_path()');
    expect(builtinPhpStub('8.0')).toContain('function ini_set(string $option, string $value): string|false');
    expect(builtinPhpStub('8.1')).toContain('function ini_set(string $option, string|int|float|bool|null $value): string|false');
    expect(builtinPhpStub('8.1')).not.toContain('function memory_reset_peak_usage');
    expect(builtinPhpStub('8.1')).not.toContain('function ini_parse_quantity');
    expect(builtinPhpStub('8.2')).toContain('function memory_reset_peak_usage(): void');
    expect(builtinPhpStub('8.2')).toContain('function ini_parse_quantity(string $shorthand): int');
  });
  it('models the remaining PHP Options/Info APIs with conditional and versioned results', () => {
    const shared = ['assert', 'assert_options', 'cli_get_process_title', 'cli_set_process_title', 'dl', 'gc_collect_cycles', 'gc_disable',
      'gc_enable', 'gc_enabled', 'gc_mem_caches', 'get_current_user', 'get_included_files', 'get_required_files',
      'get_resources', 'getenv', 'getlastmod', 'getmygid', 'getmyinode', 'getmypid', 'getmyuid', 'getopt',
      'getrusage', 'phpcredits', 'phpinfo', 'putenv', 'set_time_limit', 'sys_get_temp_dir', 'version_compare',
      'zend_version'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of shared) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('const INFO_GENERAL = 1; const INFO_CREDITS = 2');
      expect(stub).toContain('const INFO_LICENSE = 64; const INFO_ALL = -1');
      expect(stub).toContain('const CREDITS_QA = 64; const CREDITS_ALL = -1');
      expect(stub).toContain('const ASSERT_ACTIVE = 1; const ASSERT_CALLBACK = 2; const ASSERT_BAIL = 3; const ASSERT_WARNING = 4');
      expect(stub).toContain('@return array<int, resource> */ function get_resources');
      expect(stub).toContain('array<string, string> : string|false) */ function getenv');
      expect(stub).toContain('@return array<array-key, string|false|list<string|false>>|false */ function getopt');
      expect(stub).not.toContain('function zend_thread_id(');
    }
    expect(builtinPhpStub('7.2')).not.toContain('function gc_status(');
    expect(builtinPhpStub('7.2')).toContain('const ASSERT_QUIET_EVAL = 5; const ASSERT_EXCEPTION = 6');
    expect(builtinPhpStub('7.2')).toContain('function get_magic_quotes_gpc()');
    expect(builtinPhpStub('7.4')).toContain('@deprecated PHP 7.4; removed in PHP 8.0.');
    expect(builtinPhpStub('8.0')).not.toContain('function get_magic_quotes_gpc()');
    expect(builtinPhpStub('8.0')).not.toContain('function get_magic_quotes_runtime()');
    expect(builtinPhpStub('8.0')).not.toContain('const ASSERT_QUIET_EVAL');
    expect(builtinPhpStub('8.0')).toContain('const ASSERT_EXCEPTION = 5');
    expect(builtinPhpStub('7.3')).toContain('@return array{runs:int, collected:int, threshold:int, roots:int} */ function gc_status()');
    expect(builtinPhpStub('8.2')).toContain('@return array{runs:int, collected:int, threshold:int, roots:int} */ function gc_status(): array');
    expect(builtinPhpStub('8.3')).toContain('buffer_size:int, roots:int, application_time:float');
    expect(builtinPhpStub('7.4')).toContain('@return ($oper is null ? -1|0|1 : bool|null)');
    expect(builtinPhpStub('8.0')).toContain('@return ($operator is null ? -1|0|1 : bool)');
    expect(builtinPhpStub('8.0')).toContain('function phpinfo(int $flags = INFO_ALL): bool');
    expect(builtinPhpStub('8.1')).toContain('function phpcredits(int $flags = CREDITS_ALL): bool');
    expect(builtinPhpStub('8.2')).toContain('function phpinfo(int $flags = INFO_ALL): true');
    expect(builtinPhpStub('8.2')).not.toContain('@deprecated PHP 8.3. */ function assert_options');
    expect(builtinPhpStub('8.3')).toContain('@deprecated PHP 8.3. */ function assert_options');
    expect(builtinPhpStub('8.0')).toContain('function assert(mixed $assertion, Throwable|string|null $description = null): bool');
  });
  it('models the standard exception hierarchy and its PHP-version boundaries', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      expect(stub).toContain('class BadMethodCallException extends BadFunctionCallException');
      expect(stub).toContain('class InvalidArgumentException extends LogicException');
      expect(stub).toContain('class UnexpectedValueException extends RuntimeException');
      expect(stub).toContain('class DivisionByZeroError extends ArithmeticError');
      expect(stub).toContain('class ArgumentCountError extends TypeError');
      expect(stub).toContain('public function __toString(): string');
      expect(stub).toContain('final public function getMessage(): string');
      expect(stub).toContain('protected $message');
    }
    expect(builtinPhpStub('7.2')).toContain('class ParseError extends Error');
    expect(builtinPhpStub('7.2')).not.toContain('class CompileError');
    expect(builtinPhpStub('7.2')).not.toContain('class JsonException');
    expect(builtinPhpStub('7.3')).toContain('class ParseError extends CompileError');
    expect(builtinPhpStub('7.3')).toContain('class JsonException extends Exception');
    expect(builtinPhpStub('7.4')).not.toContain('class ValueError');
    for (const name of ['Exception', 'Error']) {
      expect(builtinPhpStub('7.2')).toMatch(new RegExp(`class ${name} implements Throwable \\{[\\s\\S]*?private function __clone\\(\\) \\{\\}`));
      expect(builtinPhpStub('8.0')).toMatch(new RegExp(`class ${name} implements Throwable \\{[\\s\\S]*?private function __clone\\(\\): void \\{\\}`));
    }
    expect(builtinPhpStub('8.0')).toContain('class UnhandledMatchError extends Error');
    expect(builtinPhpStub('8.0')).not.toContain('class FiberError');
    expect(builtinPhpStub('8.1')).toContain('final class FiberError extends Error');
    expect(builtinPhpStub('8.3')).not.toContain('class RequestParseBodyException');
    expect(builtinPhpStub('8.4')).toContain('class RequestParseBodyException extends Exception');
    expect(builtinPhpStub('7.4')).toContain('string $filename = __FILE__, int $lineno = __LINE__');
    expect(builtinPhpStub('8.0')).toContain('?string $filename = null, ?int $line = null');
  });
  it('models core iteration contracts and versioned object types without leaking future symbols', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      expect(stub).toContain('interface Iterator extends Traversable');
      expect(stub).toContain('interface ArrayAccess');
      expect(stub).toContain('interface Countable');
      expect(stub).toContain('interface JsonSerializable');
      expect(stub).toContain('final class Generator implements Iterator');
      expect(stub).toContain('final class Closure');
      expect(stub).toContain('class stdClass');
    }
    expect(builtinPhpStub('7.3')).not.toContain('class WeakReference');
    expect(builtinPhpStub('7.4')).toContain('class WeakReference');
    expect(builtinPhpStub('7.2')).toContain('function unserialize(string $serialized)');
    expect(builtinPhpStub('7.2')).toContain('function bindTo($newthis, $newscope');
    expect(builtinPhpStub('7.2')).toContain('function call(object $newthis, ...$parameters)');
    expect(builtinPhpStub('7.4')).toContain('function create(object $referent): WeakReference');
    expect(builtinPhpStub('8.0')).toContain('function bindTo($newThis, $newScope');
    expect(builtinPhpStub('8.0')).toContain('function create(object $object): WeakReference');
    expect(builtinPhpStub('7.4')).not.toContain('interface Stringable');
    expect(builtinPhpStub('8.0')).toContain('interface Stringable');
    expect(builtinPhpStub('8.0')).toContain('class WeakMap');
    expect(builtinPhpStub('8.0')).not.toContain('interface UnitEnum');
    expect(builtinPhpStub('8.3')).not.toContain('final class Deprecated');
    expect(builtinPhpStub('8.4')).toContain('final class Deprecated { public readonly ?string $message; public readonly ?string $since;');
    expect(builtinPhpStub('8.4')).not.toContain('final class NoDiscard');
    expect(builtinPhpStub('8.4')).not.toContain('final class DelayedTargetValidation');
    expect(builtinPhpStub('8.5')).toContain('final class NoDiscard { public readonly ?string $message;');
    expect(builtinPhpStub('8.5')).toContain('final class DelayedTargetValidation');
    expect(builtinPhpStub('7.2')).toContain('function is_iterable($var): bool');
    expect(builtinPhpStub('7.2')).toContain('function is_callable($var, $syntax_only = false');
    expect(builtinPhpStub('7.2')).toContain('function is_array($var)');
    expect(builtinPhpStub('8.0')).toContain('function is_iterable(mixed $value): bool');
    expect(builtinPhpStub('8.1')).toContain('function iterator_to_array(Traversable $iterator, bool $preserve_keys = true): array');
    expect(builtinPhpStub('8.1')).toContain('function iterator_count(Traversable $iterator): int');
    expect(builtinPhpStub('8.2')).toContain('function iterator_to_array(Traversable|array $iterator, bool $preserve_keys = true): array');
    expect(builtinPhpStub('8.2')).toContain('@param Traversable<TKey, TValue>|array<TKey, TValue> $iterator');
    expect(builtinPhpStub('7.4')).toContain('function get_class($object): string');
    expect(builtinPhpStub('8.0')).toContain('function get_class(object $object): string');
    expect(builtinPhpStub('7.4')).toContain('@return list<string>|null */ function get_class_methods($class)');
    expect(builtinPhpStub('7.2')).toContain('function iterator_to_array(Traversable $iterator, bool $use_keys = true): array');
    expect(builtinPhpStub('7.2')).toContain('function class_exists($classname, $autoload = true)');
    expect(builtinPhpStub('7.2')).toContain('function strlen(string $str): int');
    expect(builtinPhpStub('7.2')).toContain('function strcmp(string $str1, string $str2): int');
    expect(builtinPhpStub('8.0')).toContain('function strlen(string $string): int');
    expect(builtinPhpStub('8.0')).toContain('@return list<string> */ function get_class_methods(object|string $object_or_class): array');
    expect(builtinPhpStub('7.4')).not.toContain('function enum_exists');
    expect(builtinPhpStub('8.1')).toContain('function enum_exists(string $enum, bool $autoload = true): bool');
    expect(builtinPhpStub('7.2')).toContain('function class_alias($user_class_name, $alias_name, $autoload = true)');
    expect(builtinPhpStub('7.2')).toContain('function get_called_class() {}');
    expect(builtinPhpStub('8.5')).toContain('function class_alias(string $class, string $alias, bool $autoload = true): bool');
    expect(builtinPhpStub('8.5')).toContain('function get_called_class(): string');
    expect(builtinPhpStub('7.2')).not.toContain('function get_mangled_object_vars(');
    expect(builtinPhpStub('7.3')).not.toContain('function get_mangled_object_vars(');
    expect(builtinPhpStub('7.4')).toContain('function get_mangled_object_vars($obj) {}');
    expect(builtinPhpStub('8.0')).toContain('function get_mangled_object_vars(object $object): array {}');
    expect(builtinPhpStub('7.2')).toContain('/** @return bool */ function is_string($var) {}');
    expect(builtinPhpStub('8.0')).toContain('function is_string(mixed $value): bool {}');
    expect(builtinPhpStub('7.2')).not.toContain('function is_countable');
    expect(builtinPhpStub('7.3')).toContain('function is_countable($value) {}');
    expect(builtinPhpStub('7.4')).toContain('function is_real($var) {}');
    expect(builtinPhpStub('8.0')).not.toContain('function is_real');
    expect(builtinPhpStub('8.1')).toContain('interface UnitEnum');
    expect(builtinPhpStub('8.1')).toContain('interface BackedEnum extends UnitEnum');
  });
  it('versions core attribute classes, flags, and target metadata', () => {
    const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0');
    const php81 = builtinPhpStub('8.1');
    const php82 = builtinPhpStub('8.2');
    const php83 = builtinPhpStub('8.3');
    const php84 = builtinPhpStub('8.4');
    const php85 = builtinPhpStub('8.5');
    expect(php74).not.toContain('final class Attribute {');
    expect(php80).toContain('final class Attribute {');
    expect(php80).toContain('public int $flags;');
    expect(php80).toContain('public const TARGET_ALL = 63;');
    expect(php80).toContain('public const IS_REPEATABLE = 64;');
    expect(php80).toContain('public function __construct(int $flags = Attribute::TARGET_ALL)');
    expect(php80).not.toContain('class ReturnTypeWillChange');
    expect(php81).toContain('final class ReturnTypeWillChange { public function __construct() {} }');
    expect(php81).not.toContain('class AllowDynamicProperties');
    expect(php82).toContain('final class AllowDynamicProperties { public function __construct() {} }');
    expect(php82).not.toContain('final class Override');
    expect(php83).toContain('final class Override { public function __construct() {} }');
    expect(php83).toContain('Attribute::TARGET_METHOD)]\nfinal class Override');
    expect(php84).toContain('public const int TARGET_ALL = 63;');
    expect(php84).toContain('public const int IS_REPEATABLE = 64;');
    expect(php84).not.toContain('TARGET_CONSTANT =');
    expect(php84).toContain('Attribute::TARGET_CLASS_CONSTANT)]\nfinal class Deprecated');
    expect(php85).toContain('public const int TARGET_CONSTANT = 64;');
    expect(php85).toContain('public const int TARGET_ALL = 127;');
    expect(php85).toContain('public const int IS_REPEATABLE = 128;');
    expect(php85).toContain('Attribute::TARGET_METHOD|\\Attribute::TARGET_PROPERTY)]\nfinal class Override');
    const overrideAnnotation = php85.slice(php85.lastIndexOf('#[', php85.indexOf('final class Override')), php85.indexOf('final class Override'));
    expect(overrideAnnotation).not.toContain('TARGET_CLASS_CONSTANT');
    expect(php85).toContain('Attribute::TARGET_CLASS_CONSTANT|\\Attribute::TARGET_CONSTANT|\\Attribute::TARGET_CLASS)]\nfinal class Deprecated');
  });
  it('versions remaining core iterators, stream classes, and incomplete objects', () => {
    const php72 = builtinPhpStub('7.2');
    const php80 = builtinPhpStub('8.0');
    const php81 = builtinPhpStub('8.1');
    const php84 = builtinPhpStub('8.4');
    for (const stub of [php72, php80, php81, php84]) {
      expect(stub).toContain('class ClosedGeneratorException extends Exception');
      expect(stub).toContain('class RecursiveArrayIterator extends ArrayIterator implements RecursiveIterator');
      expect(stub).toContain('CHILD_ARRAYS_ONLY = 4;');
      expect(stub).toContain('class php_user_filter {');
    }
    expect(php72).not.toContain('class InternalIterator');
    expect(php72).toContain('class __PHP_Incomplete_Class {}');
    expect(php72).not.toContain('final class __PHP_Incomplete_Class');
    expect(php72).not.toContain('class StreamBucket');
    expect(php80).toContain('final class InternalIterator implements Iterator');
    expect(php80).toContain('final class __PHP_Incomplete_Class');
    expect(php80).toContain('public function filter($in, $out, &$consumed, bool $closing)');
    expect(php81).toContain("public string $filtername = '';");
    expect(php81).toContain("public mixed $params = '';");
    expect(php81).toContain('public $stream = null;');
    expect(php81).not.toContain('class StreamBucket');
    expect(php84).toContain('public const int CHILD_ARRAYS_ONLY = 4;');
    expect(php84).toContain('final class StreamBucket {');
    expect(php84).toContain('public int $dataLength;');
  });
  it('provides Filter exception types only when PHP 8.5 Filter is available', () => {
    expect(filterClassesPhpStub('8.4')).toBe('');
    const php85 = filterClassesPhpStub('8.5');
    expect(php85).toContain('namespace Filter;');
    expect(php85).toContain('class FilterException extends \\Exception');
    expect(php85).toContain('class FilterFailedException extends FilterException');
    expect(filterClassesPhpStub('8.5', { disabledExtensions: ['filter'] })).toBe('');
    const uri = filterClassesDocumentUri('8.5', { disabledExtensions: ['ctype'] });
    expect(parseFilterClassesDocumentUri(uri)).toMatchObject({ version: '8.5', disabledExtensions: ['ctype'] });
    expect(isBuiltinDocumentUri(uri)).toBe(true);
  });
  it('models Fiber and sensitive-parameter runtime objects at their exact version boundaries', () => {
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1'); const php82 = builtinPhpStub('8.2');
    expect(php80).not.toContain('class Fiber {');
    expect(php80).not.toContain('class ReflectionFiber {');
    expect(php81).toContain('final class Fiber {');
    expect(php81).toContain('public function start(mixed ...$args): mixed');
    expect(php81).toContain('public static function getCurrent(): ?Fiber');
    expect(php81).toContain('final class ReflectionFiber {');
    expect(php81).toContain('public function __construct(Fiber $fiber)');
    expect(php81).toContain('public function getExecutingFile(): ?string');
    expect(php81).toContain('public function getTrace(int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT): array');
    expect(php81).not.toContain('class SensitiveParameter {');
    expect(php82).toContain('#[\\Attribute(\\Attribute::TARGET_PARAMETER)]\nfinal class SensitiveParameter { public function __construct() {} }');
    expect(php82).toContain('final class SensitiveParameterValue {');
    expect(php82).toContain('public function getValue(): mixed');
    expect(php82).toContain('public function __debugInfo(): array');
  });
  it('completes the versioned SPL function catalog and preserves collection shapes', () => {
    const catalog = `class_implements class_parents class_uses iterator_apply iterator_count iterator_to_array
      spl_autoload spl_autoload_call spl_autoload_extensions spl_autoload_functions spl_autoload_register
      spl_autoload_unregister spl_classes spl_object_hash spl_object_id`.split(/\s+/);
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of catalog) expect(stub).toContain(`function ${name}(`);
    }
    const php72 = builtinPhpStub('7.2'); const php80 = builtinPhpStub('8.0'); const php82 = builtinPhpStub('8.2');
    expect(php72).toContain('function class_implements($what, $autoload = true)');
    expect(php72).toContain('function class_parents($instance, $autoload = true)');
    expect(php72).toContain('@return list<callable>|false */ function spl_autoload_functions()');
    expect(php72).toContain('function iterator_apply(Traversable $iterator, $function, ?array $args = null)');
    expect(php80).toContain('function class_implements(object|string $object_or_class, bool $autoload = true): array|false');
    expect(php80).toContain('@return list<callable> */ function spl_autoload_functions(): array');
    expect(php80).toContain('function spl_autoload(string $class, ?string $file_extensions = null): void');
    expect(php80).toContain('function spl_autoload_register(?callable $callback = null, bool $throw = true, bool $prepend = false): bool');
    expect(php80).toContain('@return array<class-string, class-string> */ function spl_classes(): array');
    expect(php80).toContain('function spl_object_id(object $object): int');
    expect(php80).toContain('function iterator_count(Traversable $iterator): int');
    expect(php82).toContain('function iterator_count(Traversable|array $iterator): int');
  });
  it('models the SPL file classes and their PHP 7/8/8.5 signature boundaries', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      expect(stub).toContain('class SplFileInfo');
      expect(stub).toContain('class SplFileObject extends SplFileInfo');
      expect(stub).toContain('class SplTempFileObject extends SplFileObject');
      expect(stub).toContain('@return string|list<string|null>|false */ public function current()');
      expect(stub).toContain('@return array{0:string, 1:string, 2:string} */ public function getCsvControl()');
      expect(stub).toContain('/** @return false */ public function hasChildren()');
      expect(stub).toContain('public function __construct(');
    }
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3');
    const php74 = builtinPhpStub('7.4'); const php80 = builtinPhpStub('8.0');
    const php81 = builtinPhpStub('8.1'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('public function __construct($file_name)');
    expect(php72).toContain('public function fgetss($allowable_tags = null)');
    expect(php72).toContain('/** @return int */ public function fwrite($str, $length = null)');
    expect(php73).toContain('@deprecated PHP 7.3');
    expect(php74).toContain('/** @return int|false */ public function fwrite($str, $length = null)');
    expect(php80).toContain('class SplFileInfo implements Stringable');
    expect(php80).toContain('class SplFileObject extends SplFileInfo implements RecursiveIterator, SeekableIterator, Stringable');
    expect(php80).not.toContain('function fgetss(');
    expect(php80).toContain('public function fputcsv(array $fields, string $separator');
    expect(php80).not.toContain('string $eol = "\\n"');
    expect(php81).toContain('string $eol = "\\n"');
    expect(php85).toContain('public function fwrite(string $data, ?int $length = null)');
  });
  it('completes ArrayObject and ArrayIterator with generics and versioned member signatures', () => {
    const arrayObjectMethods = `__construct append asort count exchangeArray getArrayCopy getFlags getIterator
      getIteratorClass ksort natcasesort natsort offsetExists offsetGet offsetSet offsetUnset serialize setFlags
      setIteratorClass uasort uksort unserialize`.split(/\s+/);
    const arrayIteratorMethods = `__construct append asort count current getArrayCopy getFlags key ksort natcasesort natsort
      next offsetExists offsetGet offsetSet offsetUnset rewind seek serialize setFlags uasort uksort unserialize valid`.split(/\s+/);
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      const object = stub.slice(stub.indexOf('class ArrayObject'), stub.indexOf('class ArrayIterator'));
      const iterator = stub.slice(stub.indexOf('class ArrayIterator'), stub.indexOf('function get_class'));
      for (const method of arrayObjectMethods) expect(object).toContain(`function ${method}(`);
      for (const method of arrayIteratorMethods) expect(iterator).toContain(`function ${method}(`);
      expect(object).toContain('@return array<TKey, TValue> */ public function getArrayCopy()');
      expect(object).toContain('@return Iterator<TKey, TValue> */ public function getIterator()');
      expect(iterator).toContain('/** @return TValue */ public function current()');
      expect(iterator).toContain('/** @return TKey|null */ public function key()');
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php82 = builtinPhpStub('8.2'); const php84 = builtinPhpStub('8.4');
    expect(php72).toContain("function __construct($input = [], $flags = 0, $iterator_class = 'ArrayIterator')");
    expect(php72).toContain('function __construct($array = [], $ar_flags = 0)');
    expect(php72).toContain('function exchangeArray($array)');
    expect(php72).toContain('function seek($position)');
    expect(php72).not.toContain('function __serialize()');
    expect(php74).toContain('function exchangeArray($input)');
    expect(php74).toContain('function __serialize()');
    expect(php74).toContain('function __unserialize($serialized)');
    expect(php80).toContain("function __construct(array|object $array = [], int $flags = 0, string $iteratorClass = 'ArrayIterator')");
    expect(php80).toContain('function asort(int $flags = SORT_REGULAR)');
    expect(php80).toContain('function seek(int $offset)');
    expect(php81).toContain('* @return bool */ public function uasort(callable $callback)');
    expect(php82).toContain('* @return true */ public function uasort(callable $callback)');
    expect(php82).toContain('/** @return true */ public function natcasesort()');
    expect(php82).toContain('public const STD_PROP_LIST = 1');
    expect(php84).toContain('public const int STD_PROP_LIST = 1');
  });
  it('models SplObjectStorage and SplFixedArray generics across their PHP 7 and 8 interface changes', () => {
    const storageMethods = `attach detach contains addAll removeAll removeAllExcept getInfo setInfo getHash count rewind valid
      key current next unserialize serialize offsetExists offsetSet offsetUnset offsetGet`.split(/\s+/);
    const fixedCommon = `__construct __wakeup count toArray fromArray getSize setSize offsetExists offsetGet offsetSet offsetUnset`.split(/\s+/);
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      const storage = stub.slice(stub.indexOf('class SplObjectStorage'), stub.indexOf('class SplFixedArray'));
      const fixed = stub.slice(stub.indexOf('class SplFixedArray'), stub.indexOf('class SplDoublyLinkedList'));
      for (const method of storageMethods) expect(storage).toContain(`function ${method}(`);
      for (const method of fixedCommon) expect(fixed).toContain(`function ${method}(`);
      expect(storage).toContain('/** @return TObject */ public function current()');
      expect(storage).toContain('* @return TInfo|null */ public function offsetGet($object)');
      expect(fixed).toContain('/** @return array<int, TValue|null> */ public function toArray()');
      expect(fixed).toContain('* @return SplFixedArray<TFrom> */');
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php82 = builtinPhpStub('8.2'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('function attach($object, $inf = null)');
    expect(php72).toContain('function count()');
    expect(php72).toContain('class SplFixedArray implements Iterator, ArrayAccess, Countable');
    expect(php72).toContain('function fromArray($data, $save_indexes = true)');
    expect(php72).toContain('function setSize($value)');
    expect(php72).not.toContain('class SplObjectStorage implements Countable, SeekableIterator');
    expect(php74).toContain('function attach($object, $data = null)');
    expect(php74).toContain('function __debugInfo()');
    expect(php74).toContain('function fromArray($array, $save_indexes = true)');
    expect(php80).toContain('function attach(object $object, mixed $info = null)');
    expect(php80).toContain('function count(int $mode = COUNT_NORMAL)');
    expect(php80).toContain('class SplFixedArray implements IteratorAggregate, ArrayAccess, Countable');
    expect(php80).toContain('function getIterator(): Iterator');
    expect(php80).not.toContain('class SplFixedArray implements IteratorAggregate, ArrayAccess, Countable, JsonSerializable');
    expect(php81).toContain('class SplFixedArray implements IteratorAggregate, ArrayAccess, Countable, JsonSerializable');
    expect(php81).toContain('function jsonSerialize(): array');
    const fixed81 = php81.slice(php81.indexOf('class SplFixedArray'), php81.indexOf('class SplDoublyLinkedList'));
    expect(fixed81).not.toContain('function __serialize()');
    expect(php82).toContain('function __serialize(): array');
    expect(php82).toContain('function __unserialize(array $data): void');
    expect(php84).toContain('class SplObjectStorage implements Countable, SeekableIterator, Serializable, ArrayAccess');
    expect(php84).toContain('function seek(int $offset): void');
    expect(php84).toContain('@deprecated PHP 8.4; use __unserialize().');
    expect(php84).toContain('/** @return true */ public function setSize(int $size)');
    expect(php84).not.toContain('@deprecated PHP 8.5; use offsetSet().');
    expect(php85).toContain('@deprecated PHP 8.5; use offsetSet().');
    expect(php85).toContain('@deprecated PHP 8.5; use offsetExists().');
    expect(php85).toContain('@deprecated PHP 8.5; use offsetUnset().');
  });
  it('models generic SplDoublyLinkedList, SplQueue, and SplStack contracts across PHP 7.2 to 8.5', () => {
    const commonMethods = `add bottom count current getIteratorMode isEmpty key next offsetExists offsetGet offsetSet offsetUnset
      pop prev push rewind serialize setIteratorMode shift top unserialize unshift valid`.split(/\s+/);
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      const linked = stub.slice(stub.indexOf('class SplDoublyLinkedList'), stub.indexOf('class SplQueue'));
      const queue = stub.slice(stub.indexOf('class SplQueue'), stub.indexOf('class SplStack'));
      for (const method of commonMethods) expect(linked).toContain(`function ${method}(`);
      expect(stub).toContain('@template-implements Iterator<int, TValue>');
      expect(linked).toContain('* @return TValue */ public function current()');
      expect(linked).toContain('* @return TValue */ public function offsetGet($index)');
      expect(stub).toContain('@template-extends SplDoublyLinkedList<TValue>');
      expect(queue).toContain('/** @return TValue */ public function dequeue()');
      expect(stub).toContain('class SplStack extends SplDoublyLinkedList');
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php84 = builtinPhpStub('8.4');
    expect(php72).toContain('public const IT_MODE_LIFO = 2');
    expect(php72).toContain('function add($index, $newval)');
    expect(php72).toContain('function setIteratorMode($flags)');
    expect(php72).toContain('* @return true */ public function push($value)');
    expect(php72).toContain('* @return true */ public function enqueue($value)');
    expect(php72).not.toContain('array{0:int, 1:list<TValue>, 2:array}');
    expect(php74).toContain('function setIteratorMode($mode)');
    expect(php74).toContain('/** @return array{0:int, 1:list<TValue>, 2:array} */ public function __serialize()');
    expect(php74).toContain('function __unserialize($serialized)');
    expect(php80).toContain('function add(int $index, mixed $value)');
    expect(php80).toContain('* @return void */ public function push(mixed $value)');
    expect(php80).toContain('* @return void */ public function enqueue(mixed $value)');
    expect(php80).toContain('function __unserialize(array $data)');
    expect(php84).toContain('public const int IT_MODE_LIFO = 2');
  });
  it('models generic SPL heaps and priority extraction results across PHP 7.2 to 8.5', () => {
    const heapMethods = `extract insert top count isEmpty rewind current key next valid recoverFromCorruption isCorrupted compare`.split(/\s+/);
    const priorityMethods = `compare insert setExtractFlags getExtractFlags top extract count isEmpty rewind current key next valid
      recoverFromCorruption isCorrupted`.split(/\s+/);
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      const heap = stub.slice(stub.indexOf('abstract class SplHeap'), stub.indexOf('class SplMinHeap'));
      const priority = stub.slice(stub.indexOf('class SplPriorityQueue'), stub.indexOf('function get_class'));
      for (const method of heapMethods) expect(heap).toContain(`function ${method}(`);
      for (const method of priorityMethods) expect(priority).toContain(`function ${method}(`);
      expect(stub).toContain('@template-extends SplHeap<TValue>');
      expect(heap).toContain('/** @return TValue */ public function extract()');
      expect(heap).toContain('* @return true */ public function insert');
      expect(priority).toContain('* @return TValue|TPriority|array{data:TValue, priority:TPriority} */ public function current()');
      expect(priority).toContain('* @return true */ public function insert');
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('abstract protected function compare()');
    expect(php72).toContain('protected function compare($a, $b)');
    expect(php72).toContain('public function compare($a, $b)');
    expect(php72).not.toContain('heap_elements:list<TValue>');
    expect(php74).toContain('protected function compare($value1, $value2)');
    expect(php74).toContain('public function compare($value1, $value2)');
    expect(php74).toContain('array<string, bool|int|list<TValue>>');
    expect(php80).toContain('abstract protected function compare(mixed $value1, mixed $value2)');
    expect(php80).toContain('public function compare(mixed $priority1, mixed $priority2)');
    expect(php80).toContain('public function setExtractFlags(int $flags)');
    expect(php84).toContain('public const int EXTR_BOTH = 3');
    expect(php85).toContain('array{0:array, 1:array{flags:int, heap_elements:list<TValue>}}');
    expect(php85).toContain('heap_elements:list<array{data:TValue, priority:TPriority}>');
    expect(php85).toContain('function __unserialize(array $data)');
  });
  it('models SplObserver and SplSubject parameter and return boundaries across PHP 7.2 to 8.5', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      expect(stub).toContain('interface SplObserver');
      expect(stub).toContain('interface SplSubject');
      expect(stub).toContain('/** @return void */ public function notify()');
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('function update(SplSubject $SplSubject);');
    expect(php72).toContain('function attach(SplObserver $SplObserver);');
    expect(php74).toContain('function update(SplSubject $subject);');
    expect(php74).toContain('function detach(SplObserver $observer);');
    expect(php80).toContain('function notify();');
    expect(php80).not.toContain('function notify(): void;');
    expect(php81).toContain('function update(SplSubject $subject): void;');
    expect(php81).toContain('function attach(SplObserver $observer): void;');
    expect(php85).toContain('function notify(): void;');
  });
  it('models generic MultipleIterator keys, values, flags, and failure boundaries across PHP 7.2 to 8.5', () => {
    const methods = `getFlags setFlags attachIterator detachIterator containsIterator countIterators rewind valid key current next`.split(/\s+/);
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      const multiple = stub.slice(stub.indexOf('class MultipleIterator'), stub.indexOf('function get_class'));
      for (const method of methods) expect(multiple).toContain(`function ${method}(`);
      expect(stub).toContain('@template-implements Iterator<array<array-key, TInnerKey|null>, array<array-key, TValue|null>>');
      expect(multiple).toContain('@param Iterator<TInnerKey, TValue> $iterator');
      expect(multiple).toMatch(/public const (?:int )?MIT_NEED_ANY = 0/);
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1'); const php84 = builtinPhpStub('8.4');
    expect(php72).toContain('function __construct($flags = 1)');
    expect(php72).toContain('function attachIterator(Iterator $iterator, $infos = null)');
    expect(php72).toContain('@return array<array-key, TValue|null>|false */ public function current()');
    expect(php72).not.toContain('function __debugInfo()');
    expect(php74).toContain('array{obj:Iterator<TInnerKey, TValue>, inf:int|string|null}');
    expect(php80).toContain('function __construct(int $flags = 1)');
    expect(php80).toContain('function attachIterator(Iterator $iterator, string|int|null $info = null)');
    expect(php80).toContain('@return array<array-key, TInnerKey|null>|false */ public function key()');
    expect(php81).toContain('@return array<array-key, TValue|null> */ public function current(): array');
    expect(php81).toContain('function setFlags(int $flags): void');
    expect(php84).toContain('public const int MIT_KEYS_ASSOC = 2');
  });
  it('models generic SPL iterator adapters and their audited PHP version boundaries', () => {
    const adapterClasses = [
      'IteratorIterator', 'FilterIterator', 'CallbackFilterIterator', 'RecursiveFilterIterator',
      'ParentIterator', 'RecursiveCallbackFilterIterator', 'LimitIterator', 'NoRewindIterator',
      'InfiniteIterator', 'AppendIterator', 'EmptyIterator',
    ];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of adapterClasses) expect(stub).toContain(`class ${name}`);
      expect(stub).toContain('@template-implements OuterIterator<TKey, TValue>');
      expect(stub).toContain('@template-extends IteratorIterator<TKey, TValue>');
      expect(stub).toContain('@template-implements RecursiveIterator<TKey, TValue>');
      expect(stub).toContain('@param callable(TValue, TKey, Iterator<TKey, TValue>):bool $callback');
      expect(stub).toContain('@return ArrayIterator<int, Iterator<TKey, TValue>>');
      expect(stub).toContain('@template-implements Iterator<never, never>');
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1'); const php82 = builtinPhpStub('8.2');
    expect(php72).toContain('interface SeekableIterator extends Iterator { /** @return void */ public function seek($position); }');
    expect(php74).toContain('interface SeekableIterator extends Iterator { /** @return void */ public function seek(int $position); }');
    expect(php80).toContain('interface SeekableIterator extends Iterator { /** @return void */ public function seek(int $offset); }');
    expect(php81).toContain('interface SeekableIterator extends Iterator { /** @return void */ public function seek(int $offset): void; }');
    expect(php72).toContain('public function __construct(Traversable $iterator) {}');
    expect(php72).not.toContain('public function __construct(Traversable $iterator, ?string $class = null) {}');
    expect(php80).toContain('public function __construct(Traversable $iterator, ?string $class = null) {}');
    expect(php72).toContain('public function __construct(Iterator $iterator, $offset = 0, $count = -1) {}');
    expect(php72).toContain('public function seek($position) {}');
    expect(php80).toContain('public function __construct(Iterator $iterator, int $offset = 0, int $limit = -1) {}');
    expect(php80).toContain('public function seek(int $offset) {}');
    expect(php81).toContain('public function seek(int $offset): int {}');
    expect(php72).toContain('public function __construct(Iterator $iterator, $callback) {}');
    expect(php80).toContain('public function __construct(Iterator $iterator, callable $callback) {}');
    expect(php81).toContain('@return static|null */ public function getChildren(): ?RecursiveFilterIterator {}');
    expect(php81).toContain('@return static */ public function getChildren(): RecursiveCallbackFilterIterator {}');
    expect(php72).toContain('@return never */ public function current() {}');
    expect(php81).toContain('@return never */ public function current(): never {}');
    expect(php81).toContain('@return false */ public function valid(): bool {}');
    expect(php82).toContain('@return false */ public function valid(): false {}');
  });
  it('models Date/Time objects, factories, return contracts, and PHP 8.3 exceptions by target version', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      expect(stub).toContain('class DateTime implements DateTimeInterface');
      expect(stub).toContain('class DateTimeImmutable implements DateTimeInterface');
      expect(stub).toContain('class DateTimeZone');
      expect(stub).toContain('class DateInterval');
      expect(stub).toContain('class DatePeriod implements');
      expect(stub).toContain('public function __construct(DateTimeInterface $start, DateInterval $interval, int $recurrences, int $options = 0)');
      expect(stub).toContain('public function __construct(DateTimeInterface $start, DateInterval $interval, DateTimeInterface $end, int $options = 0)');
      expect(stub).toContain('public function __construct(string $isostr, int $options = 0)');
      expect(stub).toContain('public const ATOM');
      expect(stub).toContain('/** @return DateTimeImmutable|false */ public static function createFromFormat');
    }
    expect(builtinPhpStub('7.2')).not.toContain('createFromImmutable');
    expect(builtinPhpStub('7.3')).toContain('createFromImmutable(DateTimeImmutable $DateTimeImmutable): DateTime');
    expect(builtinPhpStub('8.0')).toContain('createFromImmutable(DateTimeImmutable $object): static');
    expect(builtinPhpStub('7.2')).toContain("__construct(string $time = 'now', ?DateTimeZone $timezone = null)");
    expect(builtinPhpStub('7.2')).toContain('setTime(int $hour, int $minute, int $second = 0, int $microseconds = 0)');
    expect(builtinPhpStub('7.2')).toContain('diff(DateTimeInterface $object, bool $absolute = false)');
    expect(builtinPhpStub('7.2')).toContain('listIdentifiers(int $what = 2047, ?string $country = null)');
    expect(builtinPhpStub('8.0')).toContain('diff(DateTimeInterface $targetObject, bool $absolute = false)');
    expect(builtinPhpStub('7.4')).not.toContain('createFromInterface');
    expect(builtinPhpStub('8.0')).toContain('createFromInterface(DateTimeInterface $object)');
    expect(builtinPhpStub('8.1')).not.toContain('ISO8601_EXPANDED');
    expect(builtinPhpStub('8.2')).toContain('ISO8601_EXPANDED');
    expect(builtinPhpStub('8.1')).not.toContain('INCLUDE_END_DATE');
    expect(builtinPhpStub('8.2')).toContain('public const INCLUDE_END_DATE = 2');
    expect(builtinPhpStub('8.1')).not.toContain('public readonly ?DateTimeInterface $start;');
    expect(builtinPhpStub('8.2')).toContain('public readonly ?DateTimeInterface $start;');
    expect(builtinPhpStub('8.2')).toContain('public readonly ?DateTimeInterface $current;');
    expect(builtinPhpStub('8.2')).toContain('public readonly bool $include_end_date;');
    expect(builtinPhpStub('8.4')).toContain('public const int INCLUDE_END_DATE = 2;');
    expect(builtinPhpStub('8.4')).toContain('public const int AFRICA = 1;');
    expect(builtinPhpStub('8.4')).toContain('public const int ALL_WITH_BC = 4095;');
    expect(builtinPhpStub('7.2')).toContain('public const PER_COUNTRY = 4096;');
    expect(builtinPhpStub('8.4')).not.toContain('public static function getCurrent(): Closure');
    expect(builtinPhpStub('8.5')).toContain('public static function getCurrent(): Closure');
    expect(builtinPhpStub('8.2')).toContain('/** @return DateTime|false */ public function modify');
    expect(builtinPhpStub('8.3')).toContain('/** @return DateTime */ public function modify');
    expect(builtinPhpStub('8.4')).not.toContain('#[\\NoDiscard("as DateTimeImmutable::modify()');
    expect(builtinPhpStub('8.5')).toContain('#[\\NoDiscard("as DateTimeImmutable::modify() does not modify the object itself")] public function modify');
    expect(builtinPhpStub('8.2')).toContain('/** @return DateInterval|false */ public static function createFromDateString');
    expect(builtinPhpStub('8.3')).toContain('/** @return DateInterval */ public static function createFromDateString');
    expect(builtinPhpStub('8.2')).not.toContain('class DateMalformedStringException');
    expect(builtinPhpStub('8.3')).toContain('class DateMalformedStringException extends DateException');
    expect(builtinPhpStub('8.2')).not.toContain('createFromISO8601String');
    expect(builtinPhpStub('8.3')).toContain('createFromISO8601String(string $specification, int $options = 0): static');
    expect(builtinPhpStub('8.3')).not.toContain('createFromTimestamp');
    expect(builtinPhpStub('8.4')).toContain('createFromTimestamp(int|float $timestamp): static');
    expect(builtinPhpStub('8.3')).not.toContain('getMicrosecond');
    expect(builtinPhpStub('8.4')).toContain('getMicrosecond(): int');
    expect(builtinPhpStub('7.4')).toContain('class DatePeriod implements Traversable');
    expect(builtinPhpStub('8.0')).toContain('class DatePeriod implements IteratorAggregate');
  });
  it('provides the complete versioned Date procedural API and constants', () => {
    const php72 = builtinPhpStub('7.2'); const php81 = builtinPhpStub('8.1');
    const php82 = builtinPhpStub('8.2'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('function strtotime($time, $now = null) {}');
    expect(php72).toContain('function date_create($time = "now", $timezone = null) {}');
    expect(php72).toContain('@return DateTime|false');
    expect(php81).toContain('function strtotime(string $datetime, ?int $baseTimestamp = null): int|false {}');
    expect(php81).toContain('function date_create(string $datetime = "now", ?DateTimeZone $timezone = null): DateTime|false {}');
    expect(php81).toContain('function date_get_last_errors(): array {}');
    expect(php82).toContain('function date_get_last_errors(): array|false {}');
    expect(php72).toContain('const DATE_ATOM = ');
    expect(php72).toContain('const SUNFUNCS_RET_TIMESTAMP = 0;');
    expect(php81).not.toContain('const DATE_ISO8601_EXPANDED = ');
    expect(php82).toContain('const DATE_ISO8601_EXPANDED = ');
    expect(php81).toContain('function timezone_transitions_get(DateTimeZone $object, int $timestampBegin = PHP_INT_MIN, int $timestampEnd = PHP_INT_MAX): array|false {}');
    expect(php85).toContain('function timezone_transitions_get(DateTimeZone $object, int $timestampBegin = PHP_INT_MIN, int $timestampEnd = 2147483647): array|false {}');
  });
  it('models audited string functions and their PHP 8.0/8.1 boundaries', () => {
    const php74 = builtinPhpStub('7.4'); const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    expect(php74).toContain('/** @return string|false */ function substr');
    expect(php74).toContain('function substr(string $str, int $start, int $length = null)');
    expect(php80).toContain('function substr(string $string, int $offset, ?int $length = null): string');
    expect(php74).not.toContain('function str_contains');
    expect(php80).toContain('function str_contains(string $haystack, string $needle): bool');
    expect(php74).toContain('/** @return list<string>|false */ function explode');
    expect(php74).toContain('function htmlspecialchars(string $string, int $quote_style = ENT_COMPAT');
    expect(php74).toContain('function str_pad(string $input, int $pad_length');
    expect(php74).toContain('function pathinfo(string $path, int $options = 15)');
    expect(php74).toContain('function bin2hex(string $data): string');
    expect(php80).toContain('function bin2hex(string $string): string');
    expect(php80).toContain('function explode(string $separator, string $string, int $limit = PHP_INT_MAX): array');
    expect(php74).toContain('function implode(array $array, string $separator): string');
    expect(php80).not.toContain('function implode(array $array, string $separator): string');
    expect(php80).toContain('int $flags = ENT_COMPAT');
    expect(php81).toContain('int $flags = ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML401');
    expect(php74).toContain('/** @return list<string>|false */ function str_split');
    expect(php80).toContain('function str_split(string $string, int $length = 1): array');
  });
  it('completes the versioned callable Strings catalog and structured results', () => {
    const catalog = `addcslashes addslashes bin2hex chop chr chunk_split convert_cyr_string convert_uudecode convert_uuencode
      count_chars crc32 crypt explode fprintf get_html_translation_table hebrev hebrevc hex2bin html_entity_decode htmlentities
      htmlspecialchars htmlspecialchars_decode implode join lcfirst levenshtein localeconv ltrim md5 md5_file metaphone money_format
      nl_langinfo nl2br number_format ord parse_str printf quoted_printable_decode quoted_printable_encode quotemeta rtrim setlocale
      sha1 sha1_file similar_text soundex sprintf sscanf str_contains str_decrement str_ends_with str_getcsv str_increment str_ireplace
      str_pad str_repeat str_replace str_rot13 str_shuffle str_split str_starts_with str_word_count strcasecmp strchr strcmp strcoll
      strcspn strip_tags stripcslashes stripos stripslashes stristr strlen strnatcasecmp strnatcmp strncasecmp strncmp strpbrk strpos
      strrchr strrev strripos strrpos strspn strstr strtok strtolower strtoupper strtr substr substr_compare substr_count substr_replace
      trim ucfirst ucwords utf8_decode utf8_encode vfprintf vprintf vsprintf wordwrap`.split(/\s+/);
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
      const php83 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.3');
      for (const name of catalog) {
        if (php80 && ['convert_cyr_string', 'hebrevc', 'money_format'].includes(name)) continue;
        if (!php80 && ['str_contains', 'str_starts_with', 'str_ends_with'].includes(name)) continue;
        if (!php83 && ['str_increment', 'str_decrement'].includes(name)) continue;
        expect(stub).toContain(`function ${name}(`);
      }
      for (const constant of ['HTML_SPECIALCHARS', 'HTML_ENTITIES', 'ENT_QUOTES', 'ENT_SUBSTITUTE',
        'ENT_HTML5', 'STR_PAD_LEFT', 'STR_PAD_RIGHT', 'STR_PAD_BOTH']) expect(stub).toContain(`const ${constant} =`);
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php82 = builtinPhpStub('8.2'); const php83 = builtinPhpStub('8.3');
    expect(php72).not.toContain('@deprecated PHP 7.4');
    expect(php74).toContain('@deprecated PHP 7.4\n * @return string */ function convert_cyr_string');
    expect(php74).toContain('@param array|string|null $allowable_tags');
    expect(php80).not.toContain('function convert_cyr_string(');
    expect(php80).not.toContain('function hebrevc(');
    expect(php80).not.toContain('function money_format(');
    expect(php82).not.toContain('function str_increment(');
    expect(php83).toContain('function str_increment(string $string): string');
    expect(php83).toContain('function str_decrement(string $string): string');
    expect(php82).toContain('@deprecated PHP 8.2 */ function utf8_decode');
    expect(php80).toContain('@return array<int, int> */ function count_chars');
    expect(php80).toContain('@return string */ function count_chars');
    expect(php80).toContain('@return list<string|null> */ function str_getcsv');
    expect(php80).toContain('decimal_point:string, thousands_sep:string, grouping:list<int>');
    expect(php80).toContain('function substr_replace(string $string, string $replace, int $offset, ?int $length = null): string');
  });
  it('models generic array functions and their PHP 7.3–8.5 boundaries', () => {
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1'); const php82 = builtinPhpStub('8.2');
    const php83 = builtinPhpStub('8.3'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php73).toContain('function array_merge(array $arr1, array ...$arrays): array');
    expect(php74).toContain('function array_merge(array ...$arrays): array');
    expect(php72).toContain('@param array<array-key, TValue> $arr1\n * @param array<array-key, TValue> ...$arrays');
    expect(php74).not.toContain('@param array<array-key, TValue> $arr1\n * @param array<array-key, TValue> ...$arrays');
    expect(php73).toContain('@return array<array-key, TValue>|false');
    expect(php80).toContain('@return array<array-key, TValue> */ function array_combine');
    expect(php80).toContain('@return ($preserve_keys is true ? list<array<TKey, TValue>> : list<array<int, TValue>>) */ function array_chunk');
    expect(php73).toContain('@return ($preserve_keys is true ? list<array<TKey, TValue>>|null : list<array<int, TValue>>|null)');
    expect(php80).toContain('@return ($num is 1 ? TKey : list<TKey>)');
    expect(php72).toContain('@return array<TKey, TValue> */ function array_map(?callable $callback, array $array): array');
    expect(php73).toContain('@return list<list<mixed>> */ function array_map(?callable $callback, array $array, array $arrays, array ...$more_arrays): array');
    expect(php80).toContain('@return array<TKey, TValue> */ function array_map(?callable $callback, array $array): array');
    expect(php80).toContain('@return list<list<mixed>> */ function array_map(?callable $callback, array $array, array $arrays, array ...$more_arrays): array');
    expect(php72).toContain('@return list<mixed> */ function array_map(callable $callback, array $array, array $arrays, array ...$more_arrays): array');
    expect(php85).toContain('@return list<mixed> */ function array_map(callable $callback, array $array, array $arrays, array ...$more_arrays): array');
    expect(php72).toContain('function key_exists($key, array $array): bool');
    expect(php72).toContain('function key_exists($key, object $array): bool');
    expect(php80).toContain('function key_exists($key, array $array): bool');
    expect(php80).not.toContain('function key_exists($key, object $array): bool');
    expect(php80).not.toContain('function array_is_list');
    expect(php81).toContain('function array_is_list(array $array): bool');
    expect(php81).toContain('function array_walk(array|object &$array, callable $callback, mixed $arg = null): bool');
    expect(php82).toContain('function array_walk(array|object &$array, callable $callback, mixed $arg = null): true');
    expect(php72).toContain('function array_walk(&$input, callable $funcname, $userdata = null): bool {}');
    expect(php85).toContain('@param array<TKey, TValue>|object $array');
    expect(php72).toContain('function count($var, int $mode = COUNT_NORMAL): int {}');
    expect(php85).toContain('function count(Countable|array $value, int $mode = COUNT_NORMAL): int {}');
    expect(php85).toContain('function array_column(array $array, int|string|null $column_key, int|string|null $index_key = null): array {}');
    expect(php85).toContain('function array_search(mixed $needle, array $haystack, bool $strict = false) {}');
    expect(php85).toContain('function array_rand(array $array, int $num = 1) {}');
    expect(php72).toContain('function array_search($needle, array $haystack, bool $strict = false) {}');
    expect(php72).toContain('function array_rand(array $arg, int $num_req = 1) {}');
    expect(php72).not.toContain('function array_key_first');
    expect(php73).toContain('@return TKey|null */ function array_key_first(array $array)');
    expect(php73).toContain('@return TKey|null */ function array_key_last(array $array)');
    expect(php80).toContain('function array_key_first(array $array): int|string|null');
    expect(php83).not.toContain('function array_find(');
    expect(php84).toContain('@return TValue|null */ function array_find(array $array, callable $callback): mixed');
    expect(php84).toContain('@return TKey|null */ function array_find_key(array $array, callable $callback): mixed');
    expect(php84).toContain('function array_any(array $array, callable $callback): bool');
    expect(php84).toContain('function array_all(array $array, callable $callback): bool');
    expect(php84).not.toContain('function array_first(');
    expect(php85).toContain('@return TValue|null */ function array_first(array $array): mixed');
    expect(php85).toContain('@return TValue|null */ function array_last(array $array): mixed');
  });
  it('provides array sorting, pointer, recursive utility functions, and option constants', () => {
    const php72 = builtinPhpStub('7.2'); const php81 = builtinPhpStub('8.1');
    const php82 = builtinPhpStub('8.2'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('function ksort(array &$arg, int $sort_flags = SORT_REGULAR) {}');
    expect(php81).toContain('function ksort(array &$array, int $flags = SORT_REGULAR): bool {}');
    expect(php82).toContain('function ksort(array &$array, int $flags = SORT_REGULAR): true {}');
    expect(php72).toContain('function current($arg) {}');
    expect(php85).toContain('function current(object|array $array): mixed {}');
    expect(php85).toContain('function key(object|array $array): string|int|null {}');
    expect(php72).toContain('function array_merge_recursive(array $arr1, array ...$arrays) {}');
    expect(builtinPhpStub('7.4')).toContain('function array_merge_recursive(array ...$arrays) {}');
    expect(php72).toContain('function compact($var_name, ...$var_names) {}');
    expect(php85).toContain('function array_merge_recursive(array ...$arrays): array {}');
    expect(php81).toContain('function array_multisort(&$array, &...$rest): bool {}');
    expect(php85).toContain('function array_multisort(&$array, &...$rest): true {}');
    for (const stub of [php72, php85]) {
      expect(stub).toContain('const SORT_REGULAR = 0;');
      expect(stub).toContain('const EXTR_OVERWRITE = 0;');
      expect(stub).toContain('const CASE_LOWER = 0;');
      expect(stub).toContain('const ARRAY_FILTER_USE_KEY = 2;');
    }
  });
  it('provides versioned array comparison functions and callback positions', () => {
    const php72 = builtinPhpStub('7.2'); const php85 = builtinPhpStub('8.5');
    const names = [
      'array_intersect_ukey', 'array_uintersect', 'array_intersect_assoc', 'array_uintersect_assoc',
      'array_intersect_uassoc', 'array_uintersect_uassoc', 'array_diff_ukey', 'array_udiff',
      'array_diff_assoc', 'array_diff_uassoc', 'array_udiff_assoc', 'array_udiff_uassoc',
    ];
    for (const name of names) {
      expect(php72).toContain(`function ${name}(`);
      expect(php85).toContain(`function ${name}(`);
    }
    expect(php72).toContain('function array_uintersect_uassoc(array $arr1, array $arr2, callable $callback_data_compare_func, callable $callback_key_compare_func) {}');
    expect(php72).toContain('function array_udiff_assoc(array $arr1, array $arr2, callable $callback_key_comp_func) {}');
    expect(php72).toContain('function array_intersect_assoc(array $arr1, array $arr2, array ...$arrays) {}');
    expect(php72).toContain('function array_diff(array $arr1, array $array2, array ...$arrays): array {}');
    expect(php85).toContain('function array_uintersect_uassoc(array $array, ...$rest): array {}');
    expect(php85).toContain('function array_diff_assoc(array $array, array ...$arrays): array {}');
  });
  it('provides standard time functions with the PHP 7.3 hrtime boundary', () => {
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3'); const php85 = builtinPhpStub('8.5');
    for (const name of ['sleep', 'usleep', 'time_nanosleep', 'time_sleep_until', 'microtime', 'gettimeofday', 'uniqid']) {
      expect(php72).toContain(`function ${name}(`);
      expect(php85).toContain(`function ${name}(`);
    }
    expect(php72).not.toContain('function hrtime(');
    expect(php73).toContain('function hrtime($as_number = false) {}');
    expect(php85).toContain('function hrtime(bool $as_number = false): array|int|float|false {}');
    expect(php72).toContain('function microtime($get_as_float = false) {}');
    expect(php85).toContain('function microtime(bool $as_float = false): string|float {}');
    expect(php72).toContain('function sleep($seconds) {}');
    expect(php85).toContain('function sleep(int $seconds): int {}');
  });
  it('provides stream context and filter functions with PHP 8.3 and 8.4 boundaries', () => {
    const php72 = builtinPhpStub('7.2'); const php82 = builtinPhpStub('8.2');
    const php83 = builtinPhpStub('8.3'); const php84 = builtinPhpStub('8.4');
    for (const name of [
      'stream_context_create', 'stream_context_set_params', 'stream_context_get_params',
      'stream_context_set_option', 'stream_context_get_options', 'stream_context_get_default',
      'stream_context_set_default', 'stream_filter_prepend', 'stream_filter_append',
      'stream_filter_remove', 'stream_get_filters', 'stream_filter_register',
    ]) {
      expect(php72).toContain(`function ${name}(`);
      expect(php84).toContain(`function ${name}(`);
    }
    expect(php82).not.toContain('function stream_context_set_options(');
    expect(php83).toContain('function stream_context_set_options($context, array $options): bool {}');
    expect(php84).toContain('function stream_context_set_options($context, array $options): true {}');
    expect(php72).toContain('function stream_context_set_option($stream_or_context, $wrappername, $optionname = null, $value = null) {}');
    expect(php84).toContain('function stream_context_set_option($context, array|string $wrapper_or_options, ?string $option_name = null, mixed $value = null): true {}');
    expect(php72).toContain('const STREAM_FILTER_READ = 1;');
    expect(php84).toContain('const STREAM_FILTER_ALL = 3;');
  });
  it('provides versioned stream I/O and status functions', () => {
    const php72 = builtinPhpStub('7.2'); const php85 = builtinPhpStub('8.5');
    for (const name of [
      'stream_select', 'stream_copy_to_stream', 'stream_get_contents', 'stream_supports_lock',
      'stream_set_write_buffer', 'stream_set_read_buffer', 'stream_set_blocking',
      'stream_get_meta_data', 'stream_get_line', 'stream_resolve_include_path',
      'stream_get_wrappers', 'stream_get_transports', 'stream_is_local', 'stream_isatty',
      'stream_set_chunk_size', 'stream_set_timeout',
    ]) {
      expect(php72).toContain(`function ${name}(`);
      expect(php85).toContain(`function ${name}(`);
    }
    expect(php72).toContain('function stream_select(&$read_streams, &$write_streams, &$except_streams, $tv_sec, $tv_usec = null) {}');
    expect(php85).toContain('function stream_select(?array &$read, ?array &$write, ?array &$except, ?int $seconds, ?int $microseconds = null): int|false {}');
    expect(php72).toContain('function stream_get_contents($source, $maxlen = null, $offset = -1) {}');
    expect(php85).toContain('function stream_get_contents($stream, ?int $length = null, int $offset = -1): string|false {}');
    expect(php85).not.toContain('function stream_copy_to_stream($from, $to, ?int $length = null, int $offset = 0, $context');
  });
  it('provides stream socket signatures and stable flags', () => {
    const php72 = builtinPhpStub('7.2'); const php85 = builtinPhpStub('8.5');
    for (const name of [
      'stream_socket_client', 'stream_socket_server', 'stream_socket_accept',
      'stream_socket_get_name', 'stream_socket_recvfrom', 'stream_socket_sendto',
      'stream_socket_enable_crypto', 'stream_socket_shutdown', 'stream_socket_pair',
    ]) {
      expect(php72).toContain(`function ${name}(`);
      expect(php85).toContain(`function ${name}(`);
    }
    expect(php72).toContain('function stream_socket_client($remoteaddress, &$errcode = null, &$errstring = null, $timeout = null, $flags = STREAM_CLIENT_CONNECT, $context = null) {}');
    expect(php85).toContain('function stream_socket_client(string $address, &$error_code = null, &$error_message = null, ?float $timeout = null, int $flags = STREAM_CLIENT_CONNECT, $context = null) {}');
    expect(php85).toContain('function stream_socket_enable_crypto($stream, bool $enable, ?int $crypto_method = null, $session_stream = null): int|bool {}');
    expect(php85).toContain('function stream_socket_pair(int $domain, int $type, int $protocol): array|false {}');
    expect(php85).not.toContain('function stream_socket_pair(int $domain, int $type, int $protocol, $context');
    for (const stub of [php72, php85]) {
      expect(stub).toContain('const STREAM_CLIENT_CONNECT = 4;');
      expect(stub).toContain('const STREAM_SERVER_LISTEN = 8;');
      expect(stub).toContain('const STREAM_SHUT_RDWR = 2;');
      expect(stub).toContain('const STREAM_PF_INET = 2;');
    }
  });
  it('provides stream wrapper and bucket functions with the PHP 8.4 StreamBucket boundary', () => {
    const php72 = builtinPhpStub('7.2'); const php81 = builtinPhpStub('8.1');
    const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    for (const name of [
      'stream_wrapper_register', 'stream_register_wrapper', 'stream_wrapper_unregister',
      'stream_wrapper_restore', 'stream_bucket_make_writeable', 'stream_bucket_prepend',
      'stream_bucket_append', 'stream_bucket_new',
    ]) {
      expect(php72).toContain(`function ${name}(`);
      expect(php85).toContain(`function ${name}(`);
    }
    expect(php72).toContain('function stream_bucket_new($stream, $buffer) {}');
    expect(php81).toContain('function stream_bucket_new($stream, string $buffer): object {}');
    expect(php84).toContain('function stream_bucket_new($stream, string $buffer): StreamBucket {}');
    expect(php84).toContain('function stream_bucket_make_writeable($brigade): ?StreamBucket {}');
    expect(php84).toContain('function stream_bucket_append($brigade, StreamBucket $bucket): void {}');
    expect(php72).toContain('const STREAM_IS_URL = 1;');
  });
  it('provides standard utility functions and versioned image constants', () => {
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php83 = builtinPhpStub('8.3'); const php84 = builtinPhpStub('8.4');
    const php85 = builtinPhpStub('8.5');
    for (const name of [
      'highlight_file', 'show_source', 'php_strip_whitespace', 'highlight_string',
      'connection_aborted', 'connection_status', 'ignore_user_abort', 'get_browser',
      'get_meta_tags', 'image_type_to_mime_type', 'image_type_to_extension',
      'getimagesize', 'getimagesizefromstring', 'iptcembed', 'iptcparse', 'mail', 'pack', 'unpack',
    ]) {
      expect(php72).toContain(`function ${name}(`);
      expect(php85).toContain(`function ${name}(`);
    }
    expect(php72).toContain('function pack($format, ...$args) {}');
    expect(php85).toContain('function pack(string $format, mixed ...$values): string {}');
    expect(php72).toContain('function ezmlm_hash($addr) {}');
    expect(php74).toContain('@deprecated PHP 7.4\n * @return int */ function ezmlm_hash($addr) {}');
    expect(php80).not.toContain('function ezmlm_hash(');
    expect(php72).toContain('function setlocale($category, $locales, ...$rest) {}');
    expect(php83).toContain('function highlight_string(string $string, bool $return = false): string|bool {}');
    expect(php84).toContain('function highlight_string(string $string, bool $return = false): string|true {}');
    expect(php72).not.toContain('const IMAGETYPE_AVIF');
    expect(php81).toContain('const IMAGETYPE_AVIF = 19;');
    expect(php84).not.toContain('const IMAGETYPE_HEIF');
    expect(php85).toContain('const IMAGETYPE_HEIF = 20;');
    expect(php85).toContain('const CONNECTION_ABORTED = 1;');
  });
  it('filters platform-dependent standard functions with runtime availability', () => {
    const php72 = builtinPhpStub('7.2'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('function ftok($pathname, $proj) {}');
    expect(php85).toContain('function ftok(string $filename, string $project_id): int {}');
    expect(php85).toContain('@deprecated PHP 8.1 */ function strptime(');
    for (const name of ['strptime', 'sys_getloadavg', 'ftok']) {
      expect(php72).toContain(`function ${name}(`);
      expect(php85).toContain(`function ${name}(`);
      expect(builtinPhpStub('8.5', { unavailableFunctions: [name as 'strptime' | 'sys_getloadavg' | 'ftok'] }))
        .not.toContain(`function ${name}(`);
    }
  });
  it('models JSON functions, constants, and their PHP 7.3–8.3 boundaries', () => {
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php82 = builtinPhpStub('8.2'); const php83 = builtinPhpStub('8.3');
    expect(php72).toContain('@return string|false */ function json_encode($value, $options = 0, $depth = 512)');
    expect(php72).toContain('@param bool|null $assoc');
    expect(php72).not.toContain('const JSON_THROW_ON_ERROR');
    expect(php73).toContain('const JSON_THROW_ON_ERROR = 4194304');
    expect(php80).toContain('function json_encode(mixed $value, int $flags = 0, int $depth = 512): string|false');
    expect(php80).toContain('function json_decode(string $json, ?bool $associative = null, int $depth = 512, int $flags = 0): mixed');
    expect(php80).toContain('function json_last_error(): int');
    expect(php80).not.toContain('const JSON_ERROR_NON_BACKED_ENUM');
    expect(php81).toContain('const JSON_ERROR_NON_BACKED_ENUM = 11');
    expect(php82).not.toContain('function json_validate');
    expect(php83).toContain('function json_validate(string $json, int $depth = 512, int $flags = 0): bool');
  });
  it('models filesystem paths, streams, and PHP 8 nullable length boundaries', () => {
    const php74 = builtinPhpStub('7.4'); const php80 = builtinPhpStub('8.0');
    expect(php74).toContain('@return string|false */ function file_get_contents(string $filename, bool $use_include_path = false, $context = null, int $offset = 0)');
    expect(php74).toContain('function file_get_contents(string $filename, bool $use_include_path, $context, int $offset, int $length)');
    expect(php74).toContain('function fclose($fp)');
    expect(php74).toContain('function mkdir(string $pathname, int $mode = 0777');
    expect(php74).toContain('function rename(string $old_name, string $new_name');
    expect(php74).toContain('@return int|false */ function fwrite($stream, string $data, int $length)');
    expect(php74).toContain('@return resource|false */ function fopen');
    expect(php80).toContain('function file_get_contents(string $filename, bool $use_include_path = false, $context = null, int $offset = 0, ?int $length = null): string|false');
    expect(php80).toContain('function fwrite($stream, string $data, ?int $length = null): int|false');
    expect(php80).toContain('function rename(string $from, string $to');
    expect(php80).toContain('function file_put_contents(string $filename, mixed $data, int $flags = 0, $context = null): int|false');
    expect(php80).toContain('@return list<string>|false */ function glob(string $pattern, int $flags = 0): array|false');
    expect(php80).toContain('function pathinfo(string $path, int $flags = 15): array|string');
    expect(php80).toContain('function realpath(string $path): string|false');
    expect(php80).toContain('const PATHINFO_ALL = 15');
  });
  it('completes the Filesystem stream, CSV, INI, lock, seek, and sync catalog', () => {
    const common = ['feof', 'fflush', 'fgetc', 'fgetcsv', 'fgets', 'file', 'flock', 'fnmatch',
      'fpassthru', 'fputcsv', 'fscanf', 'fseek', 'fstat', 'ftell', 'ftruncate', 'parse_ini_file',
      'parse_ini_string', 'pclose', 'popen', 'readfile', 'rewind', 'set_file_buffer', 'tmpfile'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of common) expect(stub).toContain(`function ${name}(`);
      for (const constant of ['FILE_IGNORE_NEW_LINES', 'FILE_SKIP_EMPTY_LINES', 'LOCK_SH', 'LOCK_UN',
        'LOCK_NB', 'SEEK_SET', 'SEEK_CUR', 'SEEK_END', 'INI_SCANNER_NORMAL', 'INI_SCANNER_RAW',
        'INI_SCANNER_TYPED']) expect(stub).toContain(`const ${constant} =`);
      expect(stub).toContain('@return list<string|null>|false */ function fgetcsv(');
      expect(stub).toContain('@return list<string>|false */ function file(');
      expect(stub).toContain('dev:int, ino:int, mode:int, nlink:int');
      expect(stub).toContain('@return resource|false */ function popen(');
      expect(stub).toContain('@return resource|false */ function tmpfile(');
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    expect(php72).not.toContain('@deprecated PHP 7.3');
    expect(php74).toContain('@deprecated PHP 7.3');
    expect(php74).toContain('function fgetss($fp, $length = null, $allowable_tags = null)');
    expect(php72).toContain('function fputcsv($fp, array $fields, $delimiter =');
    expect(php72).toContain('function readfile($filename, $flags = false, $context = null)');
    expect(php72).not.toContain('function fsync(');
    expect(php80).not.toContain('function fgetss(');
    expect(php80).not.toContain('function fsync(');
    expect(php80).toContain('function fputcsv($stream, array $fields, string $separator =');
    expect(php80).not.toContain('string $eol =');
    expect(php81).toContain('string $eol = "\\n"');
    expect(php81).toContain('function fsync($stream): bool');
    expect(php81).toContain('function fdatasync($stream): bool');
    expect(php81).toContain('function fscanf($stream, string $format, mixed &...$vars): int|false|null');
    const officialCallableCatalog = `basename chgrp chmod chown clearstatcache copy dirname disk_free_space disk_total_space diskfreespace
      fclose fdatasync feof fflush fgetc fgetcsv fgets file file_exists file_get_contents file_put_contents fileatime filectime
      filegroup fileinode filemtime fileowner fileperms filesize filetype flock fnmatch fopen fpassthru fputcsv fputs fread fscanf
      fseek fstat fsync ftell ftruncate fwrite glob is_dir is_executable is_file is_link is_readable is_uploaded_file is_writable
      is_writeable lchgrp lchown link linkinfo lstat mkdir move_uploaded_file parse_ini_file parse_ini_string pathinfo pclose popen
      readfile readlink realpath realpath_cache_get realpath_cache_size rename rewind rmdir set_file_buffer stat symlink tempnam
      tmpfile touch umask unlink`.split(/\s+/);
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const php81OrLater = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
      const stub = builtinPhpStub(version);
      for (const name of officialCallableCatalog) {
        if (!php81OrLater && (name === 'fsync' || name === 'fdatasync')) continue;
        expect(stub).toContain(`function ${name}(`);
      }
      expect(stub).not.toMatch(/^function delete\(/m);
    }
  });
  it('models filesystem metadata, permissions, links, and PHP 7/8 names and shapes', () => {
    const functions = ['chgrp', 'chmod', 'chown', 'clearstatcache', 'disk_free_space', 'disk_total_space',
      'diskfreespace', 'fileatime', 'filectime', 'filegroup', 'fileinode', 'filemtime', 'fileowner',
      'fileperms', 'filetype', 'is_executable', 'is_link', 'is_uploaded_file', 'lchgrp', 'lchown',
      'link', 'linkinfo', 'lstat', 'move_uploaded_file', 'readlink', 'realpath_cache_get',
      'realpath_cache_size', 'rmdir', 'stat', 'symlink', 'tempnam', 'touch', 'umask'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of functions) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('dev:int, ino:int, mode:int, nlink:int, uid:int, gid:int');
      expect(stub).toContain('realpath:string, expires:int');
    }
    const php72 = builtinPhpStub('7.2'); const php80 = builtinPhpStub('8.0');
    expect(php72).toContain('function chmod($filename, $mode)');
    expect(php72).toContain('function is_uploaded_file($path)');
    expect(php72).toContain('function move_uploaded_file($path, $new_path)');
    expect(php72).toContain('function rmdir($dirname, $context = null)');
    expect(php72).toContain('function touch($filename, $time = null, $atime = null)');
    expect(php72).toContain('@return array<string, array{key:float, is_dir:bool, realpath:string, expires:int}> */ function realpath_cache_get()');
    expect(php80).toContain('function chmod(string $filename, int $permissions): bool');
    expect(php80).toContain('function is_uploaded_file(string $filename): bool');
    expect(php80).toContain('function move_uploaded_file(string $from, string $to): bool');
    expect(php80).toContain('function rmdir(string $directory, $context = null): bool');
    expect(php80).toContain('function touch(string $filename, ?int $mtime = null, ?int $atime = null): bool');
    expect(php80).toContain('@return array<string, array{key:int, is_dir:bool, realpath:string, expires:int}> */ function realpath_cache_get(): array');
    expect(php80).toContain('function stat(string $filename): array|false');
    expect(php80).toContain('function umask(?int $mask = null): int');
  });
  it('models the complete Directory catalog and PHP 8.1/8.5 class boundaries', () => {
    const functions = ['chdir', 'chroot', 'closedir', 'dir', 'getcwd', 'opendir', 'readdir', 'rewinddir', 'scandir'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of functions) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('const SCANDIR_SORT_ASCENDING = 0; const SCANDIR_SORT_DESCENDING = 1; const SCANDIR_SORT_NONE = 2;');
      expect(stub).toContain('@return list<string>|false */ function scandir(');
      expect(stub).toContain('class Directory {');
      expect(stub).toContain('@var resource */ public');
    }
    const php72 = builtinPhpStub('7.2'); const php80 = builtinPhpStub('8.0');
    const php81 = builtinPhpStub('8.1'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('function opendir($path, $context = null)');
    expect(php72).toContain('function scandir($dir, $sorting_order = SCANDIR_SORT_ASCENDING, $context = null)');
    expect(php72).toContain('public function read($dir_handle = null)');
    expect(php80).toContain('function opendir(string $directory, $context = null)');
    expect(php80).toContain('function scandir(string $directory, int $sorting_order = SCANDIR_SORT_ASCENDING, $context = null): array|false');
    expect(php80).toContain('public function read()');
    expect(php80).not.toContain('public readonly string $path');
    expect(php81).toContain('public readonly string $path');
    expect(php81).toContain('public readonly mixed $handle');
    expect(php81).toContain('public function read(): string|false');
    expect(php84).not.toContain('final class Directory');
    expect(php85).toContain('final class Directory');
  });
  it('models the complete Program Execution catalog and PHP 7.4/8.2/8.3 boundaries', () => {
    const functions = ['escapeshellarg', 'escapeshellcmd', 'exec', 'passthru', 'proc_close', 'proc_get_status',
      'proc_nice', 'proc_open', 'proc_terminate', 'shell_exec', 'system'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of functions) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('@return resource|false */ function proc_open(');
      expect(stub).toContain('array<int, resource|array{0:string, 1?:string|int, 2?:string}>');
      expect(stub).toContain('array{command:string, pid:int');
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php82 = builtinPhpStub('8.2'); const php83 = builtinPhpStub('8.3');
    expect(php72).toContain('@param string $command\n * @param array<int, resource|array{0:string, 1?:string|int, 2?:string}> $descriptorspec');
    expect(php74).toContain('@param array|string $command\n * @param array<int, resource|array{0:string, 1?:string|int, 2?:string}> $descriptorspec');
    expect(php72).toContain('function exec($command, &$output = null, &$return_value = null)');
    expect(php72).toContain('@return string|false|null */ function shell_exec($cmd)');
    expect(php80).toContain('function exec(string $command, &$output = null, &$result_code = null): string|false');
    expect(php80).toContain('function proc_open(array|string $command, array $descriptor_spec, &$pipes, ?string $cwd = null, ?array $env_vars = null, ?array $options = null)');
    expect(php80).toContain('function shell_exec(string $command): string|false|null');
    expect(php81).toContain('function passthru(string $command, &$result_code = null): ?bool');
    expect(php82).toContain('function passthru(string $command, &$result_code = null): false|null');
    expect(php82).not.toContain('pid:int, cached:bool');
    expect(php83).toContain('pid:int, cached:bool');
  });
  it('models serialization, encoding, URL parsing, and PHP 8 header signatures', () => {
    const php74 = builtinPhpStub('7.4'); const php80 = builtinPhpStub('8.0');
    expect(php74).toContain('@param mixed $var */ function serialize($var): string');
    expect(php80).toContain('@param mixed $value */ function serialize(mixed $value): string');
    expect(php74).toContain('@return mixed */ function unserialize(string $variable_representation, array $allowed_classes = []) {}');
    expect(php80).toContain('@return mixed */ function unserialize(string $data, array $options = []): mixed');
    expect(php74).toContain('@return string|false */ function base64_decode(string $str, bool $strict = false) {}');
    expect(php80).toContain('function base64_decode(string $string, bool $strict = false): string|false');
    expect(php74).toContain('function parse_url(string $url, int $component = -1) {}');
    expect(php80).toContain('$component is -1 ? (array{scheme?:string, host?:string, port?:int');
    expect(php80).toContain('function parse_url(string $url, int $component = -1): array|string|int|false|null');
    expect(php80).toContain('$component is 2 ? int|false|null : string|false|null');
    expect(php74).toContain('function http_build_query($formdata, string $prefix = \'\', string $arg_separator = null');
    expect(php80).toContain('function http_build_query(array|object $data, string $numeric_prefix = \'\', ?string $arg_separator = null');
    expect(php74).toContain('function get_headers(string $url, int $format = 0, $context = null)');
    expect(php80).toContain('function get_headers(string $url, bool $associative = false, $context = null): array|false');
    expect(php80).toContain('const PHP_URL_PORT = 2');
    expect(php80).toContain('const PHP_QUERY_RFC3986 = 2');
  });
  it('models PDO connections, statements, failures, and the PHP 8.4 connect boundary', () => {
    const php72 = builtinPhpStub('7.2'); const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php83 = builtinPhpStub('8.3'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('class PDO {');
    expect(php72).toContain('string $username = null, string $passwd = null');
    expect(php72).toContain('function exec(string $query)');
    expect(php72).toContain('function lastInsertId(string $seqname = null)');
    expect(php72).toContain('function quote(string $string, int $paramtype = self::PARAM_STR)');
    expect(php72).toContain('@return PDOStatement|false */ public function prepare(string $statement, array $options = [])');
    expect(php72).toContain('class PDOStatement implements Traversable');
    expect(php72).toContain('public const PARAM_INPUT_OUTPUT = 2147483648');
    expect(php72).toContain('public const FETCH_GROUP = 65536');
    expect(php72).not.toContain('public const FETCH_DEFAULT =');
    expect(php72).toContain('final public function __sleep()');
    expect(php72).toContain('final class PDORow {}');
    expect(php72).toContain('function pdo_drivers(): array');
    expect(php72).toContain('@return object|false */ public function fetchObject');
    expect(php80).toContain('public function prepare(string $query, array $options = []): PDOStatement|false');
    expect(php80).toContain('public function query(string $query, ?int $fetchMode = null, mixed ...$fetchModeArgs): PDOStatement|false');
    expect(php80).toContain('class PDOStatement implements IteratorAggregate');
    expect(php80).toContain('public function fetchObject(?string $class = \'stdClass\', array $constructorArgs = []): object|false');
    expect(php80).not.toContain('public ?array $errorInfo');
    expect(php81).toContain('public ?array $errorInfo');
    expect(php80).toContain('public const FETCH_ASSOC = 2');
    expect(php80).toContain('public const FETCH_DEFAULT = 0');
    expect(php80).not.toContain('final public function __sleep()');
    expect(php84).toContain('public const FETCH_GROUP = 65536');
    expect(php85).toContain('public const FETCH_GROUP = 32');
    expect(php85).toContain('public const FETCH_UNIQUE = 64');
    expect(php85).toContain('public const FETCH_CLASSTYPE = 128');
    expect(php85).toContain('final class PDORow { public string $queryString; }');
    expect(php83).not.toContain('public static function connect(string $dsn');
    expect(php84).toContain('public static function connect(string $dsn, ?string $username = null, ?string $password = null, ?array $options = null): static');
    expect(php83).toContain('public function setFetchMode(int $mode, mixed ...$args): bool');
    expect(php84).toContain('public function setFetchMode(int $mode, mixed ...$args): true');
  });
  it('limits PDO driver constants and namespaced classes to the detected runtime', () => {
    const pdoRuntime = normalizePdoRuntimeFacts({
      constants: { MYSQL_ATTR_USE_BUFFERED_QUERY: 1000, MYSQL_ATTR_UNKNOWN: 1 },
      classes: { 'Pdo\\Mysql': { methods: ['getWarningCount', 'futureMethod'],
        constants: { ATTR_USE_BUFFERED_QUERY: 1000, ATTR_UNKNOWN: 1 } } },
    });
    expect(pdoRuntime?.constants).toEqual({ MYSQL_ATTR_USE_BUFFERED_QUERY: 1000 });
    expect(pdoRuntime?.classes['Pdo\\Mysql']).toEqual({ methods: ['getWarningCount'], constants: { ATTR_USE_BUFFERED_QUERY: 1000 } });
    const uri = builtinDocumentUri('8.5', { pdoRuntime });
    expect(parseBuiltinDocumentUri(uri)?.pdoRuntime).toEqual(pdoRuntime);
    const driverUri = pdoDriverDocumentUri('8.5', { pdoRuntime });
    expect(parsePdoDriverDocumentUri(driverUri)?.pdoRuntime).toEqual(pdoRuntime);
    expect(isBuiltinDocumentUri(driverUri)).toBe(true);
    expect(builtinPhpExtensionStub('8.5', 'pdo', { pdoRuntime })).toContain('public const MYSQL_ATTR_USE_BUFFERED_QUERY = 1000');
    expect(builtinPhpExtensionStub('8.5', 'pdo')).not.toContain('public const MYSQL_ATTR_USE_BUFFERED_QUERY');
    expect(pdoDriverPhpStub('8.5', pdoRuntime)).toContain('class Mysql extends \\PDO');
    expect(pdoDriverPhpStub('8.5', pdoRuntime)).toContain('public function getWarningCount(): int');
    expect(pdoDriverPhpStub('8.5', pdoRuntime)).not.toContain('class Pgsql');
    expect(pdoDriverPhpStub('8.3', pdoRuntime)).toBe('');
    const sqliteRuntime = normalizePdoRuntimeFacts({ constants: { SQLITE_DETERMINISTIC: 2048 },
      classes: { 'Pdo\\Sqlite': { methods: ['createFunction', 'setAuthorizer'], constants: { DETERMINISTIC: 2048, OK: 0 } } } });
    expect(pdoDriverPhpStub('8.4', sqliteRuntime)).toContain('function createFunction(');
    expect(pdoDriverPhpStub('8.4', sqliteRuntime)).not.toContain('function setAuthorizer(');
    expect(pdoDriverPhpStub('8.4', sqliteRuntime)).not.toContain('const OK =');
    expect(pdoDriverPhpStub('8.5', sqliteRuntime)).toContain('function setAuthorizer(');
    expect(pdoDriverPhpStub('8.5', sqliteRuntime)).toContain('const OK = 0;');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['pdo'], pdoRuntime })).not.toContain('MYSQL_ATTR_USE_BUFFERED_QUERY');
    expect(normalizePdoRuntimeFacts({ constants: { MYSQL_ATTR_USE_BUFFERED_QUERY: '1000' }, classes: {} })).toBeUndefined();
  });
  it('provides versioned Random functions, engines, and float APIs', () => {
    const php72 = builtinPhpStub('7.2');
    const php82 = builtinPhpStub('8.2');
    const php83 = builtinPhpStub('8.3');
    for (const name of ['getrandmax', 'lcg_value', 'mt_getrandmax', 'mt_rand', 'mt_srand', 'rand', 'srand']) {
      expect(php72).toContain(`function ${name}(`);
      expect(php82).toContain(`function ${name}(`);
    }
    expect(php72).toContain('const MT_RAND_MT19937 = 0; const MT_RAND_PHP = 1;');
    expect(php72).toContain('function rand(): int {}');
    expect(php72).toContain('function rand(int $min, int $max): int {}');
    expect(php82).toContain('function mt_srand(int $seed = null, int $mode = MT_RAND_MT19937): void');
    expect(php83).toContain('function mt_srand(?int $seed = null, int $mode = MT_RAND_MT19937): void');
    expect(randomClassesPhpStub('8.1')).toBe('');
    const classes82 = randomClassesPhpStub('8.2');
    const classes83 = randomClassesPhpStub('8.3');
    expect(classes82).toContain('final class Randomizer');
    expect(classes82).toContain('final class Mt19937 implements \\Random\\Engine');
    expect(classes82).not.toContain('getFloat(');
    expect(classes82).not.toContain('enum IntervalBoundary');
    expect(classes83).toContain('enum IntervalBoundary { case ClosedOpen;');
    expect(classes83).toContain('function getFloat(float $min, float $max, \\Random\\IntervalBoundary $boundary');
    expect(classes83).toContain('function getBytesFromString(string $string, int $length): string');
    const uri = randomClassesDocumentUri('8.3');
    expect(parseRandomClassesDocumentUri(uri)?.version).toBe('8.3');
    expect(isBuiltinDocumentUri(uri)).toBe(true);
  });
  it('models password, hashing, and random APIs across PHP 7.2–8.5', () => {
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php83 = builtinPhpStub('8.3'); const php84 = builtinPhpStub('8.4');
    expect(php72).toContain('const PASSWORD_DEFAULT = 1; const PASSWORD_BCRYPT = 1;');
    expect(php72).toContain('@return string|false */ function password_hash(string $password, int $algo, array $options = [])');
    expect(php72).toContain('array{algo:int, algoName:string, options:array<string, mixed>}');
    expect(php72).not.toContain('function password_algos');
    expect(php74).toContain("const PASSWORD_DEFAULT = '2y'; const PASSWORD_BCRYPT = '2y';");
    expect(php74).toContain('@param string|int $algo');
    expect(php74).toContain('array{algo:string|null, algoName:string, options:array<string, mixed>}');
    expect(php74).toContain('@return list<string> */ function password_algos(): array');
    expect(php80).toContain('function password_hash(string $password, string|int|null $algo, array $options = []): string');
    expect(php72).toContain('@return string|false */ function hash(string $algo, string $data, bool $raw_output = false)');
    expect(php80).toContain('function hash(string $algo, string $data, bool $binary = false): string');
    expect(php80).not.toContain('bool $binary = false, array $options = []');
    expect(php81).toContain('function hash(string $algo, string $data, bool $binary = false, array $options = []): string');
    expect(php81).toContain('function hash_file(string $algo, string $filename, bool $binary = false, array $options = []): string|false');
    expect(php83).toContain('const PASSWORD_BCRYPT_DEFAULT_COST = 10;');
    expect(php84).toContain('const PASSWORD_BCRYPT_DEFAULT_COST = 12;');
    expect(php84).toContain('function random_bytes(int $length): string');
    expect(php84).toContain('function random_int(int $min, int $max): int');
  });
  it('models Filter functions, overloads, constants, and PHP 8.0–8.5 boundaries', () => {
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php82 = builtinPhpStub('8.2'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('const INPUT_SESSION = 6; const INPUT_REQUEST = 99;');
    expect(php72).toContain('const FILTER_SANITIZE_MAGIC_QUOTES = 521;');
    expect(php72).not.toContain('FILTER_SANITIZE_ADD_SLASHES');
    expect(php73).toContain('const FILTER_SANITIZE_ADD_SLASHES = 523;');
    expect(php72).not.toContain('const FILTER_VALIDATE_BOOL =');
    expect(php80).toContain('const FILTER_VALIDATE_BOOL = 258;');
    expect(php80).not.toContain('INPUT_SESSION');
    expect(php80).not.toContain('FILTER_FLAG_SCHEME_REQUIRED');
    expect(php80).toContain('function filter_var(mixed $value, int $filter = FILTER_DEFAULT, array|int $options = 0): mixed');
    expect(php80).toContain('@param 257 $filter */ function filter_var(mixed $value, $filter): int|false');
    expect(php80).toContain('@param 272|273|274|275|276|277 $filter */ function filter_input(int $type, string $var_name, $filter): string|false|null');
    expect(php81).not.toContain('FILTER_FLAG_GLOBAL_RANGE');
    expect(php82).toContain('const FILTER_FLAG_GLOBAL_RANGE = 268435456;');
    expect(php84).not.toContain('FILTER_THROW_ON_FAILURE');
    expect(php85).toContain('const FILTER_THROW_ON_FAILURE = 268435456;');
    expect(php85).toContain('const FILTER_FLAG_GLOBAL_RANGE = 536870912;');
    expect(php85).toContain('function filter_input_array(int $type, array|int $options = FILTER_DEFAULT, bool $add_empty = true): array|false|null');
    expect(php85).toContain('/** @return list<string> */ function filter_list(): array');
    expect(php85).toContain('/** @return int|false */ function filter_id(string $name): int|false');
  });
  it('models advanced SPL iterator traversal, caching, regex transforms, and tree formatting by PHP target', () => {
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of ['RecursiveIteratorIterator', 'CachingIterator', 'RecursiveCachingIterator',
        'RegexIterator', 'RecursiveRegexIterator', 'RecursiveTreeIterator']) {
        expect(stub, `${version}:${name}`).toContain(`class ${name}`);
      }
      expect(stub).toContain('@template-extends FilterIterator<TKey, TValue|string|array<array-key, mixed>>');
      expect(stub).toContain('@return array<TKey, TValue> */ public function getCache()');
      expect(stub).toContain('@return TKey|string */ public function key()');
      expect(stub).toContain('@return TValue|string */ public function current()');
    }
    expect(php72).toContain('setMaxDepth($max_depth = -1)');
    expect(php72).toContain('public function setPostfix() {}');
    expect(php73).toContain('public function setPostfix($postfix) {}');
    expect(php72).toContain('public function __construct(Iterator $iterator, $regex, $mode = self::MATCH, $flags = 0, $preg_flags = 0)');
    expect(php80).toContain('public function __construct(Iterator $iterator, string $pattern, int $mode = self::MATCH, int $flags = 0, int $pregFlags = 0)');
    expect(php80).toContain('class CachingIterator extends IteratorIterator implements ArrayAccess, Countable, Stringable');
    expect(php80).toContain('public $replacement = null');
    expect(php81).toContain('public ?string $replacement = null');
    expect(php81).toContain('public function getChildren(): RecursiveRegexIterator');
    expect(php81).toContain('public function getMaxDepth(): int|false');
    expect(php84).toContain('public const int BYPASS_CURRENT = 4');
    expect(php84).toContain('public const int GET_MATCH = 1');
    expect(php84).toContain('/** @var int */ public const MATCH = 0;');
    expect(php84).toContain('public const int FULL_CACHE = 256');
    expect(php84).toContain('public function __construct($iterator, int $flags = self::BYPASS_KEY');
    expect(php85).toContain('public function __construct(RecursiveIterator|IteratorAggregate $iterator, int $flags = self::BYPASS_KEY');
  });
  it('models SPL directory iterators, mutable modes, and PHP 7.2 to 8.5 boundaries', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of ['DirectoryIterator', 'FilesystemIterator', 'RecursiveDirectoryIterator', 'GlobIterator']) {
        expect(stub).toContain(`class ${name}`);
      }
      expect(stub).toContain('@template-implements SeekableIterator<int, static>');
      expect(stub).toContain('@template-implements SeekableIterator<string, string|SplFileInfo|static>');
      expect(stub).toContain('@template-implements RecursiveIterator<string, string|SplFileInfo|static>');
      expect(stub).toContain('@return static */ public function getChildren()');
    }
    const php72 = builtinPhpStub('7.2'); const php80 = builtinPhpStub('8.0');
    const php81 = builtinPhpStub('8.1'); const php84 = builtinPhpStub('8.4');
    expect(php72).toContain('function __construct($path)');
    expect(php72).toContain('function seek($position)');
    expect(php72).toContain('function hasChildren($allow_links = false)');
    expect(php72).toContain('public const FOLLOW_SYMLINKS = 512');
    expect(php72).toContain('public const OTHER_MODE_MASK = 12288');
    expect(php80).toContain('function __construct(string $directory, int $flags = 4096)');
    expect(php80).toContain('function __construct(string $pattern, int $flags = 0)');
    expect(php80).toContain('function seek(int $offset)');
    expect(php80.match(/class DirectoryIterator[\s\S]*?(?=class FilesystemIterator)/)?.[0]).not.toContain('function key(): string');
    expect(php81).toContain('public const FOLLOW_SYMLINKS = 16384');
    expect(php81).toContain('public const OTHER_MODE_MASK = 28672');
    expect(php81).toContain('function current(): string|SplFileInfo|FilesystemIterator');
    expect(php81).toContain('function getChildren(): RecursiveDirectoryIterator');
    expect(php84).toContain('public const int CURRENT_MODE_MASK = 240');
  });
  it('models Reflection class, callable, property, parameter, and type APIs across PHP 7.2–8.5', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of ['ReflectionFunctionAbstract', 'ReflectionFunction', 'ReflectionMethod', 'ReflectionClass', 'ReflectionObject', 'ReflectionProperty', 'ReflectionClassConstant', 'ReflectionParameter', 'ReflectionType', 'ReflectionNamedType']) {
        expect(stub).toContain(`class ${name}`);
      }
      expect(stub).toContain('@return list<ReflectionParameter> */ public function getParameters()');
      expect(stub).toContain('@return list<ReflectionMethod> */ public function getMethods(');
      expect(stub).toContain('@return list<ReflectionProperty> */ public function getProperties(');
      expect(stub).toContain('/** @template T of object */\nclass ReflectionClass');
      expect(stub).toContain('/** @return T */ public function newInstance(');
      expect(stub).toContain('/** @return T */ public function newInstanceWithoutConstructor()');
      expect(stub).toContain('/** @return T */ public function newInstanceArgs(array $args = [])');
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php82 = builtinPhpStub('8.2'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('interface Reflector { public static function export(); public function __toString(); }');
    expect(php72).toContain('public const IS_PUBLIC = 256');
    expect(php72).toContain('public function __construct($class_or_method, $name = null)');
    expect(php72).toContain('/** @param class-string<T>|T $argument */');
    expect(php72).toContain('public static function export($class, $name, $return = false)');
    expect(php72).not.toContain('function isInitialized(');
    expect(php74).toContain('public const IS_PUBLIC = 1');
    expect(php74).toContain('function isInitialized($object = null)');
    expect(php80).toContain('interface Reflector extends Stringable');
    expect(php80).toContain('/** @param class-string<T>|T $objectOrClass */');
    expect(php80).not.toContain('public static function export($class');
    expect(php80).toContain('class ReflectionUnionType extends ReflectionType');
    expect(php80).not.toContain('class ReflectionEnum extends ReflectionClass');
    expect(php80).toContain('class ReflectionAttribute {');
    expect(php80).not.toContain('class ReflectionAttribute implements Reflector');
    expect(php81).toContain('class ReflectionAttribute implements Reflector');
    expect(php81).toContain('class ReflectionIntersectionType extends ReflectionType');
    expect(php81).toContain('class ReflectionEnum extends ReflectionClass');
    expect(php81).toContain('function getBackingType(): ?ReflectionType');
    expect(php81).toContain('function getParameters(): array');
    expect(php82).toContain('function hasPrototype(): bool');
    expect(php82).toContain('function isReadOnly(): bool');
    expect(php84).toContain('public static function createFromMethodName(string $method): static');
    expect(php84).toContain('function newLazyGhost(callable $initializer, int $options = 0): object');
    expect(php84).toContain('enum PropertyHookType: string');
    expect(php84).toContain('function getBackingType(): ?ReflectionNamedType');
    expect(php84).toContain('function isDeprecated(): bool');
    expect(php84).toContain('public const int IS_VIRTUAL = 512');
    expect(php85).toContain('function getMangledName(): string');
  });
  it('versions Reflection extension and global-constant classes', () => {
    const php72 = builtinPhpStub('7.2');
    const php80 = builtinPhpStub('8.0');
    const php81 = builtinPhpStub('8.1');
    const php84 = builtinPhpStub('8.4');
    const php85 = builtinPhpStub('8.5');
    for (const stub of [php72, php80, php81, php84, php85]) {
      expect(stub).toContain('class ReflectionExtension implements Reflector');
      expect(stub).toContain('class ReflectionZendExtension implements Reflector');
      expect(stub).toContain('function getFunctions()');
      expect(stub).toContain('function getCopyright()');
    }
    expect(php72).toContain('public static function export($name, $return = false)');
    expect(php72).toContain('public $name;');
    expect(php72).toContain('public function __construct($name)');
    expect(php72).not.toContain('class ReflectionConstant implements Reflector');
    expect(php80).not.toContain('public static function export($name, $return = false)');
    expect(php80).toContain('public function __construct(string $name)');
    expect(php80).toContain('public $name;');
    expect(php81).toContain('public string $name;');
    expect(php81).not.toContain('class ReflectionConstant implements Reflector');
    expect(php84).toContain('final class ReflectionConstant implements Reflector');
    expect(php84).toContain('public function getValue(): mixed');
    const reflectionConstant84 = php84.match(/final class ReflectionConstant implements Reflector \{([\s\S]*?)\n\}/)?.[1];
    expect(reflectionConstant84).not.toContain('public function getExtensionName(): string|false');
    expect(php85).toContain('class ReflectionConstant implements Reflector');
    expect(php85).not.toContain('final class ReflectionConstant implements Reflector');
    expect(php85).toContain('public function getExtensionName(): string|false');
    expect(php85).toContain('public function getAttributes(?string $name = null, int $flags = 0): array');
    const reflectionConstant85 = php85.match(/class ReflectionConstant implements Reflector \{([\s\S]*?)\n\}/)?.[1];
    expect(reflectionConstant85).not.toContain('function inNamespace(');
  });
  it('versions ReflectionGenerator and ReflectionReference without future methods', () => {
    const php72 = builtinPhpStub('7.2');
    const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0');
    const php83 = builtinPhpStub('8.3');
    const php84 = builtinPhpStub('8.4');
    const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('class ReflectionGenerator {');
    expect(php72).not.toContain('final class ReflectionGenerator {');
    expect(php72).not.toContain('class ReflectionReference {');
    expect(php72).toContain('public function __construct($generator)');
    expect(php74).toContain('class ReflectionReference {');
    expect(php74).not.toContain('final class ReflectionReference {');
    expect(php74).toContain('public static function fromArrayElement($array, $key)');
    expect(php80).toContain('final class ReflectionGenerator {');
    expect(php80).toContain('final class ReflectionReference {');
    expect(php80).toContain('public static function fromArrayElement(array $array, int|string $key): ?ReflectionReference');
    const generator83 = php83.match(/class ReflectionGenerator \{([\s\S]*?)\n\}/)?.[1];
    expect(generator83).not.toContain('isClosed(');
    expect(php84).toContain('public function isClosed(): bool');
    expect(php85).toContain('public function getExecutingGenerator(): Generator');
    expect(php85).toContain('public function getTrace(int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT): array');
  });
  it('models mbstring signatures, shapes, and version boundaries across PHP 7.2–8.5', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of ['mb_strlen', 'mb_convert_encoding', 'mb_detect_encoding', 'mb_ereg', 'mb_ereg_search_pos']) {
        expect(stub).toContain(`function ${name}(`);
      }
      expect(stub).toContain('@return list<string> */ function mb_list_encodings(');
      expect(stub).toContain('@return array{0:int, 1:int}|false */ function mb_ereg_search_pos(');
    }
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1'); const php82 = builtinPhpStub('8.2');
    const php83 = builtinPhpStub('8.3'); const php84 = builtinPhpStub('8.4');
    expect(php72).toContain('function mbereg(');
    expect(php72).toContain('function mb_parse_str($encoded_string, &$result = null)');
    expect(php72).toContain('const MB_OVERLOAD_MAIL = 1');
    expect(php72).not.toContain('const MB_CASE_FOLD = 3');
    expect(php73).toContain('const MB_CASE_FOLD = 3');
    expect(php73).not.toContain('const MB_ONIGURUMA_VERSION');
    expect(php74).not.toContain('const MB_ONIGURUMA_VERSION');
    expect(builtinPhpStub('7.4', { mbOnigurumaVersion: '6.9.10' }))
      .toContain("const MB_ONIGURUMA_VERSION = '6.9.10';");
    expect(builtinPhpStub('7.2', { mbOnigurumaVersion: '6.9.10' }))
      .not.toContain('const MB_ONIGURUMA_VERSION');
    expect(builtinPhpStub('8.5', { disabledExtensions: ['mbstring'], mbOnigurumaVersion: '6.9.10' }))
      .not.toContain('const MB_ONIGURUMA_VERSION');
    const mbUri = builtinDocumentUri('8.5', { mbOnigurumaVersion: '6.9.10' });
    expect(parseBuiltinDocumentUri(mbUri)?.mbOnigurumaVersion).toBe('6.9.10');
    expect(parseBuiltinDocumentUri(`${mbUri}&mbOniguruma=bad`)).toBeUndefined();
    expect(php72).not.toContain('function mb_str_split(');
    expect(php74).toContain('function mb_str_split($str, $split_length = 1, $encoding = null)');
    expect(php80).not.toContain('function mbereg(');
    expect(php80).not.toContain('const MB_OVERLOAD_MAIL');
    expect(php80).toContain('function mb_strlen(string $string, ?string $encoding = null): int');
    expect(php81).toContain("function mb_get_info(string $type = 'all'): array|string|int|false");
    expect(php82).toContain("function mb_get_info(string $type = 'all'): array|string|int|false|null");
    expect(php82).not.toContain('function mb_str_pad(');
    expect(php83).toContain('function mb_str_pad(');
    expect(php83).not.toContain('function mb_ucfirst(');
    expect(php84).toContain('function mb_ucfirst(');
    expect(php84).toContain('function mb_trim(');
  });
  it('models libxml, SimpleXML, and XML Parser contracts across PHP 7.2–8.5', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of ['libxml_get_errors', 'libxml_get_last_error', 'simplexml_load_file', 'simplexml_load_string', 'simplexml_import_dom']) {
        expect(stub).toContain(`function ${name}(`);
      }
      expect(stub).toContain('class LibXMLError');
      expect(stub).toContain('class SimpleXMLElement');
      expect(stub).toContain('class SimpleXMLIterator extends SimpleXMLElement');
      expect(stub).toContain('@return list<LibXMLError> */ function libxml_get_errors(');
      expect(stub).toContain('@return list<SimpleXMLElement>|null|false */ public function xpath(');
      expect(stub).toContain('@return array<string, string> */ public function getNamespaces(');
      for (const name of ['xml_parser_create', 'xml_parser_create_ns', 'xml_set_element_handler', 'xml_set_character_data_handler',
        'xml_set_processing_instruction_handler', 'xml_set_default_handler', 'xml_set_unparsed_entity_decl_handler',
        'xml_set_notation_decl_handler', 'xml_set_external_entity_ref_handler', 'xml_set_start_namespace_decl_handler',
        'xml_set_end_namespace_decl_handler', 'xml_parse', 'xml_parse_into_struct', 'xml_get_error_code', 'xml_error_string',
        'xml_get_current_line_number', 'xml_get_current_column_number', 'xml_get_current_byte_index', 'xml_parser_free',
        'xml_parser_set_option', 'xml_parser_get_option']) expect(stub).toContain(`function ${name}(`);
      for (const name of ['XML_ERROR_NONE', 'XML_ERROR_EXTERNAL_ENTITY_HANDLING', 'XML_OPTION_CASE_FOLDING',
        'XML_OPTION_TARGET_ENCODING', 'XML_OPTION_SKIP_TAGSTART', 'XML_OPTION_SKIP_WHITE', 'XML_SAX_IMPL']) {
        expect(stub).toContain(`const ${name} =`);
      }
    }
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php82 = builtinPhpStub('8.2'); const php83 = builtinPhpStub('8.3');
    const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('class SimpleXMLElement implements Traversable');
    expect(php72).toContain('@return resource|false */ function xml_parser_create($encoding = null)');
    expect(php72).toContain('function xml_parser_create_ns($encoding = null, $sep =');
    expect(php72).toContain('function xml_set_element_handler($parser, $shdl, $ehdl)');
    expect(php72).toContain('function xml_parse($parser, $data, $isfinal = false)');
    expect(php72).not.toContain('final class XMLParser');
    expect(php73).toContain('class SimpleXMLElement implements Traversable, Countable');
    expect(php72).toContain('public $level;');
    expect(php80).toContain('class SimpleXMLElement implements Stringable, Countable, RecursiveIterator');
    expect(php80).toContain('function xml_parser_create(?string $encoding = null): XMLParser');
    expect(php80).toContain('function xml_parse_into_struct(XMLParser $parser, string $data, &$values, &$index = null): int');
    expect(php80).toContain('final class XMLParser {}');
    expect(php80).toContain('public function xpath(string $expression) {}');
    expect(php81).toContain('public int $level;');
    expect(php81).toContain('public function xpath(string $expression): array|null|false');
    expect(php81).toContain('function xml_parse_into_struct(XMLParser $parser, string $data, &$values, &$index = null): int|false');
    expect(php81).not.toContain('function libxml_get_external_entity_loader(');
    expect(php82).toContain('function libxml_get_external_entity_loader(): ?callable');
    expect(php82).toContain('function xml_set_element_handler(XMLParser $parser, $start_handler, $end_handler): true');
    expect(php82).toContain('function xml_parser_get_option(XMLParser $parser, int $option): string|int');
    expect(php82).not.toContain('const LIBXML_RECOVER');
    expect(php82).not.toContain('const LIBXML_BIGLINES');
    const simple82 = php82.slice(php82.indexOf('class SimpleXMLElement'), php82.indexOf('class SimpleXMLIterator'));
    const simple83 = php83.slice(php83.indexOf('class SimpleXMLElement'), php83.indexOf('class SimpleXMLIterator'));
    expect(simple82).not.toContain('function __debugInfo(): ?array');
    expect(simple83).toContain('function __debugInfo(): ?array');
    expect(php83).toContain('@param string|int|bool $value');
    expect(php83).toContain('function xml_parser_get_option(XMLParser $parser, int $option): string|int|bool');
    expect(php83).not.toContain('const XML_OPTION_PARSE_HUGE');
    expect(php84).toContain('const LIBXML_RECOVER = 1');
    expect(php84).toContain('const LIBXML_BIGLINES = 4194304');
    expect(php84).toContain('function __debugInfo(): ?array');
    expect(php84).toContain('function simplexml_import_dom(object $node');
    expect(php84).toContain('const XML_OPTION_PARSE_HUGE = 5');
    expect(php84).toContain('function xml_set_character_data_handler(XMLParser $parser, callable|string|null $handler): true');
    expect(php84).toContain('@deprecated PHP 8.4 @return true */ function xml_set_object');
    expect(php84).toContain('@return bool */ function libxml_set_external_entity_loader(');
    expect(php85).toContain('@return true */ function libxml_set_external_entity_loader(');
    expect(php85).toContain('@deprecated PHP 8.5 @return bool */ function xml_parser_free');
  });
  it('models complete XMLReader and XMLWriter contracts across PHP 7.2–8.5', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      const reader = stub.slice(stub.indexOf('class XMLReader'), stub.indexOf('function xmlwriter_open_uri'));
      expect([...reader.matchAll(/public const (?:int )?[A-Z_]+ =/g)]).toHaveLength(22);
      for (const member of ['attributeCount', 'namespaceURI', 'getAttributeNs', 'moveToNextAttribute', 'readInnerXml', 'setRelaxNGSchemaSource', 'expand']) {
        expect(reader).toContain(member);
      }
      expect([...stub.matchAll(/function xmlwriter_[a-z_]+\(/g)]).toHaveLength(42);
      for (const member of ['openMemory', 'writeAttributeNs', 'writeElementNs', 'startDocument', 'writeDtdEntity', 'outputMemory', 'flush']) {
        expect(stub).toContain(`function ${member}(`);
      }
    }
    const php72 = builtinPhpStub('7.2'); const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php83 = builtinPhpStub('8.3'); const php84 = builtinPhpStub('8.4');
    expect(php72).toContain('public function open($URI, $encoding = null, $options = 0)');
    expect(php72).toContain('public function next($localname = null)');
    expect(php72).toContain('@return resource|false */ function xmlwriter_open_memory()');
    expect(php72).toContain('function xmlwriter_set_indent($xmlwriter, $indent)');
    expect(php72).toContain('function xmlwriter_write_dtd_entity($xmlwriter, $name, $content)');
    expect(php80).toContain('public static function open(string $uri, ?string $encoding = null, int $flags = 0)');
    expect(php80).toContain('@return XMLWriter|false */ function xmlwriter_open_memory(): XMLWriter|false');
    expect(php80).toContain('function xmlwriter_write_dtd_entity(XMLWriter $writer, string $name, string $content, bool $isParam = false');
    expect(php80).toContain('@return bool */ public function writeElement(string $name, ?string $content = null) {}');
    expect(php81).toContain('public string $namespaceURI;');
    expect(php81).toContain('public function getAttribute(string $name): ?string');
    expect(php81).toContain('public function writeElement(string $name, ?string $content = null): bool');
    expect(php83).toContain('@return true */ public function close() {}');
    expect(php83).not.toContain('public static function fromUri(');
    expect(php84).toContain('public const int XML_DECLARATION = 17');
    expect(php84).toContain('public function close(): true');
    expect(php84).toContain('public static function fromUri(string $uri, ?string $encoding = null, int $flags = 0): static');
    expect(php84).toContain('public static function toMemory(): static');
    expect(php84).toContain('public static function toStream($stream): static');
  });
  it('models the complete classic DOM surface and its PHP 7.2–8.5 boundaries', () => {
    const expectedCounts: Record<string, readonly [types: number, methods: number, properties: number]> = {
      '7.2': [31, 124, 87], '7.3': [31, 124, 87], '7.4': [31, 124, 87], '8.0': [22, 122, 87],
      '8.1': [22, 126, 87], '8.2': [22, 126, 87], '8.3': [22, 137, 93], '8.4': [22, 139, 93], '8.5': [22, 139, 93],
    };
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      const start = stub.indexOf('const XML_ELEMENT_NODE =');
      const modernStart = stub.indexOf('namespace Dom\n{', start);
      const end = modernStart >= 0 ? modernStart : stub.indexOf('const PASSWORD_DEFAULT =', start);
      const dom = stub.slice(start, end); const constants = dom.slice(0, dom.indexOf('class DOMDocumentType'));
      expect([...constants.matchAll(/^const (?:XML|DOM)[A-Z_]+ =/gm)]).toHaveLength(45);
      expect([...dom.matchAll(/^(?:(?:final|abstract) )?class DOM|^interface DOM/gm)]).toHaveLength(expectedCounts[version]![0]);
      expect([...dom.matchAll(/public (?:static )?function /g)]).toHaveLength(expectedCounts[version]![1]);
      expect([...dom.matchAll(/public\s+(?:(?:\??[A-Za-z_][\w|?]*)\s+)?\$\w+/g)]).toHaveLength(expectedCounts[version]![2]);
      for (const name of ['DOMNode', 'DOMDocument', 'DOMElement', 'DOMAttr', 'DOMNodeList', 'DOMNamedNodeMap', 'DOMXPath']) {
        expect(stub).toContain(`class ${name}`);
      }
      for (const name of ['XML_ELEMENT_NODE', 'XML_ATTRIBUTE_NOTATION', 'DOM_PHP_ERR', 'DOM_VALIDATION_ERR']) {
        expect(stub).toContain(`const ${name} =`);
      }
      expect(stub).toContain('function dom_import_simplexml(');
      expect(stub).toContain('public function createElement(');
      expect(stub).toContain('public function getElementsByTagName(');
      expect(stub).toContain('public function query(');
    }
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1'); const php82 = builtinPhpStub('8.2');
    const php83 = builtinPhpStub('8.3'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    for (const stub of [php72, php73, php74]) {
      expect(stub).toContain('class DOMNameList {');
      expect(stub).toContain('class DOMConfiguration {');
    }
    for (const stub of [php80, php81, php82, php83, php84, php85]) {
      expect(stub).not.toContain('class DOMNameList {');
      expect(stub).not.toContain('class DOMConfiguration {');
    }
    expect(php72).not.toContain('interface DOMParentNode');
    expect(php72).toContain('/** @var ?DOMElement */ public $documentElement;');
    expect(php72).toContain('public function renameNode(DOMNode $node, $namespaceURI, $qualifiedName)');
    expect(php72).toContain('public function createProcessingInstruction($target, $data)');
    expect(php72).toContain('public function importNode(DOMNode $importedNode, $deep)');
    expect(php73).toContain('public function createProcessingInstruction($target, $data)');
    expect(php74).toContain('public function createProcessingInstruction($target, $data = "")');
    expect(php74).toContain('public function importNode(DOMNode $importedNode, $deep = false)');
    expect(php80).toContain('interface DOMParentNode');
    expect(php80).toContain('/** @var ?DOMElement */ public $documentElement;');
    expect(php80).not.toContain('public function renameNode(');
    expect(php81).toContain('public ?DOMElement $documentElement;');
    expect(php81).toContain('public function count(): int');
    expect(php82).toContain('function dom_import_simplexml(object $node): DOMAttr|DOMElement');
    expect(php83).toContain('public ?DOMElement $parentElement;');
    expect(php83).toContain('public function getAttributeNames(): array');
    expect(php83).toContain('public function replaceChildren(...$nodes): void');
    expect(php83).not.toContain('DOCUMENT_POSITION_DISCONNECTED');
    expect(php84).toContain('public const int DOCUMENT_POSITION_DISCONNECTED = 0x01');
    expect(php84).toContain('public function compareDocumentPosition(DOMNode $other): int');
    expect(php84).toContain('public static function quote(string $str): string');
    expect(php84).toContain('public function registerPhpFunctionNS(string $namespaceURI, string $name, callable $callable): void');
    expect(php84).not.toContain('public function getFeature(string $feature');
    expect(php85).toContain('public const int DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = 0x20');
  });
  it('models the complete modern Dom namespace and its PHP 8.4–8.5 boundaries', () => {
    for (const version of SUPPORTED_PHP_VERSIONS.slice(0, 7)) expect(builtinPhpStub(version)).not.toContain('namespace Dom\n{');
    for (const version of ['8.4', '8.5'] as const) {
      const stub = builtinPhpStub(version); const start = stub.indexOf('namespace Dom\n{');
      const modern = stub.slice(start, stub.indexOf('const PASSWORD_DEFAULT =', start));
      expect(start).toBeGreaterThan(0);
      expect([...modern.matchAll(/^ {4}const [A-Z_]+ =/gm)]).toHaveLength(16);
      expect([...modern.matchAll(/^ {4}(?:(?:readonly|abstract|final) )*(?:class|interface|enum) /gm)]).toHaveLength(28);
      expect([...modern.matchAll(/\b(?:public|private|protected)(?:\s+static|\s+final)*\s+function /g)])
        .toHaveLength(version === '8.4' ? 168 : 171);
      expect([...modern.matchAll(/\bpublic\s+(?:readonly\s+)?[^\n;{}()]+\$\w+\s*;/g)])
        .toHaveLength(version === '8.4' ? 85 : 89);
      expect([...modern.matchAll(/public const int DOCUMENT_POSITION_/g)]).toHaveLength(6);
      expect([...modern.matchAll(/^ {8}case /gm)]).toHaveLength(4);
      for (const name of ['Node', 'Element', 'Document', 'HTMLDocument', 'XMLDocument', 'XPath', 'TokenList', 'NamespaceInfo']) {
        expect(modern).toMatch(new RegExp(`(?:class|interface) ${name}\\b`));
      }
      expect(modern).toContain('function import_simplexml(object $node): Attr|Element');
      expect(modern).toContain('public static function createFromString(string $source, int $options = 0, ?string $overrideEncoding = null): HTMLDocument');
      expect(modern).toContain('public function evaluate(string $expression, ?Node $contextNode = null, bool $registerNodeNS = true): null|bool|float|string|NodeList');
    }
    const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php84).not.toContain('public HTMLCollection $children;');
    expect(php84).not.toContain('public function getElementsByClassName(string $classNames): HTMLCollection');
    expect(php84).not.toContain('public function insertAdjacentHTML(AdjacentPosition $where, string $string): void');
    expect(php84).not.toContain('public string $outerHTML;');
    expect(php85).toContain('public HTMLCollection $children;');
    expect(php85).toContain('public function getElementsByClassName(string $classNames): HTMLCollection');
    expect(php85).toContain('public function insertAdjacentHTML(AdjacentPosition $where, string $string): void');
    expect(php85).toContain('public string $outerHTML;');
  });
  it('reports syntax only below its minimum version', () => {
    const node = { type: 'enum_declaration', text: 'enum E {}', startIndex: 2, endIndex: 11, namedChildren: [] };
    expect(unsupportedSyntax(node, '8.0')).toEqual([{ feature: 'enum', minimumVersion: '8.1', start: 2, end: 11 }]);
    expect(unsupportedSyntax(node, '8.1')).toEqual([]);
    const name = { type: 'name', text: 'value', startIndex: 4, endIndex: 9, namedChildren: [] };
    const argument = { type: 'argument', text: 'value: 1', startIndex: 4, endIndex: 12, namedChildren: [name], childForFieldName: (field: string): typeof name | null => field === 'name' ? name : null };
    expect(unsupportedSyntax(argument, '7.4')).toEqual([{ feature: 'named argument', minimumVersion: '8.0', start: 4, end: 9 }]);
    expect(unsupportedSyntax(argument, '8.0')).toEqual([]);
    const dynamicName = { type: 'name', text: '{$name}', startIndex: 9, endIndex: 16, namedChildren: [] };
    const dynamicConstant = { type: 'class_constant_access_expression', text: 'Flags::{$name}', startIndex: 2, endIndex: 16,
      namedChildren: [dynamicName], childForFieldName: (field: string): typeof dynamicName | null => field === 'name' ? dynamicName : null };
    expect(unsupportedSyntax(dynamicConstant, '8.2')).toEqual([
      { feature: 'dynamic class constant access', minimumVersion: '8.3', start: 9, end: 16 },
    ]);
    expect(unsupportedSyntax(dynamicConstant, '8.3')).toEqual([]);
  });
  it('tracks PHP 8.0 and 8.2 atomic type syntax boundaries', () => {
    const atom = (type: string, value: string, start: number, parent?: any): any => ({ type, text: value, startIndex: start, endIndex: start + value.length, namedChildren: [], parent });
    const callable: any = { type: 'function_definition', text: '', startIndex: 0, endIndex: 20, namedChildren: [], childForFieldName: (field: string) => field === 'return_type' ? callable.namedChildren[0] : null };
    const staticType = atom('named_type', 'static', 10, callable); callable.namedChildren = [staticType];
    expect(unsupportedSyntax(callable, '7.4')).toEqual([{ feature: 'static return type', minimumVersion: '8.0', start: 10, end: 16 }]);
    const mixed = atom('primitive_type', 'mixed', 2);
    expect(unsupportedSyntax(mixed, '7.4')).toEqual([{ feature: 'mixed type', minimumVersion: '8.0', start: 2, end: 7 }]);
    expect(unsupportedSyntax(mixed, '8.0')).toEqual([]);
    const falseType = atom('primitive_type', 'false', 4);
    expect(unsupportedSyntax(falseType, '8.1')).toEqual([{ feature: 'standalone false type', minimumVersion: '8.2', start: 4, end: 9 }]);
    const union: any = { type: 'union_type', text: 'false|null', startIndex: 4, endIndex: 14, namedChildren: [] };
    union.namedChildren = [atom('primitive_type', 'false', 4, union), atom('primitive_type', 'null', 10, union)];
    expect(unsupportedSyntax(union, '8.1')).toEqual([{ feature: 'standalone false and null types', minimumVersion: '8.2', start: 4, end: 14 }]);
    const trueType = atom('primitive_type', 'true', 6);
    expect(unsupportedSyntax(trueType, '8.1')).toEqual([{ feature: 'true type', minimumVersion: '8.2', start: 6, end: 10 }]);
    expect(unsupportedSyntax(trueType, '8.2')).toEqual([]);
  });
  it('resolves Composer PHP constraints to the lowest supported minor', () => {
    expect(lowestSupportedVersion('^7.2 || ^8.1')).toBe('7.2');
    expect(lowestSupportedVersion('>=8.3 <9')).toBe('8.3');
    expect(lowestSupportedVersion('<7.2')).toBeUndefined();
  });
  it('compares syntax availability by PHP minor', () => {
    expect(isSyntaxAvailable('8.1', '8.0')).toBe(true);
    expect(isSyntaxAvailable('7.4', '8.0')).toBe(false);
  });
});
