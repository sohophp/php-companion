import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'; import { tmpdir } from 'node:os'; import { join } from 'node:path'; import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest'; import { collectWinstarModuleRouteFacts } from '../src/index.js';

describe('Winstar module route provider', () => {
  const roots: string[] = []; afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));
  it('intersects runtime routes with exact and generated YAML declarations', async () => {
    const root = await mkdtemp(join(tmpdir(), 'winstar-routes-')); roots.push(root); const routes = join(root, 'src', 'Modules', 'Admin', 'Routes'); await mkdir(routes, { recursive: true });
    const direct = join(routes, 'routes.yaml'); const defaults = join(routes, 'admin_defaults.yaml');
    await writeFile(direct, "- name: 'admin.login'\n  path: /login\n"); await writeFile(defaults, 'admin_defaults:\n  - name: CompanyPage\n');
    const facts = await collectWinstarModuleRouteFacts(root, { 'admin.login': { path: '/control/login' }, 'admin.CompanyPage.edit': { path: '/control/CompanyPage/edit/{id}' }, disabled: { path: '/disabled' } });
    expect(facts.map(({ name, path }) => [name, path])).toEqual([['admin.CompanyPage.edit', '/control/CompanyPage/edit/{id}'], ['admin.login', '/control/login']]);
    expect(facts[0]).toMatchObject({ uri: pathToFileURL(defaults).toString(), start: 26, end: 37 });
    expect(facts[1]).toMatchObject({ uri: pathToFileURL(direct).toString(), start: 9, end: 20 });
  });
  it('rejects malformed YAML files instead of publishing partial names', async () => {
    const root = await mkdtemp(join(tmpdir(), 'winstar-routes-')); roots.push(root); const routes = join(root, 'src', 'Modules', 'Broken', 'Routes'); await mkdir(routes, { recursive: true });
    await writeFile(join(routes, 'routes.yaml'), '- name: [broken\n'); expect(await collectWinstarModuleRouteFacts(root, { broken: { path: '/' } })).toEqual([]);
  });
  it('keeps duplicate possible declarations ambiguous even when runtime has one name', async () => {
    const root = await mkdtemp(join(tmpdir(), 'winstar-routes-')); roots.push(root);
    for (const module of ['One', 'Two']) { const routes = join(root, 'src', 'Modules', module, 'Routes'); await mkdir(routes, { recursive: true }); await writeFile(join(routes, 'routes.yaml'), '- name: duplicate\n'); }
    expect(await collectWinstarModuleRouteFacts(root, { duplicate: { path: '/' } })).toEqual([]);
  });
});
