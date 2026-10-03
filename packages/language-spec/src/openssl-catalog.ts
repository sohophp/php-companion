// Names and numeric values generated from JetBrains/phpstorm-stubs at e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, openssl/openssl.php.
// Signatures and dynamic constants are checked against local PHP 7.2-8.5 reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.
export const OPENSSL_FUNCTIONS = ["openssl_cipher_iv_length","openssl_cipher_key_length","openssl_cms_decrypt","openssl_cms_encrypt","openssl_cms_read","openssl_cms_sign","openssl_cms_verify","openssl_csr_export","openssl_csr_export_to_file","openssl_csr_get_public_key","openssl_csr_get_subject","openssl_csr_new","openssl_csr_sign","openssl_decrypt","openssl_dh_compute_key","openssl_digest","openssl_encrypt","openssl_error_string","openssl_free_key","openssl_get_cert_locations","openssl_get_cipher_methods","openssl_get_curve_names","openssl_get_md_methods","openssl_get_privatekey","openssl_get_publickey","openssl_open","openssl_pbkdf2","openssl_pkcs12_export","openssl_pkcs12_export_to_file","openssl_pkcs12_read","openssl_pkcs7_decrypt","openssl_pkcs7_encrypt","openssl_pkcs7_read","openssl_pkcs7_sign","openssl_pkcs7_verify","openssl_pkey_derive","openssl_pkey_export","openssl_pkey_export_to_file","openssl_pkey_free","openssl_pkey_get_details","openssl_pkey_get_private","openssl_pkey_get_public","openssl_pkey_new","openssl_private_decrypt","openssl_private_encrypt","openssl_public_decrypt","openssl_public_encrypt","openssl_random_pseudo_bytes","openssl_seal","openssl_sign","openssl_spki_export","openssl_spki_export_challenge","openssl_spki_new","openssl_spki_verify","openssl_verify","openssl_x509_check_private_key","openssl_x509_checkpurpose","openssl_x509_export","openssl_x509_export_to_file","openssl_x509_fingerprint","openssl_x509_free","openssl_x509_parse","openssl_x509_read","openssl_x509_verify"] as const;
export const OPENSSL_NUMERIC_CONSTANTS = {
  "OPENSSL_ALGO_DSS1": 5,
  "OPENSSL_ALGO_MD2": 4,
  "OPENSSL_ALGO_MD4": 3,
  "OPENSSL_ALGO_MD5": 2,
  "OPENSSL_ALGO_RMD160": 10,
  "OPENSSL_ALGO_SHA1": 1,
  "OPENSSL_ALGO_SHA224": 6,
  "OPENSSL_ALGO_SHA256": 7,
  "OPENSSL_ALGO_SHA384": 8,
  "OPENSSL_ALGO_SHA512": 9,
  "OPENSSL_CIPHER_3DES": 4,
  "OPENSSL_CIPHER_AES_128_CBC": 5,
  "OPENSSL_CIPHER_AES_192_CBC": 6,
  "OPENSSL_CIPHER_AES_256_CBC": 7,
  "OPENSSL_CIPHER_DES": 3,
  "OPENSSL_CIPHER_RC2_128": 1,
  "OPENSSL_CIPHER_RC2_40": 0,
  "OPENSSL_CIPHER_RC2_64": 2,
  "OPENSSL_CMS_BINARY": 128,
  "OPENSSL_CMS_DETACHED": 64,
  "OPENSSL_CMS_NOATTR": 256,
  "OPENSSL_CMS_NOCERTS": 2,
  "OPENSSL_CMS_NOINTERN": 16,
  "OPENSSL_CMS_NOSIGS": 12,
  "OPENSSL_CMS_NOVERIFY": 32,
  "OPENSSL_CMS_OLDMIMETYPE": 1024,
  "OPENSSL_CMS_TEXT": 1,
  "OPENSSL_DONT_ZERO_PAD_KEY": 4,
  "OPENSSL_ENCODING_DER": 0,
  "OPENSSL_ENCODING_PEM": 2,
  "OPENSSL_ENCODING_SMIME": 1,
  "OPENSSL_KEYTYPE_DH": 2,
  "OPENSSL_KEYTYPE_DSA": 1,
  "OPENSSL_KEYTYPE_EC": 3,
  "OPENSSL_KEYTYPE_ED25519": 5,
  "OPENSSL_KEYTYPE_ED448": 7,
  "OPENSSL_KEYTYPE_RSA": 0,
  "OPENSSL_KEYTYPE_X25519": 4,
  "OPENSSL_KEYTYPE_X448": 6,
  "OPENSSL_NO_PADDING": 3,
  "OPENSSL_PKCS1_OAEP_PADDING": 4,
  "OPENSSL_PKCS1_PADDING": 1,
  "OPENSSL_PKCS1_PSS_PADDING": 6,
  "OPENSSL_RAW_DATA": 1,
  "OPENSSL_SSLV23_PADDING": 2,
  "OPENSSL_TLSEXT_SERVER_NAME": 1,
  "OPENSSL_VERSION_NUMBER": 268435551,
  "OPENSSL_ZERO_PADDING": 2,
  "PKCS7_BINARY": 128,
  "PKCS7_CRLFEOL": 2048,
  "PKCS7_DETACHED": 64,
  "PKCS7_NO_DUAL_CONTENT": 65536,
  "PKCS7_NOATTR": 256,
  "PKCS7_NOCERTS": 2,
  "PKCS7_NOCHAIN": 8,
  "PKCS7_NOCRL": 8192,
  "PKCS7_NOINTERN": 16,
  "PKCS7_NOOLDMIMETYPE": 1024,
  "PKCS7_NOSIGS": 4,
  "PKCS7_NOVERIFY": 32,
  "PKCS7_TEXT": 1,
  "X509_PURPOSE_ANY": 7,
  "X509_PURPOSE_CRL_SIGN": 6,
  "X509_PURPOSE_NS_SSL_SERVER": 3,
  "X509_PURPOSE_OCSP_HELPER": 8,
  "X509_PURPOSE_SMIME_ENCRYPT": 5,
  "X509_PURPOSE_SMIME_SIGN": 4,
  "X509_PURPOSE_SSL_CLIENT": 1,
  "X509_PURPOSE_SSL_SERVER": 2,
  "X509_PURPOSE_TIMESTAMP_SIGN": 9
} as const;
export const OPENSSL_RUNTIME_ONLY_CONSTANT_NAMES = ["OPENSSL_DEFAULT_STREAM_CIPHERS","OPENSSL_VERSION_TEXT","PKCS7_NOSMIMECAP"] as const;
export const OPENSSL_LEGACY_PARAMETERS = {
  "openssl_get_cert_locations": [],
  "openssl_spki_new": [
    {
      "name": "privkey",
      "byRef": false,
      "optional": false
    },
    {
      "name": "challenge",
      "byRef": false,
      "optional": false
    },
    {
      "name": "algo",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_spki_verify": [
    {
      "name": "spki",
      "byRef": false,
      "optional": false
    }
  ],
  "openssl_spki_export": [
    {
      "name": "spki",
      "byRef": false,
      "optional": false
    }
  ],
  "openssl_spki_export_challenge": [
    {
      "name": "spki",
      "byRef": false,
      "optional": false
    }
  ],
  "openssl_pkey_free": [
    {
      "name": "key",
      "byRef": false,
      "optional": false
    }
  ],
  "openssl_pkey_new": [
    {
      "name": "configargs",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_pkey_export": [
    {
      "name": "key",
      "byRef": false,
      "optional": false
    },
    {
      "name": "out",
      "byRef": true,
      "optional": false
    },
    {
      "name": "passphrase",
      "byRef": false,
      "optional": true
    },
    {
      "name": "config_args",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_pkey_export_to_file": [
    {
      "name": "key",
      "byRef": false,
      "optional": false
    },
    {
      "name": "outfilename",
      "byRef": false,
      "optional": false
    },
    {
      "name": "passphrase",
      "byRef": false,
      "optional": true
    },
    {
      "name": "config_args",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_pkey_get_private": [
    {
      "name": "key",
      "byRef": false,
      "optional": false
    },
    {
      "name": "passphrase",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_pkey_get_public": [
    {
      "name": "cert",
      "byRef": false,
      "optional": false
    }
  ],
  "openssl_pkey_get_details": [
    {
      "name": "key",
      "byRef": false,
      "optional": false
    }
  ],
  "openssl_free_key": [
    {
      "name": "key",
      "byRef": false,
      "optional": false
    }
  ],
  "openssl_get_privatekey": [
    {
      "name": "key",
      "byRef": false,
      "optional": false
    },
    {
      "name": "passphrase",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_get_publickey": [
    {
      "name": "cert",
      "byRef": false,
      "optional": false
    }
  ],
  "openssl_x509_read": [
    {
      "name": "cert",
      "byRef": false,
      "optional": false
    }
  ],
  "openssl_x509_free": [
    {
      "name": "x509",
      "byRef": false,
      "optional": false
    }
  ],
  "openssl_x509_parse": [
    {
      "name": "x509",
      "byRef": false,
      "optional": false
    },
    {
      "name": "shortname",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_x509_checkpurpose": [
    {
      "name": "x509cert",
      "byRef": false,
      "optional": false
    },
    {
      "name": "purpose",
      "byRef": false,
      "optional": false
    },
    {
      "name": "cainfo",
      "byRef": false,
      "optional": true
    },
    {
      "name": "untrustedfile",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_x509_check_private_key": [
    {
      "name": "cert",
      "byRef": false,
      "optional": false
    },
    {
      "name": "key",
      "byRef": false,
      "optional": false
    }
  ],
  "openssl_x509_export": [
    {
      "name": "x509",
      "byRef": false,
      "optional": false
    },
    {
      "name": "out",
      "byRef": true,
      "optional": false
    },
    {
      "name": "notext",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_x509_fingerprint": [
    {
      "name": "x509",
      "byRef": false,
      "optional": false
    },
    {
      "name": "method",
      "byRef": false,
      "optional": true
    },
    {
      "name": "raw_output",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_x509_export_to_file": [
    {
      "name": "x509",
      "byRef": false,
      "optional": false
    },
    {
      "name": "outfilename",
      "byRef": false,
      "optional": false
    },
    {
      "name": "notext",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_pkcs12_export": [
    {
      "name": "x509",
      "byRef": false,
      "optional": false
    },
    {
      "name": "out",
      "byRef": true,
      "optional": false
    },
    {
      "name": "priv_key",
      "byRef": false,
      "optional": false
    },
    {
      "name": "pass",
      "byRef": false,
      "optional": false
    },
    {
      "name": "args",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_pkcs12_export_to_file": [
    {
      "name": "x509",
      "byRef": false,
      "optional": false
    },
    {
      "name": "filename",
      "byRef": false,
      "optional": false
    },
    {
      "name": "priv_key",
      "byRef": false,
      "optional": false
    },
    {
      "name": "pass",
      "byRef": false,
      "optional": false
    },
    {
      "name": "args",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_pkcs12_read": [
    {
      "name": "PKCS12",
      "byRef": false,
      "optional": false
    },
    {
      "name": "certs",
      "byRef": true,
      "optional": false
    },
    {
      "name": "pass",
      "byRef": false,
      "optional": false
    }
  ],
  "openssl_csr_new": [
    {
      "name": "dn",
      "byRef": false,
      "optional": false
    },
    {
      "name": "privkey",
      "byRef": true,
      "optional": false
    },
    {
      "name": "configargs",
      "byRef": false,
      "optional": true
    },
    {
      "name": "extraattribs",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_csr_export": [
    {
      "name": "csr",
      "byRef": false,
      "optional": false
    },
    {
      "name": "out",
      "byRef": true,
      "optional": false
    },
    {
      "name": "notext",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_csr_export_to_file": [
    {
      "name": "csr",
      "byRef": false,
      "optional": false
    },
    {
      "name": "outfilename",
      "byRef": false,
      "optional": false
    },
    {
      "name": "notext",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_csr_sign": [
    {
      "name": "csr",
      "byRef": false,
      "optional": false
    },
    {
      "name": "x509",
      "byRef": false,
      "optional": false
    },
    {
      "name": "priv_key",
      "byRef": false,
      "optional": false
    },
    {
      "name": "days",
      "byRef": false,
      "optional": false
    },
    {
      "name": "config_args",
      "byRef": false,
      "optional": true
    },
    {
      "name": "serial",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_csr_get_subject": [
    {
      "name": "csr",
      "byRef": false,
      "optional": false
    },
    {
      "name": "use_shortnames",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_csr_get_public_key": [
    {
      "name": "csr",
      "byRef": false,
      "optional": false
    },
    {
      "name": "use_shortnames",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_digest": [
    {
      "name": "data",
      "byRef": false,
      "optional": false
    },
    {
      "name": "method",
      "byRef": false,
      "optional": false
    },
    {
      "name": "raw_output",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_encrypt": [
    {
      "name": "data",
      "byRef": false,
      "optional": false
    },
    {
      "name": "method",
      "byRef": false,
      "optional": false
    },
    {
      "name": "password",
      "byRef": false,
      "optional": false
    },
    {
      "name": "options",
      "byRef": false,
      "optional": true
    },
    {
      "name": "iv",
      "byRef": false,
      "optional": true
    },
    {
      "name": "tag",
      "byRef": true,
      "optional": true
    },
    {
      "name": "aad",
      "byRef": false,
      "optional": true
    },
    {
      "name": "tag_length",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_decrypt": [
    {
      "name": "data",
      "byRef": false,
      "optional": false
    },
    {
      "name": "method",
      "byRef": false,
      "optional": false
    },
    {
      "name": "password",
      "byRef": false,
      "optional": false
    },
    {
      "name": "options",
      "byRef": false,
      "optional": true
    },
    {
      "name": "iv",
      "byRef": false,
      "optional": true
    },
    {
      "name": "tag",
      "byRef": false,
      "optional": true
    },
    {
      "name": "aad",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_cipher_iv_length": [
    {
      "name": "method",
      "byRef": false,
      "optional": false
    }
  ],
  "openssl_sign": [
    {
      "name": "data",
      "byRef": false,
      "optional": false
    },
    {
      "name": "signature",
      "byRef": true,
      "optional": false
    },
    {
      "name": "key",
      "byRef": false,
      "optional": false
    },
    {
      "name": "method",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_verify": [
    {
      "name": "data",
      "byRef": false,
      "optional": false
    },
    {
      "name": "signature",
      "byRef": false,
      "optional": false
    },
    {
      "name": "key",
      "byRef": false,
      "optional": false
    },
    {
      "name": "method",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_seal": [
    {
      "name": "data",
      "byRef": false,
      "optional": false
    },
    {
      "name": "sealdata",
      "byRef": true,
      "optional": false
    },
    {
      "name": "ekeys",
      "byRef": true,
      "optional": false
    },
    {
      "name": "pubkeys",
      "byRef": false,
      "optional": false
    },
    {
      "name": "method",
      "byRef": false,
      "optional": true
    },
    {
      "name": "iv",
      "byRef": true,
      "optional": true
    }
  ],
  "openssl_open": [
    {
      "name": "data",
      "byRef": false,
      "optional": false
    },
    {
      "name": "opendata",
      "byRef": true,
      "optional": false
    },
    {
      "name": "ekey",
      "byRef": false,
      "optional": false
    },
    {
      "name": "privkey",
      "byRef": false,
      "optional": false
    },
    {
      "name": "method",
      "byRef": false,
      "optional": true
    },
    {
      "name": "iv",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_pbkdf2": [
    {
      "name": "password",
      "byRef": false,
      "optional": false
    },
    {
      "name": "salt",
      "byRef": false,
      "optional": false
    },
    {
      "name": "key_length",
      "byRef": false,
      "optional": false
    },
    {
      "name": "iterations",
      "byRef": false,
      "optional": false
    },
    {
      "name": "digest_algorithm",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_pkcs7_verify": [
    {
      "name": "filename",
      "byRef": false,
      "optional": false
    },
    {
      "name": "flags",
      "byRef": false,
      "optional": false
    },
    {
      "name": "signerscerts",
      "byRef": false,
      "optional": true
    },
    {
      "name": "cainfo",
      "byRef": false,
      "optional": true
    },
    {
      "name": "extracerts",
      "byRef": false,
      "optional": true
    },
    {
      "name": "content",
      "byRef": false,
      "optional": true
    },
    {
      "name": "pk7",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_pkcs7_decrypt": [
    {
      "name": "infilename",
      "byRef": false,
      "optional": false
    },
    {
      "name": "outfilename",
      "byRef": false,
      "optional": false
    },
    {
      "name": "recipcert",
      "byRef": false,
      "optional": false
    },
    {
      "name": "recipkey",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_pkcs7_sign": [
    {
      "name": "infile",
      "byRef": false,
      "optional": false
    },
    {
      "name": "outfile",
      "byRef": false,
      "optional": false
    },
    {
      "name": "signcert",
      "byRef": false,
      "optional": false
    },
    {
      "name": "signkey",
      "byRef": false,
      "optional": false
    },
    {
      "name": "headers",
      "byRef": false,
      "optional": false
    },
    {
      "name": "flags",
      "byRef": false,
      "optional": true
    },
    {
      "name": "extracertsfilename",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_pkcs7_encrypt": [
    {
      "name": "infile",
      "byRef": false,
      "optional": false
    },
    {
      "name": "outfile",
      "byRef": false,
      "optional": false
    },
    {
      "name": "recipcerts",
      "byRef": false,
      "optional": false
    },
    {
      "name": "headers",
      "byRef": false,
      "optional": false
    },
    {
      "name": "flags",
      "byRef": false,
      "optional": true
    },
    {
      "name": "cipher",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_pkcs7_read": [
    {
      "name": "infilename",
      "byRef": false,
      "optional": false
    },
    {
      "name": "certs",
      "byRef": true,
      "optional": false
    }
  ],
  "openssl_private_encrypt": [
    {
      "name": "data",
      "byRef": false,
      "optional": false
    },
    {
      "name": "crypted",
      "byRef": true,
      "optional": false
    },
    {
      "name": "key",
      "byRef": false,
      "optional": false
    },
    {
      "name": "padding",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_private_decrypt": [
    {
      "name": "data",
      "byRef": false,
      "optional": false
    },
    {
      "name": "crypted",
      "byRef": true,
      "optional": false
    },
    {
      "name": "key",
      "byRef": false,
      "optional": false
    },
    {
      "name": "padding",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_public_encrypt": [
    {
      "name": "data",
      "byRef": false,
      "optional": false
    },
    {
      "name": "crypted",
      "byRef": true,
      "optional": false
    },
    {
      "name": "key",
      "byRef": false,
      "optional": false
    },
    {
      "name": "padding",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_public_decrypt": [
    {
      "name": "data",
      "byRef": false,
      "optional": false
    },
    {
      "name": "crypted",
      "byRef": true,
      "optional": false
    },
    {
      "name": "key",
      "byRef": false,
      "optional": false
    },
    {
      "name": "padding",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_get_md_methods": [
    {
      "name": "aliases",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_get_cipher_methods": [
    {
      "name": "aliases",
      "byRef": false,
      "optional": true
    }
  ],
  "openssl_get_curve_names": [],
  "openssl_dh_compute_key": [
    {
      "name": "pub_key",
      "byRef": false,
      "optional": false
    },
    {
      "name": "dh_key",
      "byRef": false,
      "optional": false
    }
  ],
  "openssl_random_pseudo_bytes": [
    {
      "name": "length",
      "byRef": false,
      "optional": false
    },
    {
      "name": "result_is_strong",
      "byRef": true,
      "optional": true
    }
  ],
  "openssl_error_string": []
} as const;
export const OPENSSL_LEGACY_ADDITIONS = {
  "openssl_x509_verify": [
    {
      "name": "cert",
      "byRef": false,
      "optional": false
    },
    {
      "name": "key",
      "byRef": false,
      "optional": false
    }
  ],
  "openssl_pkey_derive": [
    {
      "name": "peer_pub_key",
      "byRef": false,
      "optional": false
    },
    {
      "name": "priv_key",
      "byRef": false,
      "optional": false
    },
    {
      "name": "keylen",
      "byRef": false,
      "optional": true
    }
  ]
} as const;
export const OPENSSL_SIGNATURES = {
  "openssl_cipher_iv_length": {
    "parameters": [
      {
        "name": "cipher_algo",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "int|false"
  },
  "openssl_cms_decrypt": {
    "parameters": [
      {
        "name": "input_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "output_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "certificate",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "private_key",
        "type": null,
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "encoding",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 1,
        "defaultConstant": "OPENSSL_ENCODING_SMIME"
      }
    ],
    "return": "bool"
  },
  "openssl_cms_encrypt": {
    "parameters": [
      {
        "name": "input_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "output_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "certificate",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "headers",
        "type": "?array",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "flags",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 0,
        "defaultConstant": null
      },
      {
        "name": "encoding",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 1,
        "defaultConstant": "OPENSSL_ENCODING_SMIME"
      },
      {
        "name": "cipher_algo",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 5,
        "defaultConstant": "OPENSSL_CIPHER_AES_128_CBC"
      }
    ],
    "return": "bool"
  },
  "openssl_cms_read": {
    "parameters": [
      {
        "name": "input_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "certificates",
        "type": null,
        "byRef": true,
        "optional": false,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "bool"
  },
  "openssl_cms_sign": {
    "parameters": [
      {
        "name": "input_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "output_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "certificate",
        "type": "OpenSSLCertificate|string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "private_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "headers",
        "type": "?array",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "flags",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 0,
        "defaultConstant": null
      },
      {
        "name": "encoding",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 1,
        "defaultConstant": "OPENSSL_ENCODING_SMIME"
      },
      {
        "name": "untrusted_certificates_filename",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "bool"
  },
  "openssl_cms_verify": {
    "parameters": [
      {
        "name": "input_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "flags",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 0,
        "defaultConstant": null
      },
      {
        "name": "certificates",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "ca_info",
        "type": "array",
        "byRef": false,
        "optional": true,
        "default": [],
        "defaultConstant": null
      },
      {
        "name": "untrusted_certificates_filename",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "content",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "pk7",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "sigfile",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "encoding",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 1,
        "defaultConstant": "OPENSSL_ENCODING_SMIME"
      }
    ],
    "return": "bool"
  },
  "openssl_csr_export": {
    "parameters": [
      {
        "name": "csr",
        "type": "OpenSSLCertificateSigningRequest|string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "output",
        "type": null,
        "byRef": true,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "no_text",
        "type": "bool",
        "byRef": false,
        "optional": true,
        "default": true,
        "defaultConstant": null
      }
    ],
    "return": "bool"
  },
  "openssl_csr_export_to_file": {
    "parameters": [
      {
        "name": "csr",
        "type": "OpenSSLCertificateSigningRequest|string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "output_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "no_text",
        "type": "bool",
        "byRef": false,
        "optional": true,
        "default": true,
        "defaultConstant": null
      }
    ],
    "return": "bool"
  },
  "openssl_csr_get_public_key": {
    "parameters": [
      {
        "name": "csr",
        "type": "OpenSSLCertificateSigningRequest|string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "short_names",
        "type": "bool",
        "byRef": false,
        "optional": true,
        "default": true,
        "defaultConstant": null
      }
    ],
    "return": "OpenSSLAsymmetricKey|false"
  },
  "openssl_csr_get_subject": {
    "parameters": [
      {
        "name": "csr",
        "type": "OpenSSLCertificateSigningRequest|string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "short_names",
        "type": "bool",
        "byRef": false,
        "optional": true,
        "default": true,
        "defaultConstant": null
      }
    ],
    "return": "array|false"
  },
  "openssl_csr_new": {
    "parameters": [
      {
        "name": "distinguished_names",
        "type": "array",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "private_key",
        "type": null,
        "byRef": true,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "options",
        "type": "?array",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "extra_attributes",
        "type": "?array",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "OpenSSLCertificateSigningRequest|false"
  },
  "openssl_csr_sign": {
    "parameters": [
      {
        "name": "csr",
        "type": "OpenSSLCertificateSigningRequest|string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "ca_certificate",
        "type": "OpenSSLCertificate|string|null",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "private_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "days",
        "type": "int",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "options",
        "type": "?array",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "serial",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 0,
        "defaultConstant": null
      }
    ],
    "return": "OpenSSLCertificate|false"
  },
  "openssl_decrypt": {
    "parameters": [
      {
        "name": "data",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "cipher_algo",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "passphrase",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "options",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 0,
        "defaultConstant": null
      },
      {
        "name": "iv",
        "type": "string",
        "byRef": false,
        "optional": true,
        "default": "",
        "defaultConstant": null
      },
      {
        "name": "tag",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "aad",
        "type": "string",
        "byRef": false,
        "optional": true,
        "default": "",
        "defaultConstant": null
      }
    ],
    "return": "string|false"
  },
  "openssl_dh_compute_key": {
    "parameters": [
      {
        "name": "public_key",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "private_key",
        "type": "OpenSSLAsymmetricKey",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "string|false"
  },
  "openssl_digest": {
    "parameters": [
      {
        "name": "data",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "digest_algo",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "binary",
        "type": "bool",
        "byRef": false,
        "optional": true,
        "default": false,
        "defaultConstant": null
      }
    ],
    "return": "string|false"
  },
  "openssl_encrypt": {
    "parameters": [
      {
        "name": "data",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "cipher_algo",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "passphrase",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "options",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 0,
        "defaultConstant": null
      },
      {
        "name": "iv",
        "type": "string",
        "byRef": false,
        "optional": true,
        "default": "",
        "defaultConstant": null
      },
      {
        "name": "tag",
        "type": null,
        "byRef": true,
        "optional": true,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "aad",
        "type": "string",
        "byRef": false,
        "optional": true,
        "default": "",
        "defaultConstant": null
      },
      {
        "name": "tag_length",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 16,
        "defaultConstant": null
      }
    ],
    "return": "string|false"
  },
  "openssl_error_string": {
    "parameters": [],
    "return": "string|false"
  },
  "openssl_free_key": {
    "parameters": [
      {
        "name": "key",
        "type": "OpenSSLAsymmetricKey",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "void"
  },
  "openssl_get_cert_locations": {
    "parameters": [],
    "return": "array"
  },
  "openssl_get_cipher_methods": {
    "parameters": [
      {
        "name": "aliases",
        "type": "bool",
        "byRef": false,
        "optional": true,
        "default": false,
        "defaultConstant": null
      }
    ],
    "return": "array"
  },
  "openssl_get_curve_names": {
    "parameters": [],
    "return": "array|false"
  },
  "openssl_get_md_methods": {
    "parameters": [
      {
        "name": "aliases",
        "type": "bool",
        "byRef": false,
        "optional": true,
        "default": false,
        "defaultConstant": null
      }
    ],
    "return": "array"
  },
  "openssl_get_privatekey": {
    "parameters": [
      {
        "name": "private_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "passphrase",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "OpenSSLAsymmetricKey|false"
  },
  "openssl_get_publickey": {
    "parameters": [
      {
        "name": "public_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "OpenSSLAsymmetricKey|false"
  },
  "openssl_open": {
    "parameters": [
      {
        "name": "data",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "output",
        "type": null,
        "byRef": true,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "encrypted_key",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "private_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "cipher_algo",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "iv",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "bool"
  },
  "openssl_pbkdf2": {
    "parameters": [
      {
        "name": "password",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "salt",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "key_length",
        "type": "int",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "iterations",
        "type": "int",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "digest_algo",
        "type": "string",
        "byRef": false,
        "optional": true,
        "default": "sha1",
        "defaultConstant": null
      }
    ],
    "return": "string|false"
  },
  "openssl_pkcs12_export": {
    "parameters": [
      {
        "name": "certificate",
        "type": "OpenSSLCertificate|string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "output",
        "type": null,
        "byRef": true,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "private_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "passphrase",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "options",
        "type": "array",
        "byRef": false,
        "optional": true,
        "default": [],
        "defaultConstant": null
      }
    ],
    "return": "bool"
  },
  "openssl_pkcs12_export_to_file": {
    "parameters": [
      {
        "name": "certificate",
        "type": "OpenSSLCertificate|string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "output_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "private_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "passphrase",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "options",
        "type": "array",
        "byRef": false,
        "optional": true,
        "default": [],
        "defaultConstant": null
      }
    ],
    "return": "bool"
  },
  "openssl_pkcs12_read": {
    "parameters": [
      {
        "name": "pkcs12",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "certificates",
        "type": null,
        "byRef": true,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "passphrase",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "bool"
  },
  "openssl_pkcs7_decrypt": {
    "parameters": [
      {
        "name": "input_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "output_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "certificate",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "private_key",
        "type": null,
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "bool"
  },
  "openssl_pkcs7_encrypt": {
    "parameters": [
      {
        "name": "input_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "output_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "certificate",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "headers",
        "type": "?array",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "flags",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 0,
        "defaultConstant": null
      },
      {
        "name": "cipher_algo",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 5,
        "defaultConstant": "OPENSSL_CIPHER_AES_128_CBC"
      }
    ],
    "return": "bool"
  },
  "openssl_pkcs7_read": {
    "parameters": [
      {
        "name": "data",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "certificates",
        "type": null,
        "byRef": true,
        "optional": false,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "bool"
  },
  "openssl_pkcs7_sign": {
    "parameters": [
      {
        "name": "input_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "output_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "certificate",
        "type": "OpenSSLCertificate|string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "private_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "headers",
        "type": "?array",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "flags",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 64,
        "defaultConstant": "PKCS7_DETACHED"
      },
      {
        "name": "untrusted_certificates_filename",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "bool"
  },
  "openssl_pkcs7_verify": {
    "parameters": [
      {
        "name": "input_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "flags",
        "type": "int",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "signers_certificates_filename",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "ca_info",
        "type": "array",
        "byRef": false,
        "optional": true,
        "default": [],
        "defaultConstant": null
      },
      {
        "name": "untrusted_certificates_filename",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "content",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "output_filename",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "int|bool"
  },
  "openssl_pkey_derive": {
    "parameters": [
      {
        "name": "public_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "private_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "key_length",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 0,
        "defaultConstant": null
      }
    ],
    "return": "string|false"
  },
  "openssl_pkey_export": {
    "parameters": [
      {
        "name": "key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "output",
        "type": null,
        "byRef": true,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "passphrase",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "options",
        "type": "?array",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "bool"
  },
  "openssl_pkey_export_to_file": {
    "parameters": [
      {
        "name": "key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "output_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "passphrase",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "options",
        "type": "?array",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "bool"
  },
  "openssl_pkey_free": {
    "parameters": [
      {
        "name": "key",
        "type": "OpenSSLAsymmetricKey",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "void"
  },
  "openssl_pkey_get_details": {
    "parameters": [
      {
        "name": "key",
        "type": "OpenSSLAsymmetricKey",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "array|false"
  },
  "openssl_pkey_get_private": {
    "parameters": [
      {
        "name": "private_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "passphrase",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "OpenSSLAsymmetricKey|false"
  },
  "openssl_pkey_get_public": {
    "parameters": [
      {
        "name": "public_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "OpenSSLAsymmetricKey|false"
  },
  "openssl_pkey_new": {
    "parameters": [
      {
        "name": "options",
        "type": "?array",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "OpenSSLAsymmetricKey|false"
  },
  "openssl_private_decrypt": {
    "parameters": [
      {
        "name": "data",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "decrypted_data",
        "type": null,
        "byRef": true,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "private_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "padding",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 1,
        "defaultConstant": "OPENSSL_PKCS1_PADDING"
      }
    ],
    "return": "bool"
  },
  "openssl_private_encrypt": {
    "parameters": [
      {
        "name": "data",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "encrypted_data",
        "type": null,
        "byRef": true,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "private_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "padding",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 1,
        "defaultConstant": "OPENSSL_PKCS1_PADDING"
      }
    ],
    "return": "bool"
  },
  "openssl_public_decrypt": {
    "parameters": [
      {
        "name": "data",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "decrypted_data",
        "type": null,
        "byRef": true,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "public_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "padding",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 1,
        "defaultConstant": "OPENSSL_PKCS1_PADDING"
      }
    ],
    "return": "bool"
  },
  "openssl_public_encrypt": {
    "parameters": [
      {
        "name": "data",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "encrypted_data",
        "type": null,
        "byRef": true,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "public_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "padding",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 1,
        "defaultConstant": "OPENSSL_PKCS1_PADDING"
      }
    ],
    "return": "bool"
  },
  "openssl_random_pseudo_bytes": {
    "parameters": [
      {
        "name": "length",
        "type": "int",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "strong_result",
        "type": null,
        "byRef": true,
        "optional": true,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "string"
  },
  "openssl_seal": {
    "parameters": [
      {
        "name": "data",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "sealed_data",
        "type": null,
        "byRef": true,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "encrypted_keys",
        "type": null,
        "byRef": true,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "public_key",
        "type": "array",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "cipher_algo",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "iv",
        "type": null,
        "byRef": true,
        "optional": true,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "int|false"
  },
  "openssl_sign": {
    "parameters": [
      {
        "name": "data",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "signature",
        "type": null,
        "byRef": true,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "private_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "algorithm",
        "type": "string|int",
        "byRef": false,
        "optional": true,
        "default": 1,
        "defaultConstant": "OPENSSL_ALGO_SHA1"
      }
    ],
    "return": "bool"
  },
  "openssl_spki_export": {
    "parameters": [
      {
        "name": "spki",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "string|false"
  },
  "openssl_spki_export_challenge": {
    "parameters": [
      {
        "name": "spki",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "string|false"
  },
  "openssl_spki_new": {
    "parameters": [
      {
        "name": "private_key",
        "type": "OpenSSLAsymmetricKey",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "challenge",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "digest_algo",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 2,
        "defaultConstant": "OPENSSL_ALGO_MD5"
      }
    ],
    "return": "string|false"
  },
  "openssl_spki_verify": {
    "parameters": [
      {
        "name": "spki",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "bool"
  },
  "openssl_verify": {
    "parameters": [
      {
        "name": "data",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "signature",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "public_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "algorithm",
        "type": "string|int",
        "byRef": false,
        "optional": true,
        "default": 1,
        "defaultConstant": "OPENSSL_ALGO_SHA1"
      }
    ],
    "return": "int|false"
  },
  "openssl_x509_check_private_key": {
    "parameters": [
      {
        "name": "certificate",
        "type": "OpenSSLCertificate|string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "private_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "bool"
  },
  "openssl_x509_checkpurpose": {
    "parameters": [
      {
        "name": "certificate",
        "type": "OpenSSLCertificate|string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "purpose",
        "type": "int",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "ca_info",
        "type": "array",
        "byRef": false,
        "optional": true,
        "default": [],
        "defaultConstant": null
      },
      {
        "name": "untrusted_certificates_file",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "int|bool"
  },
  "openssl_x509_export": {
    "parameters": [
      {
        "name": "certificate",
        "type": "OpenSSLCertificate|string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "output",
        "type": null,
        "byRef": true,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "no_text",
        "type": "bool",
        "byRef": false,
        "optional": true,
        "default": true,
        "defaultConstant": null
      }
    ],
    "return": "bool"
  },
  "openssl_x509_export_to_file": {
    "parameters": [
      {
        "name": "certificate",
        "type": "OpenSSLCertificate|string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "output_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "no_text",
        "type": "bool",
        "byRef": false,
        "optional": true,
        "default": true,
        "defaultConstant": null
      }
    ],
    "return": "bool"
  },
  "openssl_x509_fingerprint": {
    "parameters": [
      {
        "name": "certificate",
        "type": "OpenSSLCertificate|string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "digest_algo",
        "type": "string",
        "byRef": false,
        "optional": true,
        "default": "sha1",
        "defaultConstant": null
      },
      {
        "name": "binary",
        "type": "bool",
        "byRef": false,
        "optional": true,
        "default": false,
        "defaultConstant": null
      }
    ],
    "return": "string|false"
  },
  "openssl_x509_free": {
    "parameters": [
      {
        "name": "certificate",
        "type": "OpenSSLCertificate",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "void"
  },
  "openssl_x509_parse": {
    "parameters": [
      {
        "name": "certificate",
        "type": "OpenSSLCertificate|string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "short_names",
        "type": "bool",
        "byRef": false,
        "optional": true,
        "default": true,
        "defaultConstant": null
      }
    ],
    "return": "array|false"
  },
  "openssl_x509_read": {
    "parameters": [
      {
        "name": "certificate",
        "type": "OpenSSLCertificate|string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "OpenSSLCertificate|false"
  },
  "openssl_x509_verify": {
    "parameters": [
      {
        "name": "certificate",
        "type": "OpenSSLCertificate|string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "public_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "int"
  }
} as const;
export const OPENSSL_SIGNATURES_82_OVERRIDES = {
  "openssl_cipher_key_length": {
    "parameters": [
      {
        "name": "cipher_algo",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "int|false"
  },
  "openssl_csr_new": {
    "parameters": [
      {
        "name": "distinguished_names",
        "type": "array",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "private_key",
        "type": null,
        "byRef": true,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "options",
        "type": "?array",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "extra_attributes",
        "type": "?array",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "OpenSSLCertificateSigningRequest|bool"
  }
} as const;
export const OPENSSL_SIGNATURES_84_OVERRIDES = {
  "openssl_csr_sign": {
    "parameters": [
      {
        "name": "csr",
        "type": "OpenSSLCertificateSigningRequest|string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "ca_certificate",
        "type": "OpenSSLCertificate|string|null",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "private_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "days",
        "type": "int",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "options",
        "type": "?array",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "serial",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 0,
        "defaultConstant": null
      },
      {
        "name": "serial_hex",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "OpenSSLCertificate|false"
  }
} as const;
export const OPENSSL_SIGNATURES_85_OVERRIDES = {
  "openssl_cms_encrypt": {
    "parameters": [
      {
        "name": "input_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "output_filename",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "certificate",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "headers",
        "type": "?array",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "flags",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 0,
        "defaultConstant": null
      },
      {
        "name": "encoding",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 1,
        "defaultConstant": "OPENSSL_ENCODING_SMIME"
      },
      {
        "name": "cipher_algo",
        "type": "string|int",
        "byRef": false,
        "optional": true,
        "default": 5,
        "defaultConstant": "OPENSSL_CIPHER_AES_128_CBC"
      }
    ],
    "return": "bool"
  },
  "openssl_private_decrypt": {
    "parameters": [
      {
        "name": "data",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "decrypted_data",
        "type": null,
        "byRef": true,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "private_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "padding",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 1,
        "defaultConstant": "OPENSSL_PKCS1_PADDING"
      },
      {
        "name": "digest_algo",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "bool"
  },
  "openssl_public_encrypt": {
    "parameters": [
      {
        "name": "data",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "encrypted_data",
        "type": null,
        "byRef": true,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "public_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "padding",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 1,
        "defaultConstant": "OPENSSL_PKCS1_PADDING"
      },
      {
        "name": "digest_algo",
        "type": "?string",
        "byRef": false,
        "optional": true,
        "default": null,
        "defaultConstant": null
      }
    ],
    "return": "bool"
  },
  "openssl_sign": {
    "parameters": [
      {
        "name": "data",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "signature",
        "type": null,
        "byRef": true,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "private_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "algorithm",
        "type": "string|int",
        "byRef": false,
        "optional": true,
        "default": 1,
        "defaultConstant": "OPENSSL_ALGO_SHA1"
      },
      {
        "name": "padding",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 0,
        "defaultConstant": null
      }
    ],
    "return": "bool"
  },
  "openssl_verify": {
    "parameters": [
      {
        "name": "data",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "signature",
        "type": "string",
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "public_key",
        "type": null,
        "byRef": false,
        "optional": false,
        "default": null,
        "defaultConstant": null
      },
      {
        "name": "algorithm",
        "type": "string|int",
        "byRef": false,
        "optional": true,
        "default": 1,
        "defaultConstant": "OPENSSL_ALGO_SHA1"
      },
      {
        "name": "padding",
        "type": "int",
        "byRef": false,
        "optional": true,
        "default": 0,
        "defaultConstant": null
      }
    ],
    "return": "int|false"
  }
} as const;
