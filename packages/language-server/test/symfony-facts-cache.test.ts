import { mkdtemp, mkdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeSymfonyContainerXml, analyzeSymfonyServiceYaml } from '@php-companion/framework-symfony';
import { SymfonyFactCache, symfonyFactCachePath } from '../src/symfonyFactsCache.js';

describe('persistent Symfony source facts', () => {
  const roots: string[] = [];
  afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

  it('restores unchanged YAML and compiled-container facts without reparsing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-symfony-cache-')); roots.push(root);
    const cacheDirectory = join(root, '.cache'); const configDirectory = join(root, 'config');
    const containerDirectory = join(root, 'var', 'cache', 'dev');
    await mkdir(configDirectory); await mkdir(containerDirectory, { recursive: true });
    const yamlPath = join(configDirectory, 'services.yaml'); const yamlUri = pathToFileURL(yamlPath).toString();
    const xmlPath = join(containerDirectory, 'App_KernelDevDebugContainer.xml'); const xmlUri = pathToFileURL(xmlPath).toString();
    await writeFile(yamlPath, 'services:\n  app.mailer:\n    class: App\\Mailer\n    public: true\n');
    await writeFile(xmlPath, '<?xml version="1.0"?><container><services><service id="app.mailer" class="App\\Mailer" public="true"/></services></container>');

    const cold = await SymfonyFactCache.open(cacheDirectory, root);
    expect((await cold.loadServiceYaml(yamlPath, yamlUri, (source) => analyzeSymfonyServiceYaml(yamlUri, source))).cached).toBe(false);
    expect((await cold.loadCompiledContainer(xmlPath, xmlUri, (source) => analyzeSymfonyContainerXml(xmlUri, source))).cached).toBe(false);
    await cold.commit();

    let yamlParses = 0; let xmlParses = 0;
    const hot = await SymfonyFactCache.open(cacheDirectory, root);
    const yaml = await hot.loadServiceYaml(yamlPath, yamlUri, (source) => { yamlParses += 1; return analyzeSymfonyServiceYaml(yamlUri, source); });
    const xml = await hot.loadCompiledContainer(xmlPath, xmlUri, (source) => { xmlParses += 1; return analyzeSymfonyContainerXml(xmlUri, source); });
    expect({ yamlCached: yaml.cached, xmlCached: xml.cached, yamlParses, xmlParses }).toEqual({ yamlCached: true, xmlCached: true, yamlParses: 0, xmlParses: 0 });
    expect(yaml.facts.services).toMatchObject([{ id: 'app.mailer', className: 'App\\Mailer' }]);
    expect(xml.facts.services).toMatchObject([{ id: 'app.mailer', className: 'App\\Mailer', origin: 'compiled' }]);
    await hot.commit();

    const originalMetadata = await stat(yamlPath);
    await writeFile(yamlPath, 'services:\n  app.mailer:\n    class: App\\Sender\n    public: true\n');
    await utimes(yamlPath, originalMetadata.atime, originalMetadata.mtime);
    let sameMetadataParses = 0;
    const sameMetadata = await SymfonyFactCache.open(cacheDirectory, root);
    const changed = await sameMetadata.loadServiceYaml(yamlPath, yamlUri, (source) => {
      sameMetadataParses += 1; return analyzeSymfonyServiceYaml(yamlUri, source);
    });
    expect({ cached: changed.cached, sameMetadataParses, className: changed.facts.services[0]?.className })
      .toEqual({ cached: false, sameMetadataParses: 1, className: 'App\\Sender' });

    let watchedParses = 0;
    const watched = await SymfonyFactCache.open(cacheDirectory, root);
    const refreshed = await watched.loadServiceYaml(yamlPath, yamlUri, (source) => {
      watchedParses += 1; return analyzeSymfonyServiceYaml(yamlUri, source);
    }, true);
    expect({ cached: refreshed.cached, watchedParses }).toEqual({ cached: false, watchedParses: 1 });
  });

  it('rebuilds only a tampered entry and rejects facts tied to another URI', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-symfony-corrupt-')); roots.push(root);
    const cacheDirectory = join(root, '.cache'); const configDirectory = join(root, 'config');
    const containerDirectory = join(root, 'var', 'cache', 'dev');
    await mkdir(configDirectory); await mkdir(containerDirectory, { recursive: true });
    const yamlPath = join(configDirectory, 'services.yaml'); const yamlUri = pathToFileURL(yamlPath).toString();
    const xmlPath = join(containerDirectory, 'App_KernelDevDebugContainer.xml'); const xmlUri = pathToFileURL(xmlPath).toString();
    await writeFile(yamlPath, 'services:\n  app.mailer:\n    class: App\\Mailer\n');
    await writeFile(xmlPath, '<?xml version="1.0"?><container><services><service id="app.mailer" class="App\\Mailer"/></services></container>');
    const cold = await SymfonyFactCache.open(cacheDirectory, root);
    await cold.loadServiceYaml(yamlPath, yamlUri, (source) => analyzeSymfonyServiceYaml(yamlUri, source));
    await cold.loadCompiledContainer(xmlPath, xmlUri, (source) => analyzeSymfonyContainerXml(xmlUri, source));
    await cold.commit();

    const cachePath = symfonyFactCachePath(cacheDirectory, root);
    const stored = JSON.parse(await readFile(cachePath, 'utf8')) as { entries: Record<string, { payload: { facts: { services: Array<{ className: string }> } } }> };
    stored.entries[yamlPath]!.payload.facts.services[0]!.className = 'Tampered\\Mailer';
    await writeFile(cachePath, JSON.stringify(stored));

    let yamlParses = 0; let xmlParses = 0;
    const recovered = await SymfonyFactCache.open(cacheDirectory, root);
    const yaml = await recovered.loadServiceYaml(yamlPath, yamlUri, (source) => { yamlParses += 1; return analyzeSymfonyServiceYaml(yamlUri, source); });
    const xml = await recovered.loadCompiledContainer(xmlPath, xmlUri, (source) => { xmlParses += 1; return analyzeSymfonyContainerXml(xmlUri, source); });
    expect({ yamlCached: yaml.cached, xmlCached: xml.cached, yamlParses, xmlParses }).toEqual({ yamlCached: false, xmlCached: true, yamlParses: 1, xmlParses: 0 });
    expect(yaml.facts.services[0]?.className).toBe('App\\Mailer');
    await recovered.commit();

    let uriMismatchParses = 0;
    const mismatched = await SymfonyFactCache.open(cacheDirectory, root);
    const remappedUri = `vscode-remote://wsl+ubuntu${yamlUri.slice('file://'.length)}`;
    const remapped = await mismatched.loadServiceYaml(yamlPath, remappedUri, (source) => {
      uriMismatchParses += 1; return analyzeSymfonyServiceYaml(remappedUri, source);
    });
    expect({ cached: remapped.cached, uriMismatchParses, uri: remapped.facts.services[0]?.uri })
      .toEqual({ cached: false, uriMismatchParses: 1, uri: remappedUri });
  });
});
