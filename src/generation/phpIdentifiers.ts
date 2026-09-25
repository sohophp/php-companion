const IDENTIFIER = /^[A-Za-z_\u0080-\u{10ffff}][A-Za-z0-9_\u0080-\u{10ffff}]*$/u;

// PHP keywords and pseudo-types that cannot name a class, interface, trait, or enum
// in any supported version. Contextual `enum` and soft-reserved `resource` stay legal.
const RESERVED_TYPE_NAMES = new Set(`
  __halt_compiler __class__ __dir__ __file__ __function__ __line__ __method__ __namespace__ __trait__
  abstract and array as break callable case catch class clone const continue declare default die do echo else elseif
  empty enddeclare endfor endforeach endif endswitch endwhile eval exit extends false final finally float for foreach
  function global goto if implements include include_once instanceof insteadof int interface isset iterable list namespace
  new null object or parent print private protected public require require_once return self static string switch throw
  trait true try unset use var void while xor yield bool
`.trim().split(/\s+/));

function atLeast(version: string, minimum: string): boolean {
  const [major, minor] = version.split('.').map(Number);
  const [minimumMajor, minimumMinor] = minimum.split('.').map(Number);
  return major! > minimumMajor! || (major === minimumMajor && minor! >= minimumMinor!);
}

export function validPhpTypeName(name: string, targetVersion: string): boolean {
  if (!IDENTIFIER.test(name)) return false;
  const lower = name.toLowerCase();
  if (RESERVED_TYPE_NAMES.has(lower)) return false;
  if (lower === 'fn' && atLeast(targetVersion, '7.4')) return false;
  if ((lower === 'match' || lower === 'mixed') && atLeast(targetVersion, '8.0')) return false;
  if (lower === '__property__' && atLeast(targetVersion, '8.4')) return false;
  return !((lower === 'readonly' || lower === 'never') && atLeast(targetVersion, '8.1'));
}

export function validPhpNamespaceSegment(name: string, targetVersion: string): boolean {
  if (!IDENTIFIER.test(name)) return false;
  // PHP 8 accepts keywords in qualified names; PHP 7 tokenizes each segment.
  return atLeast(targetVersion, '8.0') || validPhpTypeName(name, targetVersion);
}
