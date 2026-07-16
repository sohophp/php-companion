import semver from 'semver';
import { SUPPORTED_PHP_VERSIONS, type PhpVersion } from './types.js';

function normalizeComposerConstraint(input: string): string {
  return input
    .replace(/@(?:dev|stable|beta|alpha|RC)\b/gi, '')
    .replace(/\s*,\s*/g, ' ')
    .replace(/(^|\s)\|(?=\s|$)/g, '$1||')
    .replace(/(?<!\|)\|(?!\|)/g, '||')
    .replace(/(^|[|\s])(?=\d+\.\d+(?:\.\d+)?(?:\s|\||$))/g, '$1=')
    .trim();
}

export function lowestSupportedVersion(constraint: string): PhpVersion | undefined {
  const normalized = normalizeComposerConstraint(constraint);
  if (!normalized) return undefined;

  for (const version of SUPPORTED_PHP_VERSIONS) {
    try {
      if (semver.satisfies(`${version}.0`, normalized, { includePrerelease: true, loose: true })) {
        return version;
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function isSyntaxAvailable(target: PhpVersion, introduced: PhpVersion): boolean {
  return semver.gte(`${target}.0`, `${introduced}.0`);
}
