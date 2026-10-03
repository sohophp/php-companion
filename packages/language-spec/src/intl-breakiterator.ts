import { INTL_BREAK_CONSTANTS, INTL_BREAK_SNAPSHOTS, INTL_PARTS_CONSTANTS } from './intl-breakiterator-catalog.js';
import type { SupportedPhpVersion } from './index.js';

type MethodSignature = readonly [parameters: string, returnType: string | null,
  tentativeReturnType: string | null, isStatic: boolean, isPrivate: boolean];
type ClassName = 'IntlBreakIterator' | 'IntlRuleBasedBreakIterator' | 'IntlPartsIterator' | 'IntlCodePointBreakIterator';
type Snapshot = Record<ClassName, Record<string, MethodSignature>>;

export function auditedIntlBreakIteratorStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const snapshotVersion = target < 80 ? '72' : target < 82 ? '81' : target < 84 ? '82' : target === 84 ? '84' : '85';
  const snapshot = INTL_BREAK_SNAPSHOTS[snapshotVersion as keyof typeof INTL_BREAK_SNAPSHOTS] as unknown as Snapshot;
  const fallback = INTL_BREAK_SNAPSHOTS['81'] as unknown as Snapshot;
  const constants = (values: Record<string, number>): string => Object.entries(values)
    .map(([name, value]) => `  public const ${target >= 84 ? 'int ' : ''}${name} = ${value};`).join('\n');
  const methods = (className: ClassName): string => Object.entries(snapshot[className]).map(([name, signature]) => {
    const [parameters, nativeReturn, tentativeReturn, isStatic, isPrivate] = signature;
    const fallbackSignature = fallback[className][name];
    const returnType = nativeReturn ?? tentativeReturn ?? fallbackSignature?.[1] ?? fallbackSignature?.[2];
    const doc = returnType ? `/** @return ${returnType} */ ` : '';
    let renderedParameters = parameters.replace(/\bNULL\b/g, 'null');
    if (target < 80 && className === 'IntlBreakIterator' && name === 'getPartsIterator') {
      renderedParameters = '$key_type = IntlPartsIterator::KEY_SEQUENTIAL';
    }
    if (target < 80 && className === 'IntlRuleBasedBreakIterator' && name === '__construct') {
      renderedParameters = '$rules, $areCompiled = false';
    }
    return `  ${doc}${isPrivate ? 'private' : 'public'} ${isStatic ? 'static ' : ''}function ${name}(${renderedParameters})${nativeReturn ? `: ${nativeReturn}` : ''} {}`;
  }).join('\n');
  return `/** @implements ${target >= 80 ? 'IteratorAggregate' : 'Traversable'}<int, int> */
class IntlBreakIterator implements ${target >= 80 ? 'IteratorAggregate' : 'Traversable'} {
${constants(INTL_BREAK_CONSTANTS)}
${methods('IntlBreakIterator')}
}
class IntlRuleBasedBreakIterator extends IntlBreakIterator {
${methods('IntlRuleBasedBreakIterator')}
}
class IntlPartsIterator extends IntlIterator {
${constants(INTL_PARTS_CONSTANTS)}
${methods('IntlPartsIterator')}
}
class IntlCodePointBreakIterator extends IntlBreakIterator {
${methods('IntlCodePointBreakIterator')}
}
`;
}
