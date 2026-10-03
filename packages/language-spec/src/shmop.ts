import type { SupportedPhpVersion } from './index.js';

// Names from the pinned JetBrains/phpstorm-stubs catalog; PHP 8 signatures
// are checked against local 8.1 and 8.5 reflection.
export function auditedShmopStub(version: SupportedPhpVersion): string {
  const php80 = Number(version.replace('.', '')) >= 80;
  const handle = php80 ? 'Shmop ' : '';
  return `${php80 ? 'final class Shmop {}\n' : ''}
/** @return ${php80 ? 'Shmop|false' : 'resource|false'} */ function shmop_open(int $key, string $mode, int $permissions, int $size)${php80 ? ': Shmop|false' : ''} {}
/** @param ${php80 ? 'Shmop' : 'resource'} $shmop
 * @return ${php80 ? 'string' : 'string|false'} */ function shmop_read(${handle}$shmop, int $offset, int $size)${php80 ? ': string' : ''} {}
${php80 ? '/** @deprecated PHP 8.0 */\n' : '/** @param resource $shmop\n * @return void */\n'}function shmop_close(${handle}$shmop)${php80 ? ': void' : ''} {}
/** @param ${php80 ? 'Shmop' : 'resource'} $shmop
 * @return int */ function shmop_size(${handle}$shmop)${php80 ? ': int' : ''} {}
/** @param ${php80 ? 'Shmop' : 'resource'} $shmop
 * @return ${php80 ? 'int' : 'int|false'} */ function shmop_write(${handle}$shmop, string $data, int $offset)${php80 ? ': int' : ''} {}
/** @param ${php80 ? 'Shmop' : 'resource'} $shmop
 * @return bool */ function shmop_delete(${handle}$shmop)${php80 ? ': bool' : ''} {}
`;
}
