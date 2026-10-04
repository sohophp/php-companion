import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { pressWorkbenchEnter, pressWorkbenchTab, visibleCompletionLabels } from './c1Ui.js';

async function until<T>(read: () => PromiseLike<T>, ready: (value: T) => boolean): Promise<T> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) { const value = await read(); if (ready(value)) return value; await new Promise(done => setTimeout(done, 50)); }
  throw new Error('Timed out waiting for comparison condition completion acceptance');
}
export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const port = Number(process.env.PHP_COMPANION_TEST_C1_DEBUG_PORT); assert.ok(port > 0);
  const declarationDefaults = process.env.PHP_COMPANION_TEST_DECLARATION_DEFAULT_ONLY === '1';
  const defaultCallables = process.env.PHP_COMPANION_TEST_DEFAULT_CALLABLE_ONLY === '1';
  const constantInitializers = process.env.PHP_COMPANION_TEST_CONSTANT_INITIALIZER_ONLY === '1';
  const initializerExpressions = process.env.PHP_COMPANION_TEST_INITIALIZER_EXPRESSION_ONLY === '1';
  const functionIdentifiers = process.env.PHP_COMPANION_TEST_FUNCTION_IDENTIFIER_ONLY === '1';
  const typeTails = process.env.PHP_COMPANION_TEST_TYPE_TAIL_ONLY === '1';
  const unclosedCallables = process.env.PHP_COMPANION_TEST_UNCLOSED_CALLABLE_ONLY === '1';
  const mixedCallables = process.env.PHP_COMPANION_TEST_MIXED_CALLABLE_ONLY === '1';
  const assignmentComments = process.env.PHP_COMPANION_TEST_ASSIGNMENT_COMMENT_ONLY === '1';
  const unclosedShapes = process.env.PHP_COMPANION_TEST_UNCLOSED_SHAPE_ONLY === '1';
  const blankComments = process.env.PHP_COMPANION_TEST_BLANK_COMMENT_ONLY === '1';
  const shapeComments = process.env.PHP_COMPANION_TEST_SHAPE_COMMENT_ONLY === '1';
  const shapeValues = process.env.PHP_COMPANION_TEST_SHAPE_VALUE_ONLY === '1';
  const namedAttributeValues = process.env.PHP_COMPANION_TEST_NAMED_ATTRIBUTE_VALUE_ONLY === '1';
  const importPrefixes = process.env.PHP_COMPANION_TEST_IMPORT_PREFIX_ONLY === '1';
  const nativeHandles = process.env.PHP_COMPANION_TEST_NATIVE_HANDLE_ONLY === '1';
  const rootImports = process.env.PHP_COMPANION_TEST_ROOT_IMPORT_ONLY === '1';
  const importHeader = '<?php namespace ImportCatalog; class Invoice {} function createInvoice():void{} const API_KEY=1; namespace Consumer; $text="literal;😀"; /* 中文; trivia */\r\n';
  const cases: Array<{ prefix: string; label: string; forbidden: string; addCall: boolean; marked: string; suffix?: string; consume?: number }> = rootImports ? [
    {prefix:'Shm',label:'Shmop',forbidden:'shmop_open',addCall:false,consume:2,marked:'<?php namespace Consumer; use Shm§op;'},
    {prefix:'ArrayOb',label:'ArrayObject',forbidden:'array_map',addCall:true,consume:4,marked:'<?php namespace Consumer; $value=new \\ArrayOb§ject;'},
    {prefix:'strl',label:'strlen',forbidden:'ArrayObject',addCall:false,consume:2,marked:'<?php namespace Consumer; use function count as Existing, strl§en;'},
    {prefix:'Inv',label:'Invoice',forbidden:'strlen',addCall:false,suffix:'}',consume:5,marked:'<?php namespace RootImportCatalog; class Invoice {} namespace Consumer; use RootImportCatalog\\{/* { ; 中文😀 } */\r\nInv§oice};'},
  ] : nativeHandles ? [
    {prefix:'Sh',label:'Shmop',forbidden:'shmop_open',addCall:false,marked:'<?php function choose(\\Sh§ $value):void{}'},
    {prefix:'XMLP',label:'XMLParser',forbidden:'xml_parser_create',addCall:false,marked:'<?php function choose(\\XMLP§ $value):void{}'},
    {prefix:'Con',label:'Connection',forbidden:'ftp_connect',addCall:false,marked:'<?php function choose():\\FTP\\Con§{}'},
    {prefix:'Lo',label:'Lob',forbidden:'pg_lo_open',addCall:false,marked:'<?php namespace Consumer; use PgSql\\Lo§;'},
  ] : importPrefixes ? [
    {prefix:'Inv',label:'Invoice',forbidden:'createInvoice',addCall:false,marked:importHeader+'use ImportCatalog\\Inv§;'},
    {prefix:'Inv',label:'Invoice',forbidden:'createInvoice',addCall:false,suffix:'}',consume:1,marked:importHeader+'use ImportCatalog\\{Inv§};'},
    {prefix:'crea',label:'createInvoice',forbidden:'API_KEY',addCall:false,suffix:'}',consume:1,marked:importHeader+'use ImportCatalog\\{Invoice, function crea§};'},
    {prefix:'API_',label:'API_KEY',forbidden:'createInvoice',addCall:false,suffix:'}',consume:1,marked:importHeader+'use ImportCatalog\\{function createInvoice, const API_§};'},
  ] : typeTails ? [
    {prefix:'Cur',label:'Current',forbidden:'',addCall:false,
      marked:'<?php class Current {} class Other {} class Host { public Other|Cur§ $value; }'},
    {prefix:'Cur',label:'Current',forbidden:'',addCall:false,
      marked:'<?php class Current {} class Other {} function choose(Other|Cur§ $value):void {}'},
    {prefix:'Cur',label:'Current',forbidden:'',addCall:false,
      marked:'<?php class Current {} class Other {} function choose():Other|Cur§ {return new Current;}'},
    {prefix:'Cur',label:'Current',forbidden:'',addCall:false,
      marked:'<?php class Current {} class Other {} class Host { public function __construct(public Other|Cur§ $value) {} }'},
  ] : mixedCallables ? [
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:'<?php ?> <script>const data={a:[1]}; }])</script> <?php function choose():bool{return tr§'},
    {prefix:'',label:'$flag',forbidden:'',addCall:false,
      marked:'<?php function choose(string $text,bool $flag):bool{?> <main>汉字🙂{])</main> <?php return /* value */ §'},
    {prefix:'pick',label:'pickZ',forbidden:'',addCall:true,
      marked:"<?php function pickA($value=null):string{return 'x';} function pickZ($value=null):bool{return true;} $tag='?> {])'; $callback=function():bool{return pick§"},
    {prefix:'tit',label:'title',forbidden:'hidden',addCall:true,
      marked:"<?php class Item{public function title($value=null):string{return 'x';} private function hidden():void{}} function choose(Item $item):string{?> <main>{])</main> <?php return $item->tit§"},
  ] : unclosedCallables ? [
    {prefix:'',label:'$flag',forbidden:'',addCall:false,
      marked:'<?php function choose(string $text,bool $flag):bool{return /* value */ §'},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:'<?php class Host{public function choose(string $text,bool $flag):bool{return /* value */ tr§'},
    {prefix:'pick',label:'pickZ',forbidden:'',addCall:true,
      marked:"<?php function pickA($value=null):string{return 'x';} function pickZ($value=null):bool{return true;} $callback=function():bool{return pick§"},
    {prefix:'',label:'$flag',forbidden:'',addCall:false,
      marked:'<?php $callback=fn(string $text,bool $flag):bool=> /* value */ §'},
  ] : assignmentComments ? [
    {prefix:'pick',label:'pickZ',forbidden:'',addCall:true,
      marked:"<?php function pickA($value=null):string{return 'x';} function pickZ($value=null):bool{return true;} class Builder{public bool $enabled;} function run(Builder $builder){$builder /* owner */ -> enabled /* property */ = pick§;}"},
    {prefix:'pick',label:'pickZ',forbidden:'',addCall:true,
      marked:"<?php function pickA($value=null):string{return 'x';} function pickZ($value=null):bool{return true;} class Builder{public static bool $enabled;} function run(){Builder /* owner */ :: $enabled /* property */ = pick§;}"},
    {prefix:'pick',label:'pickZ',forbidden:'',addCall:true,
      marked:"<?php function pickA($value=null):string{return 'x';} function pickZ($value=null):bool{return true;} function run(bool $assigned){$assigned /* variable */ = pick§;}"},
    {prefix:'pick',label:'pickZ',forbidden:'',addCall:true,
      marked:"<?php function pickA($value=null):string{return 'x';} function pickZ($value=null):bool{return true;} class Builder{public bool $enabled{set(bool $value){}}} function run(Builder $builder){$builder /* owner */ -> enabled /* property */ = pick§;}"},
  ] : unclosedShapes ? [
    {prefix:'shapePick',label:'shapePickZ',forbidden:'',addCall:true,
      marked:"<?php function shapePickA($value=null):string{return 'x';} function shapePickZ($value=null):bool{return true;} /** @param array{enabled:bool} $config */ function send(array $config):void{} send(['enabled'=>shapePick§"},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:"<?php /** @param array{enabled:bool} $config */ function send(array $config):void{} send(['enabled'=> /* value */ tr§"},
    {prefix:'shapePick',label:'shapePickZ',forbidden:'',addCall:true,
      marked:"<?php function shapePickA($value=null):string{return 'x';} function shapePickZ($value=null):bool{return true;} /** @param array{nested:array{enabled:bool}} $config */ function send(array $config):void{} send(['nested'=>['enabled'=>shapePick§"},
    {prefix:'shapePick',label:'shapePickA',forbidden:'',addCall:true,
      marked:"<?php function shapePickA($value=null):string{return 'x';} function shapePickZ($value=null):bool{return true;} function inner(string $value):void{} /** @param array{enabled:bool} $config */ function send(array $config):void{} send(['enabled'=>inner(shapePick§"},
  ] : blankComments ? [
    {prefix:'',label:'$shapeZBool',forbidden:'',addCall:false,
      marked:"<?php /** @param array{enabled:bool} $config */ function send(array $config):void{} function run(string $shapeAText,bool $shapeZBool){send(['enabled'=> /* value */ §]);}"},
    {prefix:'',label:'$shapeZBool',forbidden:'',addCall:false,
      marked:"<?php function run(string $shapeAText,bool $shapeZBool):bool{return /* value */ §;}"},
    {prefix:'',label:'$shapeZBool',forbidden:'',addCall:false,
      marked:"<?php function inner(bool $flag):void{} function run(string $shapeAText,bool $shapeZBool){inner(/* value */ §);}"},
    {prefix:'',label:'$shapeZBool',forbidden:'flag:',addCall:false,
      marked:"<?php function inner(bool $flag):void{} function run(string $shapeAText,bool $shapeZBool){inner(flag: /* value */ §);}"},
  ] : shapeComments ? [
    {prefix:'shapePick',label:'shapePickZ',forbidden:'',addCall:true,
      marked:"<?php function shapePickA($value=null):string{return 'x';} function shapePickZ($value=null):bool{return true;} /** @param array{enabled:bool} $config */ function send(array $config):void{} send(['enabled' /* key */ => /* value */ shapePick§]);"},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:"<?php /** @param array{enabled:bool} $config */ function send(array $config):void{} send(['enabled' // key\n => tr§]);"},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:"<?php /** @param array{nested:array{enabled:bool}} $config */ function send(array $config):void{} send(['nested' /* key */ => ['enabled' => /* value */ tr§]]);"},
    {prefix:'PICK_',label:'PICK_Z_BOOL',forbidden:'',addCall:false,
      marked:"<?php const PICK_A_TEXT='x', PICK_Z_BOOL=true; /** @param array{enabled:bool} $config */ function send(array $config):void{} send(['enabled' /* key */ => PICK_§]);"},
  ] : shapeValues ? [
    {prefix:'shapePick',label:'shapePickZ',forbidden:'',addCall:true,
      marked:"<?php function shapePickA($value=null):string{return 'x';} function shapePickZ($value=null):bool{return true;} /** @param array{enabled:bool} $config */ function send(array $config):void{} send(['enabled'=>shapePick§]);"},
    {prefix:'PICK_',label:'PICK_Z_BOOL',forbidden:'',addCall:false,
      marked:"<?php const PICK_A_TEXT='x', PICK_Z_BOOL=true; /** @param array{enabled:bool} $config */ function send(array $config):void{} send(['enabled'=>PICK_§]);"},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:"<?php /** @param array{enabled:bool} $config */ function send(array $config):void{} send(['enabled'=>(tr§)]);"},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:"<?php /** @param array{enabled:bool} $config */ function send(array $config):void{} function inner(bool $value):bool{return $value;} send(['enabled'=>inner(tr§)]);"},
  ] : namedAttributeValues ? [
    {prefix:'tr',label:'true',forbidden:'flag:',addCall:false,
      marked:'<?php #[\\Attribute] class Host { public function __construct(string $text, bool $flag) {} } #[Host(flag: (tr§), text: "x")] class Tagged {}'},
    {prefix:'tr',label:'true',forbidden:'flag:',addCall:false,
      marked:'<?php #[\\Attribute] class Host { public function __construct(string $text, bool $flag) {} } #[Host /* ctor */ (flag: tr§, text: "x")] class Tagged {}'},
    {prefix:'rea',label:'Current::Ready',forbidden:'state:',addCall:false,
      marked:'<?php enum Current { case Ready; } #[\\Attribute] class Host { public function __construct(string $text, Current $state) {} } #[Host(state: rea§, text: "x")] class Tagged {}'},
    {prefix:'PICK_',label:'PICK_FLAG',forbidden:'flag:',addCall:false,
      marked:'<?php const PICK_TEXT = "x", PICK_FLAG = true; #[\\Attribute] class Host { public function __construct(bool $flag) {} } #[Host(flag: PICK_§)] class Tagged {}'},
  ] : functionIdentifiers ? [
    {prefix:'demo2',label:'demo2',forbidden:'',addCall:true,
      marked:'<?php function demo2($value = null) {} demo2§;'},
    {prefix:'demo2',label:'demo2_optional',forbidden:'',addCall:true,consume:'_optional'.length,
      marked:'<?php function demo2_optional($value = null) {} demo2§_optional;'},
    {prefix:'méth',label:'méthode2',forbidden:'throw',addCall:true,consume:'ode2'.length,
      marked:'<?php function méthode2($value = null) {} méth§ode2;'},
    {prefix:'demo2',label:'demo2_optional',forbidden:'',addCall:false,
      suffix:' /* before */ (/* inside */...)',consume:'_optional /* before */ (/* inside */)'.length,
      marked:'<?php function demo2_optional($value = null) {} const CALLBACK = demo2§_optional /* before */ (/* inside */);'},
  ] : initializerExpressions ? [
    {prefix:'strl',label:'strlen',forbidden:'',addCall:false,suffix:'(...)',
      marked:'<?php const CALLBACK = strl§;'},
    {prefix:'strl',label:'strlen',forbidden:'',addCall:false,suffix:'(...)',
      marked:'<?php #[Attr(strl§)] class Host {}'},
    {prefix:'tar',label:'target',forbidden:'',addCall:false,suffix:'(...)',
      marked:'<?php class Host { private static function target() {} const CALLBACK = self::tar§; }'},
    {prefix:'phpv',label:'phpversion',forbidden:'',addCall:true,
      marked:'<?php function choose() { static $value = phpv§; }'},
  ] : constantInitializers ? [
    {prefix:'tr',label:'true',forbidden:'readonly',addCall:false,
      marked:'<?php class Host { const bool VALUE = /* value */ tr§; }'},
    {prefix:'PICK_',label:'PICK_TEXT',forbidden:'',addCall:false,
      marked:'<?php const PICK_BOOL = true, PICK_TEXT = "ready"; class Host { const string VALUE = PICK_§; }'},
    {prefix:'PICK_',label:'PICK_INT',forbidden:'',addCall:false,
      marked:'<?php const PICK_BOOL = true, PICK_INT = 1, PICK_TEXT = "ready"; enum Current: int { case Ready = PICK_§; }'},
    {prefix:'PICK_',label:'PICK_TEXT',forbidden:'',addCall:false,
      marked:'<?php const PICK_BOOL = true, PICK_INT = 1, PICK_TEXT = "ready"; enum Current: string { case Ready = PICK_§; }'},
  ] : defaultCallables ? [
    {prefix:'strl',label:'strlen',forbidden:'',addCall:false,suffix:'(...)',
      marked:'<?php function choose($callback = strl§) {}'},
    {prefix:'strl',label:'strlen',forbidden:'',addCall:false,suffix:'(...)',
      marked:'<?php class Host { public $callback = strl§; }'},
    {prefix:'tar',label:'target',forbidden:'',addCall:false,suffix:'(...)',
      marked:'<?php class Host { private static function target() {} public $callback = self::tar§; }'},
    {prefix:'strl',label:'strlen',forbidden:'',addCall:false,suffix:'(...)',consume:2,
      marked:'<?php function choose($callback = strl§()) {}'},
  ] : declarationDefaults ? [
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:'<?php function choose(bool $flag = tr§): void {}'},
    {prefix:'fa',label:'false',forbidden:'',addCall:false,
      marked:'<?php class Host { public bool $flag = fa§; }'},
    {prefix:'rea',label:'Current::Ready',forbidden:'',addCall:false,
      marked:'<?php enum Current { case Ready; } class Host { public Current $state = rea§; }'},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:'<?php class Host { public function __construct(public bool $flag = tr§) {} }'},
  ] : [
    {prefix:'rea',label:'Current::Ready',forbidden:'try',addCall:false,
      marked:'<?php enum Current { case Ready; } function choose(Current $status): string { return match($status) { rea§ => "yes", default => "no" }; }'},
    {prefix:'rea',label:'Current::Ready',forbidden:'try',addCall:false,
      marked:'<?php enum Current { case Ready; } function choose(Current $status): string { switch($status) { case rea§: return "yes"; default: return "no"; } }'},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:'<?php function choose(bool $status): string { switch($status) { case tr§: return "yes"; default: return "no"; } }'},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:'<?php function choose(bool $status): string { return match($status) { tr§ => "yes", default => "no" }; }'},
  ];
  const results: object[] = [];
  for (const item of cases) for (const key of ['Enter', 'Tab'] as const) {
    console.log('Comparison condition case: ' + JSON.stringify({ index: cases.indexOf(item), key, marked: item.marked }));
    const uri = vscode.Uri.joinPath(folder.uri, 'src', `ComparisonCondition${cases.indexOf(item)}${key}.php`);
    const suffix = `${cases.indexOf(item)}${key}`;
    let marked = item.marked.replace(/\b(Current|choose|Host|CALLBACK)\b/g, name => `${name}${suffix}`)
      .replaceAll('PICK_', `PICK${suffix}_`);
    if (importPrefixes) marked = marked.replaceAll('ImportCatalog', `ImportCatalog${suffix}`);
    if (rootImports) marked = marked.replaceAll('RootImportCatalog', `RootImportCatalog${suffix}`);
    if (typeTails) marked = marked.replace('<?php ', `<?php namespace TypeTailGate${suffix}; `);
    if (shapeValues || shapeComments || blankComments || unclosedShapes || assignmentComments || unclosedCallables || mixedCallables) marked = marked.replace('<?php ', `<?php namespace ShapeGate${suffix}; `);
    if (functionIdentifiers) marked = marked.replace('<?php ', `<?php namespace FunctionGate${suffix}; `);
    const offset = marked.indexOf('§'); const source = marked.replace('§', '');
    const label = item.label.replace('Current', `Current${suffix}`).replace('PICK_', `PICK${suffix}_`);
    const prefix = item.prefix.replace('PICK_', `PICK${suffix}_`);
    const accepted = source.slice(0, offset - prefix.length) + label + (item.suffix ?? (item.addCall ? '()' : '')) + source.slice(offset + (item.consume ?? 0));
    await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
    const document = await vscode.workspace.openTextDocument(uri); const editor = await vscode.window.showTextDocument(document);
    const position = document.positionAt(offset); editor.selection = new vscode.Selection(position, position);
    const provided = await until(() => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, position),
      list => list?.items.some(value => value.label === label) === true);
    console.log('Comparison provided target: ' + JSON.stringify(provided.items.find(value => value.label === label)));
    if (item.forbidden) assert.equal(provided.items.some(value => value.label === item.forbidden), false);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    const visibleStarted = Date.now();
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    let lastLabels: string[] = [];
    const labels = await until(async () => { const next = await visibleCompletionLabels(port); if (JSON.stringify(next) !== JSON.stringify(lastLabels)) console.log('Comparison visible labels: ' + JSON.stringify(next)); lastLabels = next; return lastLabels; }, values => values.some(value => value.startsWith(label)));
    if (item.forbidden) assert.equal(labels.some(value => value.startsWith(item.forbidden)), false);
    const visibleMs = Date.now() - visibleStarted;
    assert.equal(labels.findIndex(value => value.startsWith(label)), 0, `Expected first visible candidate ${label}, got ${JSON.stringify(labels)}`);
    if (key === 'Enter') await pressWorkbenchEnter(port); else await pressWorkbenchTab(port);
    await until(async () => document.getText(), text => text === accepted);
    const caretExtra = (rootImports || importPrefixes) && item.suffix === '}' ? 0 : item.suffix?.length ?? (item.addCall ? 1 : 0);
    assert.equal(document.offsetAt(editor.selection.active), offset - prefix.length + label.length + caretExtra);
    assert.equal(editor.selection.isEmpty, true);
    await vscode.commands.executeCommand('undo'); await until(async () => document.getText(), text => text === source);
    await vscode.commands.executeCommand('redo'); await until(async () => document.getText(), text => text === accepted);
    assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), source);
    results.push({ label, key, visibleMs, visibleLabels: labels, acceptedText: accepted,
      caretOffset: document.offsetAt(editor.selection.active), exactText: true, caretMatched: true, addCall: item.addCall, undoRedo: true, diskUnchanged: true });
  }
  console.log('Comparison condition acceptance proof: ' + JSON.stringify({ platform: process.platform,
    context: rootImports ? 'root-imports-and-middle-word-ranges' : nativeHandles ? 'native-handle-type-references' : mixedCallables ? 'mixed-callable-values' : unclosedCallables ? 'unclosed-callable-values' : assignmentComments ? 'assignment-comment-values' : unclosedShapes ? 'unclosed-shape-values' : blankComments ? 'blank-comment-variables' : shapeComments ? 'shape-comment-values' : typeTails ? 'composite-type-positions' : shapeValues ? 'shape-field-values' : namedAttributeValues ? 'named-attribute-values' : functionIdentifiers ? 'function-identifiers' : initializerExpressions ? 'initializer-expressions' : constantInitializers ? 'constant-initializers'
      : defaultCallables ? 'declaration-callables' : declarationDefaults ? 'declaration-defaults' : 'comparison-conditions', results }));
}
