// Names come from the pinned JetBrains/phpstorm-stubs msgpack catalog.
// Signatures and the additional 3.0.1 constants are checked against local runtimes.
export function auditedMsgpackStub(): string {
  return `const MESSAGEPACK_OPT_PHPONLY = -1001;
const MESSAGEPACK_OPT_ASSOC = -1002;
const MESSAGEPACK_OPT_FORCE_F32 = -1003;
/** @return string */ function msgpack_serialize($value) {}
/** @return mixed */ function msgpack_unserialize($str, $object = null) {}
/** @return string */ function msgpack_pack($value) {}
/** @return mixed */ function msgpack_unpack($str, $object = null) {}
class MessagePack {
  public const OPT_PHPONLY = -1001;
  public const OPT_ASSOC = -1002;
  public const OPT_FORCE_F32 = -1003;
  public function __construct($opt = null) {}
  /** @return bool */ public function setOption($option, $value) {}
  /** @return string */ public function pack($value) {}
  /** @return mixed */ public function unpack($str, $object = null) {}
  /** @return MessagePackUnpacker */ public function unpacker() {}
}
class MessagePackUnpacker {
  public function __construct($opt = null) {}
  public function __destruct() {}
  /** @return bool */ public function setOption($option, $value) {}
  /** @return bool */ public function feed($str) {}
  /** @return bool */ public function execute($str = null, &$offset = null) {}
  /** @return mixed */ public function data($object = null) {}
  /** @return void */ public function reset() {}
}
`;
}
