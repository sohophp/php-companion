import { describe, expect, it } from 'vitest';
import { phpRuntimePayload } from '../../src/extension/phpRuntimePayload.js';
import type { PhpRuntime } from '@php-companion/runtime-probe';

describe('PHP runtime payload', () => {
  it('forwards extension facts to the language server without client-only fields', () => {
    const runtime: PhpRuntime = {
      command: 'php85', path: '/usr/bin/php85', minor: '8.5', version: '8.5.9', versionId: 80509,
      sapi: 'cli', loadedExtensions: ['core', 'redis', 'readline', 'pcntl', 'pgsql', 'xsl'], scannedConfigurationFiles: [],
      redisRuntime: { version: '6.3.0' },
      imagickRuntime: { version: '3.8.1', imageMagickVersionNumber: 1810, fingerprint: 'a'.repeat(64) },
      readlineLib: 'libedit',
      pcntlRuntime: { functions: ['pcntl_fork'], constants: { SIGTERM: 15 }, qosClass: false },
      pgsqlRuntime: { functions: ['pg_connect'], constants: { PGSQL_LIBPQ_VERSION: '13.23' } },
      xslRuntime: { constants: { LIBXSLT_DOTTED_VERSION: '1.1.32' } },
      sysvMsgConstants: { MSG_EAGAIN: 35, MSG_ENOMSG: 91 },
      posixConstants: { POSIX_RLIMIT_INFINITY: '9223372036854775807' },
    };
    const payload = phpRuntimePayload(runtime);
    expect(payload).toMatchObject({ executable: '/usr/bin/php85', redisRuntime: runtime.redisRuntime,
      imagickRuntime: runtime.imagickRuntime,
      readlineLib: 'libedit', pcntlRuntime: runtime.pcntlRuntime, pgsqlRuntime: runtime.pgsqlRuntime,
      xslRuntime: runtime.xslRuntime, sysvMsgConstants: runtime.sysvMsgConstants, posixConstants: runtime.posixConstants });
    expect(payload).not.toHaveProperty('command');
    expect(payload).not.toHaveProperty('path');
    expect(payload).not.toHaveProperty('minor');
  });
});
