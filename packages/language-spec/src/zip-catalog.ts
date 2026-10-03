// Names and stable values generated from JetBrains/phpstorm-stubs at e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, zip/zip.php.
// Signatures checked against PHP 7.2 and 8.5 reflection; LIBZIP_VERSION and ER_TRUNCATED_ZIP require runtime facts. Four upstream PHP 8.6 methods are excluded. Apache-2.0; see THIRD_PARTY_NOTICES.md.
export const ZIP_FUNCTIONS = ["zip_close","zip_entry_close","zip_entry_compressedsize","zip_entry_compressionmethod","zip_entry_filesize","zip_entry_name","zip_entry_open","zip_entry_read","zip_open","zip_read"] as const;
export const ZIP_METHODS = ["addEmptyDir","addFile","addFromString","addGlob","addPattern","clearError","close","count","deleteIndex","deleteName","extractTo","getArchiveComment","getArchiveFlag","getCommentIndex","getCommentName","getExternalAttributesIndex","getExternalAttributesName","getFromIndex","getFromName","getNameIndex","getStatusString","getStream","getStreamIndex","getStreamName","isCompressionMethodSupported","isEncryptionMethodSupported","locateName","open","registerCancelCallback","registerProgressCallback","renameIndex","renameName","replaceFile","setArchiveComment","setArchiveFlag","setCommentIndex","setCommentName","setCompressionIndex","setCompressionName","setEncryptionIndex","setEncryptionName","setExternalAttributesIndex","setExternalAttributesName","setMtimeIndex","setMtimeName","setPassword","statIndex","statName","unchangeAll","unchangeArchive","unchangeIndex","unchangeName"] as const;
export const ZIP_PROPERTIES = ["comment","filename","lastId","numFiles","status","statusSys"] as const;
export const ZIP_CONSTANTS = {
  "CREATE": 1,
  "EXCL": 2,
  "CHECKCONS": 4,
  "OVERWRITE": 8,
  "FL_NOCASE": 1,
  "FL_NODIR": 2,
  "FL_COMPRESSED": 4,
  "FL_UNCHANGED": 8,
  "FL_RECOMPRESS": 16,
  "FL_ENCRYPTED": 32,
  "FL_OVERWRITE": 8192,
  "FL_LOCAL": 256,
  "FL_CENTRAL": 512,
  "EM_TRAD_PKWARE": 1,
  "EM_UNKNOWN": 65535,
  "CM_DEFAULT": -1,
  "CM_STORE": 0,
  "CM_SHRINK": 1,
  "CM_REDUCE_1": 2,
  "CM_REDUCE_2": 3,
  "CM_REDUCE_3": 4,
  "CM_REDUCE_4": 5,
  "CM_IMPLODE": 6,
  "CM_DEFLATE": 8,
  "CM_DEFLATE64": 9,
  "CM_PKWARE_IMPLODE": 10,
  "CM_BZIP2": 12,
  "CM_LZMA": 14,
  "CM_TERSE": 18,
  "CM_LZ77": 19,
  "CM_WAVPACK": 97,
  "CM_PPMD": 98,
  "ER_OK": 0,
  "ER_MULTIDISK": 1,
  "ER_RENAME": 2,
  "ER_CLOSE": 3,
  "ER_SEEK": 4,
  "ER_READ": 5,
  "ER_WRITE": 6,
  "ER_CRC": 7,
  "ER_ZIPCLOSED": 8,
  "ER_NOENT": 9,
  "ER_EXISTS": 10,
  "ER_OPEN": 11,
  "ER_TMPOPEN": 12,
  "ER_ZLIB": 13,
  "ER_MEMORY": 14,
  "ER_CHANGED": 15,
  "ER_COMPNOTSUPP": 16,
  "ER_EOF": 17,
  "ER_INVAL": 18,
  "ER_NOZIP": 19,
  "ER_INTERNAL": 20,
  "ER_INCONS": 21,
  "ER_REMOVE": 22,
  "ER_DELETED": 23,
  "EM_NONE": 0,
  "EM_AES_128": 257,
  "EM_AES_192": 258,
  "EM_AES_256": 259,
  "RDONLY": 16,
  "FL_ENC_GUESS": 0,
  "FL_ENC_RAW": 64,
  "FL_ENC_STRICT": 128,
  "FL_ENC_UTF_8": 2048,
  "FL_ENC_CP437": 4096,
  "CM_LZMA2": 33,
  "CM_XZ": 95,
  "ER_ENCRNOTSUPP": 24,
  "ER_RDONLY": 25,
  "ER_NOPASSWD": 26,
  "ER_WRONGPASSWD": 27,
  "ER_OPNOTSUPP": 28,
  "ER_INUSE": 29,
  "ER_TELL": 30,
  "ER_COMPRESSED_DATA": 31,
  "ER_CANCELLED": 32,
  "OPSYS_DOS": 0,
  "OPSYS_AMIGA": 1,
  "OPSYS_OPENVMS": 2,
  "OPSYS_UNIX": 3,
  "OPSYS_VM_CMS": 4,
  "OPSYS_ATARI_ST": 5,
  "OPSYS_OS_2": 6,
  "OPSYS_MACINTOSH": 7,
  "OPSYS_Z_SYSTEM": 8,
  "OPSYS_Z_CPM": 9,
  "OPSYS_WINDOWS_NTFS": 10,
  "OPSYS_MVS": 11,
  "OPSYS_VSE": 12,
  "OPSYS_ACORN_RISC": 13,
  "OPSYS_VFAT": 14,
  "OPSYS_ALTERNATE_MVS": 15,
  "OPSYS_BEOS": 16,
  "OPSYS_TANDEM": 17,
  "OPSYS_OS_400": 18,
  "OPSYS_OS_X": 19,
  "OPSYS_CPM": 9,
  "OPSYS_DEFAULT": 3,
  "FL_OPEN_FILE_NOW": 1073741824,
  "CM_ZSTD": 93,
  "ER_DATA_LENGTH": 33,
  "ER_NOT_ALLOWED": 34,
  "AFL_RDONLY": 2,
  "AFL_IS_TORRENTZIP": 4,
  "AFL_WANT_TORRENTZIP": 8,
  "AFL_CREATE_OR_KEEP_FILE_FOR_EMPTY_ARCHIVE": 16,
  "LENGTH_TO_END": 0,
  "LENGTH_UNCHECKED": -2
} as const;
export const ZIP_METHOD_SIGNATURES = {
  "addEmptyDir": {
    "static": false,
    "params": [
      {
        "name": "dirname",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "dirname",
      "flags"
    ]
  },
  "addFile": {
    "static": false,
    "params": [
      {
        "name": "filepath",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "entryname",
        "type": "string",
        "optional": true,
        "byRef": false,
        "default": ""
      },
      {
        "name": "start",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      },
      {
        "name": "length",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 8192
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "filepath",
      "entryname",
      "start",
      "length",
      "flags"
    ]
  },
  "addFromString": {
    "static": false,
    "params": [
      {
        "name": "name",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "content",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 8192
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "name",
      "content",
      "flags"
    ]
  },
  "addGlob": {
    "static": false,
    "params": [
      {
        "name": "pattern",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      },
      {
        "name": "options",
        "type": "array",
        "optional": true,
        "byRef": false,
        "default": []
      }
    ],
    "return": "",
    "tentative": "array|false",
    "legacyNames": [
      "pattern",
      "flags",
      "options"
    ]
  },
  "addPattern": {
    "static": false,
    "params": [
      {
        "name": "pattern",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "path",
        "type": "string",
        "optional": true,
        "byRef": false,
        "default": "."
      },
      {
        "name": "options",
        "type": "array",
        "optional": true,
        "byRef": false,
        "default": []
      }
    ],
    "return": "",
    "tentative": "array|false",
    "legacyNames": [
      "pattern",
      "path",
      "options"
    ]
  },
  "clearError": {
    "static": false,
    "params": [],
    "return": "void",
    "tentative": "",
    "legacyNames": []
  },
  "close": {
    "static": false,
    "params": [],
    "return": "",
    "tentative": "bool",
    "legacyNames": []
  },
  "count": {
    "static": false,
    "params": [],
    "return": "",
    "tentative": "int",
    "legacyNames": []
  },
  "deleteIndex": {
    "static": false,
    "params": [
      {
        "name": "index",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "index"
    ]
  },
  "deleteName": {
    "static": false,
    "params": [
      {
        "name": "name",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "name"
    ]
  },
  "extractTo": {
    "static": false,
    "params": [
      {
        "name": "pathto",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "files",
        "type": "array|string|null",
        "optional": true,
        "byRef": false,
        "default": null
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "pathto",
      "files"
    ]
  },
  "getArchiveComment": {
    "static": false,
    "params": [
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "string|false",
    "legacyNames": [
      "flags"
    ]
  },
  "getArchiveFlag": {
    "static": false,
    "params": [
      {
        "name": "flag",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "int",
    "tentative": "",
    "legacyNames": [
      "flag",
      "flags"
    ]
  },
  "getCommentIndex": {
    "static": false,
    "params": [
      {
        "name": "index",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "string|false",
    "legacyNames": [
      "index",
      "flags"
    ]
  },
  "getCommentName": {
    "static": false,
    "params": [
      {
        "name": "name",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "string|false",
    "legacyNames": [
      "name",
      "flags"
    ]
  },
  "getExternalAttributesIndex": {
    "static": false,
    "params": [
      {
        "name": "index",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "opsys",
        "type": "",
        "optional": false,
        "byRef": true,
        "default": null
      },
      {
        "name": "attr",
        "type": "",
        "optional": false,
        "byRef": true,
        "default": null
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "index",
      "opsys",
      "attr",
      "flags"
    ]
  },
  "getExternalAttributesName": {
    "static": false,
    "params": [
      {
        "name": "name",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "opsys",
        "type": "",
        "optional": false,
        "byRef": true,
        "default": null
      },
      {
        "name": "attr",
        "type": "",
        "optional": false,
        "byRef": true,
        "default": null
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "name",
      "opsys",
      "attr",
      "flags"
    ]
  },
  "getFromIndex": {
    "static": false,
    "params": [
      {
        "name": "index",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "len",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "string|false",
    "legacyNames": [
      "index",
      "len",
      "flags"
    ]
  },
  "getFromName": {
    "static": false,
    "params": [
      {
        "name": "name",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "len",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "string|false",
    "legacyNames": [
      "entryname",
      "len",
      "flags"
    ]
  },
  "getNameIndex": {
    "static": false,
    "params": [
      {
        "name": "index",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "string|false",
    "legacyNames": [
      "index",
      "flags"
    ]
  },
  "getStatusString": {
    "static": false,
    "params": [],
    "return": "",
    "tentative": "string",
    "legacyNames": []
  },
  "getStream": {
    "static": false,
    "params": [
      {
        "name": "name",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      }
    ],
    "return": "",
    "tentative": "",
    "legacyNames": [
      "entryname"
    ]
  },
  "getStreamIndex": {
    "static": false,
    "params": [
      {
        "name": "index",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "",
    "legacyNames": [
      "index",
      "flags"
    ]
  },
  "getStreamName": {
    "static": false,
    "params": [
      {
        "name": "name",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "",
    "legacyNames": [
      "entryname",
      "flags"
    ]
  },
  "isCompressionMethodSupported": {
    "static": true,
    "params": [
      {
        "name": "method",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "enc",
        "type": "bool",
        "optional": true,
        "byRef": false,
        "default": true
      }
    ],
    "return": "bool",
    "tentative": "",
    "legacyNames": [
      "method",
      "encode"
    ]
  },
  "isEncryptionMethodSupported": {
    "static": true,
    "params": [
      {
        "name": "method",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "enc",
        "type": "bool",
        "optional": true,
        "byRef": false,
        "default": true
      }
    ],
    "return": "bool",
    "tentative": "",
    "legacyNames": [
      "method",
      "encode"
    ]
  },
  "locateName": {
    "static": false,
    "params": [
      {
        "name": "name",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "int|false",
    "legacyNames": [
      "filename",
      "flags"
    ]
  },
  "open": {
    "static": false,
    "params": [
      {
        "name": "filename",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "int|bool",
    "legacyNames": [
      "filename",
      "flags"
    ]
  },
  "registerCancelCallback": {
    "static": false,
    "params": [
      {
        "name": "callback",
        "type": "callable",
        "optional": false,
        "byRef": false,
        "default": null
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "callback"
    ]
  },
  "registerProgressCallback": {
    "static": false,
    "params": [
      {
        "name": "rate",
        "type": "float",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "callback",
        "type": "callable",
        "optional": false,
        "byRef": false,
        "default": null
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "rate",
      "callback"
    ]
  },
  "renameIndex": {
    "static": false,
    "params": [
      {
        "name": "index",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "new_name",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "index",
      "new_name"
    ]
  },
  "renameName": {
    "static": false,
    "params": [
      {
        "name": "name",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "new_name",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "name",
      "new_name"
    ]
  },
  "replaceFile": {
    "static": false,
    "params": [
      {
        "name": "filepath",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "index",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "start",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      },
      {
        "name": "length",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "filepath",
      "index",
      "start",
      "length",
      "flags"
    ]
  },
  "setArchiveComment": {
    "static": false,
    "params": [
      {
        "name": "comment",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "comment"
    ]
  },
  "setArchiveFlag": {
    "static": false,
    "params": [
      {
        "name": "flag",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "value",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      }
    ],
    "return": "bool",
    "tentative": "",
    "legacyNames": [
      "flag",
      "value"
    ]
  },
  "setCommentIndex": {
    "static": false,
    "params": [
      {
        "name": "index",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "comment",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "index",
      "comment"
    ]
  },
  "setCommentName": {
    "static": false,
    "params": [
      {
        "name": "name",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "comment",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "name",
      "comment"
    ]
  },
  "setCompressionIndex": {
    "static": false,
    "params": [
      {
        "name": "index",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "method",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "compflags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "index",
      "method",
      "compflags"
    ]
  },
  "setCompressionName": {
    "static": false,
    "params": [
      {
        "name": "name",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "method",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "compflags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "name",
      "method",
      "compflags"
    ]
  },
  "setEncryptionIndex": {
    "static": false,
    "params": [
      {
        "name": "index",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "method",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "password",
        "type": "?string",
        "optional": true,
        "byRef": false,
        "default": null
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "index",
      "method",
      "password"
    ]
  },
  "setEncryptionName": {
    "static": false,
    "params": [
      {
        "name": "name",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "method",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "password",
        "type": "?string",
        "optional": true,
        "byRef": false,
        "default": null
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "name",
      "method",
      "password"
    ]
  },
  "setExternalAttributesIndex": {
    "static": false,
    "params": [
      {
        "name": "index",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "opsys",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "attr",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "index",
      "opsys",
      "attr",
      "flags"
    ]
  },
  "setExternalAttributesName": {
    "static": false,
    "params": [
      {
        "name": "name",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "opsys",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "attr",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "name",
      "opsys",
      "attr",
      "flags"
    ]
  },
  "setMtimeIndex": {
    "static": false,
    "params": [
      {
        "name": "index",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "timestamp",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "index",
      "timestamp",
      "flags"
    ]
  },
  "setMtimeName": {
    "static": false,
    "params": [
      {
        "name": "name",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "timestamp",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "name",
      "timestamp",
      "flags"
    ]
  },
  "setPassword": {
    "static": false,
    "params": [
      {
        "name": "password",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "password"
    ]
  },
  "statIndex": {
    "static": false,
    "params": [
      {
        "name": "index",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "array|false",
    "legacyNames": [
      "index",
      "flags"
    ]
  },
  "statName": {
    "static": false,
    "params": [
      {
        "name": "name",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      },
      {
        "name": "flags",
        "type": "int",
        "optional": true,
        "byRef": false,
        "default": 0
      }
    ],
    "return": "",
    "tentative": "array|false",
    "legacyNames": [
      "filename",
      "flags"
    ]
  },
  "unchangeAll": {
    "static": false,
    "params": [],
    "return": "",
    "tentative": "bool",
    "legacyNames": []
  },
  "unchangeArchive": {
    "static": false,
    "params": [],
    "return": "",
    "tentative": "bool",
    "legacyNames": []
  },
  "unchangeIndex": {
    "static": false,
    "params": [
      {
        "name": "index",
        "type": "int",
        "optional": false,
        "byRef": false,
        "default": null
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "index"
    ]
  },
  "unchangeName": {
    "static": false,
    "params": [
      {
        "name": "name",
        "type": "string",
        "optional": false,
        "byRef": false,
        "default": null
      }
    ],
    "return": "",
    "tentative": "bool",
    "legacyNames": [
      "name"
    ]
  }
} as const;
