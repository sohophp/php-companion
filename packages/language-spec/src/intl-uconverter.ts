import { INTL_UCONVERTER_CONSTANTS, INTL_UCONVERTER_SNAPSHOTS } from './intl-uconverter-catalog.js';
import type { SupportedPhpVersion } from './index.js';

type MethodSignature = readonly [parameters: string, returnType: string | null,
  tentativeReturnType: string | null, isStatic: boolean];
type Snapshot = Record<string, MethodSignature>;

export function auditedIntlUConverterStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const snapshotVersion = target < 80 ? '72' : target < 82 ? '81' : target < 84 ? '82' : target === 84 ? '84' : '85';
  const snapshot = INTL_UCONVERTER_SNAPSHOTS[snapshotVersion as keyof typeof INTL_UCONVERTER_SNAPSHOTS] as Snapshot;
  const fallback = INTL_UCONVERTER_SNAPSHOTS['81'] as Snapshot;
  const constants = Object.entries(INTL_UCONVERTER_CONSTANTS)
    .map(([name, value]) => `  public const ${target >= 84 ? 'int ' : ''}${name} = ${value};`).join('\n');
  const methods = Object.entries(snapshot).map(([name, [parameters, nativeReturn, tentativeReturn, isStatic]]) => {
    let renderedParameters = parameters.replace(/\bNULL\b/g, 'null');
    if (target < 80 && name === 'convert') renderedParameters = '$str, $reverse = false';
    if (target < 80 && name === 'reasonText') renderedParameters = '$reason = 0';
    const returnType = nativeReturn ?? tentativeReturn ?? fallback[name]?.[1] ?? fallback[name]?.[2];
    return `  ${returnType ? `/** @return ${returnType} */ ` : ''}public ${isStatic ? 'static ' : ''}function ${name}(${renderedParameters})${nativeReturn ? `: ${nativeReturn}` : ''} {}`;
  }).join('\n');
  return `class UConverter {
${constants}
${methods}
}
`;
}
