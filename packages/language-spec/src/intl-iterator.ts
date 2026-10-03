/** IntlIterator and IntlException names and shape checked against the pinned phpstorm-stubs Intl catalog and local PHP runtimes. */
export function auditedIntlIteratorStub(): string {
  return `/** @implements Iterator<mixed, mixed> */
class IntlIterator implements Iterator {
  /** @return mixed */ public function current() {}
  /** @return mixed */ public function key() {}
  /** @return void */ public function next() {}
  /** @return void */ public function rewind() {}
  /** @return bool */ public function valid() {}
}
class IntlException extends Exception {}
`;
}
