import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface Manifest {
  publisher: string;
  name: string;
  activationEvents?: string[];
  contributes?: {
    commands?: Array<{ command: string; title: string; category?: string; enablement?: string }>;
    configuration?: { properties?: Record<string, Record<string, unknown>> };
  };
}

const readJson = async (path: string): Promise<Record<string, unknown>> =>
  JSON.parse(await readFile(resolve(path), 'utf8')) as Record<string, unknown>;

function publicContract(manifest: Manifest, defaults: Record<string, unknown>, chinese: Record<string, unknown>): Record<string, unknown> {
  const properties = manifest.contributes?.configuration?.properties ?? {};
  return {
    extensionId: `${manifest.publisher}.${manifest.name}`,
    activationEvents: manifest.activationEvents ?? [],
    commands: (manifest.contributes?.commands ?? []).map(({ title, ...command }) => {
      const key = /^%([^%]+)%$/u.exec(title)?.[1];
      expect(key, `${command.command} must reference a package.nls key`).toBeDefined();
      const english = defaults[key!]; const translation = chinese[key!];
      expect(typeof english, `${key} must have an English string`).toBe('string');
      expect(typeof translation, `${key} must have a Simplified Chinese string`).toBe('string');
      expect(String(translation).trim()).not.toBe('');
      return { ...command, title: english };
    }),
    configuration: Object.fromEntries(Object.entries(properties).map(([name, schema]) => [name,
      Object.fromEntries(Object.entries(schema).filter(([key]) => key !== 'description' && key !== 'markdownDescription'))])),
  };
}

describe('F14 public manifest baseline', () => {
  it('preserves the Core and Symfony command, activation and setting contracts', async () => {
    const baseline = await readJson('docs/php-language-toolchain/reports/f14-public-manifest-baseline-2026-09-23.json');
    expect(baseline.schema).toBe(1);
    const core = publicContract(await readJson('package.json') as unknown as Manifest,
      await readJson('package.nls.json'), await readJson('package.nls.zh-cn.json'));
    const symfony = publicContract(await readJson('packages/php-companion-symfony/package.json') as unknown as Manifest,
      await readJson('packages/php-companion-symfony/package.nls.json'),
      await readJson('packages/php-companion-symfony/package.nls.zh-cn.json'));
    expect(core).toEqual(baseline.core);
    expect(symfony).toEqual(baseline.symfony);
    const commands = [...(core.commands as Array<{ command: string; category?: string }>),
      ...(symfony.commands as Array<{ command: string; category?: string }>)];
    expect(new Set(commands.map(({ command }) => command)).size).toBe(commands.length);
    expect(commands.every(({ category }) => category?.startsWith('SoPHP'))).toBe(true);
  });
});
