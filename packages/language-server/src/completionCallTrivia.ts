/** Checks the next PHP token without treating parentheses inside comments as a call. */
export function hasFollowingCallParenthesis(source: string, offset: number, attributesSupported = true): boolean {
  const token = nextPhpTokenOffset(source, offset, attributesSupported);
  return token !== undefined && source[token] === '(';
}

/** Returns the next token's source offset while retaining comment text for edits. */
export function nextPhpTokenOffset(source: string, offset: number, attributesSupported = true): number | undefined {
  let cursor = offset;
  while (cursor < source.length) {
    if (/\s/u.test(source[cursor]!)) { cursor++; continue; }
    if (source.startsWith('/*', cursor)) {
      const end = source.indexOf('*/', cursor + 2);
      if (end < 0) return undefined;
      cursor = end + 2; continue;
    }
    if (source.startsWith('//', cursor) || source[cursor] === '#' && (!attributesSupported || source[cursor + 1] !== '[')) {
      while (cursor < source.length && source[cursor] !== '\n' && source[cursor] !== '\r') {
        if (source.startsWith('?>', cursor)) return undefined;
        cursor++;
      }
      continue;
    }
    return cursor;
  }
  return undefined;
}
