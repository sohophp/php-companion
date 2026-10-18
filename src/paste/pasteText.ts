const PHP_TYPE_NAME = /\b[A-Z][A-Za-z0-9_]*\b/;
const ALL_PHP_TYPE_NAMES = /\b[A-Z][A-Za-z0-9_]*\b/g;

export function potentialPhpTypeNames(text: string): Set<string> {
  return new Set(text.match(ALL_PHP_TYPE_NAMES) ?? []);
}

export function mayNeedPhpImportResolution(text: string): boolean {
  return PHP_TYPE_NAME.test(text);
}

export async function resolvePasteAliasConflicts<
  Symbol extends { fqcn: string; alias: string; selectedAlias?: string },
  Plan extends { conflict?: { fqcn: string; sourceAlias: string } },
>(symbols: Symbol[], planFor: (symbols: Symbol[]) => Promise<Plan | null>,
  chooseAlias: (conflict: NonNullable<Plan['conflict']>) => Promise<string | undefined>,
  canPrompt: boolean, sourceUnchanged: () => Promise<boolean>): Promise<Plan | undefined> {
  let current = symbols;
  if (!await sourceUnchanged()) return undefined;
  let plan = await planFor(current);
  // Resolve each symbol once; repeated conflicts cannot create an endless
  // prompt cycle or cause a partial import plan to escape.
  const resolved = new Set<string>();
  while (plan?.conflict) {
    if (!canPrompt || !await sourceUnchanged()) return undefined;
    const conflict = plan.conflict; const key = conflict.fqcn.toLowerCase();
    if (resolved.has(key) || !current.some(symbol => symbol.fqcn.toLowerCase() === key)) return undefined;
    const selectedAlias = await chooseAlias(conflict);
    if (!selectedAlias || !await sourceUnchanged()) return undefined;
    resolved.add(key);
    current = current.map(symbol => symbol.fqcn.toLowerCase() === key ? { ...symbol, selectedAlias } : symbol);
    plan = await planFor(current);
  }
  return plan && await sourceUnchanged() ? plan : undefined;
}

/** Local lexical preflight: literal text needs no project index or disk snapshot.
 * Ambiguous interpolated expressions keep the normal import path.
 * Offsets are UTF-16, matching TextDocument.offsetAt.
 */
export function phpPasteTargetsOnlyText(source: string, ranges: readonly { start: number; end: number }[]): boolean {
  if (!ranges.length || ranges.some(range => range.start < 0 || range.end < range.start || range.end > source.length)) return false;
  const covered = new Set<number>();
  const cover = (start: number, end: number): void => {
    ranges.forEach((range, index) => { if (range.start >= start && range.end <= end) covered.add(index); });
  };
  const lineCommentEnd = /[\r\n]|\?>/g;
  let php = false;
  for (let i = 0; i < source.length && covered.size < ranges.length;) {
    if (!php) {
      const open = source.indexOf('<?', i);
      cover(i, open < 0 ? source.length : open);
      if (open < 0) break;
      if (source.startsWith('<?xml', open)) { i = open + 2; continue; }
      php = true; i = open + 2; continue;
    }
    if (source.startsWith('?>', i)) { php = false; i += 2; continue; }
    if (source.startsWith('//', i) || source[i] === '#' && source[i + 1] !== '[') {
      // Stop at the first line boundary or closing tag. Searching separately
      // for a closing tag scans the remaining file again for every comment.
      lineCommentEnd.lastIndex = i;
      i = lineCommentEnd.exec(source)?.index ?? source.length;
      continue;
    }
    if (source.startsWith('/*', i)) {
      const end = source.indexOf('*/', i + 2); i = end < 0 ? source.length : end + 2; continue;
    }
    if (source.startsWith('<<<', i)) {
      const header = /^<<<[ \t]*(['"]?)([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)\1\r?\n/.exec(source.slice(i));
      if (header) {
        const start = i + header[0].length;
        const closing = new RegExp(`^[ \t]*${header[2]}(?![A-Za-z0-9_\\x80-\\xff])`, 'gm');
        closing.lastIndex = start;
        const match = closing.exec(source); const end = match?.index ?? source.length;
        if (header[1] === "'" || !/\{\$|\$\{/.test(source.slice(start, end))) cover(start, end);
        i = match ? end + match[0].length : end; continue;
      }
    }
    const quote = source[i];
    if (quote === "'" || quote === '"' || quote === '`') {
      const start = ++i;
      let interpolation = false;
      let interpolationDepth = 0;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === '\\') { i += 2; continue; }
        if (quote !== "'" && (source.startsWith('{$', i) || source.startsWith('$' + '{', i))) {
          interpolation = true; interpolationDepth++;
          i += 2; continue;
        }
        if (interpolationDepth && source[i] === '{') interpolationDepth++;
        if (interpolationDepth && source[i] === '}') interpolationDepth--;
        i++;
      }
      if (interpolationDepth) return false;
      if (!interpolation) cover(start, Math.min(i, source.length));
      if (i < source.length) i++;
      continue;
    }
    i++;
  }
  return covered.size === ranges.length;
}
