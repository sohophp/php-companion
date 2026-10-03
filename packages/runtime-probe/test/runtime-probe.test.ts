import { describe, expect, it } from 'vitest';
import { discoverPhpRuntimes, phpMinor, probePhpRuntime } from '../src/index.js';

const payload = (overrides: Record<string, unknown> = {}): string => `noise\nPHP_COMPANION_RUNTIME_V1:${JSON.stringify({
  version: '8.5.3', versionId: 80503, sapi: 'cli', loadedExtensions: ['Core', 'PDO', 'pdo'],
  loadedConfigurationFile: '/etc/php.ini', scannedConfigurationFiles: ['/etc/php.d/pdo.ini'], ...overrides,
})}`;

describe('PHP runtime probe', () => {
  it('accepts a framed payload and normalizes extension identities', async () => {
    const runtime = await probePhpRuntime('php', {}, async () => payload(), async () => '/usr/bin/php');
    expect(runtime).toEqual({
      command: 'php', path: '/usr/bin/php', version: '8.5.3', versionId: 80503, minor: '8.5', sapi: 'cli',
      loadedExtensions: ['core', 'pdo'], loadedConfigurationFile: '/etc/php.ini', scannedConfigurationFiles: ['/etc/php.d/pdo.ini'],
    });
  });

  it('records conditional function availability without assuming it from the PHP version', async () => {
    const available = await probePhpRuntime('php', {}, async () => payload({ availableFunctions: ['curl_upkeep', 'imageavif', 'imagecreatefromavif', 'intltz_get_iana_id'] }), async () => '/usr/bin/php');
    const unavailable = await probePhpRuntime('php', {}, async () => payload({ availableFunctions: [] }), async () => '/usr/bin/php');
    expect(available?.availableFunctions).toEqual(['curl_upkeep', 'imageavif', 'imagecreatefromavif', 'intltz_get_iana_id']);
    expect(unavailable?.availableFunctions).toEqual([]);
    expect(await probePhpRuntime('php', {}, async () => payload({ availableFunctions: 'curl_upkeep' }), async () => '/usr/bin/php')).toBeUndefined();
    const standard = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'standard'],
      availableFunctions: ['strptime', 'ftok', 'sys_getloadavg'] }), async () => '/usr/bin/php');
    expect(standard?.availableFunctions).toEqual(['ftok', 'strptime', 'sys_getloadavg']);
  });
  it('carries PostgreSQL client constants only with the PostgreSQL extension', async () => {
    const pgsqlRuntime = { functions: ['pg_connect'], constants: { PGSQL_LIBPQ_VERSION: '13.23', PGSQL_ERRORS_SQLSTATE: 3 } };
    const available = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'pgsql'], pgsqlRuntime }), async () => '/usr/bin/php');
    expect(available?.pgsqlRuntime).toEqual(pgsqlRuntime);
    expect(await probePhpRuntime('php', {}, async () => payload({ pgsqlRuntime }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'pgsql'],
      pgsqlRuntime: { functions: ['pg_connect'], constants: { PGSQL_LIBPQ_VERSION: { value: '13.23' } } } }), async () => '/usr/bin/php')).toBeUndefined();
  });
  it('carries libxslt versions only with the XSL extension', async () => {
    const xslRuntime = { constants: { LIBXSLT_VERSION: 10132, LIBXSLT_DOTTED_VERSION: '1.1.32' } };
    const available = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'xsl'], xslRuntime }), async () => '/usr/bin/php');
    expect(available?.xslRuntime).toEqual(xslRuntime);
    expect(await probePhpRuntime('php', {}, async () => payload({ xslRuntime }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'xsl'],
      xslRuntime: { constants: { LIBXSLT_VERSION: { value: 10132 } } } }), async () => '/usr/bin/php')).toBeUndefined();
  });
  it('carries the phpredis build version only when Redis is loaded', async () => {
    const redisRuntime = { version: '6.3.0' };
    const available = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'redis'], redisRuntime }), async () => '/usr/bin/php');
    expect(available?.redisRuntime).toEqual(redisRuntime);
    expect(await probePhpRuntime('php', {}, async () => payload({ redisRuntime }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'redis'], redisRuntime: { version: '6.3.0;evil' } }), async () => '/usr/bin/php')).toBeUndefined();
  });
  it('carries a bounded Imagick build fingerprint only when the extension is loaded', async () => {
    const imagickRuntime = { version: '3.8.1', imageMagickVersionNumber: 1810, fingerprint: 'a'.repeat(64) };
    const available = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'imagick'], imagickRuntime }), async () => '/usr/bin/php');
    expect(available?.imagickRuntime).toEqual(imagickRuntime);
    expect(await probePhpRuntime('php', {}, async () => payload({ imagickRuntime }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'imagick'],
      imagickRuntime: { ...imagickRuntime, fingerprint: 'invalid' } }), async () => '/usr/bin/php')).toBeUndefined();
  });
  it('records the Readline library and its conditional history function only when loaded', async () => {
    const runtime = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'readline'],
      availableFunctions: ['readline_list_history'], readlineLib: 'libedit' }), async () => '/usr/bin/php');
    expect(runtime?.readlineLib).toBe('libedit');
    expect(runtime?.availableFunctions).toContain('readline_list_history');
    expect(await probePhpRuntime('php', {}, async () => payload({ readlineLib: 'libedit' }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'readline'],
      readlineLib: 'bad";' }), async () => '/usr/bin/php')).toBeUndefined();
  });
  it('carries bounded ZipArchive reflection facts only with the Zip extension', async () => {
    const zipRuntime = { methods: ['open', 'addFile'], constants: { CREATE: 1, LIBZIP_VERSION: '1.11.4' } };
    const runtime = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'zip'], zipRuntime }), async () => '/usr/bin/php');
    expect(runtime?.zipRuntime).toEqual({ methods: ['addFile', 'open'], constants: zipRuntime.constants });
    expect(await probePhpRuntime('php', {}, async () => payload({ zipRuntime }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'zip'],
      zipRuntime: { methods: ['open'], constants: { CREATE: [] } } }), async () => '/usr/bin/php')).toBeUndefined();
  });
  it('carries Zlib version constants only with the Zlib extension', async () => {
    const zlibRuntime = { version: '1.2.11', vernum: 4784 };
    const runtime = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'zlib'], zlibRuntime }), async () => '/usr/bin/php');
    expect(runtime?.zlibRuntime).toEqual(zlibRuntime);
    expect(await probePhpRuntime('php', {}, async () => payload({ zlibRuntime }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'zlib'],
      zlibRuntime: { version: 'bad version', vernum: 4784 } }), async () => '/usr/bin/php')).toBeUndefined();
  });
  it('carries bounded Sockets symbols only with the Sockets extension', async () => {
    const socketsRuntime = { functions: ['socket_read', 'socket_create'], constants: { AF_INET: 2, SOCK_STREAM: 1 } };
    const runtime = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'sockets'], socketsRuntime }), async () => '/usr/bin/php');
    expect(runtime?.socketsRuntime).toEqual({ functions: ['socket_create', 'socket_read'], constants: socketsRuntime.constants });
    expect(await probePhpRuntime('php', {}, async () => payload({ socketsRuntime }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'sockets'],
      socketsRuntime: { functions: ['socket_create'], constants: { AF_INET: '2' } } }), async () => '/usr/bin/php')).toBeUndefined();
  });
  it('carries PCNTL functions, signal values and the QoS enum only with PCNTL loaded', async () => {
    const pcntlRuntime = { functions: ['pcntl_waitid', 'pcntl_fork'],
      constants: { SIGRTMIN: 34, SIGTERM: 15, WEXITED: 4 }, qosClass: true };
    const runtime = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'pcntl'], pcntlRuntime }), async () => '/usr/bin/php');
    expect(runtime?.pcntlRuntime).toEqual({ ...pcntlRuntime, functions: ['pcntl_fork', 'pcntl_waitid'] });
    expect(await probePhpRuntime('php', {}, async () => payload({ pcntlRuntime }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'pcntl'],
      pcntlRuntime: { ...pcntlRuntime, constants: { SIGRTMIN: '34' } } }), async () => '/usr/bin/php')).toBeUndefined();
  });
  it('carries cURL constants only with the cURL extension', async () => {
    const curlRuntime = { constants: { CURLOPT_URL: 10002, CURLINFO_REDIRECT_URL: 1048607 } };
    const runtime = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'curl'], curlRuntime }), async () => '/usr/bin/php');
    expect(runtime?.curlRuntime).toEqual(curlRuntime);
    expect(await probePhpRuntime('php', {}, async () => payload({ curlRuntime }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'curl'],
      curlRuntime: { constants: { CURLOPT_URL: '10002' } } }), async () => '/usr/bin/php')).toBeUndefined();
  });
  it('carries GD numeric and version constants only with the GD extension', async () => {
    const gdRuntime = { constants: { IMG_WEBP_LOSSLESS: 101, GD_VERSION: '2.3.3', GD_EXTRA_VERSION: '' } };
    const runtime = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'gd'], gdRuntime }), async () => '/usr/bin/php');
    expect(runtime?.gdRuntime).toEqual(gdRuntime);
    expect(await probePhpRuntime('php', {}, async () => payload({ gdRuntime }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'gd'],
      gdRuntime: { constants: { GD_VERSION: [] } } }), async () => '/usr/bin/php')).toBeUndefined();
  });
  it('carries version-specific token IDs only with the Tokenizer extension', async () => {
    const tokenizerRuntime = { constants: { T_STRING: 262, T_MATCH: 306 } };
    const runtime = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'tokenizer'], tokenizerRuntime }), async () => '/usr/bin/php');
    expect(runtime?.tokenizerRuntime).toEqual({ constants: { T_MATCH: 306, T_STRING: 262 } });
    expect(await probePhpRuntime('php', {}, async () => payload({ tokenizerRuntime }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'tokenizer'],
      tokenizerRuntime: { constants: { T_STRING: '262' } } }), async () => '/usr/bin/php')).toBeUndefined();
  });
  it('carries APCu functions and constants only with the APCu extension', async () => {
    const apcuRuntime = { functions: ['apcu_store', 'apcu_entry'],
      constants: { APC_ITER_ALL: 4294967295, APC_ITER_VALUE: 4 }, iteratorAvailable: true };
    const runtime = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'apcu'], apcuRuntime }), async () => '/usr/bin/php');
    expect(runtime?.apcuRuntime).toEqual({ ...apcuRuntime, functions: ['apcu_entry', 'apcu_store'] });
    expect(await probePhpRuntime('php', {}, async () => payload({ apcuRuntime }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'apcu'],
      apcuRuntime: { ...apcuRuntime, constants: { APC_ITER_ALL: '4294967295' } } }), async () => '/usr/bin/php')).toBeUndefined();
  });
  it('carries OpenSSL functions and version constants only with the OpenSSL extension', async () => {
    const openSslRuntime = { functions: ['openssl_pkey_new', 'openssl_encrypt'],
      constants: { OPENSSL_RAW_DATA: 1, OPENSSL_VERSION_NUMBER: 269488319, OPENSSL_VERSION_TEXT: 'OpenSSL 1.1.1k' } };
    const runtime = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'openssl'], openSslRuntime }), async () => '/usr/bin/php');
    expect(runtime?.openSslRuntime).toEqual({ functions: ['openssl_encrypt', 'openssl_pkey_new'], constants: openSslRuntime.constants });
    expect(await probePhpRuntime('php', {}, async () => payload({ openSslRuntime }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'openssl'],
      openSslRuntime: { functions: ['openssl_encrypt'], constants: { OPENSSL_VERSION_NUMBER: [] } } }), async () => '/usr/bin/php')).toBeUndefined();
  });

  it('carries bounded Sodium functions and constants only with Sodium loaded', async () => {
    const sodiumRuntime = { functions: ['sodium_crypto_secretbox_open', 'sodium_crypto_secretbox'],
      constants: { SODIUM_CRYPTO_SECRETBOX_KEYBYTES: 32, SODIUM_LIBRARY_VERSION: '1.0.22' } };
    const runtime = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'sodium'], sodiumRuntime }), async () => '/usr/bin/php');
    expect(runtime?.sodiumRuntime).toEqual({ functions: ['sodium_crypto_secretbox', 'sodium_crypto_secretbox_open'],
      constants: sodiumRuntime.constants });
    expect(await probePhpRuntime('php', {}, async () => payload({ sodiumRuntime }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'sodium'],
      sodiumRuntime: { ...sodiumRuntime, constants: { SODIUM_LIBRARY_VERSION: [] } } }), async () => '/usr/bin/php')).toBeUndefined();
  });

  it('carries actual PCRE version and JIT constants only with PCRE loaded', async () => {
    const pcreRuntime = { PCRE_VERSION: '10.32 2018-09-10', PCRE_VERSION_MAJOR: 10,
      PCRE_VERSION_MINOR: 32, PCRE_JIT_SUPPORT: true };
    const runtime = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'pcre'], pcreRuntime }), async () => '/usr/bin/php');
    expect(runtime?.pcreRuntime).toEqual(pcreRuntime);
    const php72 = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'pcre'],
      pcreRuntime: { PCRE_VERSION: '8.42 2018-03-20' } }), async () => '/usr/bin/php');
    expect(php72?.pcreRuntime).toEqual({ PCRE_VERSION: '8.42 2018-03-20' });
    expect(await probePhpRuntime('php', {}, async () => payload({ pcreRuntime }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'pcre'],
      pcreRuntime: { ...pcreRuntime, PCRE_JIT_SUPPORT: 1 } }), async () => '/usr/bin/php')).toBeUndefined();
  });
  it('carries platform SysV errno values only with sysvmsg loaded', async () => {
    const sysvMsgConstants = { MSG_ENOMSG: 91, MSG_EAGAIN: 35 };
    const runtime = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'sysvmsg'], sysvMsgConstants }), async () => '/usr/bin/php');
    expect(runtime?.sysvMsgConstants).toEqual(sysvMsgConstants);
    expect(await probePhpRuntime('php', {}, async () => payload({ sysvMsgConstants }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'sysvmsg'], sysvMsgConstants: { MSG_ENOMSG: '42' } }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'sysvmsg'], sysvMsgConstants: { MSG_ENOMSG: 42, OTHER: 1 } }), async () => '/usr/bin/php')).toBeUndefined();
  });
  it('preserves POSIX signed 64-bit constants across runtime JSON transport', async () => {
    const posixConstants = { POSIX_RLIMIT_INFINITY: '9223372036854775807', POSIX_RLIMIT_AS: '9' };
    const runtime = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'posix'], posixConstants }), async () => '/usr/bin/php');
    expect(runtime?.posixConstants).toEqual(posixConstants);
    expect(await probePhpRuntime('php', {}, async () => payload({ posixConstants }), async () => '/usr/bin/php')).toBeUndefined();
    for (const value of [Number('9223372036854775807'), '9223372036854775808', '0xFF', '1; exit;']) {
      expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'posix'], posixConstants: { POSIX_RLIMIT_INFINITY: value } }), async () => '/usr/bin/php')).toBeUndefined();
    }
  });

  it('carries the actual Oniguruma version only with mbstring loaded', async () => {
    const runtime = await probePhpRuntime('php', {}, async () => payload({
      loadedExtensions: ['Core', 'mbstring'], mbOnigurumaVersion: '6.9.10',
    }), async () => '/usr/bin/php');
    expect(runtime?.mbOnigurumaVersion).toBe('6.9.10');
    expect(await probePhpRuntime('php', {}, async () => payload({ mbOnigurumaVersion: '6.9.10' }),
      async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({
      loadedExtensions: ['Core', 'mbstring'], mbOnigurumaVersion: '',
    }), async () => '/usr/bin/php')).toBeUndefined();
  });

  it('carries MySQLi functions, constants, and methods only with the MySQLi extension', async () => {
    const mysqliRuntime = { functions: ['mysqli_query', 'mysqli_connect'],
      constants: { MYSQLI_ASSOC: 1, MYSQLI_IS_MARIADB: false },
      methods: { mysqli_sql_exception: [], mysqli_driver: [], mysqli: ['query'],
        mysqli_warning: [], mysqli_result: ['fetch_assoc'], mysqli_stmt: ['execute'] }, executeParams: 1 };
    const runtime = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'mysqli'], mysqliRuntime }), async () => '/usr/bin/php');
    expect(runtime?.mysqliRuntime).toMatchObject({ functions: ['mysqli_connect', 'mysqli_query'], constants: mysqliRuntime.constants,
      methods: { mysqli: ['query'], mysqli_stmt: ['execute'] }, executeParams: 1 });
    expect(await probePhpRuntime('php', {}, async () => payload({ mysqliRuntime }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'mysqli'],
      mysqliRuntime: { ...mysqliRuntime, constants: { MYSQLI_ASSOC: '1' } } }), async () => '/usr/bin/php')).toBeUndefined();
  });

  it('carries PDO driver constants and classes only for loaded drivers', async () => {
    const pdoRuntime = { constants: { MYSQL_ATTR_USE_BUFFERED_QUERY: 1000 },
      classes: { 'Pdo\\Mysql': { methods: ['getWarningCount'], constants: { ATTR_USE_BUFFERED_QUERY: 1000 } } } };
    const loadedExtensions = ['Core', 'PDO', 'pdo_mysql'];
    const runtime = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions, pdoRuntime }), async () => '/usr/bin/php');
    expect(runtime?.pdoRuntime).toEqual(pdoRuntime);
    expect(await probePhpRuntime('php', {}, async () => payload({ pdoRuntime }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions,
      pdoRuntime: { ...pdoRuntime, constants: { MYSQL_ATTR_USE_BUFFERED_QUERY: '1000' } } }), async () => '/usr/bin/php')).toBeUndefined();
  });

  it('preserves ICU-dependent IntlChar constants from the detected runtime', async () => {
    const constants = { UNICODE_VERSION: '15.1', JG_COUNT: 104, BLOCK_CODE_COUNT: 329 };
    const runtime = await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'intl'], intlCharConstants: constants,
      intlCalendarFieldCount: 24, intlCurrencyAccountingAvailable: false }), async () => '/usr/bin/php');
    expect(runtime?.intlCharConstants).toEqual(constants);
    expect(runtime?.intlCalendarFieldCount).toBe(24);
    expect(runtime?.intlCurrencyAccountingAvailable).toBe(false);
    expect(await probePhpRuntime('php', {}, async () => payload({ intlCharConstants: constants }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'intl'], intlCharConstants: { UNICODE_VERSION: 'bad' } }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'intl'], intlCharConstants: { UNKNOWN: 1 } }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'intl'], intlCalendarFieldCount: -1 }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ intlCurrencyAccountingAvailable: true }), async () => '/usr/bin/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: ['Core', 'intl'],
      intlCurrencyAccountingAvailable: 'true' }), async () => '/usr/bin/php')).toBeUndefined();
  });

  it('accepts a complete GD function catalog from the runtime probe', async () => {
    const names = Array.from({ length: 106 }, (_, index) => `gd_function_${index}`);
    const runtime = await probePhpRuntime('php', {}, async () => payload({ availableFunctions: names }), async () => '/usr/bin/php');
    expect(runtime?.availableFunctions).toHaveLength(106);
    expect(await probePhpRuntime('php', {}, async () => payload({ availableFunctions: Array.from({ length: 257 }, (_, index) => `function_${index}`) }), async () => '/usr/bin/php')).toBeUndefined();
  });

  it('fails closed for unavailable executables and malformed payloads', async () => {
    expect(await probePhpRuntime('missing', {}, async () => payload(), async () => undefined)).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => '8.5.3', async () => '/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ loadedExtensions: 'pdo' }), async () => '/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => payload({ versionId: 80403 }), async () => '/php')).toBeUndefined();
    expect(await probePhpRuntime('php', {}, async () => { throw new Error('timeout'); }, async () => '/php')).toBeUndefined();
  });

  it('deduplicates aliases resolving to one executable', async () => {
    const runtimes = await discoverPhpRuntimes(['php85', 'php'], {}, async () => payload(), async () => '/usr/bin/php');
    expect(runtimes).toHaveLength(1);
    expect(runtimes[0]?.minor).toBe('8.5');
  });

  it('extracts only a numeric major/minor prefix', () => {
    expect(phpMinor('8.4.12')).toBe('8.4');
    expect(phpMinor('invalid')).toBeUndefined();
  });
});
