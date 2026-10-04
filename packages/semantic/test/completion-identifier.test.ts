import { expect, it } from 'vitest';
import { completionIdentifierPrefix } from '../src/completionIdentifier.js';

it.each([
  ['<?php sha1', 'sha1'], ['<?php 123sha1', 'sha1'], ['<?php 123', ''],
  ['$object->méthode2', 'méthode2'], ['return _call2', '_call2'],
  ['func\n', ''], ['func\r\n', ''], ['function ', ''], ['return;', ''],
  ['App\\call2', 'call2'], ['é', 'é'], ['', ''],
])('reads only the current identifier in %j', (source, expected) => {
  expect(completionIdentifierPrefix(source, source.length)).toBe(expected);
});

it('retains full long identifiers and the left portion at a middle cursor', () => {
  const name = '_' + 'x'.repeat(140_000) + '2';
  const source = '<?php ' + name + ';';
  expect(completionIdentifierPrefix(source, source.length - 1)).toBe(name);
  expect(completionIdentifierPrefix('sha1_file', 4)).toBe('sha1');
  expect(completionIdentifierPrefix('méthode2', 4)).toBe('méth');
});

it('keeps the ASCII-only constant boundary distinct from Latin1 function names', () => {
  expect(completionIdentifierPrefix('méthTOKEN', 9, false)).toBe('thTOKEN');
  expect(completionIdentifierPrefix('méthTOKEN', 9)).toBe('méthTOKEN');
  expect(completionIdentifierPrefix('TOKENé', 6, false)).toBe('');
});
