import { expect, it } from 'vitest';
import { builtinDocumentUri, builtinPhpStub, normalizeGetrusageRuntimeFacts, parseBuiltinDocumentUri } from '../src/index.js';

const timingKeys = ['ru_stime.tv_sec', 'ru_stime.tv_usec', 'ru_utime.tv_sec', 'ru_utime.tv_usec'];
const facts = { selfKeys: [...timingKeys, 'ru_majflt', 'ru_maxrss'], childrenKeys: timingKeys };

it.each(['7.2', '8.5'] as const)('preserves measured getrusage fields in declarations and URI snapshots at PHP %s', version => {
  const normalized = normalizeGetrusageRuntimeFacts(facts);
  const uri = builtinDocumentUri(version, { getrusageRuntime: facts });
  expect(parseBuiltinDocumentUri(uri)?.getrusageRuntime).toEqual(normalized);
  const reversed = { selfKeys: [...facts.selfKeys].reverse(), childrenKeys: [...facts.childrenKeys].reverse() };
  expect(builtinDocumentUri(version, { getrusageRuntime: reversed })).toBe(uri);
  expect(builtinDocumentUri(version)).not.toBe(uri);
  const source = builtinPhpStub(version, { getrusageRuntime: facts });
  expect(source).toContain(version === '7.2' ? '($who is 1 ? array{' : '($mode is 1 ? array{');
  expect(source).toContain("'ru_utime.tv_sec':int"); expect(source).not.toContain("'ru_nivcsw':int");
  const declaration = source.slice(source.indexOf('function getrusage'), source.indexOf('function getrusage') + 80);
  expect(declaration).toContain(version === '7.2' ? 'function getrusage($who = 0)' : 'function getrusage(int $mode = 0): array|false');
});

it('rejects corrupted and noncanonical getrusage URI snapshots', () => {
  const uri = builtinDocumentUri('8.5', { getrusageRuntime: facts });
  for (const bad of [{ selfKeys: ['ru_maxrss'], childrenKeys: timingKeys },
    { selfKeys: [...facts.selfKeys].reverse(), childrenKeys: timingKeys },
    { selfKeys: [...timingKeys, "bad':mixed} */"], childrenKeys: timingKeys }]) {
    const parsed = new URL(uri); parsed.searchParams.set('getrusage', JSON.stringify(bad));
    expect(parseBuiltinDocumentUri(parsed.toString())).toBeUndefined();
  }
});
