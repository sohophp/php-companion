import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertPerformanceBudget, encodeLspMessage, generatePhpComposerProject, LspMessageDecoder, markedSource, PHP_VERSION_FIXTURES, summarizeDurations } from '../src/index.js';

describe('@php-companion/testkit', () => {
  it('removes named markers and preserves UTF-16 offsets', () => {
    const fixture = markedSource('<?php $x = "😀"; $x->/*@member*/run(/*@argument*/);');
    expect(fixture.source).toBe('<?php $x = "😀"; $x->run();');
    expect(fixture.source.slice(fixture.offset('member'))).toBe('run();');
    expect(fixture.source[fixture.offset('argument')]).toBe(')');
    expect(() => markedSource('/*@same*//*@same*/')).toThrow('Duplicate');
  });

  it('summarizes samples and enforces frozen scalar budgets', () => {
    expect(summarizeDurations([9, 1, 3, 2, 5])).toEqual({ samples: 5, p50: 3, p95: 9, maximum: 9 });
    expect(() => assertPerformanceBudget('hotQueryMs', 151)).toThrow('frozen budget');
    expect(() => assertPerformanceBudget('hotQueryMs', 150)).not.toThrow();
  });

  it('decodes fragmented and consecutive LSP frames', () => {
    const first = encodeLspMessage({ id: 1 }); const second = encodeLspMessage({ id: 2 }); const decoder = new LspMessageDecoder();
    expect(decoder.push(first.subarray(0, 8))).toEqual([]);
    expect(decoder.push(Buffer.concat([first.subarray(8), second]))).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('registers one representative fixture for every supported PHP minor', () => {
    expect(PHP_VERSION_FIXTURES.map((fixture) => fixture.version)).toEqual(['7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5']);
  });
  it('generates a deterministic Composer benchmark project', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-testkit-'));
    try {
      await generatePhpComposerProject(root, 2);
      expect(await readFile(join(root, 'composer.json'), 'utf8')).toContain('Benchmark\\\\');
      expect(await readFile(join(root, 'src', 'Fixture000001.php'), 'utf8')).toContain('return 1;');
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
