/** Checks the next PHP token without treating parentheses inside comments as a call. */
export function hasFollowingCallParenthesis(source: string, offset: number, attributesSupported = true): boolean {
  let cursor = offset;
  while (cursor < source.length) {
    if (/\s/u.test(source[cursor]!)) { cursor++; continue; }
    if (source.startsWith('/*', cursor)) {
      const end = source.indexOf('*/', cursor + 2);
      if (end < 0) return false;
      cursor = end + 2; continue;
    }
    if (source.startsWith('//', cursor) || source[cursor] === '#' && (!attributesSupported || source[cursor + 1] !== '[')) {
      while (cursor < source.length && source[cursor] !== '\n' && source[cursor] !== '\r') {
        if (source.startsWith('?>', cursor)) return false;
        cursor++;
      }
      continue;
    }
    return source[cursor] === '(';
  }
  return false;
}
