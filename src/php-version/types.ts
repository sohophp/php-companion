export const SUPPORTED_PHP_VERSIONS = [
  '7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5',
] as const;

export type PhpVersion = (typeof SUPPORTED_PHP_VERSIONS)[number];
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
