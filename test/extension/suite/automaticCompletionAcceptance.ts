import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { pressWorkbenchEnter, typeWorkbenchText, visibleCompletionState } from './c1Ui.js';

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const port = Number(process.env.PHP_COMPANION_TEST_C1_DEBUG_PORT); assert.ok(port > 0);
  const results: object[] = [];
  const observations: object[] = [];
  let document: vscode.TextDocument, editor: vscode.TextEditor, original: string, name: string;

  async function open(caseName: string, marked: string): Promise<void> {
    name = caseName; observations.length = 0;
    const offset = marked.indexOf('§'); assert.ok(offset >= 0);
    original = marked.replace('§', '');
    const uri = vscode.Uri.joinPath(folder!.uri, 'src', `Automatic${caseName}.php`);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
    document = await vscode.workspace.openTextDocument(uri); editor = await vscode.window.showTextDocument(document);
    const position = document.positionAt(offset); editor.selection = new vscode.Selection(position, position);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    console.log('Automatic completion case: ' + caseName);
  }

  async function type(value: string): Promise<void> {
    for (const character of value) {
      const source = document.getText(), start = document.offsetAt(editor.selection.start), end = document.offsetAt(editor.selection.end);
      const expected = source.slice(0, start) + character + source.slice(end);
      await typeWorkbenchText(port, character);
      const deadline = Date.now() + 5_000;
      while (document.getText() !== expected && Date.now() < deadline) await new Promise(done => setTimeout(done, 20));
      assert.equal(document.getText(), expected, `Workbench text mismatch for ${name}/${JSON.stringify(character)}`);
    }
  }

  async function select(start: number, end: number): Promise<void> {
    editor.selection = new vscode.Selection(document.positionAt(start), document.positionAt(end));
    // Flush the Extension Host selection to the renderer before CDP input.
    // This command does not request or manually trigger completion.
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  }

  async function observe(phase: string, ready: (labels: string[]) => boolean, empty = false): Promise<void> {
    const started = Date.now(), deadline = started + 10_000;
    const transitions: object[] = []; let previous = '', clearSince: number | undefined;
    while (Date.now() < deadline) {
      const state = await visibleCompletionState(port);
      const signature = JSON.stringify(state);
      if (signature !== previous) { transitions.push({ elapsedMs: Date.now() - started, ...state }); previous = signature; }
      if (ready(state.labels) && (!empty || !state.visible)) {
        clearSince ??= Date.now();
        if (!empty || Date.now() - clearSince >= 500) {
          observations.push({ phase, afterLastKeyMs: Date.now() - started, transitions, ...state }); return;
        }
      } else clearSince = undefined;
      await new Promise(done => setTimeout(done, 30));
    }
    console.log('Automatic completion failure: ' + JSON.stringify({ name, phase, text: document.getText(), transitions }));
    assert.fail(`Automatic completion did not settle for ${name}/${phase}`);
  }

  async function finish(): Promise<void> {
    assert.equal(Buffer.from(await vscode.workspace.fs.readFile(document.uri)).toString(), original);
    results.push({ name, observations: [...observations], text: document.getText(), version: document.version, diskUnchanged: true });
  }

  async function accept(prefix: string, label: string): Promise<void> {
    const source = document.getText(), offset = document.offsetAt(editor.selection.active);
    assert.equal(source.slice(offset - prefix.length, offset), prefix);
    const accepted = source.slice(0, offset - prefix.length) + label + source.slice(offset);
    await pressWorkbenchEnter(port);
    const deadline = Date.now() + 5_000;
    while (document.getText() !== accepted && Date.now() < deadline) await new Promise(done => setTimeout(done, 20));
    assert.equal(document.getText(), accepted, `Natural acceptance text for ${name}/${label}`);
    const caretOffset = document.offsetAt(editor.selection.active);
    assert.equal(caretOffset, offset - prefix.length + label.length);
    assert.equal(editor.selection.isEmpty, true);
    observations.push({ phase: `accept ${label}`, exactText: true, caretMatched: true, text: accepted, caretOffset });
  }

  for (const [caseName, partial, rest, keyword, excluded] of [
    ['Function', 'func', 'tion', 'function', 'function_exists'],
    ['Class', 'clas', 's', 'class', 'class_exists'],
    ['Enum', 'enu', 'm', 'enum', 'enum_exists'],
  ] as const) {
    await open(caseName, '<?php\n§\n'); await type(partial);
    await observe(partial, labels => labels[0]?.startsWith(keyword) === true && !labels.some(label => label.includes(excluded)));
    await type(rest);
    await observe(keyword, labels => labels[0]?.startsWith(keyword) === true && !labels.some(label => label.includes(excluded)));
    await type(' z'); await observe('declaration name', labels => labels.length === 0, true); await finish();
  }

  await open('Member', '<?php\nclass AutomaticMemberHost {\n    §\n}\n'); await type('pu');
  await observe('public', labels => labels[0]?.startsWith('public') === true && !labels.some(label => /putenv|PHP_URL_/u.test(label)));
  await type('blic function __con');
  await observe('magic name', labels => labels[0]?.startsWith('__construct') === true && !labels.some(label => /func_get_arg|PHP_URL_/u.test(label)));
  await pressWorkbenchEnter(port);
  assert.ok(document!.getText().includes('public function __construct()')); await finish();

  await open('Types', '<?php namespace AutomaticTypes; class ShortCurrent {} class ShallowCurrent {} class OtherCurrent {} function make():void{new §;}');
  await type('Sh');
  await observe('short type', labels => labels.some(label => label.startsWith('ShortCurrent')) && labels.some(label => label.startsWith('ShallowCurrent'))
    && !labels.some(label => label.startsWith('Shmop')));
  const typeEnd = document!.offsetAt(editor!.selection.active);
  await select(typeEnd - 2, typeEnd); await type('Ot');
  await observe('changed type', labels => labels[0]?.startsWith('OtherCurrent') === true && !labels.some(label => /ShortCurrent|ShallowCurrent/u.test(label)));
  const otherEnd = document!.offsetAt(editor!.selection.active);
  await select(otherEnd - 2, otherEnd); await type('Sh');
  await observe('restored type', labels => labels.some(label => label.startsWith('ShortCurrent')) && labels.some(label => label.startsWith('ShallowCurrent'))
    && !labels.some(label => /OtherCurrent|Shmop/u.test(label)));
  await type('o'); await observe('narrow type', labels => labels[0]?.startsWith('ShortCurrent') === true && !labels.some(label => label.includes('ShallowCurrent'))); await finish();

  await open('Arguments', '<?php namespace AutomaticArguments; function needBool(bool $value):void{} function needText(string $value):void{} function work(bool $firstBool,string $firstText):void{needBool(§);}');
  await type('$f'); await observe('bool argument', labels => labels[0]?.startsWith('$firstBool') === true && labels.some(label => label.startsWith('$firstText')));
  const calleeStart = document!.getText().lastIndexOf('needBool(');
  await select(calleeStart, calleeStart + 'needBool'.length); await type('needText');
  const valueStart = document!.getText().lastIndexOf('$f');
  await select(valueStart, valueStart + 2); await type('$f');
  await observe('string argument', labels => labels[0]?.startsWith('$firstText') === true && labels.some(label => label.startsWith('$firstBool'))); await finish();

  if (process.env.SOPHP_ROOT_IMPORT_FLOW === '1') {
    await open('RootImport', '<?php namespace AutomaticRootImport; §;'); await type('use ArrayOb');
    await observe('root type', labels => labels[0]?.startsWith('ArrayObject') === true);
    await type('ject as strl'); await observe('import alias name', labels => labels.length === 0, true); await finish();
  }

  if (process.env.SOPHP_LIVE_TYPE_FLOW === '1') {
    const dependencyUri = vscode.Uri.joinPath(folder.uri, 'src', 'AutomaticLiveDependency.php');
    const dependencySource = '<?php namespace App; class AutomaticLiveDependency {}';
    await vscode.workspace.fs.writeFile(dependencyUri, Buffer.from(dependencySource));
    await open('LiveType', '<?php namespace App; function buildLive():void{new §;}');
    const prefix = 'AutomaticLiveDep';
    await type(prefix);
    await observe('cold class', labels => labels[0]?.startsWith('AutomaticLiveDependency') === true);
    const dependencyDocument = await vscode.workspace.openTextDocument(dependencyUri);
    async function changeDependency(source: string): Promise<void> {
      const edit = new vscode.WorkspaceEdit();
      edit.replace(dependencyUri, new vscode.Range(dependencyDocument.positionAt(0),
        dependencyDocument.positionAt(dependencyDocument.getText().length)), source);
      assert.equal(await vscode.workspace.applyEdit(edit), true);
      assert.equal(dependencyDocument.getText(), source);
      const end = document.offsetAt(editor.selection.active);
      await select(end - prefix.length, end); await type(prefix);
    }
    await changeDependency(dependencySource.replace('class', 'interface'));
    await observe('unsaved interface withdraws construction', labels => labels.length === 0, true);
    await changeDependency(dependencySource);
    await observe('restored class', labels => labels[0]?.startsWith('AutomaticLiveDependency') === true);
    assert.equal(Buffer.from(await vscode.workspace.fs.readFile(dependencyUri)).toString(), dependencySource);
    await finish();
    Object.assign(results.at(-1)!, { dependencyDiskUnchanged: true, dependencyFinalText: dependencyDocument.getText() });
  }

  if (process.env.SOPHP_NAMESPACE_IMPORT_FLOW === '1') {
    const directory = vscode.Uri.joinPath(folder.uri, 'src', 'AutomaticImportTree', 'Nested');
    await vscode.workspace.fs.createDirectory(directory);
    const dependencies = ['ChildEntity', 'OtherEntity'].map(typeName => ({
      uri: vscode.Uri.joinPath(directory, `${typeName}.php`),
      source: `<?php namespace App\\AutomaticImportTree\\Nested; class ${typeName} {}`,
    }));
    for (const dependency of dependencies) await vscode.workspace.fs.writeFile(dependency.uri, Buffer.from(dependency.source));
    const namespacePrefix = 'AutomaticImportT';
    for (const kind of ['class', 'group', 'function', 'const'] as const) {
      // Define this symbol catalog once; repeated declarations across consumer
      // files would make the fixture an invalid PHP project.
      const catalog = kind === 'class' ? 'namespace App\\AutomaticImportTree\\Nested; function childFactory():void{} function otherFactory():void{} const CHILD_FLAG=1; const OTHER_FLAG=2; ' : '';
      const header = `<?php ${catalog}namespace AutomaticImportConsumer${kind}; `;
      await open(`Namespace${kind}`, header + (kind === 'group' ? 'use App\\AutomaticImportTree\\{§};'
        : `use ${kind === 'class' ? '' : `${kind} `}App\\§;`));
      if (kind !== 'group') {
        await type(namespacePrefix);
        await observe('namespace segment', labels => labels[0]?.startsWith('AutomaticImportTree\\') === true);
        await accept(namespacePrefix, 'AutomaticImportTree\\');
      }
      await type('Nest');
      await observe('nested namespace', labels => labels[0]?.startsWith('Nested\\') === true);
      await accept('Nest', 'Nested\\');
      const prefix = kind === 'function' ? 'childF' : kind === 'const' ? 'CHILD_' : 'Chi';
      const label = kind === 'function' ? 'childFactory' : kind === 'const' ? 'CHILD_FLAG' : 'ChildEntity';
      await type(prefix);
      await observe('next segment symbol', labels => labels[0]?.startsWith(label) === true
        && !labels.some(value => /strlen|array_map|OTHER_FLAG|otherFactory|OtherEntity/u.test(value))
        && labels.filter(value => value.startsWith(label)).length === 1);
      if (kind === 'class') {
        const end = document!.offsetAt(editor!.selection.active);
        await select(end - prefix.length, end); await type('Oth');
        await observe('changed segment', labels => labels[0]?.startsWith('OtherEntity') === true && !labels.some(value => value.includes('ChildEntity')));
        const changedEnd = document!.offsetAt(editor!.selection.active);
        await select(changedEnd - 3, changedEnd); await type(prefix);
        await observe('restored segment', labels => labels[0]?.startsWith(label) === true && !labels.some(value => value.includes('OtherEntity')));
      }
      await accept(prefix, label);
      await type(' as strl'); await observe('namespace import alias name', labels => labels.length === 0, true);
      await finish();
    }
    for (const dependency of dependencies) assert.equal(Buffer.from(await vscode.workspace.fs.readFile(dependency.uri)).toString(), dependency.source);
  }

  const settings = vscode.workspace.getConfiguration('editor', { uri: document!.uri, languageId: 'php' });
  console.log('Automatic completion acceptance proof: ' + JSON.stringify({ platform: process.platform, vscodeVersion: vscode.version,
    context: 'ordinary single character Workbench input; no completion provider prewarming or explicit triggerSuggest',
    indexingMode: vscode.workspace.getConfiguration('phpCompanion', document!.uri).get('indexing.mode'),
    settings: { quickSuggestions: settings.get('quickSuggestions'), wordBasedSuggestions: settings.get('wordBasedSuggestions'),
      snippetSuggestions: settings.get('snippetSuggestions'), basicPhpSuggestions: vscode.workspace.getConfiguration('php').get('suggest.basic') }, results }));
}
