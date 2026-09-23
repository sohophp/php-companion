import type * as vscode from 'vscode';

export type RenameFileMode = 'off' | 'preview' | 'always';
export type PasteImportMode = 'auto' | 'prompt' | 'off';

type Configuration = Pick<vscode.WorkspaceConfiguration, 'get' | 'inspect'>;
type Inspected<T> = {
  globalValue?: T;
  workspaceValue?: T;
  workspaceFolderValue?: T;
  globalLanguageValue?: T;
  workspaceLanguageValue?: T;
  workspaceFolderLanguageValue?: T;
} | undefined;

function hasExplicitValue<T>(setting: Inspected<T>): boolean {
  return Boolean(setting && [
    setting.globalValue,
    setting.workspaceValue,
    setting.workspaceFolderValue,
    setting.globalLanguageValue,
    setting.workspaceLanguageValue,
    setting.workspaceFolderLanguageValue,
  ].some((value) => value !== undefined));
}

/** Keep the old file Rename preference when the replacement has no user value. */
export function configuredRenameFileMode(configuration: Configuration): RenameFileMode {
  if (hasExplicitValue(configuration.inspect<RenameFileMode>('rename.file'))) {
    const mode = configuration.get<RenameFileMode>('rename.file', 'preview');
    return mode === 'off' || mode === 'preview' || mode === 'always' ? mode : 'preview';
  }
  const legacy = configuration.inspect<'whenMatched' | 'never'>('rename.syncFileName');
  return hasExplicitValue(legacy) && configuration.get<'whenMatched' | 'never'>('rename.syncFileName') === 'never' ? 'off' : 'preview';
}

/** Translate the published pasteImports.mode values without rewriting user settings. */
export function configuredPasteImportMode(configuration: Configuration): PasteImportMode {
  if (hasExplicitValue(configuration.inspect<PasteImportMode>('imports.onPaste'))) {
    const mode = configuration.get<PasteImportMode>('imports.onPaste', 'prompt');
    return mode === 'auto' || mode === 'prompt' || mode === 'off' ? mode : 'prompt';
  }
  const legacy = configuration.inspect<'auto' | 'preview' | 'off'>('pasteImports.mode');
  if (!hasExplicitValue(legacy)) return 'prompt';
  const mode = configuration.get<'auto' | 'preview' | 'off'>('pasteImports.mode', 'preview');
  return mode === 'auto' || mode === 'off' ? mode : 'prompt';
}
