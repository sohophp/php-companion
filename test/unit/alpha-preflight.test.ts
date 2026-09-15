import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

type PreflightModule = {
  parseExtensionList(source: string): Map<string, string>;
  extensionAssessment(manifest: { supportedExtensions: Array<{ id: string; version: string }>; artifacts?: Array<{ role: string; id: string; version: string }> }, installed: Map<string, string>): {
    missing: string[];
    mismatched: Array<{ id: string; expected: string; installed?: string }>;
    competingInstalled: string[];
    productMissing: string[];
    productMismatched: Array<{ id: string; expected: string; installed?: string }>;
    installedPacks: Array<{ id: string }>;
  };
  isWslEnvironment(environment: NodeJS.ProcessEnv, kernelRelease?: string): boolean;
  verifyCandidate(directory: string): Promise<{ artifacts: Array<{ file: string; valid: boolean }> }>;
};
const modulePath = '../../scripts/alpha-preflight.mjs';
let preflight: PreflightModule;
const commit = '1234567890abcdef1234567890abcdef12345678';

async function writeCandidate(root: string, contents: Buffer): Promise<string> {
  const specifications = [
    { role: 'core', id: 'sohophp.php-companion', file: 'php-companion.vsix' },
    { role: 'open-source-pack', id: 'sohophp.php-companion-open-source-pack', file: 'php-companion-open-source-pack.vsix' },
    { role: 'recommended-pack', id: 'sohophp.php-companion-recommended-pack', file: 'php-companion-recommended-pack.vsix' },
  ];
  const artifacts = await Promise.all(specifications.map(async (specification) => {
    await writeFile(join(root, specification.file), contents);
    return { ...specification, version: '0.4.5', bytes: contents.length,
      sha256: createHash('sha256').update(contents).digest('hex') };
  }));
  await writeFile(join(root, 'candidate.json'), JSON.stringify({
    schema: 1, channel: 'alpha', source: { clean: true, commit }, artifacts,
    supportedExtensions: [{ id: 'redhat.vscode-yaml', version: '1.24.0' }], rejectedExtensions: [],
  }));
  return specifications[0]!.file;
}

describe('Alpha preflight', () => {
  const roots: string[] = [];
  beforeAll(async () => { preflight = await import(modulePath) as PreflightModule; });
  afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

  it('parses exact extension versions and assesses missing, mismatched, and competing providers', () => {
    const installed = preflight.parseExtensionList('SOHOPHP.TWIG-PLUS@1.3.7\nredhat.vscode-yaml@1.23.0\nbmewburn.vscode-intelephense-client@1.0.0\ninvalid\n');
    const result = preflight.extensionAssessment({ supportedExtensions: [
      { id: 'sohophp.twig-plus', version: '1.3.7' },
      { id: 'redhat.vscode-yaml', version: '1.24.0' },
      { id: 'redhat.vscode-xml', version: '0.29.3' },
    ], artifacts: [
      { role: 'core', id: 'sohophp.php-companion', version: '0.4.5' },
      { role: 'open-source-pack', id: 'sohophp.php-companion-open-source-pack', version: '0.4.5' },
      { role: 'recommended-pack', id: 'sohophp.php-companion-recommended-pack', version: '0.4.5' },
    ] }, installed);
    expect(result.missing).toEqual(['redhat.vscode-xml']);
    expect(result.mismatched).toEqual([{ id: 'redhat.vscode-yaml', expected: '1.24.0', installed: '1.23.0' }]);
    expect(result.competingInstalled).toEqual(['bmewburn.vscode-intelephense-client']);
    expect(result.productMissing).toEqual(['sohophp.php-companion']);
    expect(result.installedPacks).toEqual([]);
  });

  it('detects WSL from either the environment or kernel release', () => {
    expect(preflight.isWslEnvironment({ WSL_DISTRO_NAME: 'Ubuntu' })).toBe(true);
    expect(preflight.isWslEnvironment({}, '6.6.87.2-microsoft-standard-WSL2')).toBe(true);
    expect(preflight.isWslEnvironment({}, '6.8.0-generic')).toBe(false);
  });

  it('verifies candidate artifact size and SHA-256', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-alpha-preflight-')); roots.push(root);
    const file = await writeCandidate(root, Buffer.from('verified-vsix'));
    await expect(preflight.verifyCandidate(root)).resolves.toMatchObject({
      artifacts: expect.arrayContaining([expect.objectContaining({ file, valid: true })]),
    });
  });

  it('rejects a candidate after an artifact changes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-alpha-preflight-tampered-')); roots.push(root);
    const original = Buffer.from('original');
    const file = await writeCandidate(root, original);
    await writeFile(join(root, file), 'tampered');
    await expect(preflight.verifyCandidate(root)).rejects.toThrow('artifact verification failed');
  });
});
