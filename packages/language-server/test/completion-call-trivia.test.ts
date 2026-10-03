import { expect, it } from 'vitest';
import { hasFollowingCallParenthesis } from '../src/completionCallTrivia.js';

it.each([
  ['()', true], [' \t\r\n()', true], ['/* annotation ( */ ()', true],
  ['/** multiline\n ( */ /* second */ ()', true], ['// ( ignored\n()', true],
  ['# ( ignored\r\n()', true], ['/* ?> is comment text */ ()', true],
  ['// ?>\n()', false], ['# ?>\n()', false], ['?> <?php ()', false],
  ['#[Attribute] ()', false], ['/* incomplete (', false], ['// incomplete (', false],
  ['# incomplete (', false], ['; ()', false], [' + ()', false], ['', false],
])('distinguishes a following PHP parenthesis in %j', (tail, expected) => {
  const prefix = '<?php $object->render';
  expect(hasFollowingCallParenthesis(prefix + tail, prefix.length)).toBe(expected);
});

it('keeps hash-bracket comments for PHP 7 and attribute boundaries for PHP 8', () => {
  expect(hasFollowingCallParenthesis('#[old comment (]\n()', 0, false)).toBe(true);
  expect(hasFollowingCallParenthesis('#[Attribute]\n()', 0, true)).toBe(false);
});
