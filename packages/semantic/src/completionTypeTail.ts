const compositeType = /(?:[\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*\s*[|&]\s*)+([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)?$/;

/** Preserve the composite match while excluding characters it cannot cross. */
export function compositeTypeCompletionTail(source: string): { index: number; prefix: string } | undefined {
  let start = source.length;
  while (start > 0) {
    const code = source.charCodeAt(start - 1);
    if (!(code >= 48 && code <= 57 || code >= 65 && code <= 90 || code >= 97 && code <= 122
      || code === 95 || code === 92 || code === 124 || code === 38 || code >= 128 && code <= 255
      || /\s/u.test(source[start - 1]!))) break;
    start--;
  }
  const match = compositeType.exec(source.slice(start));
  return match ? { index: start + match.index, prefix: match[1] ?? '' } : undefined;
}
