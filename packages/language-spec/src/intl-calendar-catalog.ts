// Generated from JetBrains/phpstorm-stubs at e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, intl/intl.php, and local PHP 7.2/8.1/8.2/8.4/8.5 reflection.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Non-runtime upstream typos are excluded.
export const INTL_CALENDAR_CONSTANTS = {
  "FIELD_ERA": 0,
  "FIELD_YEAR": 1,
  "FIELD_MONTH": 2,
  "FIELD_WEEK_OF_YEAR": 3,
  "FIELD_WEEK_OF_MONTH": 4,
  "FIELD_DATE": 5,
  "FIELD_DAY_OF_YEAR": 6,
  "FIELD_DAY_OF_WEEK": 7,
  "FIELD_DAY_OF_WEEK_IN_MONTH": 8,
  "FIELD_AM_PM": 9,
  "FIELD_HOUR": 10,
  "FIELD_HOUR_OF_DAY": 11,
  "FIELD_MINUTE": 12,
  "FIELD_SECOND": 13,
  "FIELD_MILLISECOND": 14,
  "FIELD_ZONE_OFFSET": 15,
  "FIELD_DST_OFFSET": 16,
  "FIELD_YEAR_WOY": 17,
  "FIELD_DOW_LOCAL": 18,
  "FIELD_EXTENDED_YEAR": 19,
  "FIELD_JULIAN_DAY": 20,
  "FIELD_MILLISECONDS_IN_DAY": 21,
  "FIELD_IS_LEAP_MONTH": 22,
  "FIELD_FIELD_COUNT": 24,
  "FIELD_DAY_OF_MONTH": 5,
  "DOW_SUNDAY": 1,
  "DOW_MONDAY": 2,
  "DOW_TUESDAY": 3,
  "DOW_WEDNESDAY": 4,
  "DOW_THURSDAY": 5,
  "DOW_FRIDAY": 6,
  "DOW_SATURDAY": 7,
  "DOW_TYPE_WEEKDAY": 0,
  "DOW_TYPE_WEEKEND": 1,
  "DOW_TYPE_WEEKEND_OFFSET": 2,
  "DOW_TYPE_WEEKEND_CEASE": 3,
  "WALLTIME_FIRST": 1,
  "WALLTIME_LAST": 0,
  "WALLTIME_NEXT_VALID": 2
} as const;
export const INTL_CALENDAR_SNAPSHOTS = {
  "72": {
    "functions": {
      "intlcal_create_instance": [
        "$timeZone = null, $locale = null",
        null,
        null
      ],
      "intlcal_get_keyword_values_for_locale": [
        "$key, $locale, $commonlyUsed",
        null,
        null
      ],
      "intlcal_get_now": [
        "",
        null,
        null
      ],
      "intlcal_get_available_locales": [
        "",
        null,
        null
      ],
      "intlcal_get": [
        "IntlCalendar $calendar, $field",
        null,
        null
      ],
      "intlcal_get_time": [
        "IntlCalendar $calendar",
        null,
        null
      ],
      "intlcal_set_time": [
        "IntlCalendar $calendar, $date",
        null,
        null
      ],
      "intlcal_add": [
        "IntlCalendar $calendar, $field, $amount",
        null,
        null
      ],
      "intlcal_set_time_zone": [
        "IntlCalendar $calendar, $timeZone",
        null,
        null
      ],
      "intlcal_after": [
        "IntlCalendar $calendar, IntlCalendar $otherCalendar",
        null,
        null
      ],
      "intlcal_before": [
        "IntlCalendar $calendar, IntlCalendar $otherCalendar",
        null,
        null
      ],
      "intlcal_set": [
        "IntlCalendar $calendar, $fieldOrYear, $valueOrMonth, $dayOfMonth = null, $hour = null, $minute = null, $second = null",
        null,
        null
      ],
      "intlcal_roll": [
        "IntlCalendar $calendar, $field, $amountOrUpOrDown = null",
        null,
        null
      ],
      "intlcal_clear": [
        "IntlCalendar $calendar, $field = null",
        null,
        null
      ],
      "intlcal_field_difference": [
        "IntlCalendar $calendar, $when, $field",
        null,
        null
      ],
      "intlcal_get_actual_maximum": [
        "IntlCalendar $calendar, $field",
        null,
        null
      ],
      "intlcal_get_actual_minimum": [
        "IntlCalendar $calendar, $field",
        null,
        null
      ],
      "intlcal_get_day_of_week_type": [
        "IntlCalendar $calendar, $dayOfWeek",
        null,
        null
      ],
      "intlcal_get_first_day_of_week": [
        "IntlCalendar $calendar",
        null,
        null
      ],
      "intlcal_get_greatest_minimum": [
        "IntlCalendar $calendar, $field",
        null,
        null
      ],
      "intlcal_get_least_maximum": [
        "IntlCalendar $calendar, $field",
        null,
        null
      ],
      "intlcal_get_locale": [
        "IntlCalendar $calendar, $localeType",
        null,
        null
      ],
      "intlcal_get_maximum": [
        "IntlCalendar $calendar, $field",
        null,
        null
      ],
      "intlcal_get_minimal_days_in_first_week": [
        "IntlCalendar $calendar",
        null,
        null
      ],
      "intlcal_get_minimum": [
        "IntlCalendar $calendar, $field",
        null,
        null
      ],
      "intlcal_get_time_zone": [
        "IntlCalendar $calendar",
        null,
        null
      ],
      "intlcal_get_type": [
        "IntlCalendar $calendar",
        null,
        null
      ],
      "intlcal_get_weekend_transition": [
        "IntlCalendar $calendar, $dayOfWeek",
        null,
        null
      ],
      "intlcal_in_daylight_time": [
        "IntlCalendar $calendar",
        null,
        null
      ],
      "intlcal_is_equivalent_to": [
        "IntlCalendar $calendar, IntlCalendar $otherCalendar",
        null,
        null
      ],
      "intlcal_is_lenient": [
        "IntlCalendar $calendar",
        null,
        null
      ],
      "intlcal_is_set": [
        "IntlCalendar $calendar, $field",
        null,
        null
      ],
      "intlcal_is_weekend": [
        "IntlCalendar $calendar, $date = null",
        null,
        null
      ],
      "intlcal_set_first_day_of_week": [
        "IntlCalendar $calendar, $dayOfWeek",
        null,
        null
      ],
      "intlcal_set_lenient": [
        "IntlCalendar $calendar, $isLenient",
        null,
        null
      ],
      "intlcal_set_minimal_days_in_first_week": [
        "IntlCalendar $calendar, $numberOfDays",
        null,
        null
      ],
      "intlcal_equals": [
        "IntlCalendar $calendar, IntlCalendar $otherCalendar",
        null,
        null
      ],
      "intlcal_from_date_time": [
        "$dateTime",
        null,
        null
      ],
      "intlcal_to_date_time": [
        "IntlCalendar $calendar",
        null,
        null
      ],
      "intlcal_get_repeated_wall_time_option": [
        "IntlCalendar $calendar",
        null,
        null
      ],
      "intlcal_get_skipped_wall_time_option": [
        "IntlCalendar $calendar",
        null,
        null
      ],
      "intlcal_set_repeated_wall_time_option": [
        "IntlCalendar $calendar, $wallTimeOption",
        null,
        null
      ],
      "intlcal_set_skipped_wall_time_option": [
        "IntlCalendar $calendar, $wallTimeOption",
        null,
        null
      ],
      "intlcal_get_error_code": [
        "IntlCalendar $calendar",
        null,
        null
      ],
      "intlcal_get_error_message": [
        "IntlCalendar $calendar",
        null,
        null
      ],
      "intlgregcal_create_instance": [
        "$timeZoneOrYear = null, $localeOrMonth = null, $dayOfMonth = null, $hour = null, $minute = null, $second = null",
        null,
        null
      ],
      "intlgregcal_set_gregorian_change": [
        "IntlGregorianCalendar $calendar, $date",
        null,
        null
      ],
      "intlgregcal_get_gregorian_change": [
        "IntlGregorianCalendar $calendar",
        null,
        null
      ],
      "intlgregcal_is_leap_year": [
        "IntlGregorianCalendar $calendar, $year",
        null,
        null
      ]
    },
    "calendar": {
      "__construct": [
        "",
        null,
        null,
        false,
        true
      ],
      "createInstance": [
        "$timeZone = null, $locale = null",
        null,
        null,
        true,
        false
      ],
      "getKeywordValuesForLocale": [
        "$key, $locale, $commonlyUsed",
        null,
        null,
        true,
        false
      ],
      "getNow": [
        "",
        null,
        null,
        true,
        false
      ],
      "getAvailableLocales": [
        "",
        null,
        null,
        true,
        false
      ],
      "get": [
        "$field",
        null,
        null,
        false,
        false
      ],
      "getTime": [
        "",
        null,
        null,
        false,
        false
      ],
      "setTime": [
        "$date",
        null,
        null,
        false,
        false
      ],
      "add": [
        "$field, $amount",
        null,
        null,
        false,
        false
      ],
      "setTimeZone": [
        "$timeZone",
        null,
        null,
        false,
        false
      ],
      "after": [
        "IntlCalendar $calendar",
        null,
        null,
        false,
        false
      ],
      "before": [
        "IntlCalendar $calendar",
        null,
        null,
        false,
        false
      ],
      "set": [
        "$fieldOrYear, $valueOrMonth, $dayOfMonth = null, $hour = null, $minute = null, $second = null",
        null,
        null,
        false,
        false
      ],
      "roll": [
        "$field, $amountOrUpOrDown",
        null,
        null,
        false,
        false
      ],
      "clear": [
        "$field = null",
        null,
        null,
        false,
        false
      ],
      "fieldDifference": [
        "$when, $field",
        null,
        null,
        false,
        false
      ],
      "getActualMaximum": [
        "$field",
        null,
        null,
        false,
        false
      ],
      "getActualMinimum": [
        "$field",
        null,
        null,
        false,
        false
      ],
      "getDayOfWeekType": [
        "$dayOfWeek",
        null,
        null,
        false,
        false
      ],
      "getFirstDayOfWeek": [
        "",
        null,
        null,
        false,
        false
      ],
      "getGreatestMinimum": [
        "$field",
        null,
        null,
        false,
        false
      ],
      "getLeastMaximum": [
        "$field",
        null,
        null,
        false,
        false
      ],
      "getLocale": [
        "$localeType",
        null,
        null,
        false,
        false
      ],
      "getMaximum": [
        "$field",
        null,
        null,
        false,
        false
      ],
      "getMinimalDaysInFirstWeek": [
        "",
        null,
        null,
        false,
        false
      ],
      "getMinimum": [
        "$field",
        null,
        null,
        false,
        false
      ],
      "getTimeZone": [
        "",
        null,
        null,
        false,
        false
      ],
      "getType": [
        "",
        null,
        null,
        false,
        false
      ],
      "getWeekendTransition": [
        "$dayOfWeek",
        null,
        null,
        false,
        false
      ],
      "inDaylightTime": [
        "",
        null,
        null,
        false,
        false
      ],
      "isEquivalentTo": [
        "IntlCalendar $calendar",
        null,
        null,
        false,
        false
      ],
      "isLenient": [
        "",
        null,
        null,
        false,
        false
      ],
      "isSet": [
        "$field",
        null,
        null,
        false,
        false
      ],
      "isWeekend": [
        "$date = null",
        null,
        null,
        false,
        false
      ],
      "setFirstDayOfWeek": [
        "$dayOfWeek",
        null,
        null,
        false,
        false
      ],
      "setLenient": [
        "$isLenient",
        null,
        null,
        false,
        false
      ],
      "setMinimalDaysInFirstWeek": [
        "$numberOfDays",
        null,
        null,
        false,
        false
      ],
      "equals": [
        "IntlCalendar $calendar",
        null,
        null,
        false,
        false
      ],
      "getRepeatedWallTimeOption": [
        "",
        null,
        null,
        false,
        false
      ],
      "getSkippedWallTimeOption": [
        "",
        null,
        null,
        false,
        false
      ],
      "setRepeatedWallTimeOption": [
        "$wallTimeOption",
        null,
        null,
        false,
        false
      ],
      "setSkippedWallTimeOption": [
        "$wallTimeOption",
        null,
        null,
        false,
        false
      ],
      "fromDateTime": [
        "$dateTime",
        null,
        null,
        true,
        false
      ],
      "toDateTime": [
        "",
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
    "gregorian": {
      "__construct": [
        "$timeZoneOrYear = null, $localeOrMonth = null, $dayOfMonth = null, $hour = null, $minute = null, $second = null",
        null,
        null,
        false,
        false
      ],
      "setGregorianChange": [
        "$date",
        null,
        null,
        false,
        false
      ],
      "getGregorianChange": [
        "",
        null,
        null,
        false,
        false
      ],
      "isLeapYear": [
        "$year",
        null,
        null,
        false,
        false
      ]
    },
    "fieldCount": 23
  },
  "81": {
    "functions": {
      "intlcal_create_instance": [
        "$timezone = NULL, ?string $locale = NULL",
        "?IntlCalendar",
        null
      ],
      "intlcal_get_keyword_values_for_locale": [
        "string $keyword, string $locale, bool $onlyCommon",
        "IntlIterator|false",
        null
      ],
      "intlcal_get_now": [
        "",
        "float",
        null
      ],
      "intlcal_get_available_locales": [
        "",
        "array",
        null
      ],
      "intlcal_get": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_time": [
        "IntlCalendar $calendar",
        "float|false",
        null
      ],
      "intlcal_set_time": [
        "IntlCalendar $calendar, float $timestamp",
        "bool",
        null
      ],
      "intlcal_add": [
        "IntlCalendar $calendar, int $field, int $value",
        "bool",
        null
      ],
      "intlcal_set_time_zone": [
        "IntlCalendar $calendar, $timezone",
        "bool",
        null
      ],
      "intlcal_after": [
        "IntlCalendar $calendar, IntlCalendar $other",
        "bool",
        null
      ],
      "intlcal_before": [
        "IntlCalendar $calendar, IntlCalendar $other",
        "bool",
        null
      ],
      "intlcal_set": [
        "IntlCalendar $calendar, int $year, int $month, int $dayOfMonth = null, int $hour = null, int $minute = null, int $second = null",
        "bool",
        null
      ],
      "intlcal_roll": [
        "IntlCalendar $calendar, int $field, $value",
        "bool",
        null
      ],
      "intlcal_clear": [
        "IntlCalendar $calendar, ?int $field = NULL",
        "bool",
        null
      ],
      "intlcal_field_difference": [
        "IntlCalendar $calendar, float $timestamp, int $field",
        "int|false",
        null
      ],
      "intlcal_get_actual_maximum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_actual_minimum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_day_of_week_type": [
        "IntlCalendar $calendar, int $dayOfWeek",
        "int|false",
        null
      ],
      "intlcal_get_first_day_of_week": [
        "IntlCalendar $calendar",
        "int|false",
        null
      ],
      "intlcal_get_least_maximum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_greatest_minimum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_locale": [
        "IntlCalendar $calendar, int $type",
        "string|false",
        null
      ],
      "intlcal_get_maximum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_minimal_days_in_first_week": [
        "IntlCalendar $calendar",
        "int|false",
        null
      ],
      "intlcal_set_minimal_days_in_first_week": [
        "IntlCalendar $calendar, int $days",
        "bool",
        null
      ],
      "intlcal_get_minimum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_time_zone": [
        "IntlCalendar $calendar",
        "IntlTimeZone|false",
        null
      ],
      "intlcal_get_type": [
        "IntlCalendar $calendar",
        "string",
        null
      ],
      "intlcal_get_weekend_transition": [
        "IntlCalendar $calendar, int $dayOfWeek",
        "int|false",
        null
      ],
      "intlcal_in_daylight_time": [
        "IntlCalendar $calendar",
        "bool",
        null
      ],
      "intlcal_is_lenient": [
        "IntlCalendar $calendar",
        "bool",
        null
      ],
      "intlcal_is_set": [
        "IntlCalendar $calendar, int $field",
        "bool",
        null
      ],
      "intlcal_is_equivalent_to": [
        "IntlCalendar $calendar, IntlCalendar $other",
        "bool",
        null
      ],
      "intlcal_is_weekend": [
        "IntlCalendar $calendar, ?float $timestamp = NULL",
        "bool",
        null
      ],
      "intlcal_set_first_day_of_week": [
        "IntlCalendar $calendar, int $dayOfWeek",
        "bool",
        null
      ],
      "intlcal_set_lenient": [
        "IntlCalendar $calendar, bool $lenient",
        "bool",
        null
      ],
      "intlcal_get_repeated_wall_time_option": [
        "IntlCalendar $calendar",
        "int",
        null
      ],
      "intlcal_equals": [
        "IntlCalendar $calendar, IntlCalendar $other",
        "bool",
        null
      ],
      "intlcal_get_skipped_wall_time_option": [
        "IntlCalendar $calendar",
        "int",
        null
      ],
      "intlcal_set_repeated_wall_time_option": [
        "IntlCalendar $calendar, int $option",
        "bool",
        null
      ],
      "intlcal_set_skipped_wall_time_option": [
        "IntlCalendar $calendar, int $option",
        "bool",
        null
      ],
      "intlcal_from_date_time": [
        "DateTime|string $datetime, ?string $locale = NULL",
        "?IntlCalendar",
        null
      ],
      "intlcal_to_date_time": [
        "IntlCalendar $calendar",
        "DateTime|false",
        null
      ],
      "intlcal_get_error_code": [
        "IntlCalendar $calendar",
        "int|false",
        null
      ],
      "intlcal_get_error_message": [
        "IntlCalendar $calendar",
        "string|false",
        null
      ],
      "intlgregcal_create_instance": [
        "$timezoneOrYear = null, $localeOrMonth = null, $day = null, $hour = null, $minute = null, $second = null",
        "?IntlGregorianCalendar",
        null
      ],
      "intlgregcal_set_gregorian_change": [
        "IntlGregorianCalendar $calendar, float $timestamp",
        "bool",
        null
      ],
      "intlgregcal_get_gregorian_change": [
        "IntlGregorianCalendar $calendar",
        "float",
        null
      ],
      "intlgregcal_is_leap_year": [
        "IntlGregorianCalendar $calendar, int $year",
        "bool",
        null
      ]
    },
    "calendar": {
      "__construct": [
        "",
        null,
        null,
        false,
        true
      ],
      "createInstance": [
        "$timezone = NULL, ?string $locale = NULL",
        null,
        "?IntlCalendar",
        true,
        false
      ],
      "equals": [
        "IntlCalendar $other",
        null,
        "bool",
        false,
        false
      ],
      "fieldDifference": [
        "float $timestamp, int $field",
        null,
        "int|false",
        false,
        false
      ],
      "add": [
        "int $field, int $value",
        null,
        "bool",
        false,
        false
      ],
      "after": [
        "IntlCalendar $other",
        null,
        "bool",
        false,
        false
      ],
      "before": [
        "IntlCalendar $other",
        null,
        "bool",
        false,
        false
      ],
      "clear": [
        "?int $field = NULL",
        null,
        null,
        false,
        false
      ],
      "fromDateTime": [
        "DateTime|string $datetime, ?string $locale = NULL",
        null,
        "?IntlCalendar",
        true,
        false
      ],
      "get": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getActualMaximum": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getActualMinimum": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getAvailableLocales": [
        "",
        null,
        "array",
        true,
        false
      ],
      "getDayOfWeekType": [
        "int $dayOfWeek",
        null,
        "int|false",
        false,
        false
      ],
      "getErrorCode": [
        "",
        null,
        "int|false",
        false,
        false
      ],
      "getErrorMessage": [
        "",
        null,
        "string|false",
        false,
        false
      ],
      "getFirstDayOfWeek": [
        "",
        null,
        "int|false",
        false,
        false
      ],
      "getGreatestMinimum": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getKeywordValuesForLocale": [
        "string $keyword, string $locale, bool $onlyCommon",
        null,
        "IntlIterator|false",
        true,
        false
      ],
      "getLeastMaximum": [
        "int $field",
        null,
        "int|false",
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
      "getMaximum": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getMinimalDaysInFirstWeek": [
        "",
        null,
        "int|false",
        false,
        false
      ],
      "setMinimalDaysInFirstWeek": [
        "int $days",
        null,
        null,
        false,
        false
      ],
      "getMinimum": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getNow": [
        "",
        null,
        "float",
        true,
        false
      ],
      "getRepeatedWallTimeOption": [
        "",
        null,
        "int",
        false,
        false
      ],
      "getSkippedWallTimeOption": [
        "",
        null,
        "int",
        false,
        false
      ],
      "getTime": [
        "",
        null,
        "float|false",
        false,
        false
      ],
      "getTimeZone": [
        "",
        null,
        "IntlTimeZone|false",
        false,
        false
      ],
      "getType": [
        "",
        null,
        "string",
        false,
        false
      ],
      "getWeekendTransition": [
        "int $dayOfWeek",
        null,
        "int|false",
        false,
        false
      ],
      "inDaylightTime": [
        "",
        null,
        "bool",
        false,
        false
      ],
      "isEquivalentTo": [
        "IntlCalendar $other",
        null,
        "bool",
        false,
        false
      ],
      "isLenient": [
        "",
        null,
        "bool",
        false,
        false
      ],
      "isWeekend": [
        "?float $timestamp = NULL",
        null,
        "bool",
        false,
        false
      ],
      "roll": [
        "int $field, $value",
        null,
        "bool",
        false,
        false
      ],
      "isSet": [
        "int $field",
        null,
        "bool",
        false,
        false
      ],
      "set": [
        "int $year, int $month, int $dayOfMonth = null, int $hour = null, int $minute = null, int $second = null",
        null,
        null,
        false,
        false
      ],
      "setFirstDayOfWeek": [
        "int $dayOfWeek",
        null,
        null,
        false,
        false
      ],
      "setLenient": [
        "bool $lenient",
        null,
        null,
        false,
        false
      ],
      "setRepeatedWallTimeOption": [
        "int $option",
        null,
        null,
        false,
        false
      ],
      "setSkippedWallTimeOption": [
        "int $option",
        null,
        null,
        false,
        false
      ],
      "setTime": [
        "float $timestamp",
        null,
        "bool",
        false,
        false
      ],
      "setTimeZone": [
        "$timezone",
        null,
        "bool",
        false,
        false
      ],
      "toDateTime": [
        "",
        null,
        "DateTime|false",
        false,
        false
      ]
    },
    "gregorian": {
      "__construct": [
        "$timezoneOrYear = null, $localeOrMonth = null, $day = null, $hour = null, $minute = null, $second = null",
        null,
        null,
        false,
        false
      ],
      "setGregorianChange": [
        "float $timestamp",
        null,
        "bool",
        false,
        false
      ],
      "getGregorianChange": [
        "",
        null,
        "float",
        false,
        false
      ],
      "isLeapYear": [
        "int $year",
        null,
        "bool",
        false,
        false
      ]
    },
    "fieldCount": 24
  },
  "82": {
    "functions": {
      "intlcal_create_instance": [
        "$timezone = NULL, ?string $locale = NULL",
        "?IntlCalendar",
        null
      ],
      "intlcal_get_keyword_values_for_locale": [
        "string $keyword, string $locale, bool $onlyCommon",
        "IntlIterator|false",
        null
      ],
      "intlcal_get_now": [
        "",
        "float",
        null
      ],
      "intlcal_get_available_locales": [
        "",
        "array",
        null
      ],
      "intlcal_get": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_time": [
        "IntlCalendar $calendar",
        "float|false",
        null
      ],
      "intlcal_set_time": [
        "IntlCalendar $calendar, float $timestamp",
        "bool",
        null
      ],
      "intlcal_add": [
        "IntlCalendar $calendar, int $field, int $value",
        "bool",
        null
      ],
      "intlcal_set_time_zone": [
        "IntlCalendar $calendar, $timezone",
        "bool",
        null
      ],
      "intlcal_after": [
        "IntlCalendar $calendar, IntlCalendar $other",
        "bool",
        null
      ],
      "intlcal_before": [
        "IntlCalendar $calendar, IntlCalendar $other",
        "bool",
        null
      ],
      "intlcal_set": [
        "IntlCalendar $calendar, int $year, int $month, int $dayOfMonth = null, int $hour = null, int $minute = null, int $second = null",
        "bool",
        null
      ],
      "intlcal_roll": [
        "IntlCalendar $calendar, int $field, $value",
        "bool",
        null
      ],
      "intlcal_clear": [
        "IntlCalendar $calendar, ?int $field = NULL",
        "bool",
        null
      ],
      "intlcal_field_difference": [
        "IntlCalendar $calendar, float $timestamp, int $field",
        "int|false",
        null
      ],
      "intlcal_get_actual_maximum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_actual_minimum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_day_of_week_type": [
        "IntlCalendar $calendar, int $dayOfWeek",
        "int|false",
        null
      ],
      "intlcal_get_first_day_of_week": [
        "IntlCalendar $calendar",
        "int|false",
        null
      ],
      "intlcal_get_least_maximum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_greatest_minimum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_locale": [
        "IntlCalendar $calendar, int $type",
        "string|false",
        null
      ],
      "intlcal_get_maximum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_minimal_days_in_first_week": [
        "IntlCalendar $calendar",
        "int|false",
        null
      ],
      "intlcal_set_minimal_days_in_first_week": [
        "IntlCalendar $calendar, int $days",
        "bool",
        null
      ],
      "intlcal_get_minimum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_time_zone": [
        "IntlCalendar $calendar",
        "IntlTimeZone|false",
        null
      ],
      "intlcal_get_type": [
        "IntlCalendar $calendar",
        "string",
        null
      ],
      "intlcal_get_weekend_transition": [
        "IntlCalendar $calendar, int $dayOfWeek",
        "int|false",
        null
      ],
      "intlcal_in_daylight_time": [
        "IntlCalendar $calendar",
        "bool",
        null
      ],
      "intlcal_is_lenient": [
        "IntlCalendar $calendar",
        "bool",
        null
      ],
      "intlcal_is_set": [
        "IntlCalendar $calendar, int $field",
        "bool",
        null
      ],
      "intlcal_is_equivalent_to": [
        "IntlCalendar $calendar, IntlCalendar $other",
        "bool",
        null
      ],
      "intlcal_is_weekend": [
        "IntlCalendar $calendar, ?float $timestamp = NULL",
        "bool",
        null
      ],
      "intlcal_set_first_day_of_week": [
        "IntlCalendar $calendar, int $dayOfWeek",
        "bool",
        null
      ],
      "intlcal_set_lenient": [
        "IntlCalendar $calendar, bool $lenient",
        "bool",
        null
      ],
      "intlcal_get_repeated_wall_time_option": [
        "IntlCalendar $calendar",
        "int",
        null
      ],
      "intlcal_equals": [
        "IntlCalendar $calendar, IntlCalendar $other",
        "bool",
        null
      ],
      "intlcal_get_skipped_wall_time_option": [
        "IntlCalendar $calendar",
        "int",
        null
      ],
      "intlcal_set_repeated_wall_time_option": [
        "IntlCalendar $calendar, int $option",
        "bool",
        null
      ],
      "intlcal_set_skipped_wall_time_option": [
        "IntlCalendar $calendar, int $option",
        "bool",
        null
      ],
      "intlcal_from_date_time": [
        "DateTime|string $datetime, ?string $locale = NULL",
        "?IntlCalendar",
        null
      ],
      "intlcal_to_date_time": [
        "IntlCalendar $calendar",
        "DateTime|false",
        null
      ],
      "intlcal_get_error_code": [
        "IntlCalendar $calendar",
        "int|false",
        null
      ],
      "intlcal_get_error_message": [
        "IntlCalendar $calendar",
        "string|false",
        null
      ],
      "intlgregcal_create_instance": [
        "$timezoneOrYear = null, $localeOrMonth = null, $day = null, $hour = null, $minute = null, $second = null",
        "?IntlGregorianCalendar",
        null
      ],
      "intlgregcal_set_gregorian_change": [
        "IntlGregorianCalendar $calendar, float $timestamp",
        "bool",
        null
      ],
      "intlgregcal_get_gregorian_change": [
        "IntlGregorianCalendar $calendar",
        "float",
        null
      ],
      "intlgregcal_is_leap_year": [
        "IntlGregorianCalendar $calendar, int $year",
        "bool",
        null
      ]
    },
    "calendar": {
      "__construct": [
        "",
        null,
        null,
        false,
        true
      ],
      "createInstance": [
        "$timezone = NULL, ?string $locale = NULL",
        null,
        "?IntlCalendar",
        true,
        false
      ],
      "equals": [
        "IntlCalendar $other",
        null,
        "bool",
        false,
        false
      ],
      "fieldDifference": [
        "float $timestamp, int $field",
        null,
        "int|false",
        false,
        false
      ],
      "add": [
        "int $field, int $value",
        null,
        "bool",
        false,
        false
      ],
      "after": [
        "IntlCalendar $other",
        null,
        "bool",
        false,
        false
      ],
      "before": [
        "IntlCalendar $other",
        null,
        "bool",
        false,
        false
      ],
      "clear": [
        "?int $field = NULL",
        null,
        null,
        false,
        false
      ],
      "fromDateTime": [
        "DateTime|string $datetime, ?string $locale = NULL",
        null,
        "?IntlCalendar",
        true,
        false
      ],
      "get": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getActualMaximum": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getActualMinimum": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getAvailableLocales": [
        "",
        null,
        "array",
        true,
        false
      ],
      "getDayOfWeekType": [
        "int $dayOfWeek",
        null,
        "int|false",
        false,
        false
      ],
      "getErrorCode": [
        "",
        null,
        "int|false",
        false,
        false
      ],
      "getErrorMessage": [
        "",
        null,
        "string|false",
        false,
        false
      ],
      "getFirstDayOfWeek": [
        "",
        null,
        "int|false",
        false,
        false
      ],
      "getGreatestMinimum": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getKeywordValuesForLocale": [
        "string $keyword, string $locale, bool $onlyCommon",
        null,
        "IntlIterator|false",
        true,
        false
      ],
      "getLeastMaximum": [
        "int $field",
        null,
        "int|false",
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
      "getMaximum": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getMinimalDaysInFirstWeek": [
        "",
        null,
        "int|false",
        false,
        false
      ],
      "setMinimalDaysInFirstWeek": [
        "int $days",
        null,
        null,
        false,
        false
      ],
      "getMinimum": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getNow": [
        "",
        null,
        "float",
        true,
        false
      ],
      "getRepeatedWallTimeOption": [
        "",
        null,
        "int",
        false,
        false
      ],
      "getSkippedWallTimeOption": [
        "",
        null,
        "int",
        false,
        false
      ],
      "getTime": [
        "",
        null,
        "float|false",
        false,
        false
      ],
      "getTimeZone": [
        "",
        null,
        "IntlTimeZone|false",
        false,
        false
      ],
      "getType": [
        "",
        null,
        "string",
        false,
        false
      ],
      "getWeekendTransition": [
        "int $dayOfWeek",
        null,
        "int|false",
        false,
        false
      ],
      "inDaylightTime": [
        "",
        null,
        "bool",
        false,
        false
      ],
      "isEquivalentTo": [
        "IntlCalendar $other",
        null,
        "bool",
        false,
        false
      ],
      "isLenient": [
        "",
        null,
        "bool",
        false,
        false
      ],
      "isWeekend": [
        "?float $timestamp = NULL",
        null,
        "bool",
        false,
        false
      ],
      "roll": [
        "int $field, $value",
        null,
        "bool",
        false,
        false
      ],
      "isSet": [
        "int $field",
        null,
        "bool",
        false,
        false
      ],
      "set": [
        "int $year, int $month, int $dayOfMonth = null, int $hour = null, int $minute = null, int $second = null",
        null,
        null,
        false,
        false
      ],
      "setFirstDayOfWeek": [
        "int $dayOfWeek",
        null,
        null,
        false,
        false
      ],
      "setLenient": [
        "bool $lenient",
        null,
        null,
        false,
        false
      ],
      "setRepeatedWallTimeOption": [
        "int $option",
        null,
        null,
        false,
        false
      ],
      "setSkippedWallTimeOption": [
        "int $option",
        null,
        null,
        false,
        false
      ],
      "setTime": [
        "float $timestamp",
        null,
        "bool",
        false,
        false
      ],
      "setTimeZone": [
        "$timezone",
        null,
        "bool",
        false,
        false
      ],
      "toDateTime": [
        "",
        null,
        "DateTime|false",
        false,
        false
      ]
    },
    "gregorian": {
      "__construct": [
        "$timezoneOrYear = null, $localeOrMonth = null, $day = null, $hour = null, $minute = null, $second = null",
        null,
        null,
        false,
        false
      ],
      "setGregorianChange": [
        "float $timestamp",
        null,
        "bool",
        false,
        false
      ],
      "getGregorianChange": [
        "",
        null,
        "float",
        false,
        false
      ],
      "isLeapYear": [
        "int $year",
        null,
        "bool",
        false,
        false
      ]
    },
    "fieldCount": 24
  },
  "84": {
    "functions": {
      "intlcal_create_instance": [
        "$timezone = NULL, ?string $locale = NULL",
        "?IntlCalendar",
        null
      ],
      "intlcal_get_keyword_values_for_locale": [
        "string $keyword, string $locale, bool $onlyCommon",
        "IntlIterator|false",
        null
      ],
      "intlcal_get_now": [
        "",
        "float",
        null
      ],
      "intlcal_get_available_locales": [
        "",
        "array",
        null
      ],
      "intlcal_get": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_time": [
        "IntlCalendar $calendar",
        "float|false",
        null
      ],
      "intlcal_set_time": [
        "IntlCalendar $calendar, float $timestamp",
        "bool",
        null
      ],
      "intlcal_add": [
        "IntlCalendar $calendar, int $field, int $value",
        "bool",
        null
      ],
      "intlcal_set_time_zone": [
        "IntlCalendar $calendar, $timezone",
        "bool",
        null
      ],
      "intlcal_after": [
        "IntlCalendar $calendar, IntlCalendar $other",
        "bool",
        null
      ],
      "intlcal_before": [
        "IntlCalendar $calendar, IntlCalendar $other",
        "bool",
        null
      ],
      "intlcal_set": [
        "IntlCalendar $calendar, int $year, int $month, int $dayOfMonth = null, int $hour = null, int $minute = null, int $second = null",
        "true",
        null
      ],
      "intlcal_roll": [
        "IntlCalendar $calendar, int $field, $value",
        "bool",
        null
      ],
      "intlcal_clear": [
        "IntlCalendar $calendar, ?int $field = NULL",
        "true",
        null
      ],
      "intlcal_field_difference": [
        "IntlCalendar $calendar, float $timestamp, int $field",
        "int|false",
        null
      ],
      "intlcal_get_actual_maximum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_actual_minimum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_day_of_week_type": [
        "IntlCalendar $calendar, int $dayOfWeek",
        "int|false",
        null
      ],
      "intlcal_get_first_day_of_week": [
        "IntlCalendar $calendar",
        "int|false",
        null
      ],
      "intlcal_get_least_maximum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_greatest_minimum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_locale": [
        "IntlCalendar $calendar, int $type",
        "string|false",
        null
      ],
      "intlcal_get_maximum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_minimal_days_in_first_week": [
        "IntlCalendar $calendar",
        "int|false",
        null
      ],
      "intlcal_set_minimal_days_in_first_week": [
        "IntlCalendar $calendar, int $days",
        "true",
        null
      ],
      "intlcal_get_minimum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_time_zone": [
        "IntlCalendar $calendar",
        "IntlTimeZone|false",
        null
      ],
      "intlcal_get_type": [
        "IntlCalendar $calendar",
        "string",
        null
      ],
      "intlcal_get_weekend_transition": [
        "IntlCalendar $calendar, int $dayOfWeek",
        "int|false",
        null
      ],
      "intlcal_in_daylight_time": [
        "IntlCalendar $calendar",
        "bool",
        null
      ],
      "intlcal_is_lenient": [
        "IntlCalendar $calendar",
        "bool",
        null
      ],
      "intlcal_is_set": [
        "IntlCalendar $calendar, int $field",
        "bool",
        null
      ],
      "intlcal_is_equivalent_to": [
        "IntlCalendar $calendar, IntlCalendar $other",
        "bool",
        null
      ],
      "intlcal_is_weekend": [
        "IntlCalendar $calendar, ?float $timestamp = NULL",
        "bool",
        null
      ],
      "intlcal_set_first_day_of_week": [
        "IntlCalendar $calendar, int $dayOfWeek",
        "true",
        null
      ],
      "intlcal_set_lenient": [
        "IntlCalendar $calendar, bool $lenient",
        "true",
        null
      ],
      "intlcal_get_repeated_wall_time_option": [
        "IntlCalendar $calendar",
        "int",
        null
      ],
      "intlcal_equals": [
        "IntlCalendar $calendar, IntlCalendar $other",
        "bool",
        null
      ],
      "intlcal_get_skipped_wall_time_option": [
        "IntlCalendar $calendar",
        "int",
        null
      ],
      "intlcal_set_repeated_wall_time_option": [
        "IntlCalendar $calendar, int $option",
        "true",
        null
      ],
      "intlcal_set_skipped_wall_time_option": [
        "IntlCalendar $calendar, int $option",
        "true",
        null
      ],
      "intlcal_from_date_time": [
        "DateTime|string $datetime, ?string $locale = NULL",
        "?IntlCalendar",
        null
      ],
      "intlcal_to_date_time": [
        "IntlCalendar $calendar",
        "DateTime|false",
        null
      ],
      "intlcal_get_error_code": [
        "IntlCalendar $calendar",
        "int|false",
        null
      ],
      "intlcal_get_error_message": [
        "IntlCalendar $calendar",
        "string|false",
        null
      ],
      "intlgregcal_create_instance": [
        "$timezoneOrYear = null, $localeOrMonth = null, $day = null, $hour = null, $minute = null, $second = null",
        "?IntlGregorianCalendar",
        null
      ],
      "intlgregcal_set_gregorian_change": [
        "IntlGregorianCalendar $calendar, float $timestamp",
        "bool",
        null
      ],
      "intlgregcal_get_gregorian_change": [
        "IntlGregorianCalendar $calendar",
        "float",
        null
      ],
      "intlgregcal_is_leap_year": [
        "IntlGregorianCalendar $calendar, int $year",
        "bool",
        null
      ]
    },
    "calendar": {
      "__construct": [
        "",
        null,
        null,
        false,
        true
      ],
      "createInstance": [
        "$timezone = NULL, ?string $locale = NULL",
        null,
        "?IntlCalendar",
        true,
        false
      ],
      "equals": [
        "IntlCalendar $other",
        null,
        "bool",
        false,
        false
      ],
      "fieldDifference": [
        "float $timestamp, int $field",
        null,
        "int|false",
        false,
        false
      ],
      "add": [
        "int $field, int $value",
        null,
        "bool",
        false,
        false
      ],
      "after": [
        "IntlCalendar $other",
        null,
        "bool",
        false,
        false
      ],
      "before": [
        "IntlCalendar $other",
        null,
        "bool",
        false,
        false
      ],
      "clear": [
        "?int $field = NULL",
        null,
        "true",
        false,
        false
      ],
      "fromDateTime": [
        "DateTime|string $datetime, ?string $locale = NULL",
        null,
        "?IntlCalendar",
        true,
        false
      ],
      "get": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getActualMaximum": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getActualMinimum": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getAvailableLocales": [
        "",
        null,
        "array",
        true,
        false
      ],
      "getDayOfWeekType": [
        "int $dayOfWeek",
        null,
        "int|false",
        false,
        false
      ],
      "getErrorCode": [
        "",
        null,
        "int|false",
        false,
        false
      ],
      "getErrorMessage": [
        "",
        null,
        "string|false",
        false,
        false
      ],
      "getFirstDayOfWeek": [
        "",
        null,
        "int|false",
        false,
        false
      ],
      "getGreatestMinimum": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getKeywordValuesForLocale": [
        "string $keyword, string $locale, bool $onlyCommon",
        null,
        "IntlIterator|false",
        true,
        false
      ],
      "getLeastMaximum": [
        "int $field",
        null,
        "int|false",
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
      "getMaximum": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getMinimalDaysInFirstWeek": [
        "",
        null,
        "int|false",
        false,
        false
      ],
      "setMinimalDaysInFirstWeek": [
        "int $days",
        null,
        "true",
        false,
        false
      ],
      "getMinimum": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getNow": [
        "",
        null,
        "float",
        true,
        false
      ],
      "getRepeatedWallTimeOption": [
        "",
        null,
        "int",
        false,
        false
      ],
      "getSkippedWallTimeOption": [
        "",
        null,
        "int",
        false,
        false
      ],
      "getTime": [
        "",
        null,
        "float|false",
        false,
        false
      ],
      "getTimeZone": [
        "",
        null,
        "IntlTimeZone|false",
        false,
        false
      ],
      "getType": [
        "",
        null,
        "string",
        false,
        false
      ],
      "getWeekendTransition": [
        "int $dayOfWeek",
        null,
        "int|false",
        false,
        false
      ],
      "inDaylightTime": [
        "",
        null,
        "bool",
        false,
        false
      ],
      "isEquivalentTo": [
        "IntlCalendar $other",
        null,
        "bool",
        false,
        false
      ],
      "isLenient": [
        "",
        null,
        "bool",
        false,
        false
      ],
      "isWeekend": [
        "?float $timestamp = NULL",
        null,
        "bool",
        false,
        false
      ],
      "roll": [
        "int $field, $value",
        null,
        "bool",
        false,
        false
      ],
      "isSet": [
        "int $field",
        null,
        "bool",
        false,
        false
      ],
      "set": [
        "int $year, int $month, int $dayOfMonth = null, int $hour = null, int $minute = null, int $second = null",
        null,
        "true",
        false,
        false
      ],
      "setDate": [
        "int $year, int $month, int $dayOfMonth",
        "void",
        null,
        false,
        false
      ],
      "setDateTime": [
        "int $year, int $month, int $dayOfMonth, int $hour, int $minute, ?int $second = NULL",
        "void",
        null,
        false,
        false
      ],
      "setFirstDayOfWeek": [
        "int $dayOfWeek",
        null,
        "true",
        false,
        false
      ],
      "setLenient": [
        "bool $lenient",
        null,
        "true",
        false,
        false
      ],
      "setRepeatedWallTimeOption": [
        "int $option",
        null,
        "true",
        false,
        false
      ],
      "setSkippedWallTimeOption": [
        "int $option",
        null,
        "true",
        false,
        false
      ],
      "setTime": [
        "float $timestamp",
        null,
        "bool",
        false,
        false
      ],
      "setTimeZone": [
        "$timezone",
        null,
        "bool",
        false,
        false
      ],
      "toDateTime": [
        "",
        null,
        "DateTime|false",
        false,
        false
      ]
    },
    "gregorian": {
      "createFromDate": [
        "int $year, int $month, int $dayOfMonth",
        "static",
        null,
        true,
        false
      ],
      "createFromDateTime": [
        "int $year, int $month, int $dayOfMonth, int $hour, int $minute, ?int $second = NULL",
        "static",
        null,
        true,
        false
      ],
      "__construct": [
        "$timezoneOrYear = null, $localeOrMonth = null, $day = null, $hour = null, $minute = null, $second = null",
        null,
        null,
        false,
        false
      ],
      "setGregorianChange": [
        "float $timestamp",
        null,
        "bool",
        false,
        false
      ],
      "getGregorianChange": [
        "",
        null,
        "float",
        false,
        false
      ],
      "isLeapYear": [
        "int $year",
        null,
        "bool",
        false,
        false
      ]
    },
    "fieldCount": 24
  },
  "85": {
    "functions": {
      "intlcal_create_instance": [
        "IntlTimeZone|DateTimeZone|string|null $timezone = NULL, ?string $locale = NULL",
        "?IntlCalendar",
        null
      ],
      "intlcal_get_keyword_values_for_locale": [
        "string $keyword, string $locale, bool $onlyCommon",
        "IntlIterator|false",
        null
      ],
      "intlcal_get_now": [
        "",
        "float",
        null
      ],
      "intlcal_get_available_locales": [
        "",
        "array",
        null
      ],
      "intlcal_get": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_time": [
        "IntlCalendar $calendar",
        "float|false",
        null
      ],
      "intlcal_set_time": [
        "IntlCalendar $calendar, float $timestamp",
        "bool",
        null
      ],
      "intlcal_add": [
        "IntlCalendar $calendar, int $field, int $value",
        "bool",
        null
      ],
      "intlcal_set_time_zone": [
        "IntlCalendar $calendar, IntlTimeZone|DateTimeZone|string|null $timezone",
        "bool",
        null
      ],
      "intlcal_after": [
        "IntlCalendar $calendar, IntlCalendar $other",
        "bool",
        null
      ],
      "intlcal_before": [
        "IntlCalendar $calendar, IntlCalendar $other",
        "bool",
        null
      ],
      "intlcal_set": [
        "IntlCalendar $calendar, int $year, int $month, int $dayOfMonth = null, int $hour = null, int $minute = null, int $second = null",
        "true",
        null
      ],
      "intlcal_roll": [
        "IntlCalendar $calendar, int $field, $value",
        "bool",
        null
      ],
      "intlcal_clear": [
        "IntlCalendar $calendar, ?int $field = NULL",
        "true",
        null
      ],
      "intlcal_field_difference": [
        "IntlCalendar $calendar, float $timestamp, int $field",
        "int|false",
        null
      ],
      "intlcal_get_actual_maximum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_actual_minimum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_day_of_week_type": [
        "IntlCalendar $calendar, int $dayOfWeek",
        "int|false",
        null
      ],
      "intlcal_get_first_day_of_week": [
        "IntlCalendar $calendar",
        "int|false",
        null
      ],
      "intlcal_get_least_maximum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_greatest_minimum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_locale": [
        "IntlCalendar $calendar, int $type",
        "string|false",
        null
      ],
      "intlcal_get_maximum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_minimal_days_in_first_week": [
        "IntlCalendar $calendar",
        "int|false",
        null
      ],
      "intlcal_set_minimal_days_in_first_week": [
        "IntlCalendar $calendar, int $days",
        "true",
        null
      ],
      "intlcal_get_minimum": [
        "IntlCalendar $calendar, int $field",
        "int|false",
        null
      ],
      "intlcal_get_time_zone": [
        "IntlCalendar $calendar",
        "IntlTimeZone|false",
        null
      ],
      "intlcal_get_type": [
        "IntlCalendar $calendar",
        "string",
        null
      ],
      "intlcal_get_weekend_transition": [
        "IntlCalendar $calendar, int $dayOfWeek",
        "int|false",
        null
      ],
      "intlcal_in_daylight_time": [
        "IntlCalendar $calendar",
        "bool",
        null
      ],
      "intlcal_is_lenient": [
        "IntlCalendar $calendar",
        "bool",
        null
      ],
      "intlcal_is_set": [
        "IntlCalendar $calendar, int $field",
        "bool",
        null
      ],
      "intlcal_is_equivalent_to": [
        "IntlCalendar $calendar, IntlCalendar $other",
        "bool",
        null
      ],
      "intlcal_is_weekend": [
        "IntlCalendar $calendar, ?float $timestamp = NULL",
        "bool",
        null
      ],
      "intlcal_set_first_day_of_week": [
        "IntlCalendar $calendar, int $dayOfWeek",
        "true",
        null
      ],
      "intlcal_set_lenient": [
        "IntlCalendar $calendar, bool $lenient",
        "true",
        null
      ],
      "intlcal_get_repeated_wall_time_option": [
        "IntlCalendar $calendar",
        "int",
        null
      ],
      "intlcal_equals": [
        "IntlCalendar $calendar, IntlCalendar $other",
        "bool",
        null
      ],
      "intlcal_get_skipped_wall_time_option": [
        "IntlCalendar $calendar",
        "int",
        null
      ],
      "intlcal_set_repeated_wall_time_option": [
        "IntlCalendar $calendar, int $option",
        "true",
        null
      ],
      "intlcal_set_skipped_wall_time_option": [
        "IntlCalendar $calendar, int $option",
        "true",
        null
      ],
      "intlcal_from_date_time": [
        "DateTime|string $datetime, ?string $locale = NULL",
        "?IntlCalendar",
        null
      ],
      "intlcal_to_date_time": [
        "IntlCalendar $calendar",
        "DateTime|false",
        null
      ],
      "intlcal_get_error_code": [
        "IntlCalendar $calendar",
        "int|false",
        null
      ],
      "intlcal_get_error_message": [
        "IntlCalendar $calendar",
        "string|false",
        null
      ],
      "intlgregcal_create_instance": [
        "$timezoneOrYear = null, $localeOrMonth = null, $day = null, $hour = null, $minute = null, $second = null",
        "?IntlGregorianCalendar",
        null
      ],
      "intlgregcal_set_gregorian_change": [
        "IntlGregorianCalendar $calendar, float $timestamp",
        "bool",
        null
      ],
      "intlgregcal_get_gregorian_change": [
        "IntlGregorianCalendar $calendar",
        "float",
        null
      ],
      "intlgregcal_is_leap_year": [
        "IntlGregorianCalendar $calendar, int $year",
        "bool",
        null
      ]
    },
    "calendar": {
      "__construct": [
        "",
        null,
        null,
        false,
        true
      ],
      "createInstance": [
        "IntlTimeZone|DateTimeZone|string|null $timezone = NULL, ?string $locale = NULL",
        null,
        "?IntlCalendar",
        true,
        false
      ],
      "equals": [
        "IntlCalendar $other",
        null,
        "bool",
        false,
        false
      ],
      "fieldDifference": [
        "float $timestamp, int $field",
        null,
        "int|false",
        false,
        false
      ],
      "add": [
        "int $field, int $value",
        null,
        "bool",
        false,
        false
      ],
      "after": [
        "IntlCalendar $other",
        null,
        "bool",
        false,
        false
      ],
      "before": [
        "IntlCalendar $other",
        null,
        "bool",
        false,
        false
      ],
      "clear": [
        "?int $field = NULL",
        null,
        "true",
        false,
        false
      ],
      "fromDateTime": [
        "DateTime|string $datetime, ?string $locale = NULL",
        null,
        "?IntlCalendar",
        true,
        false
      ],
      "get": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getActualMaximum": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getActualMinimum": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getAvailableLocales": [
        "",
        null,
        "array",
        true,
        false
      ],
      "getDayOfWeekType": [
        "int $dayOfWeek",
        null,
        "int|false",
        false,
        false
      ],
      "getErrorCode": [
        "",
        null,
        "int|false",
        false,
        false
      ],
      "getErrorMessage": [
        "",
        null,
        "string|false",
        false,
        false
      ],
      "getFirstDayOfWeek": [
        "",
        null,
        "int|false",
        false,
        false
      ],
      "getGreatestMinimum": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getKeywordValuesForLocale": [
        "string $keyword, string $locale, bool $onlyCommon",
        null,
        "IntlIterator|false",
        true,
        false
      ],
      "getLeastMaximum": [
        "int $field",
        null,
        "int|false",
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
      "getMaximum": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getMinimalDaysInFirstWeek": [
        "",
        null,
        "int|false",
        false,
        false
      ],
      "setMinimalDaysInFirstWeek": [
        "int $days",
        null,
        "true",
        false,
        false
      ],
      "getMinimum": [
        "int $field",
        null,
        "int|false",
        false,
        false
      ],
      "getNow": [
        "",
        null,
        "float",
        true,
        false
      ],
      "getRepeatedWallTimeOption": [
        "",
        null,
        "int",
        false,
        false
      ],
      "getSkippedWallTimeOption": [
        "",
        null,
        "int",
        false,
        false
      ],
      "getTime": [
        "",
        null,
        "float|false",
        false,
        false
      ],
      "getTimeZone": [
        "",
        null,
        "IntlTimeZone|false",
        false,
        false
      ],
      "getType": [
        "",
        null,
        "string",
        false,
        false
      ],
      "getWeekendTransition": [
        "int $dayOfWeek",
        null,
        "int|false",
        false,
        false
      ],
      "inDaylightTime": [
        "",
        null,
        "bool",
        false,
        false
      ],
      "isEquivalentTo": [
        "IntlCalendar $other",
        null,
        "bool",
        false,
        false
      ],
      "isLenient": [
        "",
        null,
        "bool",
        false,
        false
      ],
      "isWeekend": [
        "?float $timestamp = NULL",
        null,
        "bool",
        false,
        false
      ],
      "roll": [
        "int $field, $value",
        null,
        "bool",
        false,
        false
      ],
      "isSet": [
        "int $field",
        null,
        "bool",
        false,
        false
      ],
      "set": [
        "int $year, int $month, int $dayOfMonth = null, int $hour = null, int $minute = null, int $second = null",
        null,
        "true",
        false,
        false
      ],
      "setDate": [
        "int $year, int $month, int $dayOfMonth",
        "void",
        null,
        false,
        false
      ],
      "setDateTime": [
        "int $year, int $month, int $dayOfMonth, int $hour, int $minute, ?int $second = NULL",
        "void",
        null,
        false,
        false
      ],
      "setFirstDayOfWeek": [
        "int $dayOfWeek",
        null,
        "true",
        false,
        false
      ],
      "setLenient": [
        "bool $lenient",
        null,
        "true",
        false,
        false
      ],
      "setRepeatedWallTimeOption": [
        "int $option",
        null,
        "true",
        false,
        false
      ],
      "setSkippedWallTimeOption": [
        "int $option",
        null,
        "true",
        false,
        false
      ],
      "setTime": [
        "float $timestamp",
        null,
        "bool",
        false,
        false
      ],
      "setTimeZone": [
        "IntlTimeZone|DateTimeZone|string|null $timezone",
        null,
        "bool",
        false,
        false
      ],
      "toDateTime": [
        "",
        null,
        "DateTime|false",
        false,
        false
      ]
    },
    "gregorian": {
      "createFromDate": [
        "int $year, int $month, int $dayOfMonth",
        "static",
        null,
        true,
        false
      ],
      "createFromDateTime": [
        "int $year, int $month, int $dayOfMonth, int $hour, int $minute, ?int $second = NULL",
        "static",
        null,
        true,
        false
      ],
      "__construct": [
        "$timezoneOrYear = null, $localeOrMonth = null, $day = null, $hour = null, $minute = null, $second = null",
        null,
        null,
        false,
        false
      ],
      "setGregorianChange": [
        "float $timestamp",
        null,
        "bool",
        false,
        false
      ],
      "getGregorianChange": [
        "",
        null,
        "float",
        false,
        false
      ],
      "isLeapYear": [
        "int $year",
        null,
        "bool",
        false,
        false
      ]
    },
    "fieldCount": 24
  }
} as const;
