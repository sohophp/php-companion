export type SourceCandidateMode = 'symbol' | 'substring-symbol' | 'named-argument';
export type SourceCandidateSummaryDecision = 'skip' | 'source' | 'rebuild';

export interface SourceCandidateSummary {
  schema: 1;
  complete: boolean;
  symbols: string[];
  namedArguments: string[];
}

const MAX_KEYS = 8_192;
const MAX_KEY_LENGTH = 128;
const IDENTIFIER = /[A-Za-z_\u0080-\u{10ffff}][A-Za-z0-9_\u0080-\u{10ffff}]*/gu;
const NAMED_ARGUMENT = /(?:^|[^\p{L}\p{N}_])([\p{L}_][\p{L}\p{N}_]*)(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*(?:\r?\n|$)|#[^\r\n]*(?:\r?\n|$))*:/gu;

function collect(pattern: RegExp, source: string, group = 0): { keys: string[]; complete: boolean } {
  const keys = new Set<string>(); pattern.lastIndex = 0;
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    const key = match[group]!.toLocaleLowerCase('en-US');
    if (key.length > MAX_KEY_LENGTH) return { keys: [], complete: false };
    keys.add(key);
    if (keys.size > MAX_KEYS) return { keys: [], complete: false };
  }
  return { keys: [...keys].sort(), complete: true };
}

export function createSourceCandidateSummary(source: string): SourceCandidateSummary {
  const symbols = collect(IDENTIFIER, source); const namedArguments = collect(NAMED_ARGUMENT, source, 1);
  return { schema: 1, complete: symbols.complete && namedArguments.complete, symbols: symbols.keys, namedArguments: namedArguments.keys };
}

function validKeys(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= MAX_KEYS && value.every((key) => typeof key === 'string' && key.length <= MAX_KEY_LENGTH);
}

export function sourceCandidateSummaryDecision(payload: unknown, names: ReadonlySet<string>, mode: SourceCandidateMode): SourceCandidateSummaryDecision {
  if (!payload || typeof payload !== 'object') return 'rebuild';
  const summary = payload as Partial<SourceCandidateSummary>;
  if (summary.schema !== 1 || typeof summary.complete !== 'boolean' || !validKeys(summary.symbols) || !validKeys(summary.namedArguments)) return 'rebuild';
  if (!summary.complete) return 'source';
  const keys = mode === 'named-argument' ? summary.namedArguments : summary.symbols;
  return [...names].some((name) => mode === 'substring-symbol'
    ? keys.some((key) => key.includes(name.toLocaleLowerCase('en-US')))
    : keys.includes(name.toLocaleLowerCase('en-US'))) ? 'source' : 'skip';
}
