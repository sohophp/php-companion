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

function resolveDescriptions(value: unknown, defaults: Record<string, unknown>): unknown {
  if (Array.isArray(value)) return value.map((item) => resolveDescriptions(item, defaults));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) =>
    [key, ['description', 'markdownDescription', 'deprecationMessage'].includes(key)
      ? resolveDescription(item, defaults) : resolveDescriptions(item, defaults)]));
  return value;
}

function resolveDescription(value: unknown, defaults: Record<string, unknown>): unknown {
  const key = typeof value === 'string' ? /^%([^%]+)%$/u.exec(value)?.[1] : undefined;
  return key ? defaults[key] : value;
}

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
      resolveDescriptions(Object.fromEntries(Object.entries(schema).filter(([key]) => key !== 'description' && key !== 'markdownDescription')), defaults)])),
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

  it('localizes all Core setting descriptions without changing their English baseline', async () => {
    const baseline = await readJson('docs/php-language-toolchain/reports/f14-setting-description-baseline-2026-09-23.json');
    const englishBaseline = baseline.english as Record<string, string>;
    const manifest = await readJson('package.json') as unknown as Manifest;
    const defaults = await readJson('package.nls.json');
    const chinese = await readJson('package.nls.zh-cn.json');
    const properties = manifest.contributes?.configuration?.properties ?? {};
    expect(baseline.schema).toBe(1);
    expect(Object.keys(properties)).toHaveLength(30);
    expect(Object.keys(englishBaseline)).toHaveLength(32);
    for (const [name, schema] of Object.entries(properties)) {
      const suffix = name.replace(/^phpCompanion\./u, '');
      const key = `config.${suffix}`;
      expect(schema.description, `${name} must use ${key}`).toBe(`%${key}%`);
      expect(defaults[key], `${key} English default`).toBe(englishBaseline[suffix]);
      expect(typeof chinese[key], `${key} Simplified Chinese`).toBe('string');
      expect(String(chinese[key]).trim()).not.toBe('');
    }
    const nested = properties['phpCompanion.routeProviders']?.items as { properties?: { cacheUntilInvalidated?: { description?: string } } } | undefined;
    expect(nested?.properties?.cacheUntilInvalidated?.description).toBe('%config.routeProviders.cacheUntilInvalidated%');
    expect(properties['phpCompanion.indexing.onStartup']?.deprecationMessage).toBe('%config.indexing.onStartup.deprecation%');
    for (const suffix of ['routeProviders.cacheUntilInvalidated', 'indexing.onStartup.deprecation']) {
      const key = `config.${suffix}`;
      expect(defaults[key]).toBe(englishBaseline[suffix]);
      expect(typeof chinese[key]).toBe('string');
      expect(String(chinese[key]).trim()).not.toBe('');
    }
  });
});
