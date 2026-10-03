import { STANDARD_PLATFORM_FUNCTIONS } from './standard-platform-catalog.js';
import type { SupportedPhpVersion } from './index.js';

export function auditedStandardPlatformStub(version: SupportedPhpVersion, unavailable: readonly string[] = []): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const declarations: Record<(typeof STANDARD_PLATFORM_FUNCTIONS)[number], string> = {
    sys_getloadavg: php80
      ? '/** @return array{float, float, float}|false */ function sys_getloadavg(): array|false {}'
      : '/** @return array{float, float, float}|false */ function sys_getloadavg() {}',
    strptime: `${target >= 81 ? '/** @deprecated PHP 8.1 */ ' : ''}${php80
      ? 'function strptime(string $timestamp, string $format): array|false {}'
      : '/** @return array<string, int|string>|false */ function strptime($timestamp, $format) {}'}`,
    ftok: php80
      ? 'function ftok(string $filename, string $project_id): int {}'
      : '/** @return int */ function ftok($pathname, $proj) {}',
  };
  const excluded = new Set(unavailable);
  return `${STANDARD_PLATFORM_FUNCTIONS.filter((name) => !excluded.has(name)).map((name) => declarations[name]).join('\n')}\n`;
}
