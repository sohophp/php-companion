import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const header = `<?php function accept(bool $enabled):void{} function text(string $value):bool{return true;}
class Host { public function __construct(bool $enabled){} public function send(bool $enabled):void{} public static function save(bool $enabled):void{} }
`;
for (const retained of [false, true]) it.each([
  ['accept(tr§);', 'accept', 'true'],
  ['accept(\ntr§\n);', 'accept', 'true'],
  ['accept(text(tr§));', 'text', undefined],
  ['new Host(tr§);', 'Host', 'true'],
  ['Host::save(tr§);', 'save', 'true'],
  ['function run(Host $host){$host->send(tr§);}', 'send', 'true'],
  ['function run(){ $callback=accept(...); $callback(tr§); }', 'accept', 'true'],
  ['accept(tr§', 'accept', 'true'],
] as const)(`uses the proven call range without losing signature position (retained=${retained}): %s`, (tail, name, value) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///SignatureRange.php';
  try {
    const marked = header + '/** ' + 'documentation '.repeat(16000) + ' */\n' + tail;
    const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
    const revision = workspace.revision(); const snapshot = JSON.stringify(workspace.snapshot(uri));
    const signatures = workspace.signatures(uri, offset);
    expect(signatures[0]?.name).toBe(name); expect(signatures[0]?.activeParameter).toBe(0);
    expect(workspace.completeExpectedValues(uri, offset).some(item => item.label === 'true')).toBe(value === 'true');
    expect(workspace.revision()).toBe(revision); expect(JSON.stringify(workspace.snapshot(uri))).toBe(snapshot);
  } finally { workspace.dispose(); }
});
it('keeps arguments longer than a fixed prefix budget and does not match a formal parameter list', () => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///SignatureLong.php';
  try {
    const marked = header + 'accept(' + ' '.repeat(140000) + 'tr§);', offset = marked.indexOf('§');
    workspace.update(uri, marked.replace('§', ''), true);
    expect(workspace.signatures(uri, offset)[0]?.name).toBe('accept');
    const declaration = '<?php function accept(bool $enabled§){}', declarationOffset = declaration.indexOf('§');
    workspace.update(uri, declaration.replace('§', ''), true);
    expect(workspace.signatures(uri, declarationOffset)).toEqual([]);
  } finally { workspace.dispose(); }
});

for (const retained of [false, true]) it.each([
  ['accept(text("ok")§);', 'accept', 0],
  ['accept(text("ok"§));', 'text', 0],
  ['accept(text("ok"))§;', undefined, undefined],
  ['new Host(text("ok")§);', 'Host', 0],
  ['Host::save(text("ok")§);', 'save', 0],
  ['function run(Host $host){$host->send(text("ok")§);}', 'send', 0],
  ['new Host(new Host(true)§);', 'Host', 0],
  ['accept(text("(ok)")§);', 'accept', 0],
  ['two(text("ok"), §);', 'two', 1],
  ['accept(text("ok")§', 'accept', 0],
  ['accept(tr§', 'accept', 0],
] as const)(`switches back to the outer signature after a closed nested invocation (retained=${retained}): %s`, (tail, name, activeParameter) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///SignatureBoundary.php';
  try {
    const marked = header + 'function two(bool $first, bool $second):void{} ' + tail, offset = marked.indexOf('§');
    workspace.update(uri, marked.replace('§', ''), retained);
    const signatures = workspace.signatures(uri, offset);
    expect(signatures[0]?.name).toBe(name);
    expect(signatures[0]?.activeParameter).toBe(activeParameter);
  } finally { workspace.dispose(); }
});
