// Names generated from JetBrains/phpstorm-stubs at e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, date/date.php.
// Parameter and constant snapshots from local PHP 7.2, 8.1, 8.2, and 8.5 reflection; Apache-2.0 names, see THIRD_PARTY_NOTICES.md.
export const DATE_FUNCTIONS = [
  "strtotime",
  "date",
  "idate",
  "gmdate",
  "mktime",
  "gmmktime",
  "checkdate",
  "strftime",
  "gmstrftime",
  "time",
  "localtime",
  "getdate",
  "date_create",
  "date_create_immutable",
  "date_create_immutable_from_format",
  "date_create_from_format",
  "date_parse",
  "date_parse_from_format",
  "date_get_last_errors",
  "date_format",
  "date_modify",
  "date_add",
  "date_sub",
  "date_timezone_get",
  "date_timezone_set",
  "date_offset_get",
  "date_diff",
  "date_time_set",
  "date_date_set",
  "date_isodate_set",
  "date_timestamp_set",
  "date_timestamp_get",
  "timezone_open",
  "timezone_name_get",
  "timezone_name_from_abbr",
  "timezone_offset_get",
  "timezone_transitions_get",
  "timezone_location_get",
  "timezone_identifiers_list",
  "timezone_abbreviations_list",
  "timezone_version_get",
  "date_interval_create_from_date_string",
  "date_interval_format",
  "date_default_timezone_set",
  "date_default_timezone_get",
  "date_sunrise",
  "date_sunset",
  "date_sun_info"
] as const;
export const DATE_SIGNATURES_PHP72 = {
  "strtotime": {
    "parameters": [
      {
        "name": "time",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "now",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date": {
    "parameters": [
      {
        "name": "format",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timestamp",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "idate": {
    "parameters": [
      {
        "name": "format",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timestamp",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "gmdate": {
    "parameters": [
      {
        "name": "format",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timestamp",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "mktime": {
    "parameters": [
      {
        "name": "hour",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "min",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "sec",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "mon",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "day",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "year",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "gmmktime": {
    "parameters": [
      {
        "name": "hour",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "min",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "sec",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "mon",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "day",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "year",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "checkdate": {
    "parameters": [
      {
        "name": "month",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "day",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "year",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "strftime": {
    "parameters": [
      {
        "name": "format",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timestamp",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "gmstrftime": {
    "parameters": [
      {
        "name": "format",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timestamp",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "time": {
    "parameters": [],
    "returnType": null
  },
  "localtime": {
    "parameters": [
      {
        "name": "timestamp",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "associative_array",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "getdate": {
    "parameters": [
      {
        "name": "timestamp",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_create": {
    "parameters": [
      {
        "name": "time",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timezone",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_create_immutable": {
    "parameters": [
      {
        "name": "time",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timezone",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_create_immutable_from_format": {
    "parameters": [
      {
        "name": "format",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "time",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "object",
        "type": "DateTimeZone",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_create_from_format": {
    "parameters": [
      {
        "name": "format",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "time",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "object",
        "type": "DateTimeZone",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_parse": {
    "parameters": [
      {
        "name": "date",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_parse_from_format": {
    "parameters": [
      {
        "name": "format",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "date",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_get_last_errors": {
    "parameters": [],
    "returnType": null
  },
  "date_format": {
    "parameters": [
      {
        "name": "object",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "format",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_modify": {
    "parameters": [
      {
        "name": "object",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "modify",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_add": {
    "parameters": [
      {
        "name": "object",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "interval",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_sub": {
    "parameters": [
      {
        "name": "object",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "interval",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_timezone_get": {
    "parameters": [
      {
        "name": "object",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_timezone_set": {
    "parameters": [
      {
        "name": "object",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timezone",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_offset_get": {
    "parameters": [
      {
        "name": "object",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_diff": {
    "parameters": [
      {
        "name": "object",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "object2",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "absolute",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_time_set": {
    "parameters": [
      {
        "name": "object",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "hour",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "minute",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "second",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "microseconds",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_date_set": {
    "parameters": [
      {
        "name": "object",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "year",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "month",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "day",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_isodate_set": {
    "parameters": [
      {
        "name": "object",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "year",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "week",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "day",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_timestamp_set": {
    "parameters": [
      {
        "name": "object",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "unixtimestamp",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_timestamp_get": {
    "parameters": [
      {
        "name": "object",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "timezone_open": {
    "parameters": [
      {
        "name": "timezone",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "timezone_name_get": {
    "parameters": [
      {
        "name": "object",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "timezone_name_from_abbr": {
    "parameters": [
      {
        "name": "abbr",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "gmtoffset",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "isdst",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "timezone_offset_get": {
    "parameters": [
      {
        "name": "object",
        "type": "DateTimeZone",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "datetime",
        "type": "DateTimeInterface",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "timezone_transitions_get": {
    "parameters": [
      {
        "name": "object",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timestamp_begin",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timestamp_end",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "timezone_location_get": {
    "parameters": [
      {
        "name": "object",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "timezone_identifiers_list": {
    "parameters": [
      {
        "name": "what",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "country",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "timezone_abbreviations_list": {
    "parameters": [],
    "returnType": null
  },
  "timezone_version_get": {
    "parameters": [],
    "returnType": null
  },
  "date_interval_create_from_date_string": {
    "parameters": [
      {
        "name": "time",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_interval_format": {
    "parameters": [
      {
        "name": "object",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "format",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_default_timezone_set": {
    "parameters": [
      {
        "name": "timezone_identifier",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_default_timezone_get": {
    "parameters": [],
    "returnType": null
  },
  "date_sunrise": {
    "parameters": [
      {
        "name": "time",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "format",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "latitude",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "longitude",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "zenith",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "gmt_offset",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_sunset": {
    "parameters": [
      {
        "name": "time",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "format",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "latitude",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "longitude",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "zenith",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "gmt_offset",
        "type": null,
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  },
  "date_sun_info": {
    "parameters": [
      {
        "name": "time",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "latitude",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "longitude",
        "type": null,
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": null
  }
} as const;
export const DATE_SIGNATURES_PHP81 = {
  "strtotime": {
    "parameters": [
      {
        "name": "datetime",
        "type": "string",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "baseTimestamp",
        "type": "?int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      }
    ],
    "returnType": "int|false"
  },
  "date": {
    "parameters": [
      {
        "name": "format",
        "type": "string",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timestamp",
        "type": "?int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      }
    ],
    "returnType": "string"
  },
  "idate": {
    "parameters": [
      {
        "name": "format",
        "type": "string",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timestamp",
        "type": "?int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      }
    ],
    "returnType": "int|false"
  },
  "gmdate": {
    "parameters": [
      {
        "name": "format",
        "type": "string",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timestamp",
        "type": "?int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      }
    ],
    "returnType": "string"
  },
  "mktime": {
    "parameters": [
      {
        "name": "hour",
        "type": "int",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "minute",
        "type": "?int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      },
      {
        "name": "second",
        "type": "?int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      },
      {
        "name": "month",
        "type": "?int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      },
      {
        "name": "day",
        "type": "?int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      },
      {
        "name": "year",
        "type": "?int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      }
    ],
    "returnType": "int|false"
  },
  "gmmktime": {
    "parameters": [
      {
        "name": "hour",
        "type": "int",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "minute",
        "type": "?int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      },
      {
        "name": "second",
        "type": "?int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      },
      {
        "name": "month",
        "type": "?int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      },
      {
        "name": "day",
        "type": "?int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      },
      {
        "name": "year",
        "type": "?int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      }
    ],
    "returnType": "int|false"
  },
  "checkdate": {
    "parameters": [
      {
        "name": "month",
        "type": "int",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "day",
        "type": "int",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "year",
        "type": "int",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "bool"
  },
  "strftime": {
    "parameters": [
      {
        "name": "format",
        "type": "string",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timestamp",
        "type": "?int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      }
    ],
    "returnType": "string|false"
  },
  "gmstrftime": {
    "parameters": [
      {
        "name": "format",
        "type": "string",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timestamp",
        "type": "?int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      }
    ],
    "returnType": "string|false"
  },
  "time": {
    "parameters": [],
    "returnType": "int"
  },
  "localtime": {
    "parameters": [
      {
        "name": "timestamp",
        "type": "?int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      },
      {
        "name": "associative",
        "type": "bool",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": false
        }
      }
    ],
    "returnType": "array"
  },
  "getdate": {
    "parameters": [
      {
        "name": "timestamp",
        "type": "?int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      }
    ],
    "returnType": "array"
  },
  "date_create": {
    "parameters": [
      {
        "name": "datetime",
        "type": "string",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": "now"
        }
      },
      {
        "name": "timezone",
        "type": "?DateTimeZone",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      }
    ],
    "returnType": "DateTime|false"
  },
  "date_create_immutable": {
    "parameters": [
      {
        "name": "datetime",
        "type": "string",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": "now"
        }
      },
      {
        "name": "timezone",
        "type": "?DateTimeZone",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      }
    ],
    "returnType": "DateTimeImmutable|false"
  },
  "date_create_immutable_from_format": {
    "parameters": [
      {
        "name": "format",
        "type": "string",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "datetime",
        "type": "string",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timezone",
        "type": "?DateTimeZone",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      }
    ],
    "returnType": "DateTimeImmutable|false"
  },
  "date_create_from_format": {
    "parameters": [
      {
        "name": "format",
        "type": "string",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "datetime",
        "type": "string",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timezone",
        "type": "?DateTimeZone",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      }
    ],
    "returnType": "DateTime|false"
  },
  "date_parse": {
    "parameters": [
      {
        "name": "datetime",
        "type": "string",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "array"
  },
  "date_parse_from_format": {
    "parameters": [
      {
        "name": "format",
        "type": "string",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "datetime",
        "type": "string",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "array"
  },
  "date_get_last_errors": {
    "parameters": [],
    "returnType": "array|false"
  },
  "date_format": {
    "parameters": [
      {
        "name": "object",
        "type": "DateTimeInterface",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "format",
        "type": "string",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "string"
  },
  "date_modify": {
    "parameters": [
      {
        "name": "object",
        "type": "DateTime",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "modifier",
        "type": "string",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "DateTime|false"
  },
  "date_add": {
    "parameters": [
      {
        "name": "object",
        "type": "DateTime",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "interval",
        "type": "DateInterval",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "DateTime"
  },
  "date_sub": {
    "parameters": [
      {
        "name": "object",
        "type": "DateTime",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "interval",
        "type": "DateInterval",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "DateTime"
  },
  "date_timezone_get": {
    "parameters": [
      {
        "name": "object",
        "type": "DateTimeInterface",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "DateTimeZone|false"
  },
  "date_timezone_set": {
    "parameters": [
      {
        "name": "object",
        "type": "DateTime",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timezone",
        "type": "DateTimeZone",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "DateTime"
  },
  "date_offset_get": {
    "parameters": [
      {
        "name": "object",
        "type": "DateTimeInterface",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "int"
  },
  "date_diff": {
    "parameters": [
      {
        "name": "baseObject",
        "type": "DateTimeInterface",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "targetObject",
        "type": "DateTimeInterface",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "absolute",
        "type": "bool",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": false
        }
      }
    ],
    "returnType": "DateInterval"
  },
  "date_time_set": {
    "parameters": [
      {
        "name": "object",
        "type": "DateTime",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "hour",
        "type": "int",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "minute",
        "type": "int",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "second",
        "type": "int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": 0
        }
      },
      {
        "name": "microsecond",
        "type": "int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": 0
        }
      }
    ],
    "returnType": "DateTime"
  },
  "date_date_set": {
    "parameters": [
      {
        "name": "object",
        "type": "DateTime",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "year",
        "type": "int",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "month",
        "type": "int",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "day",
        "type": "int",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "DateTime"
  },
  "date_isodate_set": {
    "parameters": [
      {
        "name": "object",
        "type": "DateTime",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "year",
        "type": "int",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "week",
        "type": "int",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "dayOfWeek",
        "type": "int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": 1
        }
      }
    ],
    "returnType": "DateTime"
  },
  "date_timestamp_set": {
    "parameters": [
      {
        "name": "object",
        "type": "DateTime",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timestamp",
        "type": "int",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "DateTime"
  },
  "date_timestamp_get": {
    "parameters": [
      {
        "name": "object",
        "type": "DateTimeInterface",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "int"
  },
  "timezone_open": {
    "parameters": [
      {
        "name": "timezone",
        "type": "string",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "DateTimeZone|false"
  },
  "timezone_name_get": {
    "parameters": [
      {
        "name": "object",
        "type": "DateTimeZone",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "string"
  },
  "timezone_name_from_abbr": {
    "parameters": [
      {
        "name": "abbr",
        "type": "string",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "utcOffset",
        "type": "int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": -1
        }
      },
      {
        "name": "isDST",
        "type": "int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": -1
        }
      }
    ],
    "returnType": "string|false"
  },
  "timezone_offset_get": {
    "parameters": [
      {
        "name": "object",
        "type": "DateTimeZone",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "datetime",
        "type": "DateTimeInterface",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "int"
  },
  "timezone_transitions_get": {
    "parameters": [
      {
        "name": "object",
        "type": "DateTimeZone",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timestampBegin",
        "type": "int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "constant": "PHP_INT_MIN"
        }
      },
      {
        "name": "timestampEnd",
        "type": "int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "constant": "PHP_INT_MAX"
        }
      }
    ],
    "returnType": "array|false"
  },
  "timezone_location_get": {
    "parameters": [
      {
        "name": "object",
        "type": "DateTimeZone",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "array|false"
  },
  "timezone_identifiers_list": {
    "parameters": [
      {
        "name": "timezoneGroup",
        "type": "int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "constant": "DateTimeZone::ALL"
        }
      },
      {
        "name": "countryCode",
        "type": "?string",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      }
    ],
    "returnType": "array"
  },
  "timezone_abbreviations_list": {
    "parameters": [],
    "returnType": "array"
  },
  "timezone_version_get": {
    "parameters": [],
    "returnType": "string"
  },
  "date_interval_create_from_date_string": {
    "parameters": [
      {
        "name": "datetime",
        "type": "string",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "DateInterval|false"
  },
  "date_interval_format": {
    "parameters": [
      {
        "name": "object",
        "type": "DateInterval",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "format",
        "type": "string",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "string"
  },
  "date_default_timezone_set": {
    "parameters": [
      {
        "name": "timezoneId",
        "type": "string",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "bool"
  },
  "date_default_timezone_get": {
    "parameters": [],
    "returnType": "string"
  },
  "date_sunrise": {
    "parameters": [
      {
        "name": "timestamp",
        "type": "int",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "returnFormat",
        "type": "int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "constant": "SUNFUNCS_RET_STRING"
        }
      },
      {
        "name": "latitude",
        "type": "?float",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      },
      {
        "name": "longitude",
        "type": "?float",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      },
      {
        "name": "zenith",
        "type": "?float",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      },
      {
        "name": "utcOffset",
        "type": "?float",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      }
    ],
    "returnType": "string|int|float|false"
  },
  "date_sunset": {
    "parameters": [
      {
        "name": "timestamp",
        "type": "int",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "returnFormat",
        "type": "int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "constant": "SUNFUNCS_RET_STRING"
        }
      },
      {
        "name": "latitude",
        "type": "?float",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      },
      {
        "name": "longitude",
        "type": "?float",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      },
      {
        "name": "zenith",
        "type": "?float",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      },
      {
        "name": "utcOffset",
        "type": "?float",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": null
        }
      }
    ],
    "returnType": "string|int|float|false"
  },
  "date_sun_info": {
    "parameters": [
      {
        "name": "timestamp",
        "type": "int",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "latitude",
        "type": "float",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "longitude",
        "type": "float",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      }
    ],
    "returnType": "array"
  }
} as const;
export const DATE_SIGNATURES_PHP85_OVERRIDES = {
  "timezone_transitions_get": {
    "parameters": [
      {
        "name": "object",
        "type": "DateTimeZone",
        "optional": false,
        "byRef": false,
        "variadic": false,
        "default": null
      },
      {
        "name": "timestampBegin",
        "type": "int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "constant": "PHP_INT_MIN"
        }
      },
      {
        "name": "timestampEnd",
        "type": "int",
        "optional": true,
        "byRef": false,
        "variadic": false,
        "default": {
          "value": 2147483647
        }
      }
    ],
    "returnType": "array|false"
  }
} as const;
export const DATE_CONSTANTS_PHP72 = {
  "DATE_ATOM": "Y-m-d\\TH:i:sP",
  "DATE_COOKIE": "l, d-M-Y H:i:s T",
  "DATE_ISO8601": "Y-m-d\\TH:i:sO",
  "DATE_RFC822": "D, d M y H:i:s O",
  "DATE_RFC850": "l, d-M-y H:i:s T",
  "DATE_RFC1036": "D, d M y H:i:s O",
  "DATE_RFC1123": "D, d M Y H:i:s O",
  "DATE_RFC7231": "D, d M Y H:i:s \\G\\M\\T",
  "DATE_RFC2822": "D, d M Y H:i:s O",
  "DATE_RFC3339": "Y-m-d\\TH:i:sP",
  "DATE_RFC3339_EXTENDED": "Y-m-d\\TH:i:s.vP",
  "DATE_RSS": "D, d M Y H:i:s O",
  "DATE_W3C": "Y-m-d\\TH:i:sP",
  "SUNFUNCS_RET_TIMESTAMP": 0,
  "SUNFUNCS_RET_STRING": 1,
  "SUNFUNCS_RET_DOUBLE": 2
} as const;
export const DATE_CONSTANTS_PHP82_ADDED = {
  "DATE_ISO8601_EXPANDED": "X-m-d\\TH:i:sP"
} as const;
