// Generated from pinned phpstorm-stubs e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, mcrypt/mcrypt.php.
// Signatures and values audited against six PHP runtimes with Mcrypt 1.0.9.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Only structural PHPDoc types are retained.
export const MCRYPT_RUNTIME_SNAPSHOT = {
  "version": "1.0.9",
  "functions": {
    "mcrypt_get_key_size": {
      "parameters": [
        {
          "name": "cipher",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "int|string"
        },
        {
          "name": "module",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        }
      ],
      "deprecated": true,
      "returnType": "int"
    },
    "mcrypt_get_block_size": {
      "parameters": [
        {
          "name": "cipher",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string|int"
        },
        {
          "name": "module",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        }
      ],
      "deprecated": true,
      "returnType": "int"
    },
    "mcrypt_get_cipher_name": {
      "parameters": [
        {
          "name": "cipher",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "int|string"
        }
      ],
      "deprecated": true,
      "returnType": "string|false"
    },
    "mcrypt_create_iv": {
      "parameters": [
        {
          "name": "size",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "int"
        },
        {
          "name": "source",
          "reference": false,
          "optional": true,
          "default": "MCRYPT_DEV_URANDOM",
          "docType": "int"
        }
      ],
      "deprecated": true,
      "returnType": "string|false"
    },
    "mcrypt_list_algorithms": {
      "parameters": [
        {
          "name": "lib_dir",
          "reference": false,
          "optional": true,
          "default": "null",
          "docType": "string"
        }
      ],
      "deprecated": true,
      "returnType": "array"
    },
    "mcrypt_list_modes": {
      "parameters": [
        {
          "name": "lib_dir",
          "reference": false,
          "optional": true,
          "default": "null",
          "docType": "string"
        }
      ],
      "deprecated": true,
      "returnType": "array"
    },
    "mcrypt_get_iv_size": {
      "parameters": [
        {
          "name": "cipher",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        },
        {
          "name": "module",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        }
      ],
      "deprecated": true,
      "returnType": "int|false"
    },
    "mcrypt_encrypt": {
      "parameters": [
        {
          "name": "cipher",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        },
        {
          "name": "key",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        },
        {
          "name": "data",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        },
        {
          "name": "mode",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        },
        {
          "name": "iv",
          "reference": false,
          "optional": true,
          "default": "null",
          "docType": "string"
        }
      ],
      "deprecated": true,
      "returnType": "string"
    },
    "mcrypt_decrypt": {
      "parameters": [
        {
          "name": "cipher",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        },
        {
          "name": "key",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        },
        {
          "name": "data",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        },
        {
          "name": "mode",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        },
        {
          "name": "iv",
          "reference": false,
          "optional": true,
          "default": "null",
          "docType": "string"
        }
      ],
      "deprecated": true,
      "returnType": "string"
    },
    "mcrypt_module_open": {
      "parameters": [
        {
          "name": "cipher",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        },
        {
          "name": "cipher_directory",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        },
        {
          "name": "mode",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        },
        {
          "name": "mode_directory",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        }
      ],
      "deprecated": true,
      "returnType": "resource|false"
    },
    "mcrypt_generic_init": {
      "parameters": [
        {
          "name": "td",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "resource"
        },
        {
          "name": "key",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        },
        {
          "name": "iv",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        }
      ],
      "deprecated": true,
      "returnType": "int|false"
    },
    "mcrypt_generic": {
      "parameters": [
        {
          "name": "td",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "resource"
        },
        {
          "name": "data",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        }
      ],
      "deprecated": true,
      "returnType": "string"
    },
    "mdecrypt_generic": {
      "parameters": [
        {
          "name": "td",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "resource"
        },
        {
          "name": "data",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        }
      ],
      "deprecated": true,
      "returnType": "string"
    },
    "mcrypt_generic_deinit": {
      "parameters": [
        {
          "name": "td",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "resource"
        }
      ],
      "deprecated": true,
      "returnType": "bool"
    },
    "mcrypt_enc_self_test": {
      "parameters": [
        {
          "name": "td",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "resource"
        }
      ],
      "deprecated": true,
      "returnType": "int"
    },
    "mcrypt_enc_is_block_algorithm_mode": {
      "parameters": [
        {
          "name": "td",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "resource"
        }
      ],
      "deprecated": true,
      "returnType": "bool"
    },
    "mcrypt_enc_is_block_algorithm": {
      "parameters": [
        {
          "name": "td",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "resource"
        }
      ],
      "deprecated": true,
      "returnType": "bool"
    },
    "mcrypt_enc_is_block_mode": {
      "parameters": [
        {
          "name": "td",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "resource"
        }
      ],
      "deprecated": true,
      "returnType": "bool"
    },
    "mcrypt_enc_get_block_size": {
      "parameters": [
        {
          "name": "td",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "resource"
        }
      ],
      "deprecated": true,
      "returnType": "int"
    },
    "mcrypt_enc_get_key_size": {
      "parameters": [
        {
          "name": "td",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "resource"
        }
      ],
      "deprecated": true,
      "returnType": "int"
    },
    "mcrypt_enc_get_supported_key_sizes": {
      "parameters": [
        {
          "name": "td",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "resource"
        }
      ],
      "deprecated": true,
      "returnType": "array"
    },
    "mcrypt_enc_get_iv_size": {
      "parameters": [
        {
          "name": "td",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "resource"
        }
      ],
      "deprecated": true,
      "returnType": "int"
    },
    "mcrypt_enc_get_algorithms_name": {
      "parameters": [
        {
          "name": "td",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "resource"
        }
      ],
      "deprecated": true,
      "returnType": "string"
    },
    "mcrypt_enc_get_modes_name": {
      "parameters": [
        {
          "name": "td",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "resource"
        }
      ],
      "deprecated": true,
      "returnType": "string"
    },
    "mcrypt_module_self_test": {
      "parameters": [
        {
          "name": "algorithm",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        },
        {
          "name": "lib_dir",
          "reference": false,
          "optional": true,
          "default": "null",
          "docType": "string"
        }
      ],
      "deprecated": true,
      "returnType": "bool"
    },
    "mcrypt_module_is_block_algorithm_mode": {
      "parameters": [
        {
          "name": "mode",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        },
        {
          "name": "lib_dir",
          "reference": false,
          "optional": true,
          "default": "null",
          "docType": "string"
        }
      ],
      "deprecated": true,
      "returnType": "bool"
    },
    "mcrypt_module_is_block_algorithm": {
      "parameters": [
        {
          "name": "algorithm",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        },
        {
          "name": "lib_dir",
          "reference": false,
          "optional": true,
          "default": "null",
          "docType": "string"
        }
      ],
      "deprecated": true,
      "returnType": "bool"
    },
    "mcrypt_module_is_block_mode": {
      "parameters": [
        {
          "name": "mode",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        },
        {
          "name": "lib_dir",
          "reference": false,
          "optional": true,
          "default": "null",
          "docType": "string"
        }
      ],
      "deprecated": true,
      "returnType": "bool"
    },
    "mcrypt_module_get_algo_block_size": {
      "parameters": [
        {
          "name": "algorithm",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        },
        {
          "name": "lib_dir",
          "reference": false,
          "optional": true,
          "default": "null",
          "docType": "string"
        }
      ],
      "deprecated": true,
      "returnType": "int"
    },
    "mcrypt_module_get_algo_key_size": {
      "parameters": [
        {
          "name": "algorithm",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        },
        {
          "name": "lib_dir",
          "reference": false,
          "optional": true,
          "default": "null",
          "docType": "string"
        }
      ],
      "deprecated": true,
      "returnType": "int"
    },
    "mcrypt_module_get_supported_key_sizes": {
      "parameters": [
        {
          "name": "algorithm",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "string"
        },
        {
          "name": "lib_dir",
          "reference": false,
          "optional": true,
          "default": "null",
          "docType": "string"
        }
      ],
      "deprecated": true,
      "returnType": "array"
    },
    "mcrypt_module_close": {
      "parameters": [
        {
          "name": "td",
          "reference": false,
          "optional": false,
          "default": null,
          "docType": "resource"
        }
      ],
      "deprecated": true,
      "returnType": "bool"
    }
  },
  "constants": {
    "MCRYPT_ENCRYPT": 0,
    "MCRYPT_DECRYPT": 1,
    "MCRYPT_DEV_RANDOM": 0,
    "MCRYPT_DEV_URANDOM": 1,
    "MCRYPT_RAND": 2,
    "MCRYPT_3DES": "tripledes",
    "MCRYPT_ARCFOUR_IV": "arcfour-iv",
    "MCRYPT_ARCFOUR": "arcfour",
    "MCRYPT_BLOWFISH": "blowfish",
    "MCRYPT_BLOWFISH_COMPAT": "blowfish-compat",
    "MCRYPT_CAST_128": "cast-128",
    "MCRYPT_CAST_256": "cast-256",
    "MCRYPT_CRYPT": "crypt",
    "MCRYPT_DES": "des",
    "MCRYPT_ENIGNA": "crypt",
    "MCRYPT_GOST": "gost",
    "MCRYPT_LOKI97": "loki97",
    "MCRYPT_PANAMA": "panama",
    "MCRYPT_RC2": "rc2",
    "MCRYPT_RIJNDAEL_128": "rijndael-128",
    "MCRYPT_RIJNDAEL_192": "rijndael-192",
    "MCRYPT_RIJNDAEL_256": "rijndael-256",
    "MCRYPT_SAFER64": "safer-sk64",
    "MCRYPT_SAFER128": "safer-sk128",
    "MCRYPT_SAFERPLUS": "saferplus",
    "MCRYPT_SERPENT": "serpent",
    "MCRYPT_THREEWAY": "threeway",
    "MCRYPT_TRIPLEDES": "tripledes",
    "MCRYPT_TWOFISH": "twofish",
    "MCRYPT_WAKE": "wake",
    "MCRYPT_XTEA": "xtea",
    "MCRYPT_IDEA": "idea",
    "MCRYPT_MARS": "mars",
    "MCRYPT_RC6": "rc6",
    "MCRYPT_SKIPJACK": "skipjack",
    "MCRYPT_MODE_CBC": "cbc",
    "MCRYPT_MODE_CFB": "cfb",
    "MCRYPT_MODE_ECB": "ecb",
    "MCRYPT_MODE_NOFB": "nofb",
    "MCRYPT_MODE_OFB": "ofb",
    "MCRYPT_MODE_STREAM": "stream"
  }
} as const;
