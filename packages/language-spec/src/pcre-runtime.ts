export interface PcreRuntimeConstants {
  PCRE_VERSION?: string;
  PCRE_VERSION_MAJOR?: number;
  PCRE_VERSION_MINOR?: number;
  PCRE_JIT_SUPPORT?: boolean;
}

export function normalizePcreRuntimeConstants(value: unknown): PcreRuntimeConstants | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).length === 0) return undefined;
  if (Object.keys(input).some((name) => !['PCRE_VERSION', 'PCRE_VERSION_MAJOR', 'PCRE_VERSION_MINOR', 'PCRE_JIT_SUPPORT'].includes(name))) return undefined;
  if (input.PCRE_VERSION !== undefined && (typeof input.PCRE_VERSION !== 'string'
    || input.PCRE_VERSION.length < 1 || input.PCRE_VERSION.length > 80 || !/^[\x20-\x7e]+$/.test(input.PCRE_VERSION))) return undefined;
  for (const name of ['PCRE_VERSION_MAJOR', 'PCRE_VERSION_MINOR'] as const) if (input[name] !== undefined
    && (typeof input[name] !== 'number' || !Number.isSafeInteger(input[name]) || input[name] < 0 || input[name] > 1_000)) return undefined;
  if (input.PCRE_JIT_SUPPORT !== undefined && typeof input.PCRE_JIT_SUPPORT !== 'boolean') return undefined;
  return {
    ...(input.PCRE_VERSION !== undefined ? { PCRE_VERSION: input.PCRE_VERSION as string } : {}),
    ...(input.PCRE_VERSION_MAJOR !== undefined ? { PCRE_VERSION_MAJOR: input.PCRE_VERSION_MAJOR as number } : {}),
    ...(input.PCRE_VERSION_MINOR !== undefined ? { PCRE_VERSION_MINOR: input.PCRE_VERSION_MINOR as number } : {}),
    ...(input.PCRE_JIT_SUPPORT !== undefined ? { PCRE_JIT_SUPPORT: input.PCRE_JIT_SUPPORT as boolean } : {}),
  };
}

export function pcreRuntimeConstantStub(value: PcreRuntimeConstants | undefined): string {
  const constants = normalizePcreRuntimeConstants(value);
  if (!constants) return '';
  return Object.entries(constants).map(([name, item]) => `const ${name} = ${typeof item === 'string' ? `'${item.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'` : String(item)};`).join('\n') + '\n';
}
