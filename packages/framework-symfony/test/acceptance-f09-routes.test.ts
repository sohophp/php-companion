import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { analyzeSymfonyRouteYaml, symfonyYamlRouteControllerAt } from '../src/index.js';

async function fixture(name: string): Promise<string> {
  return readFile(new URL(`./fixtures/acceptance/${name}`, import.meta.url), 'utf8');
}

describe('F09 Symfony route acceptance fixtures', () => {
  it('F09-ROUTE-01 resolves a literal route and its exact controller range', async () => {
    const source = await fixture('f09-route-valid.yaml');
    const facts = analyzeSymfonyRouteYaml('file:///config/routes.yaml', source);
    expect(facts.complete).toBe(true);
    expect(facts.routes).toHaveLength(1);
    const route = facts.routes[0]!;
    expect([route.name, route.path, source.slice(route.start, route.end)]).toEqual(['account.show', '/account/{id}', 'account.show']);
    expect(route.controller).toMatchObject({ className: 'App\\Controller\\AccountController', method: 'show' });
    expect(source.slice(route.controller!.classStart, route.controller!.classEnd)).toBe('App\\Controller\\AccountController');
    expect(symfonyYamlRouteControllerAt('file:///config/routes.yaml', source, source.indexOf('AccountController') + 4))
      .toMatchObject({ className: 'App\\Controller\\AccountController', method: 'show' });
  });

  it('F09-ROUTE-02 does not invent routes for a valid attribute directory import', async () => {
    const source = await fixture('f09-route-counterexample.yaml');
    const facts = analyzeSymfonyRouteYaml('file:///config/routes.yaml', source);
    expect(facts.complete).toBe(true);
    expect(facts.routes).toEqual([]);
    expect(facts.imports).toEqual([{ resource: '../src/Controller/', namePrefix: '', pathPrefix: '', attribute: true }]);
  });

  it('F09-ROUTE-03 does not claim a route with a dynamic path', async () => {
    const source = await fixture('f09-route-incomplete.yaml');
    const facts = analyzeSymfonyRouteYaml('file:///config/routes.yaml', source);
    expect(facts.complete).toBe(false);
    expect(facts.routes).toEqual([]);
  });
});
