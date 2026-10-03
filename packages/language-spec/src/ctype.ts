// Generated from JetBrains/phpstorm-stubs at e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, ctype/ctype.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Descriptive PHP Documentation Group text is omitted.
import type { SupportedPhpVersion } from './index.js';

export const CTYPE_FUNCTIONS = [
  "ctype_alnum",
  "ctype_alpha",
  "ctype_cntrl",
  "ctype_digit",
  "ctype_lower",
  "ctype_graph",
  "ctype_print",
  "ctype_punct",
  "ctype_space",
  "ctype_upper",
  "ctype_xdigit"
] as const;

export function auditedCtypeStub(version: SupportedPhpVersion): string {
  // The runtime accepts mixed values; PHP 8.1+ deprecates non-string inputs rather than rejecting them.
  const parameter = Number(version.replace('.', '')) >= 80 ? 'mixed $text' : '$text';
  return CTYPE_FUNCTIONS.map((name) => 'function ' + name + '(' + parameter + '): bool {}').join("\n") + "\n";
}
