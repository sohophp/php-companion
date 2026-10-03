import { INTL_CALENDAR_CONSTANTS, INTL_CALENDAR_SNAPSHOTS } from './intl-calendar-catalog.js';
import type { SupportedPhpVersion } from './index.js';

type Signature = readonly [parameters: string, returnType: string | null, tentativeReturnType: string | null, ...rest: unknown[]];
type MethodSignature = readonly [parameters: string, returnType: string | null, tentativeReturnType: string | null, isStatic: boolean, isPrivate: boolean];
type CalendarSnapshot = {
  functions: Record<string, Signature>;
  calendar: Record<string, MethodSignature>;
  gregorian: Record<string, MethodSignature>;
  fieldCount: number;
};

export function auditedIntlCalendarStub(version: SupportedPhpVersion, runtimeFieldCount?: number): string {
  const target = Number(version.replace('.', ''));
  // PHP 8.3 introduced setDate/setDateTime and the Gregorian date factories.
  // The PHP 8.4 reflection snapshot has those signatures; constant typing is
  // controlled separately below because it starts in PHP 8.4.
  const snapshotVersion = target < 80 ? '72' : target < 82 ? '81' : target < 83 ? '82' : target < 85 ? '84' : '85';
  const snapshot = INTL_CALENDAR_SNAPSHOTS[snapshotVersion as keyof typeof INTL_CALENDAR_SNAPSHOTS] as unknown as CalendarSnapshot;
  const php84 = target >= 84;
  const normalize = (parameters: string): string => parameters.replace(/\bNULL\b/g, 'null')
    // Reflection represents the short set(field, value) overload as optional
    // parameters from the longer overload without defaults. Keep both forms
    // callable without PHP 8.4's implicit-nullability deprecation.
    .replace(/(?<!\?)\bint (\$[A-Za-z_][A-Za-z0-9_]*) = null/g, '?int $1 = null');
  const docReturn = (name: string, signature: Signature): string | null => {
    const current = signature[1] ?? signature[2];
    if (current) return current;
    const php81 = INTL_CALENDAR_SNAPSHOTS['81'];
    const older = (php81.functions as Record<string, Signature>)[name]
      ?? (php81.calendar as Record<string, MethodSignature>)[name]
      ?? (php81.gregorian as Record<string, MethodSignature>)[name];
    if (older?.[1] || older?.[2]) return older[1] ?? older[2];
    // Several calendar methods have no tentative return type even though
    // their procedural twins declare the precise result in PHP 8.
    const suffix = name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    for (const prefix of ['intlcal_', 'intlgregcal_']) {
      const currentProcedural = (snapshot.functions as Record<string, Signature>)[`${prefix}${suffix}`];
      const procedural = currentProcedural?.[1] || currentProcedural?.[2] ? currentProcedural
        : (php81.functions as Record<string, Signature>)[`${prefix}${suffix}`];
      if (procedural?.[1] || procedural?.[2]) return procedural[1] ?? procedural[2];
    }
    return null;
  };
  const renderMethod = (name: string, signature: MethodSignature): string => {
    const [parameters, nativeReturn, , isStatic, isPrivate] = signature;
    const returnType = docReturn(name, signature);
    return `  ${returnType ? `/** @return ${returnType} */ ` : ''}${isPrivate ? 'private' : 'public'} ${isStatic ? 'static ' : ''}function ${name}(${normalize(parameters)})${nativeReturn ? `: ${nativeReturn}` : ''} {}`;
  };
  const constants = Object.entries(INTL_CALENDAR_CONSTANTS).flatMap(([name, value]) => {
    if (name === 'FIELD_FIELD_COUNT' && runtimeFieldCount === undefined) return [];
    return [`  public const ${php84 ? 'int ' : ''}${name} = ${name === 'FIELD_FIELD_COUNT' ? runtimeFieldCount : value};`];
  });
  const calendar = Object.entries(snapshot.calendar).map(([name, signature]) => renderMethod(name, signature));
  const gregorian = Object.entries(snapshot.gregorian).map(([name, signature]) => renderMethod(name, signature));
  const functions = Object.entries(snapshot.functions).map(([name, signature]) => {
    const [parameters, nativeReturn] = signature;
    const returnType = docReturn(name, signature);
    return `${returnType ? `/** @return ${returnType} */ ` : ''}function ${name}(${normalize(parameters)})${nativeReturn ? `: ${nativeReturn}` : ''} {}`;
  });
  return `class IntlCalendar {
${constants.join('\n')}
${calendar.join('\n')}
}
class IntlGregorianCalendar extends IntlCalendar {
${gregorian.join('\n')}
}
${functions.join('\n')}
`;
}
