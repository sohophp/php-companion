// Names from JetBrains/phpstorm-stubs e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, random/random.php.
// Signatures and availability checked against PHP 8.2/8.4/8.5 reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.
export const RANDOM_FUNCTION_NAMES = ["getrandmax","lcg_value","mt_getrandmax","mt_rand","mt_srand","rand","random_bytes","random_int","srand"] as const;
export const RANDOM_CLASS_NAMES = ["Random\\Engine","Random\\CryptoSafeEngine","Random\\RandomError","Random\\BrokenRandomEngineError","Random\\RandomException","Random\\Engine\\Mt19937","Random\\Engine\\PcgOneseq128XslRr64","Random\\Engine\\Xoshiro256StarStar","Random\\Engine\\Secure","Random\\Randomizer","Random\\IntervalBoundary"] as const;
export const RANDOM_SNAPSHOTS = {
  "82": {
    "functions": [
      "lcg_value",
      "mt_srand",
      "srand",
      "rand",
      "mt_rand",
      "mt_getrandmax",
      "getrandmax",
      "random_bytes",
      "random_int"
    ],
    "classes": {
      "Random\\Engine": {
        "methods": {
          "generate": {
            "parameters": [],
            "return": "string"
          }
        },
        "properties": []
      },
      "Random\\CryptoSafeEngine": {
        "methods": [],
        "properties": []
      },
      "Random\\RandomError": {
        "methods": [],
        "properties": []
      },
      "Random\\BrokenRandomEngineError": {
        "methods": [],
        "properties": []
      },
      "Random\\RandomException": {
        "methods": [],
        "properties": []
      },
      "Random\\Engine\\Mt19937": {
        "methods": {
          "__construct": {
            "parameters": [
              {
                "name": "seed",
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
                "default": null,
                "defaultConstant": "MT_RAND_MT19937"
              }
            ],
            "return": null
          },
          "__debugInfo": {
            "parameters": [],
            "return": "array"
          },
          "__serialize": {
            "parameters": [],
            "return": "array"
          },
          "__unserialize": {
            "parameters": [
              {
                "name": "data",
                "type": "array",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "void"
          },
          "generate": {
            "parameters": [],
            "return": "string"
          }
        },
        "properties": []
      },
      "Random\\Engine\\PcgOneseq128XslRr64": {
        "methods": {
          "__construct": {
            "parameters": [
              {
                "name": "seed",
                "type": "string|int|null",
                "byRef": false,
                "variadic": false,
                "optional": true,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": null
          },
          "__debugInfo": {
            "parameters": [],
            "return": "array"
          },
          "__serialize": {
            "parameters": [],
            "return": "array"
          },
          "__unserialize": {
            "parameters": [
              {
                "name": "data",
                "type": "array",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "void"
          },
          "generate": {
            "parameters": [],
            "return": "string"
          },
          "jump": {
            "parameters": [
              {
                "name": "advance",
                "type": "int",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "void"
          }
        },
        "properties": []
      },
      "Random\\Engine\\Xoshiro256StarStar": {
        "methods": {
          "__construct": {
            "parameters": [
              {
                "name": "seed",
                "type": "string|int|null",
                "byRef": false,
                "variadic": false,
                "optional": true,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": null
          },
          "__debugInfo": {
            "parameters": [],
            "return": "array"
          },
          "__serialize": {
            "parameters": [],
            "return": "array"
          },
          "__unserialize": {
            "parameters": [
              {
                "name": "data",
                "type": "array",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "void"
          },
          "generate": {
            "parameters": [],
            "return": "string"
          },
          "jump": {
            "parameters": [],
            "return": "void"
          },
          "jumpLong": {
            "parameters": [],
            "return": "void"
          }
        },
        "properties": []
      },
      "Random\\Engine\\Secure": {
        "methods": {
          "generate": {
            "parameters": [],
            "return": "string"
          }
        },
        "properties": []
      },
      "Random\\Randomizer": {
        "methods": {
          "__construct": {
            "parameters": [
              {
                "name": "engine",
                "type": "?Random\\Engine",
                "byRef": false,
                "variadic": false,
                "optional": true,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": null
          },
          "__serialize": {
            "parameters": [],
            "return": "array"
          },
          "__unserialize": {
            "parameters": [
              {
                "name": "data",
                "type": "array",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "void"
          },
          "getBytes": {
            "parameters": [
              {
                "name": "length",
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
          "getInt": {
            "parameters": [
              {
                "name": "min",
                "type": "int",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              },
              {
                "name": "max",
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
          "nextInt": {
            "parameters": [],
            "return": "int"
          },
          "pickArrayKeys": {
            "parameters": [
              {
                "name": "array",
                "type": "array",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              },
              {
                "name": "num",
                "type": "int",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "array"
          },
          "shuffleArray": {
            "parameters": [
              {
                "name": "array",
                "type": "array",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "array"
          },
          "shuffleBytes": {
            "parameters": [
              {
                "name": "bytes",
                "type": "string",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "string"
          }
        },
        "properties": {
          "engine": "Random\\Engine"
        }
      }
    },
    "constants": {
      "MT_RAND_MT19937": 0,
      "MT_RAND_PHP": 1
    }
  },
  "84": {
    "functions": [
      "lcg_value",
      "mt_srand",
      "srand",
      "rand",
      "mt_rand",
      "mt_getrandmax",
      "getrandmax",
      "random_bytes",
      "random_int"
    ],
    "classes": {
      "Random\\Engine": {
        "methods": {
          "generate": {
            "parameters": [],
            "return": "string"
          }
        },
        "properties": []
      },
      "Random\\CryptoSafeEngine": {
        "methods": [],
        "properties": []
      },
      "Random\\RandomError": {
        "methods": [],
        "properties": []
      },
      "Random\\BrokenRandomEngineError": {
        "methods": [],
        "properties": []
      },
      "Random\\RandomException": {
        "methods": [],
        "properties": []
      },
      "Random\\Engine\\Mt19937": {
        "methods": {
          "__construct": {
            "parameters": [
              {
                "name": "seed",
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
                "default": null,
                "defaultConstant": "MT_RAND_MT19937"
              }
            ],
            "return": null
          },
          "__debugInfo": {
            "parameters": [],
            "return": "array"
          },
          "__serialize": {
            "parameters": [],
            "return": "array"
          },
          "__unserialize": {
            "parameters": [
              {
                "name": "data",
                "type": "array",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "void"
          },
          "generate": {
            "parameters": [],
            "return": "string"
          }
        },
        "properties": []
      },
      "Random\\Engine\\PcgOneseq128XslRr64": {
        "methods": {
          "__construct": {
            "parameters": [
              {
                "name": "seed",
                "type": "string|int|null",
                "byRef": false,
                "variadic": false,
                "optional": true,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": null
          },
          "__debugInfo": {
            "parameters": [],
            "return": "array"
          },
          "__serialize": {
            "parameters": [],
            "return": "array"
          },
          "__unserialize": {
            "parameters": [
              {
                "name": "data",
                "type": "array",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "void"
          },
          "generate": {
            "parameters": [],
            "return": "string"
          },
          "jump": {
            "parameters": [
              {
                "name": "advance",
                "type": "int",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "void"
          }
        },
        "properties": []
      },
      "Random\\Engine\\Xoshiro256StarStar": {
        "methods": {
          "__construct": {
            "parameters": [
              {
                "name": "seed",
                "type": "string|int|null",
                "byRef": false,
                "variadic": false,
                "optional": true,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": null
          },
          "__debugInfo": {
            "parameters": [],
            "return": "array"
          },
          "__serialize": {
            "parameters": [],
            "return": "array"
          },
          "__unserialize": {
            "parameters": [
              {
                "name": "data",
                "type": "array",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "void"
          },
          "generate": {
            "parameters": [],
            "return": "string"
          },
          "jump": {
            "parameters": [],
            "return": "void"
          },
          "jumpLong": {
            "parameters": [],
            "return": "void"
          }
        },
        "properties": []
      },
      "Random\\Engine\\Secure": {
        "methods": {
          "generate": {
            "parameters": [],
            "return": "string"
          }
        },
        "properties": []
      },
      "Random\\Randomizer": {
        "methods": {
          "__construct": {
            "parameters": [
              {
                "name": "engine",
                "type": "?Random\\Engine",
                "byRef": false,
                "variadic": false,
                "optional": true,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": null
          },
          "__serialize": {
            "parameters": [],
            "return": "array"
          },
          "__unserialize": {
            "parameters": [
              {
                "name": "data",
                "type": "array",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "void"
          },
          "getBytes": {
            "parameters": [
              {
                "name": "length",
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
          "getBytesFromString": {
            "parameters": [
              {
                "name": "string",
                "type": "string",
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
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "string"
          },
          "getFloat": {
            "parameters": [
              {
                "name": "min",
                "type": "float",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              },
              {
                "name": "max",
                "type": "float",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              },
              {
                "name": "boundary",
                "type": "Random\\IntervalBoundary",
                "byRef": false,
                "variadic": false,
                "optional": true,
                "default": null,
                "defaultConstant": "Random\\IntervalBoundary::ClosedOpen"
              }
            ],
            "return": "float"
          },
          "getInt": {
            "parameters": [
              {
                "name": "min",
                "type": "int",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              },
              {
                "name": "max",
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
          "nextFloat": {
            "parameters": [],
            "return": "float"
          },
          "nextInt": {
            "parameters": [],
            "return": "int"
          },
          "pickArrayKeys": {
            "parameters": [
              {
                "name": "array",
                "type": "array",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              },
              {
                "name": "num",
                "type": "int",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "array"
          },
          "shuffleArray": {
            "parameters": [
              {
                "name": "array",
                "type": "array",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "array"
          },
          "shuffleBytes": {
            "parameters": [
              {
                "name": "bytes",
                "type": "string",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "string"
          }
        },
        "properties": {
          "engine": "Random\\Engine"
        }
      },
      "Random\\IntervalBoundary": {
        "methods": {
          "cases": {
            "parameters": [],
            "return": "array"
          }
        },
        "properties": {
          "name": "string"
        }
      }
    },
    "constants": {
      "MT_RAND_MT19937": 0,
      "MT_RAND_PHP": 1
    }
  },
  "85": {
    "functions": [
      "lcg_value",
      "mt_srand",
      "srand",
      "rand",
      "mt_rand",
      "mt_getrandmax",
      "getrandmax",
      "random_bytes",
      "random_int"
    ],
    "classes": {
      "Random\\Engine": {
        "methods": {
          "generate": {
            "parameters": [],
            "return": "string"
          }
        },
        "properties": []
      },
      "Random\\CryptoSafeEngine": {
        "methods": [],
        "properties": []
      },
      "Random\\RandomError": {
        "methods": [],
        "properties": []
      },
      "Random\\BrokenRandomEngineError": {
        "methods": [],
        "properties": []
      },
      "Random\\RandomException": {
        "methods": [],
        "properties": []
      },
      "Random\\Engine\\Mt19937": {
        "methods": {
          "__construct": {
            "parameters": [
              {
                "name": "seed",
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
                "default": null,
                "defaultConstant": "MT_RAND_MT19937"
              }
            ],
            "return": null
          },
          "__debugInfo": {
            "parameters": [],
            "return": "array"
          },
          "__serialize": {
            "parameters": [],
            "return": "array"
          },
          "__unserialize": {
            "parameters": [
              {
                "name": "data",
                "type": "array",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "void"
          },
          "generate": {
            "parameters": [],
            "return": "string"
          }
        },
        "properties": []
      },
      "Random\\Engine\\PcgOneseq128XslRr64": {
        "methods": {
          "__construct": {
            "parameters": [
              {
                "name": "seed",
                "type": "string|int|null",
                "byRef": false,
                "variadic": false,
                "optional": true,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": null
          },
          "__debugInfo": {
            "parameters": [],
            "return": "array"
          },
          "__serialize": {
            "parameters": [],
            "return": "array"
          },
          "__unserialize": {
            "parameters": [
              {
                "name": "data",
                "type": "array",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "void"
          },
          "generate": {
            "parameters": [],
            "return": "string"
          },
          "jump": {
            "parameters": [
              {
                "name": "advance",
                "type": "int",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "void"
          }
        },
        "properties": []
      },
      "Random\\Engine\\Xoshiro256StarStar": {
        "methods": {
          "__construct": {
            "parameters": [
              {
                "name": "seed",
                "type": "string|int|null",
                "byRef": false,
                "variadic": false,
                "optional": true,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": null
          },
          "__debugInfo": {
            "parameters": [],
            "return": "array"
          },
          "__serialize": {
            "parameters": [],
            "return": "array"
          },
          "__unserialize": {
            "parameters": [
              {
                "name": "data",
                "type": "array",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "void"
          },
          "generate": {
            "parameters": [],
            "return": "string"
          },
          "jump": {
            "parameters": [],
            "return": "void"
          },
          "jumpLong": {
            "parameters": [],
            "return": "void"
          }
        },
        "properties": []
      },
      "Random\\Engine\\Secure": {
        "methods": {
          "generate": {
            "parameters": [],
            "return": "string"
          }
        },
        "properties": []
      },
      "Random\\Randomizer": {
        "methods": {
          "__construct": {
            "parameters": [
              {
                "name": "engine",
                "type": "?Random\\Engine",
                "byRef": false,
                "variadic": false,
                "optional": true,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": null
          },
          "__serialize": {
            "parameters": [],
            "return": "array"
          },
          "__unserialize": {
            "parameters": [
              {
                "name": "data",
                "type": "array",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "void"
          },
          "getBytes": {
            "parameters": [
              {
                "name": "length",
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
          "getBytesFromString": {
            "parameters": [
              {
                "name": "string",
                "type": "string",
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
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "string"
          },
          "getFloat": {
            "parameters": [
              {
                "name": "min",
                "type": "float",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              },
              {
                "name": "max",
                "type": "float",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              },
              {
                "name": "boundary",
                "type": "Random\\IntervalBoundary",
                "byRef": false,
                "variadic": false,
                "optional": true,
                "default": null,
                "defaultConstant": "Random\\IntervalBoundary::ClosedOpen"
              }
            ],
            "return": "float"
          },
          "getInt": {
            "parameters": [
              {
                "name": "min",
                "type": "int",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              },
              {
                "name": "max",
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
          "nextFloat": {
            "parameters": [],
            "return": "float"
          },
          "nextInt": {
            "parameters": [],
            "return": "int"
          },
          "pickArrayKeys": {
            "parameters": [
              {
                "name": "array",
                "type": "array",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              },
              {
                "name": "num",
                "type": "int",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "array"
          },
          "shuffleArray": {
            "parameters": [
              {
                "name": "array",
                "type": "array",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "array"
          },
          "shuffleBytes": {
            "parameters": [
              {
                "name": "bytes",
                "type": "string",
                "byRef": false,
                "variadic": false,
                "optional": false,
                "default": null,
                "defaultConstant": null
              }
            ],
            "return": "string"
          }
        },
        "properties": {
          "engine": "Random\\Engine"
        }
      },
      "Random\\IntervalBoundary": {
        "methods": {
          "cases": {
            "parameters": [],
            "return": "array"
          }
        },
        "properties": {
          "name": "string"
        }
      }
    },
    "constants": {
      "MT_RAND_MT19937": 0,
      "MT_RAND_PHP": 1
    }
  }
} as const;
