// Audited against JetBrains/phpstorm-stubs e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, gettext/gettext.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Descriptive upstream text is omitted.
import type { SupportedPhpVersion } from './index.js';

export const GETTEXT_FUNCTIONS = [
  'textdomain', 'gettext', '_', 'dgettext', 'dcgettext', 'bindtextdomain',
  'ngettext', 'dngettext', 'dcngettext', 'bind_textdomain_codeset',
] as const;

export function auditedGettextStub(version: SupportedPhpVersion): string {
  const php80 = Number(version.replace('.', '')) >= 80;
  const php81 = Number(version.replace('.', '')) >= 81;
  const php84 = Number(version.replace('.', '')) >= 84;
  if (!php80) return `
/** @return string */ function textdomain($domain) {}
/** @return string */ function gettext($msgid) {}
/** @return string */ function _($msgid) {}
/** @return string */ function dgettext($domain_name, $msgid) {}
/** @return string */ function dcgettext($domain_name, $msgid, $category) {}
/** @return string|false */ function bindtextdomain($domain_name, $dir) {}
/** @return string */ function ngettext($msgid1, $msgid2, $count) {}
/** @return string */ function dngettext($domain, $msgid1, $msgid2, $count) {}
/** @return string */ function dcngettext($domain, $msgid1, $msgid2, $count, $category) {}
/** @return string|false */ function bind_textdomain_codeset($domain, $codeset) {}
`;
  // PHP 8.0.3 made directory/codeset nullable; version selection is minor-grained,
  // so PHP 8.0 retains the conservative non-nullable signature.
  const nullableString = php81 ? '?string' : 'string';
  const optionalDomain = php84 ? ' = null' : '';
  const optionalBinding = php84 ? ' = null' : '';
  return `
function textdomain(?string $domain${optionalDomain}): string {}
function gettext(string $message): string {}
function _(string $message): string {}
function dgettext(string $domain, string $message): string {}
function dcgettext(string $domain, string $message, int $category): string {}
function bindtextdomain(string $domain, ${nullableString} $directory${optionalBinding}): string|false {}
function ngettext(string $singular, string $plural, int $count): string {}
function dngettext(string $domain, string $singular, string $plural, int $count): string {}
function dcngettext(string $domain, string $singular, string $plural, int $count, int $category): string {}
function bind_textdomain_codeset(string $domain, ${nullableString} $codeset${optionalBinding}): string|false {}
`;
}
