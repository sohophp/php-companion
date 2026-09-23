import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { analyzeSymfonyServiceYaml, symfonyYamlServiceReferenceAt, symfonyYamlServiceReferences } from '../src/index.js';

async function fixture(name: string): Promise<string> {
  return readFile(new URL(`./fixtures/acceptance/${name}`, import.meta.url), 'utf8');
}

describe('F09 Symfony service acceptance fixtures', () => {
  it('F09-SVC-01 resolves an exact YAML service ID reference to one declaration', async () => {
    const source = await fixture('f09-service-valid.yaml');
    const facts = analyzeSymfonyServiceYaml('file:///config/services.yaml', source);
    const declaration = facts.services.find((service) => service.id === 'app.mailer');
    const reference = symfonyYamlServiceReferenceAt(source, source.indexOf('@app.mailer') + 4);
    expect(facts.complete).toBe(true);
    expect(declaration).toBeDefined();
    expect(source.slice(declaration!.start, declaration!.end)).toBe('app.mailer');
    expect(reference).toBeDefined();
    expect(source.slice(reference!.start, reference!.end)).toBe('app.mailer');
    expect(reference!.value).toBe(declaration!.id);
  });

  it('F09-SVC-02 rejects valid escaped and expression literals as service references', async () => {
    const source = await fixture('f09-service-literal-counterexample.yaml');
    expect(analyzeSymfonyServiceYaml('file:///config/services.yaml', source).complete).toBe(true);
    expect(symfonyYamlServiceReferenceAt(source, source.indexOf('@@app.mailer') + 4)).toBeUndefined();
    expect(symfonyYamlServiceReferenceAt(source, source.indexOf('service("app.mailer")') + 12)).toBeUndefined();
    expect(symfonyYamlServiceReferences(source)).toEqual([]);
  });

  it('F09-SVC-03 suppresses facts and references for incomplete YAML', async () => {
    const source = await fixture('f09-service-incomplete.yaml');
    const facts = analyzeSymfonyServiceYaml('file:///config/services.yaml', source);
    expect(facts.complete).toBe(false);
    expect(facts.services).toEqual([]);
    expect(symfonyYamlServiceReferences(source)).toEqual([]);
  });
});
