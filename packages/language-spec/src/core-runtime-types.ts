import type { SupportedPhpVersion } from './index.js';

export function auditedCoreRuntimeTypeStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const php81 = target >= 81;
  return `class ClosedGeneratorException extends Exception {}
${php80 ? `final class InternalIterator implements Iterator {
  private function __construct() {}
  public function current(): mixed {}
  public function key(): mixed {}
  public function next(): void {}
  public function rewind(): void {}
  public function valid(): bool {}
}` : ''}
/** @property string $__PHP_Incomplete_Class_Name */
${target >= 82 ? '#[\\AllowDynamicProperties]' : ''}
${php80 ? 'final ' : ''}class __PHP_Incomplete_Class {}
class php_user_filter {
  public ${php81 ? 'string ' : ''}$filtername = '';
  public ${php81 ? 'mixed ' : ''}$params = '';
  ${php81 ? 'public $stream = null;' : ''}
  /** @param resource $in @param resource $out @param-out int $consumed @return int */
  public function filter($in, $out, &$consumed, ${php80 ? 'bool ' : ''}$closing) {}
  /** @return bool */ public function onCreate() {}
  /** @return void */ public function onClose() {}
}
${target >= 84 ? `final class StreamBucket {
  /** @var resource */ public $bucket;
  public string $data;
  public int $datalen;
  public int $dataLength;
}` : ''}
`;
}
