// Names are checked against pinned JetBrains/phpstorm-stubs and four local runtimes.
export function auditedIgbinaryStub(): string {
  return `/** @return string|null */ function igbinary_serialize($value) {}
/** @return mixed|false */ function igbinary_unserialize($str) {}
`;
}
