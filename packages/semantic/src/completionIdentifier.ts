/** The identifier immediately left of the cursor, within the existing ASCII/Latin1 support. */
export function completionIdentifierPrefix(source: string, offset: number, latin1 = true): string {
  let start = offset;
  while (start > 0) {
    const code = source.charCodeAt(start - 1);
    if (!(code >= 48 && code <= 57 || code >= 65 && code <= 90 || code >= 97 && code <= 122
      || code === 95 || latin1 && code >= 128 && code <= 255)) break;
    start--;
  }
  // Preserve suffix matching after a numeric token; callers that disallow it
  // still inspect the character before the returned prefix.
  while (start < offset && source.charCodeAt(start) >= 48 && source.charCodeAt(start) <= 57) start++;
  return source.slice(start, offset);
}
