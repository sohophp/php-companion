import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import process from 'node:process';
import console from 'node:console';
import { setImmediate, setTimeout } from 'node:timers';

const [candidate] = process.argv.slice(2);
assert.ok(candidate, 'Provide the reviewed formatter development candidate');
const bundle = await readFile(path.join(candidate, 'index.js'), 'utf8');
const start = bundle.indexOf('var Dn=class extends as{');
const end = bundle.indexOf('exports.activate=', start);
assert.ok(start >= 0 && end > start);
class Position {
  constructor(line, character) { this.line = line; this.character = character; }
  translate(line, character) { return new Position(this.line + line, this.character + character); }
}
class Range { constructor(start, end) { this.start = start; this.end = end; } }
function document(root, text = '<?php\n$value=1;') {
  const lines = text.split('\n');
  return { uri: { scheme: 'file', fsPath: `${root}/Example.php` }, version: 1, isClosed: false,
    offsetAt: p => lines.slice(0, p.line).reduce((sum, line) => sum + line.length + 1, 0) + p.character,
    getText(range) { return range ? text.slice(this.offsetAt(range.start), this.offsetAt(range.end)) : text; },
    lineAt(line) { const index = typeof line === 'number' ? line : line.line;
      return { text: lines[index], lineNumber: index, range: new Range(new Position(index, 0), new Position(index, lines[index].length)) }; },
  };
}
function harness(method) {
  const bracket = method === 'doAutoFixByBracket';
  const doc = document('/project A', bracket ? '<?php\nclass C{\npublic function value(){return 1;}\n}' : undefined);
  const position = new Position(bracket ? 3 : 1, bracket ? 1 : doc.lineAt(1).text.length - 1);
  const calls = [], edits = [], commands = [], pending = [];
  let selections = [{ start: position, end: position, anchor: position, active: position }];
  const editor = { document: doc,
    get selection() { return selections[0]; },
    set selection(value) { selections = [{ ...value, anchor: value.anchor ?? value.start, active: value.active ?? value.end }]; },
    get selections() { return selections; },
    set selections(value) { selections = value; },
    async edit(callback) { callback({ replace: (range, text) => edits.push({ uri: doc.uri.fsPath, range, text }) }); return true; } };
  let beforeCommandReturn;
  const v = { window: { activeTextEditor: editor }, workspace: {
    getConfiguration: () => ({ get: (_key, fallback) => fallback }),
    workspaceFolders: [{ uri: { scheme: 'file', fsPath: '/project A' } }],
    getWorkspaceFolder: () => ({ uri: { scheme: 'file', fsPath: '/project A' } }),
  }, Position, Range, Uri: { joinPath: (uri, ...parts) => ({ scheme: 'file', fsPath: path.join(uri.fsPath, ...parts) }) },
  commands: { async executeCommand(command) {
    commands.push(command);
    if (command === 'editor.action.jumpToBracket') editor.selection = { start: new Position(1, 7), end: new Position(1, 7) };
    if (command === 'cursorUndo') editor.selection = { start: position, end: position };
    beforeCommandReturn?.(command);
  } } };
  const Formatter = runInNewContext(`${bundle.slice(start, end)};Dn`, { v, as: class {}, Ct: path,
    $e: { homedir: () => '/home/test' }, __dirname: candidate, process: { platform: 'linux', env: {} },
    In: '/tmp/fixer', yE: '/tmp/fixer2', console, setTimeout });
  const formatter = new Formatter();
  formatter.format = (source, uri) => { calls.push({ source, uri: uri.fsPath }); return new Promise(resolve => pending.push(resolve)); };
  const event = { document: doc, contentChanges: [{ text: bracket ? '}' : ';', range: new Range(position, position) }] };
  return { formatter, method, doc, editor, v, calls, edits, commands, pending, event,
    beforeCommandReturn(fn) { beforeCommandReturn = fn; },
    completeTyping() {
      if (!bracket) editor.selection = { start: position.translate(0, 1), end: position.translate(0, 1) };
    },
    start() { formatter[method](event); },
  };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const results = [];
for (const method of ['doAutoFixBySemicolon', 'doAutoFixByBracket']) {
  for (const state of ['different-document', 'no-editor']) {
    const h = harness(method);
    h.v.window.activeTextEditor = state === 'no-editor' ? undefined : { ...h.editor, document: document('/project B') };
    h.start(); await flush();
    assert.equal(h.calls.length, 0, `${method}/${state} must not invoke formatting for a background event`);
    assert.equal(h.commands.length, 0, `${method}/${state} must not move another editor's caret`);
    assert.equal(h.edits.length, 0); results.push({ method, state, passed: true });
  }
  for (const state of ['new-version', 'closed-document', 'focus-changed', 'selection-changed', 'multiple-selections', 'current']) {
    const h = harness(method);h.start();await flush();h.completeTyping();
    assert.equal(h.calls.length, 1, `${method}/${state} needs an actual deferred formatting request`);
    if (state === 'new-version') h.doc.version++;
    if (state === 'closed-document') h.doc.isClosed = true;
    if (state === 'focus-changed') h.v.window.activeTextEditor = { ...h.editor, document: document('/project B') };
    if (state === 'selection-changed') h.editor.selection = { start: new Position(1, 0), end: new Position(1, 4) };
    if (state === 'multiple-selections') h.editor.selections = [...h.editor.selections,
      { start: new Position(1, 0), end: new Position(1, 0), anchor: new Position(1, 0), active: new Position(1, 0) }];
    const source = h.calls[0].source;
    h.pending[0](source.replace('$value=1;', '$value = 1;').replace('class C{', 'class C\n{'));
    await flush();
    assert.equal(h.edits.length, state === 'current' ? 1 : 0, `${method}/${state} must preserve new content and unrelated editors`);
    if (state === 'current') assert.equal(h.edits[0].uri, h.doc.uri.fsPath);
    else assert.ok(!h.commands.includes('cancelSelection'), `${method}/${state} must preserve current selection`);
    results.push({ method, state, passed: true });
  }
  for (const state of ['failed-edit', 'focus-after-edit']) {
    const h = harness(method);
    if (state === 'failed-edit') h.editor.edit = async () => false;
    else {
      const originalEdit = h.editor.edit;
      h.editor.edit = async callback => {
        const applied = await originalEdit(callback);
        h.v.window.activeTextEditor = { ...h.editor, document: document('/project B') };
        return applied;
      };
    }
    h.start(); await flush(); h.completeTyping(); assert.equal(h.calls.length, 1);
    h.pending[0](h.calls[0].source.replace('$value=1;', '$value = 1;').replace('class C{', 'class C\n{'));
    await flush();
    assert.equal(h.edits.length, state === 'failed-edit' ? 0 : 1);
    assert.ok(!h.commands.includes('cancelSelection'), `${method}/${state} must not change selection after a failed edit or focus change`);
    results.push({ method, state, passed: true });
  }
}
for (const command of ['editor.action.jumpToBracket', 'cursorUndo']) {
  for (const state of ['new-version', 'focus-changed']) {
    const h = harness('doAutoFixByBracket');
    h.beforeCommandReturn(current => {
      if (current !== command) return;
      if (state === 'new-version') h.doc.version++;
      else h.v.window.activeTextEditor = { ...h.editor, document: document('/project B') };
    });
    h.start();await flush();assert.equal(h.calls.length,0);assert.equal(h.edits.length,0);
    if (command === 'editor.action.jumpToBracket') assert.ok(!h.commands.includes('cursorUndo'));
    results.push({ method: 'doAutoFixByBracket', command, state, passed: true });
  }
}
const selectionFixture = harness('doAutoFixBySemicolon');
for (const fixture of [
  { name: 'simultaneous-insertions', changes: [[1, 2, 1, 2, ';'], [1, 7, 1, 7, ';']],
    selections: [[1, 2, 1, 2], [1, 7, 1, 7]], expected: [[1, 3, 1, 3], [1, 9, 1, 9]] },
  { name: 'utf16-insertion', changes: [[0, 1, 0, 1, '😀']],
    selections: [[0, 3, 0, 3]], expected: [[0, 5, 0, 5]] },
  { name: 'multiline-selected-replacement', changes: [[1, 2, 2, 3, 'X\r\nYZ']],
    selections: [[1, 2, 2, 3]], expected: [[2, 2, 2, 2]] },
]) {
  const event = { contentChanges: fixture.changes.map(([line, character, endLine, endCharacter, text]) =>
    ({ range: new Range(new Position(line, character), new Position(endLine, endCharacter)), text })) };
  const selections = fixture.selections.map(([line, character, endLine, endCharacter]) =>
    ({ anchor: new Position(line, character), active: new Position(endLine, endCharacter) }));
  assert.deepEqual(JSON.parse(selectionFixture.formatter.selectionAfterChanges(event, selections)), fixture.expected);
  results.push({ method: 'selectionAfterChanges', state: fixture.name, passed: true });
}
console.log(JSON.stringify({ cases: results.length, results,
  scope: 'Exact reviewed formatter methods in a mocked VS Code/deferred-format boundary; not real CLI or editor UI acceptance' }));
