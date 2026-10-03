// Generated from JetBrains/phpstorm-stubs at e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, intl/intl.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md.
export const SPOOFCHECKER_CONSTANTS = {
  "SINGLE_SCRIPT_CONFUSABLE": 1,
  "MIXED_SCRIPT_CONFUSABLE": 2,
  "WHOLE_SCRIPT_CONFUSABLE": 4,
  "ANY_CASE": 8,
  "SINGLE_SCRIPT": 16,
  "INVISIBLE": 32,
  "CHAR_LIMIT": 64,
  "ASCII": 268435456,
  "HIGHLY_RESTRICTIVE": 805306368,
  "MODERATELY_RESTRICTIVE": 1073741824,
  "MINIMALLY_RESTRICTIVE": 1342177280,
  "UNRESTRICTIVE": 1610612736,
  "SINGLE_SCRIPT_RESTRICTIVE": 536870912,
  "MIXED_NUMBERS": 128,
  "HIDDEN_OVERLAY": 256,
  "IGNORE_SPACE": 1,
  "CASE_INSENSITIVE": 2,
  "ADD_CASE_MAPPINGS": 4,
  "SIMPLE_CASE_INSENSITIVE": 6
} as const;
export const SPOOFCHECKER_METHODS = [
  "__construct",
  "isSuspicious",
  "areConfusable",
  "setAllowedLocales",
  "setChecks",
  "setRestrictionLevel",
  "setAllowedChars"
] as const;
