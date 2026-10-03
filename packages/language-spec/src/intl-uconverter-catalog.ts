// Generated from JetBrains/phpstorm-stubs at e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, intl/intl.php, and local PHP 7.2/8.1/8.2/8.4/8.5 reflection.
// Apache-2.0. See THIRD_PARTY_NOTICES.md.
export const INTL_UCONVERTER_CONSTANTS = {
  "REASON_UNASSIGNED": 0,
  "REASON_ILLEGAL": 1,
  "REASON_IRREGULAR": 2,
  "REASON_RESET": 3,
  "REASON_CLOSE": 4,
  "REASON_CLONE": 5,
  "UNSUPPORTED_CONVERTER": -1,
  "SBCS": 0,
  "DBCS": 1,
  "MBCS": 2,
  "LATIN_1": 3,
  "UTF8": 4,
  "UTF16_BigEndian": 5,
  "UTF16_LittleEndian": 6,
  "UTF32_BigEndian": 7,
  "UTF32_LittleEndian": 8,
  "EBCDIC_STATEFUL": 9,
  "ISO_2022": 10,
  "LMBCS_1": 11,
  "LMBCS_2": 12,
  "LMBCS_3": 13,
  "LMBCS_4": 14,
  "LMBCS_5": 15,
  "LMBCS_6": 16,
  "LMBCS_8": 17,
  "LMBCS_11": 18,
  "LMBCS_16": 19,
  "LMBCS_17": 20,
  "LMBCS_18": 21,
  "LMBCS_19": 22,
  "LMBCS_LAST": 22,
  "HZ": 23,
  "SCSU": 24,
  "ISCII": 25,
  "US_ASCII": 26,
  "UTF7": 27,
  "BOCU1": 28,
  "UTF16": 29,
  "UTF32": 30,
  "CESU8": 31,
  "IMAP_MAILBOX": 32
} as const;
export const INTL_UCONVERTER_SNAPSHOTS = {
  "72": {
    "__construct": [
      "$destination_encoding = null, $source_encoding = null",
      null,
      null,
      false
    ],
    "setSourceEncoding": [
      "$encoding",
      null,
      null,
      false
    ],
    "setDestinationEncoding": [
      "$encoding",
      null,
      null,
      false
    ],
    "getSourceEncoding": [
      "",
      null,
      null,
      false
    ],
    "getDestinationEncoding": [
      "",
      null,
      null,
      false
    ],
    "getSourceType": [
      "",
      null,
      null,
      false
    ],
    "getDestinationType": [
      "",
      null,
      null,
      false
    ],
    "getSubstChars": [
      "",
      null,
      null,
      false
    ],
    "setSubstChars": [
      "$chars",
      null,
      null,
      false
    ],
    "toUCallback": [
      "$reason, $source, $codeUnits, &$error",
      null,
      null,
      false
    ],
    "fromUCallback": [
      "$reason, $source, $codePoint, &$error",
      null,
      null,
      false
    ],
    "convert": [
      "$str, $reverse = null",
      null,
      null,
      false
    ],
    "transcode": [
      "$str, $toEncoding, $fromEncoding, array $options = null",
      null,
      null,
      true
    ],
    "getErrorCode": [
      "",
      null,
      null,
      false
    ],
    "getErrorMessage": [
      "",
      null,
      null,
      false
    ],
    "reasonText": [
      "$reason = null",
      null,
      null,
      true
    ],
    "getAvailable": [
      "",
      null,
      null,
      true
    ],
    "getAliases": [
      "$name",
      null,
      null,
      true
    ],
    "getStandards": [
      "",
      null,
      null,
      true
    ]
  },
  "81": {
    "__construct": [
      "?string $destination_encoding = NULL, ?string $source_encoding = NULL",
      null,
      null,
      false
    ],
    "convert": [
      "string $str, bool $reverse = false",
      null,
      "string|false",
      false
    ],
    "fromUCallback": [
      "int $reason, array $source, int $codePoint, &$error",
      null,
      "array|string|int|null",
      false
    ],
    "getAliases": [
      "string $name",
      null,
      "array|false|null",
      true
    ],
    "getAvailable": [
      "",
      null,
      "array",
      true
    ],
    "getDestinationEncoding": [
      "",
      null,
      "string|false|null",
      false
    ],
    "getDestinationType": [
      "",
      null,
      "int|false|null",
      false
    ],
    "getErrorCode": [
      "",
      null,
      "int",
      false
    ],
    "getErrorMessage": [
      "",
      null,
      "?string",
      false
    ],
    "getSourceEncoding": [
      "",
      null,
      "string|false|null",
      false
    ],
    "getSourceType": [
      "",
      null,
      "int|false|null",
      false
    ],
    "getStandards": [
      "",
      null,
      "?array",
      true
    ],
    "getSubstChars": [
      "",
      null,
      "string|false|null",
      false
    ],
    "reasonText": [
      "int $reason",
      null,
      "string",
      true
    ],
    "setDestinationEncoding": [
      "string $encoding",
      null,
      "bool",
      false
    ],
    "setSourceEncoding": [
      "string $encoding",
      null,
      "bool",
      false
    ],
    "setSubstChars": [
      "string $chars",
      null,
      "bool",
      false
    ],
    "toUCallback": [
      "int $reason, string $source, string $codeUnits, &$error",
      null,
      "array|string|int|null",
      false
    ],
    "transcode": [
      "string $str, string $toEncoding, string $fromEncoding, ?array $options = NULL",
      null,
      "string|false",
      true
    ]
  },
  "82": {
    "__construct": [
      "?string $destination_encoding = NULL, ?string $source_encoding = NULL",
      null,
      null,
      false
    ],
    "convert": [
      "string $str, bool $reverse = false",
      null,
      "string|false",
      false
    ],
    "fromUCallback": [
      "int $reason, array $source, int $codePoint, &$error",
      null,
      "array|string|int|null",
      false
    ],
    "getAliases": [
      "string $name",
      null,
      "array|false|null",
      true
    ],
    "getAvailable": [
      "",
      null,
      "array",
      true
    ],
    "getDestinationEncoding": [
      "",
      null,
      "string|false|null",
      false
    ],
    "getDestinationType": [
      "",
      null,
      "int|false|null",
      false
    ],
    "getErrorCode": [
      "",
      null,
      "int",
      false
    ],
    "getErrorMessage": [
      "",
      null,
      "?string",
      false
    ],
    "getSourceEncoding": [
      "",
      null,
      "string|false|null",
      false
    ],
    "getSourceType": [
      "",
      null,
      "int|false|null",
      false
    ],
    "getStandards": [
      "",
      null,
      "?array",
      true
    ],
    "getSubstChars": [
      "",
      null,
      "string|false|null",
      false
    ],
    "reasonText": [
      "int $reason",
      null,
      "string",
      true
    ],
    "setDestinationEncoding": [
      "string $encoding",
      null,
      "bool",
      false
    ],
    "setSourceEncoding": [
      "string $encoding",
      null,
      "bool",
      false
    ],
    "setSubstChars": [
      "string $chars",
      null,
      "bool",
      false
    ],
    "toUCallback": [
      "int $reason, string $source, string $codeUnits, &$error",
      null,
      "array|string|int|null",
      false
    ],
    "transcode": [
      "string $str, string $toEncoding, string $fromEncoding, ?array $options = NULL",
      null,
      "string|false",
      true
    ]
  },
  "84": {
    "__construct": [
      "?string $destination_encoding = NULL, ?string $source_encoding = NULL",
      null,
      null,
      false
    ],
    "convert": [
      "string $str, bool $reverse = false",
      null,
      "string|false",
      false
    ],
    "fromUCallback": [
      "int $reason, array $source, int $codePoint, &$error",
      null,
      "array|string|int|null",
      false
    ],
    "getAliases": [
      "string $name",
      null,
      "array|false|null",
      true
    ],
    "getAvailable": [
      "",
      null,
      "array",
      true
    ],
    "getDestinationEncoding": [
      "",
      null,
      "string|false|null",
      false
    ],
    "getDestinationType": [
      "",
      null,
      "int|false|null",
      false
    ],
    "getErrorCode": [
      "",
      null,
      "int",
      false
    ],
    "getErrorMessage": [
      "",
      null,
      "?string",
      false
    ],
    "getSourceEncoding": [
      "",
      null,
      "string|false|null",
      false
    ],
    "getSourceType": [
      "",
      null,
      "int|false|null",
      false
    ],
    "getStandards": [
      "",
      null,
      "?array",
      true
    ],
    "getSubstChars": [
      "",
      null,
      "string|false|null",
      false
    ],
    "reasonText": [
      "int $reason",
      null,
      "string",
      true
    ],
    "setDestinationEncoding": [
      "string $encoding",
      null,
      "bool",
      false
    ],
    "setSourceEncoding": [
      "string $encoding",
      null,
      "bool",
      false
    ],
    "setSubstChars": [
      "string $chars",
      null,
      "bool",
      false
    ],
    "toUCallback": [
      "int $reason, string $source, string $codeUnits, &$error",
      null,
      "array|string|int|null",
      false
    ],
    "transcode": [
      "string $str, string $toEncoding, string $fromEncoding, ?array $options = NULL",
      null,
      "string|false",
      true
    ]
  },
  "85": {
    "__construct": [
      "?string $destination_encoding = NULL, ?string $source_encoding = NULL",
      null,
      null,
      false
    ],
    "convert": [
      "string $str, bool $reverse = false",
      null,
      "string|false",
      false
    ],
    "fromUCallback": [
      "int $reason, array $source, int $codePoint, &$error",
      null,
      "array|string|int|null",
      false
    ],
    "getAliases": [
      "string $name",
      null,
      "array|false|null",
      true
    ],
    "getAvailable": [
      "",
      null,
      "array",
      true
    ],
    "getDestinationEncoding": [
      "",
      null,
      "string|false|null",
      false
    ],
    "getDestinationType": [
      "",
      null,
      "int|false|null",
      false
    ],
    "getErrorCode": [
      "",
      null,
      "int",
      false
    ],
    "getErrorMessage": [
      "",
      null,
      "?string",
      false
    ],
    "getSourceEncoding": [
      "",
      null,
      "string|false|null",
      false
    ],
    "getSourceType": [
      "",
      null,
      "int|false|null",
      false
    ],
    "getStandards": [
      "",
      null,
      "?array",
      true
    ],
    "getSubstChars": [
      "",
      null,
      "string|false|null",
      false
    ],
    "reasonText": [
      "int $reason",
      null,
      "string",
      true
    ],
    "setDestinationEncoding": [
      "string $encoding",
      null,
      "bool",
      false
    ],
    "setSourceEncoding": [
      "string $encoding",
      null,
      "bool",
      false
    ],
    "setSubstChars": [
      "string $chars",
      null,
      "bool",
      false
    ],
    "toUCallback": [
      "int $reason, string $source, string $codeUnits, &$error",
      null,
      "array|string|int|null",
      false
    ],
    "transcode": [
      "string $str, string $toEncoding, string $fromEncoding, ?array $options = NULL",
      null,
      "string|false",
      true
    ]
  }
} as const;
