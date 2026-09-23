import { describe, expect, it } from 'vitest';
import { configuredPasteImportMode, configuredRenameFileMode } from '../../src/extension/legacySettings.js';

type Configuration = Parameters<typeof configuredRenameFileMode>[0];
type Value = { globalValue?: string; workspaceValue?: string; workspaceFolderValue?: string;
  globalLanguageValue?: string; workspaceLanguageValue?: string; workspaceFolderLanguageValue?: string; effective?: string };

function configuration(values: Record<string, Value>): Configuration {
  return {
    inspect: (key: string) => values[key] ? { key, ...values[key] } : undefined,
    get: (key: string, fallback?: string) => values[key]?.effective ?? fallback,
  } as Configuration;
}

describe('F14 Rename setting migration', () => {
  it('keeps the default file Rename preview when neither setting is explicit', () => {
    expect(configuredRenameFileMode(configuration({ 'rename.file': { effective: 'preview' } }))).toBe('preview');
  });

  it('honors the legacy never and whenMatched values', () => {
    expect(configuredRenameFileMode(configuration({ 'rename.syncFileName': { globalValue: 'never', effective: 'never' } }))).toBe('off');
    expect(configuredRenameFileMode(configuration({ 'rename.syncFileName': { workspaceValue: 'whenMatched', effective: 'whenMatched' } }))).toBe('preview');
  });

  it('lets an explicit new value override a legacy value', () => {
    expect(configuredRenameFileMode(configuration({
      'rename.file': { workspaceValue: 'always', effective: 'always' },
      'rename.syncFileName': { globalValue: 'never', effective: 'never' },
    }))).toBe('always');
    expect(configuredRenameFileMode(configuration({
      'rename.file': { globalValue: 'preview', effective: 'preview' },
      'rename.syncFileName': { workspaceFolderValue: 'never', effective: 'never' },
    }))).toBe('preview');
  });

  it('uses the effective language-specific value when present', () => {
    expect(configuredRenameFileMode(configuration({
      'rename.file': { workspaceValue: 'always', workspaceFolderLanguageValue: 'off', effective: 'off' },
      'rename.syncFileName': { globalValue: 'whenMatched', effective: 'whenMatched' },
    }))).toBe('off');
  });
});

describe('F14 Paste setting migration', () => {
  it('uses prompt by default', () => {
    expect(configuredPasteImportMode(configuration({ 'imports.onPaste': { effective: 'prompt' } }))).toBe('prompt');
  });

  it('translates all published legacy modes', () => {
    for (const [oldMode, newMode] of [['auto', 'auto'], ['preview', 'prompt'], ['off', 'off']] as const) {
      expect(configuredPasteImportMode(configuration({ 'pasteImports.mode': { globalValue: oldMode, effective: oldMode } }))).toBe(newMode);
    }
  });

  it('lets the explicit new mode override the legacy mode', () => {
    expect(configuredPasteImportMode(configuration({
      'imports.onPaste': { workspaceValue: 'auto', effective: 'auto' },
      'pasteImports.mode': { globalValue: 'off', effective: 'off' },
    }))).toBe('auto');
  });

  it('uses the effective language override', () => {
    expect(configuredPasteImportMode(configuration({
      'imports.onPaste': { workspaceValue: 'auto', workspaceFolderLanguageValue: 'off', effective: 'off' },
      'pasteImports.mode': { globalValue: 'preview', effective: 'preview' },
    }))).toBe('off');
  });
});
