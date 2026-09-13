import { SUPPORTED_PHP_VERSIONS, type SupportedPhpVersion } from '@php-companion/language-spec';

export { SUPPORTED_PHP_VERSIONS };
export type PhpVersion = SupportedPhpVersion;
export type PhpVersionSetting = PhpVersion | 'auto';

export interface PhpExecutable {
  command: string;
  path: string;
  version: string;
  minor: PhpVersion | undefined;
}

export type PhpVersionSource =
  | 'setting'
  | 'composer-platform'
  | 'composer-lock-platform'
  | 'composer-require'
  | 'configured-executable'
  | 'discovered-executable'
  | 'fallback';

export interface PhpVersionResolution {
  target: PhpVersion;
  detectedVersion?: string;
  source: PhpVersionSource;
  sourceDetail: string;
  executable?: PhpExecutable;
  discovered: PhpExecutable[];
  warnings: string[];
}

export function toSupportedMinor(version: string): PhpVersion | undefined {
  const match = /^(\d+)\.(\d+)/.exec(version.trim());
  if (!match) return undefined;
  const minor = `${match[1]}.${match[2]}`;
  return SUPPORTED_PHP_VERSIONS.find((candidate) => candidate === minor);
}
