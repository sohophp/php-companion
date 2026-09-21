import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('bundled reference engine build identity', () => {
  it('tracks all engine bytes, is deterministic, and preserves source-map widths', async () => {
    const { ENGINE_BUILD_PLACEHOLDER, finalizeReferenceEngineBuild } = await import(pathToFileURL(resolve('scripts/reference-engine-build.mjs')).toString());
    const outputs = [
      { path: '/out/language-server.js', contents: Buffer.from(`const identity="${ENGINE_BUILD_PLACEHOLDER}";`) },
      { path: '/out/candidateWorker.js', contents: Buffer.from('worker-original') },
      { path: '/out/extension.js', contents: Buffer.from('editor-original') },
      { path: '/out/language-server.js.map', contents: Buffer.from('{"mappings":"AAAA"}') },
    ];
    const assets = new Map([['web-tree-sitter.wasm', Buffer.from('core')], ['tree-sitter-php.wasm', Buffer.from('php')]]);
    const first = finalizeReferenceEngineBuild(outputs, assets);
    expect(first.buildId).toMatch(/^[a-f0-9]{64}$/);
    expect(finalizeReferenceEngineBuild([...outputs].reverse(), assets).buildId).toBe(first.buildId);
    expect(first.files[0].contents.toString()).toContain(first.buildId);
    expect(first.files[0].contents.length).toBe(outputs[0]!.contents.length);
    expect(first.files[3].contents).toEqual(outputs[3]!.contents);
    for (const path of ['/out/language-server.js', '/out/candidateWorker.js']) {
      const changed = outputs.map((file) => file.path === path ? { ...file, contents: Buffer.concat([file.contents, Buffer.from('changed')]) } : file);
      expect(finalizeReferenceEngineBuild(changed, assets).buildId, path).not.toBe(first.buildId);
    }
    for (const name of assets.keys()) {
      expect(finalizeReferenceEngineBuild(outputs, new Map([...assets, [name, Buffer.from('changed')]])).buildId, name).not.toBe(first.buildId);
    }
    expect(finalizeReferenceEngineBuild(outputs.map((file) => file.path.endsWith('extension.js')
      ? { ...file, contents: Buffer.from('editor-changed') } : file), assets).buildId).toBe(first.buildId);
    expect(() => finalizeReferenceEngineBuild(outputs.slice(1), assets)).toThrow('Expected one engine output');
    expect(() => finalizeReferenceEngineBuild(outputs, new Map())).toThrow('Missing engine asset');
    expect(() => finalizeReferenceEngineBuild(outputs.map((file) => ({ ...file, contents: Buffer.from('no marker') })), assets))
      .toThrow('placeholder was not emitted');
  });
});
