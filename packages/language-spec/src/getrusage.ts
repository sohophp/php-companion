import type { SupportedPhpVersion } from './index.js';

export interface GetrusageRuntimeFacts {
  selfKeys: readonly string[];
  childrenKeys: readonly string[];
}

const timingKeys = ['ru_stime.tv_sec', 'ru_stime.tv_usec', 'ru_utime.tv_sec', 'ru_utime.tv_usec'];
const allowedKeys = new Set(['ru_oublock', 'ru_inblock', 'ru_msgsnd', 'ru_msgrcv', 'ru_maxrss',
  'ru_ixrss', 'ru_idrss', 'ru_minflt', 'ru_majflt', 'ru_nsignals', 'ru_nvcsw', 'ru_nivcsw',
  'ru_nswap', ...timingKeys]);

export function normalizeGetrusageRuntimeFacts(value: unknown): GetrusageRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  const keys = (input: unknown): string[] | undefined => {
    if (!Array.isArray(input) || input.length > allowedKeys.size
      || !input.every((key): key is string => typeof key === 'string' && allowedKeys.has(key))) return undefined;
    const unique = new Set(input);
    if (unique.size !== input.length || timingKeys.some(key => !unique.has(key))) return undefined;
    return [...unique].sort();
  };
  const selfKeys = keys(candidate.selfKeys); const childrenKeys = keys(candidate.childrenKeys);
  return selfKeys && childrenKeys ? { selfKeys, childrenKeys } : undefined;
}

// The fields come from the project's PHP executable, including its platform.
// Without that evidence, retain the existing broad array and failure type.
export function auditedGetrusageStub(version: SupportedPhpVersion, runtime?: GetrusageRuntimeFacts): string {
  const php80 = Number(version.replace('.', '')) >= 80;
  const parameter = php80 ? 'mode' : 'who';
  const facts = normalizeGetrusageRuntimeFacts(runtime);
  const shape = (keys: readonly string[]): string => `array{${keys.map(key => `'${key}':int`).join(',')}}`;
  const result = facts ? `($${parameter} is 1 ? ${shape(facts.childrenKeys)}|false : ${shape(facts.selfKeys)}|false)`
    : 'array<string, int>|false';
  return `/** @return ${result} */ function getrusage(${php80 ? 'int ' : ''}$${parameter} = 0)${php80 ? ': array|false' : ''} {}`;
}
