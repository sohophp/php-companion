// Names from JetBrains/phpstorm-stubs e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, pgsql/.
// PHP 8.1/8.2/8.4/8.5 signatures and constants checked against local reflection.
// Apache-2.0; see THIRD_PARTY_NOTICES.md.
export const PGSQL_FUNCTION_NAMES = ["pg_affected_rows","pg_cancel_query","pg_change_password","pg_client_encoding","pg_clientencoding","pg_close","pg_close_stmt","pg_cmdtuples","pg_connect","pg_connect_poll","pg_connection_busy","pg_connection_reset","pg_connection_status","pg_consume_input","pg_convert","pg_copy_from","pg_copy_to","pg_dbname","pg_delete","pg_end_copy","pg_enter_pipeline_mode","pg_errormessage","pg_escape_bytea","pg_escape_identifier","pg_escape_literal","pg_escape_string","pg_exec","pg_execute","pg_exit_pipeline_mode","pg_fetch_all","pg_fetch_all_columns","pg_fetch_array","pg_fetch_assoc","pg_fetch_object","pg_fetch_result","pg_fetch_row","pg_field_is_null","pg_field_name","pg_field_num","pg_field_prtlen","pg_field_size","pg_field_table","pg_field_type","pg_field_type_oid","pg_fieldisnull","pg_fieldname","pg_fieldnum","pg_fieldprtlen","pg_fieldsize","pg_fieldtype","pg_flush","pg_free_result","pg_freeresult","pg_get_notify","pg_get_pid","pg_get_result","pg_getlastoid","pg_host","pg_insert","pg_jit","pg_last_error","pg_last_notice","pg_last_oid","pg_lo_close","pg_lo_create","pg_lo_export","pg_lo_import","pg_lo_open","pg_lo_read","pg_lo_read_all","pg_lo_seek","pg_lo_tell","pg_lo_truncate","pg_lo_unlink","pg_lo_write","pg_loclose","pg_locreate","pg_loexport","pg_loimport","pg_loopen","pg_loread","pg_loreadall","pg_lounlink","pg_lowrite","pg_meta_data","pg_num_fields","pg_num_rows","pg_numfields","pg_numrows","pg_options","pg_parameter_status","pg_pconnect","pg_ping","pg_pipeline_status","pg_pipeline_sync","pg_port","pg_prepare","pg_put_copy_data","pg_put_copy_end","pg_put_line","pg_query","pg_query_params","pg_result","pg_result_error","pg_result_error_field","pg_result_memory_size","pg_result_seek","pg_result_status","pg_select","pg_send_execute","pg_send_prepare","pg_send_query","pg_send_query_params","pg_set_chunked_rows_size","pg_set_client_encoding","pg_set_error_context_visibility","pg_set_error_verbosity","pg_setclientencoding","pg_socket","pg_socket_poll","pg_trace","pg_transaction_status","pg_tty","pg_unescape_bytea","pg_untrace","pg_update","pg_version"] as const;
export const PGSQL_CONSTANT_NAMES = ["PGSQL_ASSOC","PGSQL_BAD_RESPONSE","PGSQL_BOTH","PGSQL_COMMAND_OK","PGSQL_CONNECTION_AUTH_OK","PGSQL_CONNECTION_AWAITING_RESPONSE","PGSQL_CONNECTION_BAD","PGSQL_CONNECTION_MADE","PGSQL_CONNECTION_OK","PGSQL_CONNECTION_SETENV","PGSQL_CONNECTION_SSL_STARTUP","PGSQL_CONNECTION_STARTED","PGSQL_CONNECT_ASYNC","PGSQL_CONNECT_FORCE_NEW","PGSQL_CONV_FORCE_NULL","PGSQL_CONV_IGNORE_DEFAULT","PGSQL_CONV_IGNORE_NOT_NULL","PGSQL_COPY_IN","PGSQL_COPY_OUT","PGSQL_DIAG_COLUMN_NAME","PGSQL_DIAG_CONSTRAINT_NAME","PGSQL_DIAG_CONTEXT","PGSQL_DIAG_DATATYPE_NAME","PGSQL_DIAG_INTERNAL_POSITION","PGSQL_DIAG_INTERNAL_QUERY","PGSQL_DIAG_MESSAGE_DETAIL","PGSQL_DIAG_MESSAGE_HINT","PGSQL_DIAG_MESSAGE_PRIMARY","PGSQL_DIAG_SCHEMA_NAME","PGSQL_DIAG_SEVERITY","PGSQL_DIAG_SEVERITY_NONLOCALIZED","PGSQL_DIAG_SOURCE_FILE","PGSQL_DIAG_SOURCE_FUNCTION","PGSQL_DIAG_SOURCE_LINE","PGSQL_DIAG_SQLSTATE","PGSQL_DIAG_STATEMENT_POSITION","PGSQL_DIAG_TABLE_NAME","PGSQL_DML_ASYNC","PGSQL_DML_ESCAPE","PGSQL_DML_EXEC","PGSQL_DML_NO_CONV","PGSQL_DML_STRING","PGSQL_EMPTY_QUERY","PGSQL_ERRORS_DEFAULT","PGSQL_ERRORS_SQLSTATE","PGSQL_ERRORS_TERSE","PGSQL_ERRORS_VERBOSE","PGSQL_FATAL_ERROR","PGSQL_LIBPQ_VERSION","PGSQL_LIBPQ_VERSION_STR","PGSQL_NONFATAL_ERROR","PGSQL_NOTICE_ALL","PGSQL_NOTICE_CLEAR","PGSQL_NOTICE_LAST","PGSQL_NUM","PGSQL_PIPELINE_ABORTED","PGSQL_PIPELINE_OFF","PGSQL_PIPELINE_ON","PGSQL_PIPELINE_SYNC","PGSQL_POLLING_ACTIVE","PGSQL_POLLING_FAILED","PGSQL_POLLING_OK","PGSQL_POLLING_READING","PGSQL_POLLING_WRITING","PGSQL_SEEK_CUR","PGSQL_SEEK_END","PGSQL_SEEK_SET","PGSQL_SHOW_CONTEXT_ALWAYS","PGSQL_SHOW_CONTEXT_ERRORS","PGSQL_SHOW_CONTEXT_NEVER","PGSQL_STATUS_LONG","PGSQL_STATUS_STRING","PGSQL_TRACE_REGRESS_MODE","PGSQL_TRACE_SUPPRESS_TIMESTAMPS","PGSQL_TRANSACTION_ACTIVE","PGSQL_TRANSACTION_IDLE","PGSQL_TRANSACTION_INERROR","PGSQL_TRANSACTION_INTRANS","PGSQL_TRANSACTION_UNKNOWN","PGSQL_TUPLES_CHUNK","PGSQL_TUPLES_OK"] as const;
export const PGSQL_SIGNATURE_SNAPSHOTS = {
  "801": {
    "pg_affected_rows": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_cancel_query": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_client_encoding": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_clientencoding": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_close": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_cmdtuples": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_connect": {
      "parameters": [
        {
          "name": "connection_string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Connection|false"
    },
    "pg_connect_poll": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_connection_busy": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_connection_reset": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_connection_status": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_consume_input": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_convert": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "values",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "array|false"
    },
    "pg_copy_from": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "rows",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "separator",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "\t",
          "defaultConstant": null
        },
        {
          "name": "null_as",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "\\\\N",
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_copy_to": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "separator",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "\t",
          "defaultConstant": null
        },
        {
          "name": "null_as",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "\\\\N",
          "defaultConstant": null
        }
      ],
      "return": "array|false"
    },
    "pg_dbname": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_delete": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "conditions",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 512,
          "defaultConstant": "PGSQL_DML_EXEC"
        }
      ],
      "return": "string|bool"
    },
    "pg_end_copy": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_errormessage": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_escape_bytea": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_escape_identifier": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_escape_literal": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_escape_string": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_exec": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_execute": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "statement_name",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "params",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_fetch_all": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "PGSQL_ASSOC"
        }
      ],
      "return": "array"
    },
    "pg_fetch_all_columns": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "array"
    },
    "pg_fetch_array": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 3,
          "defaultConstant": "PGSQL_BOTH"
        }
      ],
      "return": "array|false"
    },
    "pg_fetch_assoc": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "array|false"
    },
    "pg_fetch_object": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "class",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "stdClass",
          "defaultConstant": null
        },
        {
          "name": "constructor_args",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "object|false"
    },
    "pg_fetch_result": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false|null"
    },
    "pg_fetch_row": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 2,
          "defaultConstant": "PGSQL_NUM"
        }
      ],
      "return": "array|false"
    },
    "pg_field_is_null": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_field_name": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_field_num": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_field_prtlen": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_field_size": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_field_table": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid_only",
          "type": "bool",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": false,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_field_type": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_field_type_oid": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int"
    },
    "pg_fieldisnull": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_fieldname": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_fieldnum": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_fieldprtlen": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_fieldsize": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_fieldtype": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_flush": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|bool"
    },
    "pg_free_result": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_freeresult": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_get_notify": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "PGSQL_ASSOC"
        }
      ],
      "return": "array|false"
    },
    "pg_get_pid": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_get_result": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_getlastoid": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_host": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_insert": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "values",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 512,
          "defaultConstant": "PGSQL_DML_EXEC"
        }
      ],
      "return": "PgSql\\Result|string|bool"
    },
    "pg_last_error": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_last_notice": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "PGSQL_NOTICE_LAST"
        }
      ],
      "return": "array|string|bool"
    },
    "pg_last_oid": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_lo_close": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_lo_create": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_lo_export": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "filename",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_lo_import": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "filename",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_lo_open": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Lob|false"
    },
    "pg_lo_read": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "length",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 8192,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_lo_read_all": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_lo_seek": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "offset",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "whence",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "SEEK_CUR"
        }
      ],
      "return": "bool"
    },
    "pg_lo_tell": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_lo_truncate": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "size",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_lo_unlink": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_lo_write": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "data",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "length",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_loclose": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_locreate": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_loexport": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "filename",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_loimport": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "filename",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_loopen": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Lob|false"
    },
    "pg_loread": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "length",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 8192,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_loreadall": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_lounlink": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_lowrite": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "data",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "length",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_meta_data": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "extended",
          "type": "bool",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": false,
          "defaultConstant": null
        }
      ],
      "return": "array|false"
    },
    "pg_num_fields": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_num_rows": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_numfields": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_numrows": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_options": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_parameter_status": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_pconnect": {
      "parameters": [
        {
          "name": "connection_string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Connection|false"
    },
    "pg_ping": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_port": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_prepare": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "statement_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_put_line": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_query": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_query_params": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "params",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_result": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false|null"
    },
    "pg_result_error": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_result_error_field": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field_code",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false|null"
    },
    "pg_result_seek": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_result_status": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "PGSQL_STATUS_LONG"
        }
      ],
      "return": "string|int"
    },
    "pg_select": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "conditions",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 512,
          "defaultConstant": "PGSQL_DML_EXEC"
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "PGSQL_ASSOC"
        }
      ],
      "return": "array|string|false"
    },
    "pg_send_execute": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "statement_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "params",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|bool"
    },
    "pg_send_prepare": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "statement_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|bool"
    },
    "pg_send_query": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|bool"
    },
    "pg_send_query_params": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "params",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|bool"
    },
    "pg_set_client_encoding": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "encoding",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_set_error_verbosity": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "verbosity",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_setclientencoding": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "encoding",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_socket": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pg_trace": {
      "parameters": [
        {
          "name": "filename",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "w",
          "defaultConstant": null
        },
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_transaction_status": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_tty": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_unescape_bytea": {
      "parameters": [
        {
          "name": "string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_untrace": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_update": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "values",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "conditions",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 512,
          "defaultConstant": "PGSQL_DML_EXEC"
        }
      ],
      "return": "string|bool"
    },
    "pg_version": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "array"
    }
  },
  "802": {
    "pg_affected_rows": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_cancel_query": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_client_encoding": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_clientencoding": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_close": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_cmdtuples": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_connect": {
      "parameters": [
        {
          "name": "connection_string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Connection|false"
    },
    "pg_connect_poll": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_connection_busy": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_connection_reset": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_connection_status": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_consume_input": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_convert": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "values",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "array|false"
    },
    "pg_copy_from": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "rows",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "separator",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "\t",
          "defaultConstant": null
        },
        {
          "name": "null_as",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "\\\\N",
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_copy_to": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "separator",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "\t",
          "defaultConstant": null
        },
        {
          "name": "null_as",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "\\\\N",
          "defaultConstant": null
        }
      ],
      "return": "array|false"
    },
    "pg_dbname": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_delete": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "conditions",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 512,
          "defaultConstant": "PGSQL_DML_EXEC"
        }
      ],
      "return": "string|bool"
    },
    "pg_end_copy": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_errormessage": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_escape_bytea": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_escape_identifier": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_escape_literal": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_escape_string": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_exec": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_execute": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "statement_name",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "params",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_fetch_all": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "PGSQL_ASSOC"
        }
      ],
      "return": "array"
    },
    "pg_fetch_all_columns": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "array"
    },
    "pg_fetch_array": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 3,
          "defaultConstant": "PGSQL_BOTH"
        }
      ],
      "return": "array|false"
    },
    "pg_fetch_assoc": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "array|false"
    },
    "pg_fetch_object": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "class",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "stdClass",
          "defaultConstant": null
        },
        {
          "name": "constructor_args",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "object|false"
    },
    "pg_fetch_result": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false|null"
    },
    "pg_fetch_row": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 2,
          "defaultConstant": "PGSQL_NUM"
        }
      ],
      "return": "array|false"
    },
    "pg_field_is_null": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_field_name": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_field_num": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_field_prtlen": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_field_size": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_field_table": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid_only",
          "type": "bool",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": false,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_field_type": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_field_type_oid": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int"
    },
    "pg_fieldisnull": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_fieldname": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_fieldnum": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_fieldprtlen": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_fieldsize": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_fieldtype": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_flush": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|bool"
    },
    "pg_free_result": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_freeresult": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_get_notify": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "PGSQL_ASSOC"
        }
      ],
      "return": "array|false"
    },
    "pg_get_pid": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_get_result": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_getlastoid": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_host": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_insert": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "values",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 512,
          "defaultConstant": "PGSQL_DML_EXEC"
        }
      ],
      "return": "PgSql\\Result|string|bool"
    },
    "pg_last_error": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_last_notice": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "PGSQL_NOTICE_LAST"
        }
      ],
      "return": "array|string|bool"
    },
    "pg_last_oid": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_lo_close": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_lo_create": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_lo_export": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "filename",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_lo_import": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "filename",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_lo_open": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Lob|false"
    },
    "pg_lo_read": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "length",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 8192,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_lo_read_all": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_lo_seek": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "offset",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "whence",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "SEEK_CUR"
        }
      ],
      "return": "bool"
    },
    "pg_lo_tell": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_lo_truncate": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "size",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_lo_unlink": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_lo_write": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "data",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "length",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_loclose": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_locreate": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_loexport": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "filename",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_loimport": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "filename",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_loopen": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Lob|false"
    },
    "pg_loread": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "length",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 8192,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_loreadall": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_lounlink": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_lowrite": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "data",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "length",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_meta_data": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "extended",
          "type": "bool",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": false,
          "defaultConstant": null
        }
      ],
      "return": "array|false"
    },
    "pg_num_fields": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_num_rows": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_numfields": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_numrows": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_options": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_parameter_status": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_pconnect": {
      "parameters": [
        {
          "name": "connection_string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Connection|false"
    },
    "pg_ping": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_port": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_prepare": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "statement_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_put_line": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_query": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_query_params": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "params",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_result": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false|null"
    },
    "pg_result_error": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_result_error_field": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field_code",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false|null"
    },
    "pg_result_seek": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_result_status": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "PGSQL_STATUS_LONG"
        }
      ],
      "return": "string|int"
    },
    "pg_select": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "conditions",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 512,
          "defaultConstant": "PGSQL_DML_EXEC"
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "PGSQL_ASSOC"
        }
      ],
      "return": "array|string|false"
    },
    "pg_send_execute": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "statement_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "params",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|bool"
    },
    "pg_send_prepare": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "statement_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|bool"
    },
    "pg_send_query": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|bool"
    },
    "pg_send_query_params": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "params",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|bool"
    },
    "pg_set_client_encoding": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "encoding",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_set_error_verbosity": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "verbosity",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_setclientencoding": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "encoding",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_socket": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pg_trace": {
      "parameters": [
        {
          "name": "filename",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "w",
          "defaultConstant": null
        },
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_transaction_status": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_tty": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_unescape_bytea": {
      "parameters": [
        {
          "name": "string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_untrace": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_update": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "values",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "conditions",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 512,
          "defaultConstant": "PGSQL_DML_EXEC"
        }
      ],
      "return": "string|bool"
    },
    "pg_version": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "array"
    }
  },
  "804": {
    "pg_affected_rows": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_cancel_query": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_change_password": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "user",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "password",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_client_encoding": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_clientencoding": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_close": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "true"
    },
    "pg_cmdtuples": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_connect": {
      "parameters": [
        {
          "name": "connection_string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Connection|false"
    },
    "pg_connect_poll": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_connection_busy": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_connection_reset": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_connection_status": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_consume_input": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_convert": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "values",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "array|false"
    },
    "pg_copy_from": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "rows",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "separator",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "\t",
          "defaultConstant": null
        },
        {
          "name": "null_as",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "\\\\N",
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_copy_to": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "separator",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "\t",
          "defaultConstant": null
        },
        {
          "name": "null_as",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "\\\\N",
          "defaultConstant": null
        }
      ],
      "return": "array|false"
    },
    "pg_dbname": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_delete": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "conditions",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 512,
          "defaultConstant": "PGSQL_DML_EXEC"
        }
      ],
      "return": "string|bool"
    },
    "pg_end_copy": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_errormessage": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_escape_bytea": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_escape_identifier": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_escape_literal": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_escape_string": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_exec": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_execute": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "statement_name",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "params",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_fetch_all": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "PGSQL_ASSOC"
        }
      ],
      "return": "array"
    },
    "pg_fetch_all_columns": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "array"
    },
    "pg_fetch_array": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 3,
          "defaultConstant": "PGSQL_BOTH"
        }
      ],
      "return": "array|false"
    },
    "pg_fetch_assoc": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "array|false"
    },
    "pg_fetch_object": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "class",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "stdClass",
          "defaultConstant": null
        },
        {
          "name": "constructor_args",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "object|false"
    },
    "pg_fetch_result": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false|null"
    },
    "pg_fetch_row": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 2,
          "defaultConstant": "PGSQL_NUM"
        }
      ],
      "return": "array|false"
    },
    "pg_field_is_null": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_field_name": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_field_num": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_field_prtlen": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_field_size": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_field_table": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid_only",
          "type": "bool",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": false,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_field_type": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_field_type_oid": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int"
    },
    "pg_fieldisnull": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_fieldname": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_fieldnum": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_fieldprtlen": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_fieldsize": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_fieldtype": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_flush": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|bool"
    },
    "pg_free_result": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_freeresult": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_get_notify": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "PGSQL_ASSOC"
        }
      ],
      "return": "array|false"
    },
    "pg_get_pid": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_get_result": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_getlastoid": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_host": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_insert": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "values",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 512,
          "defaultConstant": "PGSQL_DML_EXEC"
        }
      ],
      "return": "PgSql\\Result|string|bool"
    },
    "pg_jit": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "array"
    },
    "pg_last_error": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_last_notice": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "PGSQL_NOTICE_LAST"
        }
      ],
      "return": "array|string|bool"
    },
    "pg_last_oid": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_lo_close": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_lo_create": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_lo_export": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "filename",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_lo_import": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "filename",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_lo_open": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Lob|false"
    },
    "pg_lo_read": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "length",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 8192,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_lo_read_all": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_lo_seek": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "offset",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "whence",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "SEEK_CUR"
        }
      ],
      "return": "bool"
    },
    "pg_lo_tell": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_lo_truncate": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "size",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_lo_unlink": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_lo_write": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "data",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "length",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_loclose": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_locreate": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_loexport": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "filename",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_loimport": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "filename",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_loopen": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Lob|false"
    },
    "pg_loread": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "length",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 8192,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_loreadall": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_lounlink": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_lowrite": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "data",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "length",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_meta_data": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "extended",
          "type": "bool",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": false,
          "defaultConstant": null
        }
      ],
      "return": "array|false"
    },
    "pg_num_fields": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_num_rows": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_numfields": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_numrows": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_options": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_parameter_status": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_pconnect": {
      "parameters": [
        {
          "name": "connection_string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Connection|false"
    },
    "pg_ping": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_port": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_prepare": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "statement_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_put_copy_data": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "cmd",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_put_copy_end": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "error",
          "type": "?string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_put_line": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_query": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_query_params": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "params",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_result": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false|null"
    },
    "pg_result_error": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_result_error_field": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field_code",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false|null"
    },
    "pg_result_memory_size": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_result_seek": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_result_status": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "PGSQL_STATUS_LONG"
        }
      ],
      "return": "string|int"
    },
    "pg_select": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "conditions",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 512,
          "defaultConstant": "PGSQL_DML_EXEC"
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "PGSQL_ASSOC"
        }
      ],
      "return": "array|string|false"
    },
    "pg_send_execute": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "statement_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "params",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|bool"
    },
    "pg_send_prepare": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "statement_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|bool"
    },
    "pg_send_query": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|bool"
    },
    "pg_send_query_params": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "params",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|bool"
    },
    "pg_set_client_encoding": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "encoding",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_set_error_context_visibility": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "visibility",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_set_error_verbosity": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "verbosity",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_setclientencoding": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "encoding",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_socket": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pg_socket_poll": {
      "parameters": [
        {
          "name": "socket",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "read",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "write",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "timeout",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": -1,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_trace": {
      "parameters": [
        {
          "name": "filename",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "w",
          "defaultConstant": null
        },
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "trace_mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_transaction_status": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_tty": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_unescape_bytea": {
      "parameters": [
        {
          "name": "string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_untrace": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "true"
    },
    "pg_update": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "values",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "conditions",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 512,
          "defaultConstant": "PGSQL_DML_EXEC"
        }
      ],
      "return": "string|bool"
    },
    "pg_version": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "array"
    }
  },
  "805": {
    "pg_affected_rows": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_cancel_query": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_change_password": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "user",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "password",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_client_encoding": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_clientencoding": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_close": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "true"
    },
    "pg_cmdtuples": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_connect": {
      "parameters": [
        {
          "name": "connection_string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Connection|false"
    },
    "pg_connect_poll": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_connection_busy": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_connection_reset": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_connection_status": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_consume_input": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_convert": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "values",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "array|false"
    },
    "pg_copy_from": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "rows",
          "type": "Traversable|array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "separator",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "\t",
          "defaultConstant": null
        },
        {
          "name": "null_as",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "\\\\N",
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_copy_to": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "separator",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "\t",
          "defaultConstant": null
        },
        {
          "name": "null_as",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "\\\\N",
          "defaultConstant": null
        }
      ],
      "return": "array|false"
    },
    "pg_dbname": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_delete": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "conditions",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 512,
          "defaultConstant": "PGSQL_DML_EXEC"
        }
      ],
      "return": "string|bool"
    },
    "pg_end_copy": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_errormessage": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_escape_bytea": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_escape_identifier": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_escape_literal": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_escape_string": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_exec": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_execute": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "statement_name",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "params",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_fetch_all": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "PGSQL_ASSOC"
        }
      ],
      "return": "array"
    },
    "pg_fetch_all_columns": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "array"
    },
    "pg_fetch_array": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 3,
          "defaultConstant": "PGSQL_BOTH"
        }
      ],
      "return": "array|false"
    },
    "pg_fetch_assoc": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "array|false"
    },
    "pg_fetch_object": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "class",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "stdClass",
          "defaultConstant": null
        },
        {
          "name": "constructor_args",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "object|false"
    },
    "pg_fetch_result": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false|null"
    },
    "pg_fetch_row": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 2,
          "defaultConstant": "PGSQL_NUM"
        }
      ],
      "return": "array|false"
    },
    "pg_field_is_null": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_field_name": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_field_num": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_field_prtlen": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_field_size": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_field_table": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid_only",
          "type": "bool",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": false,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_field_type": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_field_type_oid": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int"
    },
    "pg_fieldisnull": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_fieldname": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_fieldnum": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_fieldprtlen": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_fieldsize": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_fieldtype": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_flush": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|bool"
    },
    "pg_free_result": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_freeresult": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_get_notify": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "PGSQL_ASSOC"
        }
      ],
      "return": "array|false"
    },
    "pg_get_pid": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_get_result": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_getlastoid": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_host": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_insert": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "values",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 512,
          "defaultConstant": "PGSQL_DML_EXEC"
        }
      ],
      "return": "PgSql\\Result|string|bool"
    },
    "pg_jit": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "array"
    },
    "pg_last_error": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_last_notice": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "PGSQL_NOTICE_LAST"
        }
      ],
      "return": "array|string|bool"
    },
    "pg_last_oid": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_lo_close": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_lo_create": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_lo_export": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "filename",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_lo_import": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "filename",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_lo_open": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Lob|false"
    },
    "pg_lo_read": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "length",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 8192,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_lo_read_all": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_lo_seek": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "offset",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "whence",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "SEEK_CUR"
        }
      ],
      "return": "bool"
    },
    "pg_lo_tell": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_lo_truncate": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "size",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_lo_unlink": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_lo_write": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "data",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "length",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_loclose": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_locreate": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_loexport": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "filename",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_loimport": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "filename",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|int|false"
    },
    "pg_loopen": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Lob|false"
    },
    "pg_loread": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "length",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 8192,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_loreadall": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_lounlink": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_lowrite": {
      "parameters": [
        {
          "name": "lob",
          "type": "PgSql\\Lob",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "data",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "length",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_meta_data": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "extended",
          "type": "bool",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": false,
          "defaultConstant": null
        }
      ],
      "return": "array|false"
    },
    "pg_num_fields": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_num_rows": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_numfields": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_numrows": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_options": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_parameter_status": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_pconnect": {
      "parameters": [
        {
          "name": "connection_string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Connection|false"
    },
    "pg_ping": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_port": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_prepare": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "statement_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_put_copy_data": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "cmd",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_put_copy_end": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "error",
          "type": "?string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_put_line": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_query": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_query_params": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "params",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    },
    "pg_result": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field",
          "type": "string|int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false|null"
    },
    "pg_result_error": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false"
    },
    "pg_result_error_field": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "field_code",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string|false|null"
    },
    "pg_result_memory_size": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_result_seek": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "row",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_result_status": {
      "parameters": [
        {
          "name": "result",
          "type": "PgSql\\Result",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "PGSQL_STATUS_LONG"
        }
      ],
      "return": "string|int"
    },
    "pg_select": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "conditions",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 512,
          "defaultConstant": "PGSQL_DML_EXEC"
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 1,
          "defaultConstant": "PGSQL_ASSOC"
        }
      ],
      "return": "array|string|false"
    },
    "pg_send_execute": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "statement_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "params",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|bool"
    },
    "pg_send_prepare": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "statement_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|bool"
    },
    "pg_send_query": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|bool"
    },
    "pg_send_query_params": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "query",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "params",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|bool"
    },
    "pg_set_client_encoding": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "encoding",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_set_error_context_visibility": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "visibility",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_set_error_verbosity": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "verbosity",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pg_setclientencoding": {
      "parameters": [
        {
          "name": "connection",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "encoding",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_socket": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pg_socket_poll": {
      "parameters": [
        {
          "name": "socket",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "read",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "write",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "timeout",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": -1,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_trace": {
      "parameters": [
        {
          "name": "filename",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": "w",
          "defaultConstant": null
        },
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "trace_mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pg_transaction_status": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pg_tty": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_unescape_bytea": {
      "parameters": [
        {
          "name": "string",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pg_untrace": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "true"
    },
    "pg_update": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "table_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "values",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "conditions",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 512,
          "defaultConstant": "PGSQL_DML_EXEC"
        }
      ],
      "return": "string|bool"
    },
    "pg_version": {
      "parameters": [
        {
          "name": "connection",
          "type": "?PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "array"
    }
  }
} as const;
export const PGSQL_CONSTANT_SNAPSHOTS = {
  "801": {
    "PGSQL_ASSOC": 1,
    "PGSQL_BAD_RESPONSE": 5,
    "PGSQL_BOTH": 3,
    "PGSQL_COMMAND_OK": 1,
    "PGSQL_CONNECT_ASYNC": 4,
    "PGSQL_CONNECT_FORCE_NEW": 2,
    "PGSQL_CONNECTION_AUTH_OK": 5,
    "PGSQL_CONNECTION_AWAITING_RESPONSE": 4,
    "PGSQL_CONNECTION_BAD": 1,
    "PGSQL_CONNECTION_MADE": 3,
    "PGSQL_CONNECTION_OK": 0,
    "PGSQL_CONNECTION_SETENV": 6,
    "PGSQL_CONNECTION_STARTED": 2,
    "PGSQL_CONV_FORCE_NULL": 4,
    "PGSQL_CONV_IGNORE_DEFAULT": 2,
    "PGSQL_CONV_IGNORE_NOT_NULL": 8,
    "PGSQL_COPY_IN": 4,
    "PGSQL_COPY_OUT": 3,
    "PGSQL_DIAG_COLUMN_NAME": 99,
    "PGSQL_DIAG_CONSTRAINT_NAME": 110,
    "PGSQL_DIAG_CONTEXT": 87,
    "PGSQL_DIAG_DATATYPE_NAME": 100,
    "PGSQL_DIAG_INTERNAL_POSITION": 112,
    "PGSQL_DIAG_INTERNAL_QUERY": 113,
    "PGSQL_DIAG_MESSAGE_DETAIL": 68,
    "PGSQL_DIAG_MESSAGE_HINT": 72,
    "PGSQL_DIAG_MESSAGE_PRIMARY": 77,
    "PGSQL_DIAG_SCHEMA_NAME": 115,
    "PGSQL_DIAG_SEVERITY": 83,
    "PGSQL_DIAG_SEVERITY_NONLOCALIZED": 86,
    "PGSQL_DIAG_SOURCE_FILE": 70,
    "PGSQL_DIAG_SOURCE_FUNCTION": 82,
    "PGSQL_DIAG_SOURCE_LINE": 76,
    "PGSQL_DIAG_SQLSTATE": 67,
    "PGSQL_DIAG_STATEMENT_POSITION": 80,
    "PGSQL_DIAG_TABLE_NAME": 116,
    "PGSQL_DML_ASYNC": 1024,
    "PGSQL_DML_ESCAPE": 4096,
    "PGSQL_DML_EXEC": 512,
    "PGSQL_DML_NO_CONV": 256,
    "PGSQL_DML_STRING": 2048,
    "PGSQL_EMPTY_QUERY": 0,
    "PGSQL_ERRORS_DEFAULT": 1,
    "PGSQL_ERRORS_TERSE": 0,
    "PGSQL_ERRORS_VERBOSE": 2,
    "PGSQL_FATAL_ERROR": 7,
    "PGSQL_LIBPQ_VERSION": "13.23",
    "PGSQL_LIBPQ_VERSION_STR": "13.23",
    "PGSQL_NONFATAL_ERROR": 6,
    "PGSQL_NOTICE_ALL": 2,
    "PGSQL_NOTICE_CLEAR": 3,
    "PGSQL_NOTICE_LAST": 1,
    "PGSQL_NUM": 2,
    "PGSQL_POLLING_ACTIVE": 4,
    "PGSQL_POLLING_FAILED": 0,
    "PGSQL_POLLING_OK": 3,
    "PGSQL_POLLING_READING": 1,
    "PGSQL_POLLING_WRITING": 2,
    "PGSQL_SEEK_CUR": 1,
    "PGSQL_SEEK_END": 2,
    "PGSQL_SEEK_SET": 0,
    "PGSQL_STATUS_LONG": 1,
    "PGSQL_STATUS_STRING": 2,
    "PGSQL_TRANSACTION_ACTIVE": 1,
    "PGSQL_TRANSACTION_IDLE": 0,
    "PGSQL_TRANSACTION_INERROR": 3,
    "PGSQL_TRANSACTION_INTRANS": 2,
    "PGSQL_TRANSACTION_UNKNOWN": 4,
    "PGSQL_TUPLES_OK": 2
  },
  "802": {
    "PGSQL_ASSOC": 1,
    "PGSQL_BAD_RESPONSE": 5,
    "PGSQL_BOTH": 3,
    "PGSQL_COMMAND_OK": 1,
    "PGSQL_CONNECT_ASYNC": 4,
    "PGSQL_CONNECT_FORCE_NEW": 2,
    "PGSQL_CONNECTION_AUTH_OK": 5,
    "PGSQL_CONNECTION_AWAITING_RESPONSE": 4,
    "PGSQL_CONNECTION_BAD": 1,
    "PGSQL_CONNECTION_MADE": 3,
    "PGSQL_CONNECTION_OK": 0,
    "PGSQL_CONNECTION_SETENV": 6,
    "PGSQL_CONNECTION_STARTED": 2,
    "PGSQL_CONV_FORCE_NULL": 4,
    "PGSQL_CONV_IGNORE_DEFAULT": 2,
    "PGSQL_CONV_IGNORE_NOT_NULL": 8,
    "PGSQL_COPY_IN": 4,
    "PGSQL_COPY_OUT": 3,
    "PGSQL_DIAG_COLUMN_NAME": 99,
    "PGSQL_DIAG_CONSTRAINT_NAME": 110,
    "PGSQL_DIAG_CONTEXT": 87,
    "PGSQL_DIAG_DATATYPE_NAME": 100,
    "PGSQL_DIAG_INTERNAL_POSITION": 112,
    "PGSQL_DIAG_INTERNAL_QUERY": 113,
    "PGSQL_DIAG_MESSAGE_DETAIL": 68,
    "PGSQL_DIAG_MESSAGE_HINT": 72,
    "PGSQL_DIAG_MESSAGE_PRIMARY": 77,
    "PGSQL_DIAG_SCHEMA_NAME": 115,
    "PGSQL_DIAG_SEVERITY": 83,
    "PGSQL_DIAG_SEVERITY_NONLOCALIZED": 86,
    "PGSQL_DIAG_SOURCE_FILE": 70,
    "PGSQL_DIAG_SOURCE_FUNCTION": 82,
    "PGSQL_DIAG_SOURCE_LINE": 76,
    "PGSQL_DIAG_SQLSTATE": 67,
    "PGSQL_DIAG_STATEMENT_POSITION": 80,
    "PGSQL_DIAG_TABLE_NAME": 116,
    "PGSQL_DML_ASYNC": 1024,
    "PGSQL_DML_ESCAPE": 4096,
    "PGSQL_DML_EXEC": 512,
    "PGSQL_DML_NO_CONV": 256,
    "PGSQL_DML_STRING": 2048,
    "PGSQL_EMPTY_QUERY": 0,
    "PGSQL_ERRORS_DEFAULT": 1,
    "PGSQL_ERRORS_TERSE": 0,
    "PGSQL_ERRORS_VERBOSE": 2,
    "PGSQL_FATAL_ERROR": 7,
    "PGSQL_LIBPQ_VERSION": "13.23",
    "PGSQL_LIBPQ_VERSION_STR": "13.23",
    "PGSQL_NONFATAL_ERROR": 6,
    "PGSQL_NOTICE_ALL": 2,
    "PGSQL_NOTICE_CLEAR": 3,
    "PGSQL_NOTICE_LAST": 1,
    "PGSQL_NUM": 2,
    "PGSQL_POLLING_ACTIVE": 4,
    "PGSQL_POLLING_FAILED": 0,
    "PGSQL_POLLING_OK": 3,
    "PGSQL_POLLING_READING": 1,
    "PGSQL_POLLING_WRITING": 2,
    "PGSQL_SEEK_CUR": 1,
    "PGSQL_SEEK_END": 2,
    "PGSQL_SEEK_SET": 0,
    "PGSQL_STATUS_LONG": 1,
    "PGSQL_STATUS_STRING": 2,
    "PGSQL_TRANSACTION_ACTIVE": 1,
    "PGSQL_TRANSACTION_IDLE": 0,
    "PGSQL_TRANSACTION_INERROR": 3,
    "PGSQL_TRANSACTION_INTRANS": 2,
    "PGSQL_TRANSACTION_UNKNOWN": 4,
    "PGSQL_TUPLES_OK": 2
  },
  "804": {
    "PGSQL_ASSOC": 1,
    "PGSQL_BAD_RESPONSE": 5,
    "PGSQL_BOTH": 3,
    "PGSQL_COMMAND_OK": 1,
    "PGSQL_CONNECT_ASYNC": 4,
    "PGSQL_CONNECT_FORCE_NEW": 2,
    "PGSQL_CONNECTION_AUTH_OK": 5,
    "PGSQL_CONNECTION_AWAITING_RESPONSE": 4,
    "PGSQL_CONNECTION_BAD": 1,
    "PGSQL_CONNECTION_MADE": 3,
    "PGSQL_CONNECTION_OK": 0,
    "PGSQL_CONNECTION_SETENV": 6,
    "PGSQL_CONNECTION_STARTED": 2,
    "PGSQL_CONV_FORCE_NULL": 4,
    "PGSQL_CONV_IGNORE_DEFAULT": 2,
    "PGSQL_CONV_IGNORE_NOT_NULL": 8,
    "PGSQL_COPY_IN": 4,
    "PGSQL_COPY_OUT": 3,
    "PGSQL_DIAG_COLUMN_NAME": 99,
    "PGSQL_DIAG_CONSTRAINT_NAME": 110,
    "PGSQL_DIAG_CONTEXT": 87,
    "PGSQL_DIAG_DATATYPE_NAME": 100,
    "PGSQL_DIAG_INTERNAL_POSITION": 112,
    "PGSQL_DIAG_INTERNAL_QUERY": 113,
    "PGSQL_DIAG_MESSAGE_DETAIL": 68,
    "PGSQL_DIAG_MESSAGE_HINT": 72,
    "PGSQL_DIAG_MESSAGE_PRIMARY": 77,
    "PGSQL_DIAG_SCHEMA_NAME": 115,
    "PGSQL_DIAG_SEVERITY": 83,
    "PGSQL_DIAG_SEVERITY_NONLOCALIZED": 86,
    "PGSQL_DIAG_SOURCE_FILE": 70,
    "PGSQL_DIAG_SOURCE_FUNCTION": 82,
    "PGSQL_DIAG_SOURCE_LINE": 76,
    "PGSQL_DIAG_SQLSTATE": 67,
    "PGSQL_DIAG_STATEMENT_POSITION": 80,
    "PGSQL_DIAG_TABLE_NAME": 116,
    "PGSQL_DML_ASYNC": 1024,
    "PGSQL_DML_ESCAPE": 4096,
    "PGSQL_DML_EXEC": 512,
    "PGSQL_DML_NO_CONV": 256,
    "PGSQL_DML_STRING": 2048,
    "PGSQL_EMPTY_QUERY": 0,
    "PGSQL_ERRORS_DEFAULT": 1,
    "PGSQL_ERRORS_SQLSTATE": 3,
    "PGSQL_ERRORS_TERSE": 0,
    "PGSQL_ERRORS_VERBOSE": 2,
    "PGSQL_FATAL_ERROR": 7,
    "PGSQL_LIBPQ_VERSION": "13.23",
    "PGSQL_LIBPQ_VERSION_STR": "13.23",
    "PGSQL_NONFATAL_ERROR": 6,
    "PGSQL_NOTICE_ALL": 2,
    "PGSQL_NOTICE_CLEAR": 3,
    "PGSQL_NOTICE_LAST": 1,
    "PGSQL_NUM": 2,
    "PGSQL_POLLING_ACTIVE": 4,
    "PGSQL_POLLING_FAILED": 0,
    "PGSQL_POLLING_OK": 3,
    "PGSQL_POLLING_READING": 1,
    "PGSQL_POLLING_WRITING": 2,
    "PGSQL_SEEK_CUR": 1,
    "PGSQL_SEEK_END": 2,
    "PGSQL_SEEK_SET": 0,
    "PGSQL_SHOW_CONTEXT_ALWAYS": 2,
    "PGSQL_SHOW_CONTEXT_ERRORS": 1,
    "PGSQL_SHOW_CONTEXT_NEVER": 0,
    "PGSQL_STATUS_LONG": 1,
    "PGSQL_STATUS_STRING": 2,
    "PGSQL_TRANSACTION_ACTIVE": 1,
    "PGSQL_TRANSACTION_IDLE": 0,
    "PGSQL_TRANSACTION_INERROR": 3,
    "PGSQL_TRANSACTION_INTRANS": 2,
    "PGSQL_TRANSACTION_UNKNOWN": 4,
    "PGSQL_TUPLES_OK": 2
  },
  "805": {
    "PGSQL_ASSOC": 1,
    "PGSQL_BAD_RESPONSE": 5,
    "PGSQL_BOTH": 3,
    "PGSQL_COMMAND_OK": 1,
    "PGSQL_CONNECT_ASYNC": 4,
    "PGSQL_CONNECT_FORCE_NEW": 2,
    "PGSQL_CONNECTION_AUTH_OK": 5,
    "PGSQL_CONNECTION_AWAITING_RESPONSE": 4,
    "PGSQL_CONNECTION_BAD": 1,
    "PGSQL_CONNECTION_MADE": 3,
    "PGSQL_CONNECTION_OK": 0,
    "PGSQL_CONNECTION_SETENV": 6,
    "PGSQL_CONNECTION_STARTED": 2,
    "PGSQL_CONV_FORCE_NULL": 4,
    "PGSQL_CONV_IGNORE_DEFAULT": 2,
    "PGSQL_CONV_IGNORE_NOT_NULL": 8,
    "PGSQL_COPY_IN": 4,
    "PGSQL_COPY_OUT": 3,
    "PGSQL_DIAG_COLUMN_NAME": 99,
    "PGSQL_DIAG_CONSTRAINT_NAME": 110,
    "PGSQL_DIAG_CONTEXT": 87,
    "PGSQL_DIAG_DATATYPE_NAME": 100,
    "PGSQL_DIAG_INTERNAL_POSITION": 112,
    "PGSQL_DIAG_INTERNAL_QUERY": 113,
    "PGSQL_DIAG_MESSAGE_DETAIL": 68,
    "PGSQL_DIAG_MESSAGE_HINT": 72,
    "PGSQL_DIAG_MESSAGE_PRIMARY": 77,
    "PGSQL_DIAG_SCHEMA_NAME": 115,
    "PGSQL_DIAG_SEVERITY": 83,
    "PGSQL_DIAG_SEVERITY_NONLOCALIZED": 86,
    "PGSQL_DIAG_SOURCE_FILE": 70,
    "PGSQL_DIAG_SOURCE_FUNCTION": 82,
    "PGSQL_DIAG_SOURCE_LINE": 76,
    "PGSQL_DIAG_SQLSTATE": 67,
    "PGSQL_DIAG_STATEMENT_POSITION": 80,
    "PGSQL_DIAG_TABLE_NAME": 116,
    "PGSQL_DML_ASYNC": 1024,
    "PGSQL_DML_ESCAPE": 4096,
    "PGSQL_DML_EXEC": 512,
    "PGSQL_DML_NO_CONV": 256,
    "PGSQL_DML_STRING": 2048,
    "PGSQL_EMPTY_QUERY": 0,
    "PGSQL_ERRORS_DEFAULT": 1,
    "PGSQL_ERRORS_SQLSTATE": 3,
    "PGSQL_ERRORS_TERSE": 0,
    "PGSQL_ERRORS_VERBOSE": 2,
    "PGSQL_FATAL_ERROR": 7,
    "PGSQL_LIBPQ_VERSION": "13.23",
    "PGSQL_LIBPQ_VERSION_STR": "13.23",
    "PGSQL_NONFATAL_ERROR": 6,
    "PGSQL_NOTICE_ALL": 2,
    "PGSQL_NOTICE_CLEAR": 3,
    "PGSQL_NOTICE_LAST": 1,
    "PGSQL_NUM": 2,
    "PGSQL_POLLING_ACTIVE": 4,
    "PGSQL_POLLING_FAILED": 0,
    "PGSQL_POLLING_OK": 3,
    "PGSQL_POLLING_READING": 1,
    "PGSQL_POLLING_WRITING": 2,
    "PGSQL_SEEK_CUR": 1,
    "PGSQL_SEEK_END": 2,
    "PGSQL_SEEK_SET": 0,
    "PGSQL_SHOW_CONTEXT_ALWAYS": 2,
    "PGSQL_SHOW_CONTEXT_ERRORS": 1,
    "PGSQL_SHOW_CONTEXT_NEVER": 0,
    "PGSQL_STATUS_LONG": 1,
    "PGSQL_STATUS_STRING": 2,
    "PGSQL_TRANSACTION_ACTIVE": 1,
    "PGSQL_TRANSACTION_IDLE": 0,
    "PGSQL_TRANSACTION_INERROR": 3,
    "PGSQL_TRANSACTION_INTRANS": 2,
    "PGSQL_TRANSACTION_UNKNOWN": 4,
    "PGSQL_TUPLES_OK": 2
  }
} as const;
// Conditional signatures checked against official PHP source, not local reflection.
export const PGSQL_BUILD_DEPENDENT_SIGNATURES = {
  "pg_set_chunked_rows_size": {
    "since": 84,
    "signature": {
      "parameters": [
        {
          "name": "connection",
          "type": "PgSql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "size",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    }
  },
  "pg_close_stmt": {
    "since": 85,
    "signature": {
      "parameters": [
        {
          "name": "connection",
          "type": "Pgsql\\Connection",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "statement_name",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "PgSql\\Result|false"
    }
  }
} as const;
