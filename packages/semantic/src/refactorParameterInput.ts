const reservedParameterNames = new Set([
  'this', 'GLOBALS', '_SERVER', '_GET', '_POST', '_FILES', '_COOKIE', '_SESSION', '_REQUEST', '_ENV',
]);

export function isRefactorParameterName(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && !reservedParameterNames.has(name);
}

export function refactorScalarArgumentType(value: string): 'int' | 'float' | 'bool' | 'string' | undefined {
  if (/^(?:true|false)$/i.test(value)) return 'bool';
  if (/^'(?:\\.|[^'\\])*'$/.test(value) || /^"(?:\\.|[^"\\$])*"$/.test(value)) return 'string';
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) return undefined;
  if (/[.e]/i.test(value)) return 'float';
  const unsigned = value.replace(/^[+-]/, '');
  if (!/^(?:0[0-7]*|[1-9][0-9]*)$/.test(unsigned)) return undefined;
  const digits = unsigned.replace(/^0+/, '');
  // The supported PHP platforms use 64-bit integers. Unary signs are applied
  // after the positive literal is lexed, so even -9223372036854775808 is float.
  const limit = unsigned.startsWith('0') ? '777777777777777777777' : '9223372036854775807';
  return digits.length < limit.length || digits.length === limit.length && digits <= limit ? 'int' : 'float';
}
