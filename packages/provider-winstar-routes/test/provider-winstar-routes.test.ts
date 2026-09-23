import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'; import { tmpdir } from 'node:os'; import { join } from 'node:path'; import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest'; import { collectWinstarModuleRouteFacts, type RuntimeRoute } from '../src/index.js';

describe('Winstar module route provider', () => {
  const roots: string[] = []; afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));
  const moduleRoute = (name: string, path: string): RuntimeRoute => ({ path, defaults: { _module_route_name: name, _module_route_file: 'symfony-module-routes' } });
  it('intersects runtime routes with exact and generated YAML declarations', async () => {
    const root = await mkdtemp(join(tmpdir(), 'winstar-routes-')); roots.push(root); const routes = join(root, 'src', 'Modules', 'Admin', 'Routes'); await mkdir(routes, { recursive: true });
    const direct = join(routes, 'routes.yaml'); const defaults = join(routes, 'admin_defaults.yaml');
    await writeFile(direct, "- name: 'admin.login'\n  path: /login\n  defaults: {_controller: 'App\\Controller\\LoginController::login'}\n"); await writeFile(defaults, 'admin_defaults:\n  - name: CompanyPage\n');
    const facts = await collectWinstarModuleRouteFacts(root, {
      'admin.login': moduleRoute('admin.login', '/control/login'),
      'admin.CompanyPage.edit': moduleRoute('admin.CompanyPage.edit', '/control/CompanyPage/edit/{id}'),
      disabled: moduleRoute('disabled', '/disabled'),
    });
    expect(facts.map(({ name, path }) => [name, path])).toEqual([['admin.CompanyPage.edit', '/control/CompanyPage/edit/{id}'], ['admin.login', '/control/login'], ['disabled', '/disabled']]);
    expect(facts[0]).toMatchObject({ uri: pathToFileURL(defaults).toString(), start: 26, end: 37 });
    expect(facts[1]).toMatchObject({ uri: pathToFileURL(direct).toString(), start: 9, end: 20, controller: {
      className: 'App\\Controller\\LoginController', method: 'login', uri: pathToFileURL(direct).toString(),
    } });
    const controller = facts[1]!.controller!; const source = await readFile(direct, 'utf8');
    expect(source.slice(controller.classStart, controller.classEnd)).toBe('App\\Controller\\LoginController');
    expect(source.slice(controller.methodStart, controller.methodEnd)).toBe('login');
  });
  it('keeps runtime names available without inventing a source for malformed YAML', async () => {
    const root = await mkdtemp(join(tmpdir(), 'winstar-routes-')); roots.push(root); const routes = join(root, 'src', 'Modules', 'Broken', 'Routes'); await mkdir(routes, { recursive: true });
    await writeFile(join(routes, 'routes.yaml'), '- name: [broken\n'); expect(await collectWinstarModuleRouteFacts(root, { broken: moduleRoute('broken', '/') })).toEqual([{ name: 'broken', path: '/' }]);
  });
  it('keeps duplicate possible declarations ambiguous even when runtime has one name', async () => {
    const root = await mkdtemp(join(tmpdir(), 'winstar-routes-')); roots.push(root);
    for (const module of ['One', 'Two']) { const routes = join(root, 'src', 'Modules', module, 'Routes'); await mkdir(routes, { recursive: true }); await writeFile(join(routes, 'routes.yaml'), '- name: duplicate\n'); }
    expect(await collectWinstarModuleRouteFacts(root, { duplicate: moduleRoute('duplicate', '/') })).toEqual([{ name: 'duplicate', path: '/' }]);
  });
  it('continues scanning modules after ordinary files in the module root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'winstar-routes-')); roots.push(root);
    for (const [module, name] of [['Alpha', 'alpha.route'], ['Zulu', 'zulu.route']] as const) {
      const routes = join(root, 'src', 'Modules', module, 'Routes'); await mkdir(routes, { recursive: true });
      await writeFile(join(routes, 'routes.yaml'), `- name: ${name}\n`);
    }
    await writeFile(join(root, 'src', 'Modules', 'README.md'), 'Module notes\n');
    const facts = await collectWinstarModuleRouteFacts(root, { 'alpha.route': moduleRoute('alpha.route', '/alpha'), 'zulu.route': moduleRoute('zulu.route', '/zulu') });
    expect(facts.map((route) => [route.name, Boolean(route.uri)])).toEqual([['alpha.route', true], ['zulu.route', true]]);
  });
  it('distinguishes explicit admin actions from generated defaults and requires runtime module provenance', async () => {
    const root = await mkdtemp(join(tmpdir(), 'winstar-routes-')); roots.push(root);
    const routes = join(root, 'src', 'Modules', 'Company', 'Routes'); await mkdir(routes, { recursive: true });
    const defaults = join(routes, 'admin_defaults.yaml'); const explicit = join(routes, 'admin.yaml');
    await writeFile(defaults, 'admin_defaults:\n  - name: CompanyPage\n');
    await writeFile(explicit, '- name: admin.CompanyPage.workflowStatus\n  path: /CompanyPage/{id}/workflow\n');
    const facts = await collectWinstarModuleRouteFacts(root, {
      'admin.CompanyPage.edit': moduleRoute('admin.CompanyPage.edit', '/control/CompanyPage/edit/{id}'),
      'admin.CompanyPage.workflowStatus': moduleRoute('admin.CompanyPage.workflowStatus', '/control/CompanyPage/{id}/workflow'),
      'admin.CompanyPage.other': moduleRoute('admin.CompanyPage.other', '/control/CompanyPage/other'),
      'admin.CompanyPage.add': { path: '/unrelated/CompanyPage/add' },
    });
    expect(facts.map(({ name, uri }) => [name, uri])).toEqual([
      ['admin.CompanyPage.add', undefined],
      ['admin.CompanyPage.edit', pathToFileURL(defaults).toString()],
      ['admin.CompanyPage.other', undefined],
      ['admin.CompanyPage.workflowStatus', pathToFileURL(explicit).toString()],
    ]);
  });
});
