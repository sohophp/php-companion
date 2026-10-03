// Generated using pinned JetBrains/phpstorm-stubs e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, posix/posix.php.
// Function names audited against upstream; signatures from PHP 8.1/8.5 reflection.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Upstream description text omitted.
export const POSIX_SIGNATURE_SNAPSHOTS = {
  "8.1": {
    "posix_kill": {
      "parameters": [
        {
          "name": "process_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "signal",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "bool"
    },
    "posix_getpid": {
      "parameters": [],
      "returnType": "int"
    },
    "posix_getppid": {
      "parameters": [],
      "returnType": "int"
    },
    "posix_getuid": {
      "parameters": [],
      "returnType": "int"
    },
    "posix_setuid": {
      "parameters": [
        {
          "name": "user_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "bool"
    },
    "posix_geteuid": {
      "parameters": [],
      "returnType": "int"
    },
    "posix_seteuid": {
      "parameters": [
        {
          "name": "user_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "bool"
    },
    "posix_getgid": {
      "parameters": [],
      "returnType": "int"
    },
    "posix_setgid": {
      "parameters": [
        {
          "name": "group_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "bool"
    },
    "posix_getegid": {
      "parameters": [],
      "returnType": "int"
    },
    "posix_setegid": {
      "parameters": [
        {
          "name": "group_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "bool"
    },
    "posix_getgroups": {
      "parameters": [],
      "returnType": "array|false"
    },
    "posix_getlogin": {
      "parameters": [],
      "returnType": "string|false"
    },
    "posix_getpgrp": {
      "parameters": [],
      "returnType": "int"
    },
    "posix_setsid": {
      "parameters": [],
      "returnType": "int"
    },
    "posix_setpgid": {
      "parameters": [
        {
          "name": "process_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "process_group_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "bool"
    },
    "posix_getpgid": {
      "parameters": [
        {
          "name": "process_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "int|false"
    },
    "posix_getsid": {
      "parameters": [
        {
          "name": "process_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "int|false"
    },
    "posix_uname": {
      "parameters": [],
      "returnType": "array|false"
    },
    "posix_times": {
      "parameters": [],
      "returnType": "array|false"
    },
    "posix_ctermid": {
      "parameters": [],
      "returnType": "string|false"
    },
    "posix_ttyname": {
      "parameters": [
        {
          "name": "file_descriptor",
          "type": null,
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "string|false"
    },
    "posix_isatty": {
      "parameters": [
        {
          "name": "file_descriptor",
          "type": null,
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "bool"
    },
    "posix_getcwd": {
      "parameters": [],
      "returnType": "string|false"
    },
    "posix_mkfifo": {
      "parameters": [
        {
          "name": "filename",
          "type": "string",
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "permissions",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "bool"
    },
    "posix_mknod": {
      "parameters": [
        {
          "name": "filename",
          "type": "string",
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "flags",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "major",
          "type": "int",
          "reference": false,
          "optional": true,
          "default": "0"
        },
        {
          "name": "minor",
          "type": "int",
          "reference": false,
          "optional": true,
          "default": "0"
        }
      ],
      "returnType": "bool"
    },
    "posix_access": {
      "parameters": [
        {
          "name": "filename",
          "type": "string",
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "flags",
          "type": "int",
          "reference": false,
          "optional": true,
          "default": "0"
        }
      ],
      "returnType": "bool"
    },
    "posix_getgrnam": {
      "parameters": [
        {
          "name": "name",
          "type": "string",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "array|false"
    },
    "posix_getgrgid": {
      "parameters": [
        {
          "name": "group_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "array|false"
    },
    "posix_getpwnam": {
      "parameters": [
        {
          "name": "username",
          "type": "string",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "array|false"
    },
    "posix_getpwuid": {
      "parameters": [
        {
          "name": "user_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "array|false"
    },
    "posix_getrlimit": {
      "parameters": [],
      "returnType": "array|false"
    },
    "posix_setrlimit": {
      "parameters": [
        {
          "name": "resource",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "soft_limit",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "hard_limit",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "bool"
    },
    "posix_get_last_error": {
      "parameters": [],
      "returnType": "int"
    },
    "posix_errno": {
      "parameters": [],
      "returnType": "int"
    },
    "posix_strerror": {
      "parameters": [
        {
          "name": "error_code",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "string"
    },
    "posix_initgroups": {
      "parameters": [
        {
          "name": "username",
          "type": "string",
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "group_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "bool"
    }
  },
  "8.5": {
    "posix_kill": {
      "parameters": [
        {
          "name": "process_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "signal",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "bool"
    },
    "posix_getpid": {
      "parameters": [],
      "returnType": "int"
    },
    "posix_getppid": {
      "parameters": [],
      "returnType": "int"
    },
    "posix_getuid": {
      "parameters": [],
      "returnType": "int"
    },
    "posix_setuid": {
      "parameters": [
        {
          "name": "user_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "bool"
    },
    "posix_geteuid": {
      "parameters": [],
      "returnType": "int"
    },
    "posix_seteuid": {
      "parameters": [
        {
          "name": "user_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "bool"
    },
    "posix_getgid": {
      "parameters": [],
      "returnType": "int"
    },
    "posix_setgid": {
      "parameters": [
        {
          "name": "group_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "bool"
    },
    "posix_getegid": {
      "parameters": [],
      "returnType": "int"
    },
    "posix_setegid": {
      "parameters": [
        {
          "name": "group_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "bool"
    },
    "posix_getgroups": {
      "parameters": [],
      "returnType": "array|false"
    },
    "posix_getlogin": {
      "parameters": [],
      "returnType": "string|false"
    },
    "posix_getpgrp": {
      "parameters": [],
      "returnType": "int"
    },
    "posix_setsid": {
      "parameters": [],
      "returnType": "int"
    },
    "posix_setpgid": {
      "parameters": [
        {
          "name": "process_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "process_group_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "bool"
    },
    "posix_getpgid": {
      "parameters": [
        {
          "name": "process_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "int|false"
    },
    "posix_getsid": {
      "parameters": [
        {
          "name": "process_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "int|false"
    },
    "posix_uname": {
      "parameters": [],
      "returnType": "array|false"
    },
    "posix_times": {
      "parameters": [],
      "returnType": "array|false"
    },
    "posix_ctermid": {
      "parameters": [],
      "returnType": "string|false"
    },
    "posix_ttyname": {
      "parameters": [
        {
          "name": "file_descriptor",
          "type": null,
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "string|false"
    },
    "posix_isatty": {
      "parameters": [
        {
          "name": "file_descriptor",
          "type": null,
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "bool"
    },
    "posix_getcwd": {
      "parameters": [],
      "returnType": "string|false"
    },
    "posix_mkfifo": {
      "parameters": [
        {
          "name": "filename",
          "type": "string",
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "permissions",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "bool"
    },
    "posix_mknod": {
      "parameters": [
        {
          "name": "filename",
          "type": "string",
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "flags",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "major",
          "type": "int",
          "reference": false,
          "optional": true,
          "default": "0"
        },
        {
          "name": "minor",
          "type": "int",
          "reference": false,
          "optional": true,
          "default": "0"
        }
      ],
      "returnType": "bool"
    },
    "posix_access": {
      "parameters": [
        {
          "name": "filename",
          "type": "string",
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "flags",
          "type": "int",
          "reference": false,
          "optional": true,
          "default": "0"
        }
      ],
      "returnType": "bool"
    },
    "posix_eaccess": {
      "parameters": [
        {
          "name": "filename",
          "type": "string",
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "flags",
          "type": "int",
          "reference": false,
          "optional": true,
          "default": "0"
        }
      ],
      "returnType": "bool"
    },
    "posix_getgrnam": {
      "parameters": [
        {
          "name": "name",
          "type": "string",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "array|false"
    },
    "posix_getgrgid": {
      "parameters": [
        {
          "name": "group_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "array|false"
    },
    "posix_getpwnam": {
      "parameters": [
        {
          "name": "username",
          "type": "string",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "array|false"
    },
    "posix_getpwuid": {
      "parameters": [
        {
          "name": "user_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "array|false"
    },
    "posix_getrlimit": {
      "parameters": [
        {
          "name": "resource",
          "type": "?int",
          "reference": false,
          "optional": true,
          "default": "NULL"
        }
      ],
      "returnType": "array|false"
    },
    "posix_setrlimit": {
      "parameters": [
        {
          "name": "resource",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "soft_limit",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "hard_limit",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "bool"
    },
    "posix_get_last_error": {
      "parameters": [],
      "returnType": "int"
    },
    "posix_errno": {
      "parameters": [],
      "returnType": "int"
    },
    "posix_strerror": {
      "parameters": [
        {
          "name": "error_code",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "string"
    },
    "posix_initgroups": {
      "parameters": [
        {
          "name": "username",
          "type": "string",
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "group_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "bool"
    },
    "posix_sysconf": {
      "parameters": [
        {
          "name": "conf_id",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "int"
    },
    "posix_pathconf": {
      "parameters": [
        {
          "name": "path",
          "type": "string",
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "name",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "int|false"
    },
    "posix_fpathconf": {
      "parameters": [
        {
          "name": "file_descriptor",
          "type": null,
          "reference": false,
          "optional": false,
          "default": null
        },
        {
          "name": "name",
          "type": "int",
          "reference": false,
          "optional": false,
          "default": null
        }
      ],
      "returnType": "int|false"
    }
  }
} as const;
export const POSIX_KNOWN_CONSTANT_NAMES = [
  "POSIX_F_OK",
  "POSIX_X_OK",
  "POSIX_W_OK",
  "POSIX_R_OK",
  "POSIX_S_IFREG",
  "POSIX_S_IFCHR",
  "POSIX_S_IFBLK",
  "POSIX_S_IFIFO",
  "POSIX_S_IFSOCK",
  "POSIX_RLIMIT_AS",
  "POSIX_RLIMIT_CORE",
  "POSIX_RLIMIT_CPU",
  "POSIX_RLIMIT_DATA",
  "POSIX_RLIMIT_FSIZE",
  "POSIX_RLIMIT_LOCKS",
  "POSIX_RLIMIT_MSGQUEUE",
  "POSIX_RLIMIT_NICE",
  "POSIX_RLIMIT_RTPRIO",
  "POSIX_RLIMIT_RTTIME",
  "POSIX_RLIMIT_SIGPENDING",
  "POSIX_RLIMIT_MEMLOCK",
  "POSIX_RLIMIT_NOFILE",
  "POSIX_RLIMIT_NPROC",
  "POSIX_RLIMIT_RSS",
  "POSIX_RLIMIT_STACK",
  "POSIX_RLIMIT_INFINITY",
  "POSIX_SC_ARG_MAX",
  "POSIX_SC_PAGESIZE",
  "POSIX_SC_NPROCESSORS_CONF",
  "POSIX_SC_NPROCESSORS_ONLN",
  "POSIX_PC_LINK_MAX",
  "POSIX_PC_MAX_CANON",
  "POSIX_PC_MAX_INPUT",
  "POSIX_PC_NAME_MAX",
  "POSIX_PC_PATH_MAX",
  "POSIX_PC_PIPE_BUF",
  "POSIX_PC_CHOWN_RESTRICTED",
  "POSIX_PC_NO_TRUNC",
  "POSIX_PC_ALLOC_SIZE_MIN",
  "POSIX_PC_SYMLINK_MAX",
  "POSIX_SC_OPEN_MAX",
  "POSIX_SC_CHILD_MAX",
  "POSIX_SC_CLK_TCK"
] as const;
