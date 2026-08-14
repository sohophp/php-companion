const PHP_TYPE_NAME = /\b[A-Z][A-Za-z0-9_]*\b/;
const ALL_PHP_TYPE_NAMES = /\b[A-Z][A-Za-z0-9_]*\b/g;

export function potentialPhpTypeNames(text: string): Set<string> {
  return new Set(text.match(ALL_PHP_TYPE_NAMES) ?? []);
}

export function mayNeedPhpImportResolution(text: string): boolean {
  return PHP_TYPE_NAME.test(text);
}
