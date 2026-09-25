import { describe, expect, it } from 'vitest';
import { composerRequiresSymfony, createRestartBudget, resolveLanguageServerActivation } from '../../src/extension/languageServerPolicy.js';

describe('language server restart policy', () => {
  it('allows three restarts in a minute and stops a crash loop', () => {
    let timestamp = 1_000;
    const budget = createRestartBudget({ now: () => timestamp });
    expect([budget.recordClose(), budget.recordClose(), budget.recordClose()].map((item) => item.restart)).toEqual([true, true, true]);
    expect(budget.recordClose()).toEqual({ restart: false, recentCloses: 4 });
    timestamp += 60_000;
    expect(budget.recordClose()).toEqual({ restart: true, recentCloses: 1 });
  });
});

describe('Symfony project detection', () => {
  it('recognizes framework projects without treating individual components as full Symfony applications', () => {
    expect(composerRequiresSymfony({ require: { 'symfony/framework-bundle': '^7.4' } })).toBe(true);
    expect(composerRequiresSymfony({ 'require-dev': { 'SYMFONY/SYMFONY': '^7.4' } })).toBe(true);
    expect(composerRequiresSymfony({ require: { 'symfony/console': '^7.4' } })).toBe(false);
    expect(composerRequiresSymfony({ require: [] })).toBe(false);
  });
});

describe('language server activation policy', () => {
  it('starts by default when SoPHP is the only general PHP language server', () => {
    expect(resolveLanguageServerActivation({ enabled: true, explicitlyConfigured: false, competingServerInstalled: false }))
      .toEqual({ start: true, blockedByCompetingServer: false });
  });

  it('preserves an existing Intelephense workflow until the user makes an explicit choice', () => {
    expect(resolveLanguageServerActivation({ enabled: true, explicitlyConfigured: false, competingServerInstalled: true }))
      .toEqual({ start: false, blockedByCompetingServer: true });
    expect(resolveLanguageServerActivation({ enabled: true, explicitlyConfigured: true, competingServerInstalled: true }))
      .toEqual({ start: true, blockedByCompetingServer: false });
  });

  it('honors an explicit disabled setting regardless of installed extensions', () => {
    expect(resolveLanguageServerActivation({ enabled: false, explicitlyConfigured: true, competingServerInstalled: false }))
      .toEqual({ start: false, blockedByCompetingServer: false });
  });
});
