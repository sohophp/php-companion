import * as assert from 'node:assert';
import process from 'node:process';
import * as vscode from 'vscode';
import { pressWorkbenchEnter, pressWorkbenchTab, visibleCompletionLabels } from './c1Ui.js';

async function until<T>(read: () => Promise<T>, ready: (value: T) => boolean, reason: string): Promise<T> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const value = await read(); if (ready(value)) return value;
    await new Promise<void>(resolve => setTimeout(resolve, 50));
  }
  throw new Error(reason);
}

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const packProfile = process.env.PHP_COMPANION_TEST_C1_OPEN_SOURCE_PROFILE === '1';
  const requiredExtensions = ['sohophp.php-companion', 'sohophp.php-companion-symfony', 'sohophp.php-companion-open-source-pack',
    'sohophp.twig-plus', 'redhat.vscode-yaml', 'redhat.vscode-xml', 'xdebug.php-debug', 'junstyle.php-cs-fixer',
    'editorconfig.editorconfig', 'eiminsasete.apacheconf-snippets', 'neilbrayfield.php-docblocker'];
  if (packProfile) {
    for (const id of requiredExtensions) assert.ok(vscode.extensions.getExtension(id), `Missing Pack member: ${id}`);
    assert.ok(!vscode.extensions.getExtension('bmewburn.vscode-intelephense-client')
      && !vscode.extensions.getExtension('symfony.language-tools'), 'Competing PHP language server present');
  }
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const port = Number(process.env.PHP_COMPANION_TEST_C1_DEBUG_PORT); assert.ok(port > 0);
  const statements = '<?php\nfunction host(): void {\n    |\n}\n';
  const cases = [
    { name: 'if', prefix: 'if', marked: statements,
      body: 'if (condition) {\n        \n    }', first: 'condition', next: '' },
    { name: 'foreach', prefix: 'fore', marked: statements,
      body: 'foreach (iterable as $item) {\n        \n    }', first: 'iterable', next: '$item' },
    { name: 'try', prefix: 'try', marked: statements,
      body: 'try {\n        \n    } catch (\\Throwable $error) {\n        \n    }', first: '', next: '$error' },
    { name: 'function', prefix: 'func', marked: '<?php\n|\n',
      body: 'function name(parameters): void {\n    \n}', first: 'name', next: 'parameters' },
    { name: 'method', prefix: 'func', marked: '<?php\nclass Host {\n    public |\n}\n',
      body: 'function name(parameters): void {\n        \n    }', first: 'name', next: 'parameters' },
  ];
  const results = [];
  for (const item of cases) for (const key of ['Enter', 'Tab'] as const) {
    const uri = vscode.Uri.joinPath(folder.uri, 'src', `Template-${item.name}-${key}.php`);
    const source = item.marked.replace('|', item.prefix);
    const accepted = item.marked.replace('|', item.body);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);
    editor.options = { insertSpaces: true, tabSize: 4 };
    const position = document.positionAt(item.marked.indexOf('|') + item.prefix.length);
    const keyword = item.name === 'method' ? 'function' : item.name;
    const label = `${keyword} block`;
    await until(async () => await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', uri, position), list => list?.items.some(value => value.label === label) === true,
    `${item.name}: missing template Provider item`);
    editor.selection = new vscode.Selection(position, position);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const labels = await until(() => visibleCompletionLabels(port), values => values.some(value => value.startsWith(label)),
      `${item.name}: template not visible`);
    assert.ok(labels[0]?.startsWith(keyword) && !labels[0]?.startsWith(label), 'Template displaced the ordinary keyword');
    const targetIndex = labels.findIndex(value => value.startsWith(label));
    for (let index = 0; index < targetIndex; index++) await vscode.commands.executeCommand('selectNextSuggestion');
    if (key === 'Enter') await pressWorkbenchEnter(port); else await pressWorkbenchTab(port);
    await until(async () => document.getText(), text => text === accepted,
      `${item.name}/${key}: incorrect accepted text: ${JSON.stringify(document.getText())}`);
    assert.strictEqual(document.getText(editor.selection), item.first, `${item.name}/${key}: first placeholder`);
    await pressWorkbenchTab(port);
    assert.strictEqual(document.getText(editor.selection), item.next, `${item.name}/${key}: next placeholder`);
    await vscode.commands.executeCommand('leaveSnippet');
    await vscode.commands.executeCommand('undo');
    await until(async () => document.getText(), text => text === source, `${item.name}/${key}: Undo did not restore input`);
    await vscode.commands.executeCommand('redo');
    await until(async () => document.getText(), text => text === accepted, `${item.name}/${key}: Redo did not restore template`);
    results.push({ template: item.name, key, exactText: true, placeholders: true, undoRedo: true });
  }
  console.log(`Template acceptance proof: ${JSON.stringify({ phpVersion: process.env.PHP_COMPANION_TEST_C1_PHP_VERSION, packProfile,
    extensions: packProfile ? vscode.extensions.all.filter(value => !value.packageJSON.isBuiltin)
      .map(value => ({ id: value.id, version: value.packageJSON.version })) : undefined, results })}`);
}
