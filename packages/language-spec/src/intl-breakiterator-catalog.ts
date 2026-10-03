// Generated from JetBrains/phpstorm-stubs at e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, intl/intl.php, and local PHP 7.2/8.1/8.2/8.4/8.5 reflection.
// Apache-2.0. See THIRD_PARTY_NOTICES.md.
export const INTL_BREAK_CONSTANTS = {
  "DONE": -1,
  "WORD_NONE": 0,
  "WORD_NONE_LIMIT": 100,
  "WORD_NUMBER": 100,
  "WORD_NUMBER_LIMIT": 200,
  "WORD_LETTER": 200,
  "WORD_LETTER_LIMIT": 300,
  "WORD_KANA": 300,
  "WORD_KANA_LIMIT": 400,
  "WORD_IDEO": 400,
  "WORD_IDEO_LIMIT": 500,
  "LINE_SOFT": 0,
  "LINE_SOFT_LIMIT": 100,
  "LINE_HARD": 100,
  "LINE_HARD_LIMIT": 200,
  "SENTENCE_TERM": 0,
  "SENTENCE_TERM_LIMIT": 100,
  "SENTENCE_SEP": 100,
  "SENTENCE_SEP_LIMIT": 200
} as const;
export const INTL_PARTS_CONSTANTS = {
  "KEY_SEQUENTIAL": 0,
  "KEY_LEFT": 1,
  "KEY_RIGHT": 2
} as const;
export const INTL_BREAK_SNAPSHOTS = {
  "72": {
    "IntlBreakIterator": {
      "__construct": [
        "",
        null,
        null,
        false,
        true
      ],
      "createWordInstance": [
        "$locale = null",
        null,
        null,
        true,
        false
      ],
      "createLineInstance": [
        "$locale = null",
        null,
        null,
        true,
        false
      ],
      "createCharacterInstance": [
        "$locale = null",
        null,
        null,
        true,
        false
      ],
      "createSentenceInstance": [
        "$locale = null",
        null,
        null,
        true,
        false
      ],
      "createTitleInstance": [
        "$locale = null",
        null,
        null,
        true,
        false
      ],
      "createCodePointInstance": [
        "",
        null,
        null,
        true,
        false
      ],
      "getText": [
        "",
        null,
        null,
        false,
        false
      ],
      "setText": [
        "$text",
        null,
        null,
        false,
        false
      ],
      "first": [
        "",
        null,
        null,
        false,
        false
      ],
      "last": [
        "",
        null,
        null,
        false,
        false
      ],
      "previous": [
        "",
        null,
        null,
        false,
        false
      ],
      "next": [
        "$offset = null",
        null,
        null,
        false,
        false
      ],
      "current": [
        "",
        null,
        null,
        false,
        false
      ],
      "following": [
        "$offset",
        null,
        null,
        false,
        false
      ],
      "preceding": [
        "$offset",
        null,
        null,
        false,
        false
      ],
      "isBoundary": [
        "$offset",
        null,
        null,
        false,
        false
      ],
      "getLocale": [
        "$locale_type",
        null,
        null,
        false,
        false
      ],
      "getPartsIterator": [
        "$key_type = null",
        null,
        null,
        false,
        false
      ],
      "getErrorCode": [
        "",
        null,
        null,
        false,
        false
      ],
      "getErrorMessage": [
        "",
        null,
        null,
        false,
        false
      ]
    },
    "IntlRuleBasedBreakIterator": {
      "__construct": [
        "$rules, $areCompiled = null",
        null,
        null,
        false,
        false
      ],
      "getRules": [
        "",
        null,
        null,
        false,
        false
      ],
      "getRuleStatus": [
        "",
        null,
        null,
        false,
        false
      ],
      "getRuleStatusVec": [
        "",
        null,
        null,
        false,
        false
      ],
      "getBinaryRules": [
        "",
        null,
        null,
        false,
        false
      ]
    },
    "IntlPartsIterator": {
      "getBreakIterator": [
        "",
        null,
        null,
        false,
        false
      ]
    },
    "IntlCodePointBreakIterator": {
      "getLastCodePoint": [
        "",
        null,
        null,
        false,
        false
      ]
    }
  },
  "81": {
    "IntlBreakIterator": {
      "createCharacterInstance": [
        "?string $locale = NULL",
        null,
        "?IntlBreakIterator",
        true,
        false
      ],
      "createCodePointInstance": [
        "",
        null,
        "IntlCodePointBreakIterator",
        true,
        false
      ],
      "createLineInstance": [
        "?string $locale = NULL",
        null,
        "?IntlBreakIterator",
        true,
        false
      ],
      "createSentenceInstance": [
        "?string $locale = NULL",
        null,
        "?IntlBreakIterator",
        true,
        false
      ],
      "createTitleInstance": [
        "?string $locale = NULL",
        null,
        "?IntlBreakIterator",
        true,
        false
      ],
      "createWordInstance": [
        "?string $locale = NULL",
        null,
        "?IntlBreakIterator",
        true,
        false
      ],
      "__construct": [
        "",
        null,
        null,
        false,
        true
      ],
      "current": [
        "",
        null,
        "int",
        false,
        false
      ],
      "first": [
        "",
        null,
        "int",
        false,
        false
      ],
      "following": [
        "int $offset",
        null,
        "int",
        false,
        false
      ],
      "getErrorCode": [
        "",
        null,
        "int",
        false,
        false
      ],
      "getErrorMessage": [
        "",
        null,
        "string",
        false,
        false
      ],
      "getLocale": [
        "int $type",
        null,
        "string|false",
        false,
        false
      ],
      "getPartsIterator": [
        "string $type = IntlPartsIterator::KEY_SEQUENTIAL",
        null,
        "IntlPartsIterator",
        false,
        false
      ],
      "getText": [
        "",
        null,
        "?string",
        false,
        false
      ],
      "isBoundary": [
        "int $offset",
        null,
        "bool",
        false,
        false
      ],
      "last": [
        "",
        null,
        "int",
        false,
        false
      ],
      "next": [
        "?int $offset = NULL",
        null,
        "int",
        false,
        false
      ],
      "preceding": [
        "int $offset",
        null,
        "int",
        false,
        false
      ],
      "previous": [
        "",
        null,
        "int",
        false,
        false
      ],
      "setText": [
        "string $text",
        null,
        "?bool",
        false,
        false
      ],
      "getIterator": [
        "",
        "Iterator",
        null,
        false,
        false
      ]
    },
    "IntlRuleBasedBreakIterator": {
      "__construct": [
        "string $rules, bool $compiled = false",
        null,
        null,
        false,
        false
      ],
      "getBinaryRules": [
        "",
        null,
        "string|false",
        false,
        false
      ],
      "getRules": [
        "",
        null,
        "string|false",
        false,
        false
      ],
      "getRuleStatus": [
        "",
        null,
        "int",
        false,
        false
      ],
      "getRuleStatusVec": [
        "",
        null,
        "array|false",
        false,
        false
      ]
    },
    "IntlPartsIterator": {
      "getBreakIterator": [
        "",
        null,
        "IntlBreakIterator",
        false,
        false
      ],
      "getRuleStatus": [
        "",
        null,
        "int",
        false,
        false
      ]
    },
    "IntlCodePointBreakIterator": {
      "getLastCodePoint": [
        "",
        null,
        "int",
        false,
        false
      ]
    }
  },
  "82": {
    "IntlBreakIterator": {
      "createCharacterInstance": [
        "?string $locale = NULL",
        null,
        "?IntlBreakIterator",
        true,
        false
      ],
      "createCodePointInstance": [
        "",
        null,
        "IntlCodePointBreakIterator",
        true,
        false
      ],
      "createLineInstance": [
        "?string $locale = NULL",
        null,
        "?IntlBreakIterator",
        true,
        false
      ],
      "createSentenceInstance": [
        "?string $locale = NULL",
        null,
        "?IntlBreakIterator",
        true,
        false
      ],
      "createTitleInstance": [
        "?string $locale = NULL",
        null,
        "?IntlBreakIterator",
        true,
        false
      ],
      "createWordInstance": [
        "?string $locale = NULL",
        null,
        "?IntlBreakIterator",
        true,
        false
      ],
      "__construct": [
        "",
        null,
        null,
        false,
        true
      ],
      "current": [
        "",
        null,
        "int",
        false,
        false
      ],
      "first": [
        "",
        null,
        "int",
        false,
        false
      ],
      "following": [
        "int $offset",
        null,
        "int",
        false,
        false
      ],
      "getErrorCode": [
        "",
        null,
        "int",
        false,
        false
      ],
      "getErrorMessage": [
        "",
        null,
        "string",
        false,
        false
      ],
      "getLocale": [
        "int $type",
        null,
        "string|false",
        false,
        false
      ],
      "getPartsIterator": [
        "string $type = IntlPartsIterator::KEY_SEQUENTIAL",
        null,
        "IntlPartsIterator",
        false,
        false
      ],
      "getText": [
        "",
        null,
        "?string",
        false,
        false
      ],
      "isBoundary": [
        "int $offset",
        null,
        "bool",
        false,
        false
      ],
      "last": [
        "",
        null,
        "int",
        false,
        false
      ],
      "next": [
        "?int $offset = NULL",
        null,
        "int",
        false,
        false
      ],
      "preceding": [
        "int $offset",
        null,
        "int",
        false,
        false
      ],
      "previous": [
        "",
        null,
        "int",
        false,
        false
      ],
      "setText": [
        "string $text",
        null,
        "?bool",
        false,
        false
      ],
      "getIterator": [
        "",
        "Iterator",
        null,
        false,
        false
      ]
    },
    "IntlRuleBasedBreakIterator": {
      "__construct": [
        "string $rules, bool $compiled = false",
        null,
        null,
        false,
        false
      ],
      "getBinaryRules": [
        "",
        null,
        "string|false",
        false,
        false
      ],
      "getRules": [
        "",
        null,
        "string|false",
        false,
        false
      ],
      "getRuleStatus": [
        "",
        null,
        "int",
        false,
        false
      ],
      "getRuleStatusVec": [
        "",
        null,
        "array|false",
        false,
        false
      ]
    },
    "IntlPartsIterator": {
      "getBreakIterator": [
        "",
        null,
        "IntlBreakIterator",
        false,
        false
      ],
      "getRuleStatus": [
        "",
        null,
        "int",
        false,
        false
      ]
    },
    "IntlCodePointBreakIterator": {
      "getLastCodePoint": [
        "",
        null,
        "int",
        false,
        false
      ]
    }
  },
  "84": {
    "IntlBreakIterator": {
      "createCharacterInstance": [
        "?string $locale = NULL",
        null,
        "?IntlBreakIterator",
        true,
        false
      ],
      "createCodePointInstance": [
        "",
        null,
        "IntlCodePointBreakIterator",
        true,
        false
      ],
      "createLineInstance": [
        "?string $locale = NULL",
        null,
        "?IntlBreakIterator",
        true,
        false
      ],
      "createSentenceInstance": [
        "?string $locale = NULL",
        null,
        "?IntlBreakIterator",
        true,
        false
      ],
      "createTitleInstance": [
        "?string $locale = NULL",
        null,
        "?IntlBreakIterator",
        true,
        false
      ],
      "createWordInstance": [
        "?string $locale = NULL",
        null,
        "?IntlBreakIterator",
        true,
        false
      ],
      "__construct": [
        "",
        null,
        null,
        false,
        true
      ],
      "current": [
        "",
        null,
        "int",
        false,
        false
      ],
      "first": [
        "",
        null,
        "int",
        false,
        false
      ],
      "following": [
        "int $offset",
        null,
        "int",
        false,
        false
      ],
      "getErrorCode": [
        "",
        null,
        "int",
        false,
        false
      ],
      "getErrorMessage": [
        "",
        null,
        "string",
        false,
        false
      ],
      "getLocale": [
        "int $type",
        null,
        "string|false",
        false,
        false
      ],
      "getPartsIterator": [
        "string $type = IntlPartsIterator::KEY_SEQUENTIAL",
        null,
        "IntlPartsIterator",
        false,
        false
      ],
      "getText": [
        "",
        null,
        "?string",
        false,
        false
      ],
      "isBoundary": [
        "int $offset",
        null,
        "bool",
        false,
        false
      ],
      "last": [
        "",
        null,
        "int",
        false,
        false
      ],
      "next": [
        "?int $offset = NULL",
        null,
        "int",
        false,
        false
      ],
      "preceding": [
        "int $offset",
        null,
        "int",
        false,
        false
      ],
      "previous": [
        "",
        null,
        "int",
        false,
        false
      ],
      "setText": [
        "string $text",
        null,
        "bool",
        false,
        false
      ],
      "getIterator": [
        "",
        "Iterator",
        null,
        false,
        false
      ]
    },
    "IntlRuleBasedBreakIterator": {
      "__construct": [
        "string $rules, bool $compiled = false",
        null,
        null,
        false,
        false
      ],
      "getBinaryRules": [
        "",
        null,
        "string|false",
        false,
        false
      ],
      "getRules": [
        "",
        null,
        "string|false",
        false,
        false
      ],
      "getRuleStatus": [
        "",
        null,
        "int",
        false,
        false
      ],
      "getRuleStatusVec": [
        "",
        null,
        "array|false",
        false,
        false
      ]
    },
    "IntlPartsIterator": {
      "getBreakIterator": [
        "",
        null,
        "IntlBreakIterator",
        false,
        false
      ],
      "getRuleStatus": [
        "",
        null,
        "int",
        false,
        false
      ]
    },
    "IntlCodePointBreakIterator": {
      "getLastCodePoint": [
        "",
        null,
        "int",
        false,
        false
      ]
    }
  },
  "85": {
    "IntlBreakIterator": {
      "createCharacterInstance": [
        "?string $locale = NULL",
        null,
        "?IntlBreakIterator",
        true,
        false
      ],
      "createCodePointInstance": [
        "",
        null,
        "IntlCodePointBreakIterator",
        true,
        false
      ],
      "createLineInstance": [
        "?string $locale = NULL",
        null,
        "?IntlBreakIterator",
        true,
        false
      ],
      "createSentenceInstance": [
        "?string $locale = NULL",
        null,
        "?IntlBreakIterator",
        true,
        false
      ],
      "createTitleInstance": [
        "?string $locale = NULL",
        null,
        "?IntlBreakIterator",
        true,
        false
      ],
      "createWordInstance": [
        "?string $locale = NULL",
        null,
        "?IntlBreakIterator",
        true,
        false
      ],
      "__construct": [
        "",
        null,
        null,
        false,
        true
      ],
      "current": [
        "",
        null,
        "int",
        false,
        false
      ],
      "first": [
        "",
        null,
        "int",
        false,
        false
      ],
      "following": [
        "int $offset",
        null,
        "int",
        false,
        false
      ],
      "getErrorCode": [
        "",
        null,
        "int",
        false,
        false
      ],
      "getErrorMessage": [
        "",
        null,
        "string",
        false,
        false
      ],
      "getLocale": [
        "int $type",
        null,
        "string|false",
        false,
        false
      ],
      "getPartsIterator": [
        "string $type = IntlPartsIterator::KEY_SEQUENTIAL",
        null,
        "IntlPartsIterator",
        false,
        false
      ],
      "getText": [
        "",
        null,
        "?string",
        false,
        false
      ],
      "isBoundary": [
        "int $offset",
        null,
        "bool",
        false,
        false
      ],
      "last": [
        "",
        null,
        "int",
        false,
        false
      ],
      "next": [
        "?int $offset = NULL",
        null,
        "int",
        false,
        false
      ],
      "preceding": [
        "int $offset",
        null,
        "int",
        false,
        false
      ],
      "previous": [
        "",
        null,
        "int",
        false,
        false
      ],
      "setText": [
        "string $text",
        null,
        "bool",
        false,
        false
      ],
      "getIterator": [
        "",
        "Iterator",
        null,
        false,
        false
      ]
    },
    "IntlRuleBasedBreakIterator": {
      "__construct": [
        "string $rules, bool $compiled = false",
        null,
        null,
        false,
        false
      ],
      "getBinaryRules": [
        "",
        null,
        "string|false",
        false,
        false
      ],
      "getRules": [
        "",
        null,
        "string|false",
        false,
        false
      ],
      "getRuleStatus": [
        "",
        null,
        "int",
        false,
        false
      ],
      "getRuleStatusVec": [
        "",
        null,
        "array|false",
        false,
        false
      ]
    },
    "IntlPartsIterator": {
      "getBreakIterator": [
        "",
        null,
        "IntlBreakIterator",
        false,
        false
      ],
      "getRuleStatus": [
        "",
        null,
        "int",
        false,
        false
      ]
    },
    "IntlCodePointBreakIterator": {
      "getLastCodePoint": [
        "",
        null,
        "int",
        false,
        false
      ]
    }
  }
} as const;
