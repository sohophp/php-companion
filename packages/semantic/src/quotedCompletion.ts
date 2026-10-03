/** Read a literal prefix without treating PHP interpolation as a known value. */
export function quotedCompletion(source: string, start: number, offset: number):
  { quote: "'" | '"'; start: number; end: number; word: string; closed: boolean } | undefined {
  const quote = source[start];
  if ((quote !== "'" && quote !== '"') || offset <= start || offset - start > 4096) return undefined;
  let word = ''; let prefix: string | undefined;
  const limit = Math.min(source.length, start + 4097);
  for (let index = start + 1; index < limit; index++) {
    if (index === offset) prefix = word;
    const char = source[index]!;
    if (char === quote) {
      if (index < offset || prefix === undefined) return undefined;
      return { quote, start, end: index + 1, word: prefix, closed: true };
    }
    if (char === '\n' || char === '\r' || quote === '"' && char === '$') return undefined;
    if (char !== '\\') { word += char; continue; }
    const next = source[index + 1];
    if (!next || index + 1 === offset) return undefined;
    if (quote === "'") word += next === "'" || next === '\\' ? next : '\\' + next;
    else {
      const escaped: Record<string, string> = { n: '\n', r: '\r', t: '\t', v: '\v', e: '\x1b', f: '\f', '\\': '\\', '"': '"', '$': '$' };
      // Numeric, hexadecimal and Unicode escapes require a complete escape sequence.
      if (/[0-7xu]/u.test(next)) return undefined;
      word += escaped[next] ?? '\\' + next;
    }
    index++;
  }
  if (offset !== source.length || limit < source.length) return undefined;
  return { quote, start, end: offset, word, closed: false };
}

export function trailingQuotedOpening(source: string, offset: number,
  eligible: (opening: number) => boolean = () => true): number | undefined {
  const before = source.slice(Math.max(0, offset - 4096), offset);
  const patterns = [/'(?:\\[^\r\n]|[^'\\\r\n])*$/u, /"(?:\\[^\r\n]|[^"\\\r\n])*$/u];
  const openings = patterns.flatMap(pattern => {
    const match = pattern.exec(before);
    return match ? [offset - match[0].length] : [];
  }).sort((left, right) => left - right);
  return openings.find(eligible);
}

export function quoteCompletionLiteral(value: string, quote: "'" | '"'): string {
  let body = value.replaceAll('\\', '\\\\').replaceAll(quote, `\\${quote}`);
  if (quote === '"') body = body.replaceAll('$', '\\$').replaceAll('\n', '\\n').replaceAll('\r', '\\r').replaceAll('\t', '\\t');
  return `${quote}${body}${quote}`;
}

/** Decode the key of one array element, requiring its following arrow. */
export function quotedArrayKey(source: string, start: number, end: number, onlyArrow = false): string | undefined {
  const text = source.slice(start, end);
  const first = text.search(/\S/u);
  if (first < 0) return undefined;
  const opening = start + first;
  const initial = quotedCompletion(source, opening, opening + 1);
  if (!initial?.closed || initial.end > end) return undefined;
  const remainder = source.slice(initial.end, end);
  if (!(onlyArrow ? /^\s*=>\s*$/u : /^\s*=>/u).test(remainder)) return undefined;
  return quotedCompletion(source, opening, initial.end - 1)?.word;
}
