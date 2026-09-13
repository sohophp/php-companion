export interface MarkedFixture {
  source: string;
  markers: ReadonlyMap<string, number>;
  offset(name: string): number;
}

const MARKER = /\/\*@([A-Za-z][A-Za-z0-9_.-]*)\*\//g;

export function markedSource(input: string): MarkedFixture {
  const markers = new Map<string, number>();
  let removed = 0;
  const source = input.replace(MARKER, (token: string, name: string, rawOffset: number) => {
    if (markers.has(name)) throw new Error(`Duplicate fixture marker: ${name}`);
    markers.set(name, rawOffset - removed);
    removed += token.length;
    return '';
  });
  return {
    source,
    markers,
    offset(name: string): number {
      const value = markers.get(name);
      if (value === undefined) throw new Error(`Unknown fixture marker: ${name}`);
      return value;
    },
  };
}

export interface DurationSummary {
  samples: number;
  p50: number;
  p95: number;
  maximum: number;
}

function percentile(sorted: readonly number[], fraction: number): number {
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]!;
}

export function summarizeDurations(values: readonly number[]): DurationSummary {
  if (values.length === 0 || values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('Durations must contain at least one finite, non-negative sample.');
  }
  const sorted = [...values].sort((left, right) => left - right);
  return { samples: sorted.length, p50: percentile(sorted, 0.5), p95: percentile(sorted, 0.95), maximum: sorted.at(-1)! };
}

export const R1_PERFORMANCE_BUDGETS = Object.freeze({
  hotQueryMs: 150,
  localDiagnosticsMs: 500,
  cancellationMs: 100,
  coldIndexMs: Object.freeze({ files1000: 8_000, files10000: 60_000, files50000: 300_000 }),
  peakRssMb: Object.freeze({ files1000: 384, files10000: 768, files50000: 1_536 }),
  warmCacheMb: Object.freeze({ files1000: 64, files10000: 512, files50000: 2_560 }),
});

export type ScalarPerformanceBudget = 'hotQueryMs' | 'localDiagnosticsMs' | 'cancellationMs';

export function assertPerformanceBudget(metric: ScalarPerformanceBudget, observedMs: number): void {
  const budget = R1_PERFORMANCE_BUDGETS[metric];
  if (!Number.isFinite(observedMs) || observedMs < 0) throw new Error(`${metric} measurement is invalid: ${observedMs}`);
  if (observedMs > budget) throw new Error(`${metric} exceeded its frozen budget: ${observedMs} ms > ${budget} ms`);
}

export function encodeLspMessage(message: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(message), 'utf8');
  return Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, 'ascii'), body]);
}

export class LspMessageDecoder {
  private buffered = Buffer.alloc(0);

  push(chunk: Uint8Array): unknown[] {
    this.buffered = Buffer.concat([this.buffered, chunk]);
    const messages: unknown[] = [];
    while (true) {
      const headerEnd = this.buffered.indexOf('\r\n\r\n');
      if (headerEnd < 0) return messages;
      const header = this.buffered.subarray(0, headerEnd).toString('ascii');
      const lengthText = /(?:^|\r\n)Content-Length:\s*(\d+)(?:\r\n|$)/i.exec(header)?.[1];
      if (!lengthText) throw new Error('LSP frame has no valid Content-Length header.');
      const length = Number(lengthText); const bodyStart = headerEnd + 4;
      if (this.buffered.length < bodyStart + length) return messages;
      messages.push(JSON.parse(this.buffered.subarray(bodyStart, bodyStart + length).toString('utf8')));
      this.buffered = this.buffered.subarray(bodyStart + length);
    }
  }
}

export interface PhpVersionFixture { version: string; feature: string; source: string; }

export const PHP_VERSION_FIXTURES: readonly PhpVersionFixture[] = Object.freeze([
  { version: '7.2', feature: 'object type', source: '<?php function accept(object $value): object { return $value; }' },
  { version: '7.3', feature: 'trailing call comma', source: '<?php run($value,);' },
  { version: '7.4', feature: 'typed property and arrow', source: '<?php class C { public int $id; } $f = fn(int $v): int => $v;' },
  { version: '8.0', feature: 'attribute union and named argument', source: '<?php #[A] function f(int|string $v): void {} f(v: 1);' },
  { version: '8.1', feature: 'enum intersection and readonly', source: '<?php enum E {} class C { public readonly int $id; } function f(A&B $v): never { throw new Exception(); }' },
  { version: '8.2', feature: 'DNF and readonly class', source: '<?php readonly class C {} function f((A&B)|C $v): true { return true; }' },
  { version: '8.3', feature: 'typed class constant and dynamic fetch', source: '<?php class C { public const string NAME = "x"; } echo C::{"NAME"};' },
  { version: '8.4', feature: 'property hook', source: '<?php class C { public string $name { get => $this->name; } }' },
  { version: '8.5', feature: 'pipe operator', source: '<?php $result = "x" |> trim(...);' },
]);

export async function generatePhpComposerProject(root: string, fileCount: number): Promise<void> {
  if (!Number.isInteger(fileCount) || fileCount < 0) throw new Error(`Invalid PHP fixture file count: ${fileCount}`);
  const sourceRoot = join(root, 'src'); await mkdir(sourceRoot, { recursive: true });
  await writeFile(join(root, 'composer.json'), `${JSON.stringify({ autoload: { 'psr-4': { 'Benchmark\\': 'src/' } } }, null, 2)}\n`);
  const batchSize = 250;
  for (let start = 0; start < fileCount; start += batchSize) {
    const end = Math.min(fileCount, start + batchSize);
    await Promise.all(Array.from({ length: end - start }, (_, offset) => {
      const index = start + offset; const name = `Fixture${String(index).padStart(6, '0')}`;
      const source = `<?php\ndeclare(strict_types=1);\nnamespace Benchmark;\nfinal class ${name} { public function id(): int { return ${index}; } public function next(): self { return $this; } }\n`;
      return writeFile(join(sourceRoot, `${name}.php`), source);
    }));
  }
}
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
