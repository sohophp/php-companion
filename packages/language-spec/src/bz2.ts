// Audited against JetBrains/phpstorm-stubs e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, bz2/bz2.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Descriptive upstream text is omitted.
import type { SupportedPhpVersion } from './index.js';

export const BZ2_FUNCTIONS = [
  'bzopen', 'bzread', 'bzwrite', 'bzflush', 'bzclose', 'bzerrno', 'bzerrstr',
  'bzerror', 'bzcompress', 'bzdecompress',
] as const;

export function auditedBz2Stub(version: SupportedPhpVersion): string {
  const php80 = Number(version.replace('.', '')) >= 80;
  const php81 = Number(version.replace('.', '')) >= 81;
  if (!php80) return `
/** @return resource|false */ function bzopen($file, $mode) {}
/** @return string|false */ function bzread($bz, $length = 1024) {}
/** @return int|false */ function bzwrite($fp, $str, $length = null) {}
/** @return bool */ function bzflush($fp) {}
/** @return bool */ function bzclose($fp) {}
/** @return int */ function bzerrno($bz) {}
/** @return string */ function bzerrstr($bz) {}
/** @return array{errno:int,errstr:string} */ function bzerror($bz) {}
/** @return string|int */ function bzcompress($source, $blocksize = 4, $workfactor = 0) {}
/** @return string|int|false */ function bzdecompress($source, $small = false) {}
`;
  return `
/** @return resource|false */ function bzopen($file, string $mode) {}
function bzread($bz, int $length = 1024): string|false {}
function bzwrite($bz, string $data, ?int $length = null): int|false {}
function bzflush($bz): bool {}
function bzclose($bz): bool {}
function bzerrno($bz): ${php81 ? 'int' : 'int|false'} {}
function bzerrstr($bz): ${php81 ? 'string' : 'string|false'} {}
/** @return array{errno:int,errstr:string}${php81 ? '' : '|false'} */ function bzerror($bz): ${php81 ? 'array' : 'array|false'} {}
function bzcompress(string $data, int $block_size = 4, int $work_factor = 0): string|int {}
function bzdecompress(string $data, bool $use_less_memory = false): string|int|false {}
`;
}
