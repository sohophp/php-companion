/** Preserve source offsets while masking only parser-confirmed comments in a slice. */
export function commentMaskedSlice(source: string, start: number, end: number,
  comments: readonly { start: number; end: number }[]): string {
  const ranges = comments.filter(range => range.start < end && range.end > start)
    .sort((left, right) => left.start - right.start);
  if (!ranges.length) return source.slice(start, end);
  const parts: string[] = []; let cursor = start;
  for (const range of ranges) {
    const from = Math.max(cursor, range.start), to = Math.min(end, range.end);
    if (to <= from) continue;
    parts.push(source.slice(cursor, from), source.slice(from, to).replace(/[^\r\n]/g, ' '));
    cursor = to;
  }
  parts.push(source.slice(cursor, end));
  return parts.join('');
}
