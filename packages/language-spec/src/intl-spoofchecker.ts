import { SPOOFCHECKER_CONSTANTS, SPOOFCHECKER_METHODS } from './intl-spoofchecker-catalog.js';
import type { SupportedPhpVersion } from './index.js';

type MethodName = typeof SPOOFCHECKER_METHODS[number];

export function auditedIntlSpoofcheckerStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const php84 = target >= 84;
  const restrictionConstants = new Set(['ASCII', 'HIGHLY_RESTRICTIVE', 'MODERATELY_RESTRICTIVE',
    'MINIMALLY_RESTRICTIVE', 'UNRESTRICTIVE', 'SINGLE_SCRIPT_RESTRICTIVE']);
  const newConstants = new Set(['MIXED_NUMBERS', 'HIDDEN_OVERLAY', 'IGNORE_SPACE', 'CASE_INSENSITIVE',
    'ADD_CASE_MAPPINGS', 'SIMPLE_CASE_INSENSITIVE']);
  const constants = Object.entries(SPOOFCHECKER_CONSTANTS)
    .filter(([name]) => (!restrictionConstants.has(name) || target >= 73) && (!newConstants.has(name) || php84))
    .map(([name, value]) => `  public const ${php84 ? 'int ' : ''}${name} = ${value};`);
  const declarations: Record<MethodName, string> = {
    __construct: 'public function __construct() {}',
    isSuspicious: `/** @return bool */ public function isSuspicious(${php80 ? 'string $string, &$errorCode' : '$text, &$error'} = null) {}`,
    areConfusable: `/** @return bool */ public function areConfusable(${php80 ? 'string $string1, string $string2, &$errorCode' : '$s1, $s2, &$error'} = null) {}`,
    setAllowedLocales: `/** @return void */ public function setAllowedLocales(${php80 ? 'string $locales' : '$locale_list'}) {}`,
    setChecks: `/** @return void */ public function setChecks(${php80 ? 'int $checks' : '$checks'}) {}`,
    setRestrictionLevel: `/** @return void */ public function setRestrictionLevel(${php80 ? 'int ' : ''}$level) {}`,
    setAllowedChars: 'public function setAllowedChars(string $pattern, int $patternOptions = 0): void {}',
  };
  const methods = SPOOFCHECKER_METHODS.filter((name) =>
    (name !== 'setRestrictionLevel' || target >= 73) && (name !== 'setAllowedChars' || php84))
    .map((name) => `  ${declarations[name]}`);
  return `class Spoofchecker {
${constants.join('\n')}
${methods.join('\n')}
}
`;
}
