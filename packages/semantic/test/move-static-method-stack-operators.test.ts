import {afterAll, beforeAll, expect, it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => {parser = await PhpSyntaxParser.createDefault();});
afterAll(() => parser.dispose());
const root = 'file:///move-stack/';
const scenarios = [
  {
    "name": "echo string conversion",
    "body": "echo new \\Support\\Inspector();return \"stable\";",
    "support": "namespace Support; final class Inspector {public function __toString(): string {return \\debug_backtrace()[1][\"class\"];}}",
    "expectedSafe": false
  },
  {
    "name": "print string conversion",
    "body": "print new \\Support\\Inspector();return \"stable\";",
    "support": "namespace Support; final class Inspector {public function __toString(): string {return \\debug_backtrace()[1][\"class\"];}}",
    "expectedSafe": false
  },
  {
    "name": "clone hook",
    "body": "return (clone new \\Support\\Inspector())->value;",
    "support": "namespace Support; final class Inspector {public string $value=\"stable\"; public function __clone() {$this->value=\\debug_backtrace()[1][\"class\"];}}",
    "expectedSafe": false
  },
  {
    "name": "magic isset",
    "body": "return \\Support\\helper();",
    "support": "namespace Support; function helper(){return isset((new Inspector())->value)?\"source\":\"target\";} /** @property-read string $value */ final class Inspector {public function __isset($name):bool {return \\debug_backtrace()[2][\"class\"]===\\A\\Source::class;}}",
    "expectedSafe": false
  },
  {
    "name": "magic unset",
    "body": "return \\Support\\helper();",
    "support": "namespace Support; function helper(){$item=new Inspector();unset($item->value);return $item->result;} /** @property string $value */ final class Inspector {public string $result=\"stable\"; public function __unset($name):void {$this->result=\\debug_backtrace()[2][\"class\"];}}",
    "expectedSafe": false
  },
  {
    "name": "iterator foreach",
    "body": "foreach(new \\Support\\Inspector() as $key=>$value){return $key;}return \"empty\";",
    "support": "namespace Support; final class Inspector implements \\Iterator {private int $n=0; public function rewind():void {$this->n=0;} public function next():void {$this->n++;} public function valid():bool {return $this->n===0;} public function current():mixed {return \"stable\";} public function key():mixed {return \\debug_backtrace()[1][\"class\"];}}",
    "expectedSafe": false
  },
  {
    "name": "array access",
    "body": "return (new \\Support\\Inspector())[\"value\"];",
    "support": "namespace Support; final class Inspector implements \\ArrayAccess {public function offsetExists(mixed $key):bool {return true;} public function offsetGet(mixed $key):mixed {return \\debug_backtrace()[1][\"class\"];} public function offsetSet(mixed $key,mixed $value):void {} public function offsetUnset(mixed $key):void {}}",
    "expectedSafe": false
  },
  {
    "name": "plain echo",
    "body": "echo new \\Support\\Inspector();return \"stable\";",
    "support": "namespace Support; final class Inspector {public function __toString(): string {return \"stable\";}}",
    "expectedSafe": true
  },
  {
    "name": "plain clone",
    "body": "return (clone new \\Support\\Inspector())->value;",
    "support": "namespace Support; final class Inspector {public string $value=\"stable\"; public function __clone() {}}",
    "expectedSafe": true
  },
  {
    "name": "plain print",
    "body": "print new \\Support\\Inspector();return \"stable\";",
    "support": "namespace Support; final class Inspector {public function __toString(): string {return \"stable\";}}",
    "expectedSafe": true
  },
  {
    "name": "multiple echo operands trace",
    "body": "echo \"prefix\",new \\Support\\Inspector();return \"stable\";",
    "support": "namespace Support; final class Inspector {public function __toString(): string {return \\debug_backtrace()[1][\"class\"];}}",
    "expectedSafe": false
  },
  {
    "name": "plain multiple echo operands",
    "body": "echo \"prefix\",new \\Support\\Inspector();return \"stable\";",
    "support": "namespace Support; final class Inspector {public function __toString(): string {return \"stable\";}}",
    "expectedSafe": true
  },
  {
    "name": "plain magic isset with unused getter",
    "body": "return \\Support\\helper();",
    "support": "namespace Support; function helper(){return isset((new Inspector())->value)?\"source\":\"target\";} /** @property-read string $value */ final class Inspector {public function __isset($name):bool {return true;} public function __get($name){return \\debug_backtrace();}}",
    "expectedSafe": true
  },
  {
    "name": "plain magic unset with unused accessors",
    "body": "return \\Support\\helper();",
    "support": "namespace Support; function helper(){$item=new Inspector();unset($item->value);return $item->result;} /** @property string $value */ final class Inspector {public string $result=\"stable\"; public function __unset($name):void {} public function __get($name){return \\debug_backtrace();} public function __set($name,$value):void {\\debug_backtrace();}}",
    "expectedSafe": true
  },
  {
    "name": "magic empty trace",
    "body": "return \\Support\\helper();",
    "support": "namespace Support; function helper(){return empty((new Inspector())->value)?\"source\":\"target\";} /** @property-read string $value */ final class Inspector {public function __isset($name):bool {return \\debug_backtrace()[2][\"class\"]===\\A\\Source::class;} public function __get($name){return \"stable\";}}",
    "expectedSafe": false
  },
  {
    "name": "plain magic empty",
    "body": "return \\Support\\helper();",
    "support": "namespace Support; function helper(){return empty((new Inspector())->value)?\"source\":\"target\";} /** @property-read string $value */ final class Inspector {public function __isset($name):bool {return true;} public function __get($name){return \"stable\";}}",
    "expectedSafe": true
  },
  {
    "name": "concrete isset skips unused magic",
    "body": "return \\Support\\helper();",
    "support": "namespace Support; function helper(){return isset((new Inspector())->value)?\"source\":\"target\";} final class Inspector {public string $value=\"stable\"; public function __isset($name):bool {return \\debug_backtrace()[2][\"class\"]===\\A\\Source::class;}}",
    "expectedSafe": true
  },
  {
    "name": "plain array access",
    "body": "return (new \\Support\\Inspector())[\"value\"];",
    "support": "namespace Support; final class Inspector implements \\ArrayAccess {public function offsetExists(mixed $key):bool {return true;} public function offsetGet(mixed $key):mixed {return \"stable\";} public function offsetSet(mixed $key,mixed $value):void {} public function offsetUnset(mixed $key):void {}}",
    "expectedSafe": true
  },
  {
    "name": "array read skips unused setter",
    "body": "return (new \\Support\\Inspector())[\"value\"];",
    "support": "namespace Support; final class Inspector implements \\ArrayAccess {public function offsetExists(mixed $key):bool {return true;} public function offsetGet(mixed $key):mixed {return \"stable\";} public function offsetSet(mixed $key,mixed $value):void {\\debug_backtrace();} public function offsetUnset(mixed $key):void {}}",
    "expectedSafe": true
  },
  {
    "name": "array offset write",
    "body": "$item=new \\Support\\Inspector();$item[\"v\"]=1;return $item->result;",
    "support": "namespace Support; final class Inspector implements \\ArrayAccess {public string $result=\"stable\"; public function offsetExists(mixed $key):bool {return true;} public function offsetGet(mixed $key):mixed {return \"stable\";} public function offsetSet(mixed $key,mixed $value):void {$this->result=\\debug_backtrace()[1][\"class\"];} public function offsetUnset(mixed $key):void {}}",
    "expectedSafe": false
  },
  {
    "name": "plain array offset write",
    "body": "$item=new \\Support\\Inspector();$item[\"v\"]=1;return $item->result;",
    "support": "namespace Support; final class Inspector implements \\ArrayAccess {public string $result=\"stable\"; public function offsetExists(mixed $key):bool {return true;} public function offsetGet(mixed $key):mixed {return \"stable\";} public function offsetSet(mixed $key,mixed $value):void {} public function offsetUnset(mixed $key):void {}}",
    "expectedSafe": true
  },
  {
    "name": "array offset unset",
    "body": "$item=new \\Support\\Inspector();unset($item[\"v\"]);return $item->result;",
    "support": "namespace Support; final class Inspector implements \\ArrayAccess {public string $result=\"stable\"; public function offsetExists(mixed $key):bool {return true;} public function offsetGet(mixed $key):mixed {return \"stable\";} public function offsetSet(mixed $key,mixed $value):void {} public function offsetUnset(mixed $key):void {$this->result=\\debug_backtrace()[1][\"class\"];}}",
    "expectedSafe": false
  },
  {
    "name": "plain array offset unset",
    "body": "$item=new \\Support\\Inspector();unset($item[\"v\"]);return $item->result;",
    "support": "namespace Support; final class Inspector implements \\ArrayAccess {public string $result=\"stable\"; public function offsetExists(mixed $key):bool {return true;} public function offsetGet(mixed $key):mixed {return \"stable\";} public function offsetSet(mixed $key,mixed $value):void {} public function offsetUnset(mixed $key):void {}}",
    "expectedSafe": true
  },
  {
    "name": "array offset isset",
    "body": "return \\Support\\helper();",
    "support": "namespace Support; function helper(){return isset((new Inspector())[\"v\"])?\"source\":\"target\";} final class Inspector implements \\ArrayAccess {public function offsetExists(mixed $key):bool {return \\debug_backtrace()[2][\"class\"]===\\A\\Source::class;} public function offsetGet(mixed $key):mixed {return \"stable\";} public function offsetSet(mixed $key,mixed $value):void {} public function offsetUnset(mixed $key):void {}}",
    "expectedSafe": false
  },
  {
    "name": "plain array offset isset",
    "body": "return \\Support\\helper();",
    "support": "namespace Support; function helper(){return isset((new Inspector())[\"v\"])?\"source\":\"target\";} final class Inspector implements \\ArrayAccess {public function offsetExists(mixed $key):bool {return true;} public function offsetGet(mixed $key):mixed {return \"stable\";} public function offsetSet(mixed $key,mixed $value):void {} public function offsetUnset(mixed $key):void {}}",
    "expectedSafe": true
  },
  {
    "name": "plain iterator foreach",
    "body": "foreach(new \\Support\\Inspector() as $key=>$value){return $key;}return \"empty\";",
    "support": "namespace Support; final class Inspector implements \\Iterator {private int $n=0; public function rewind():void {$this->n=0;} public function next():void {$this->n++;} public function valid():bool {return $this->n===0;} public function current():mixed {return \"stable\";} public function key():mixed {return \"stable\";}}",
    "expectedSafe": true
  },
  {
    "name": "value-only iteration skips unused key",
    "body": "foreach(new \\Support\\Inspector() as $value){return $value;}return \"empty\";",
    "support": "namespace Support; final class Inspector implements \\Iterator {private int $n=0; public function rewind():void {$this->n=0;} public function next():void {$this->n++;} public function valid():bool {return $this->n===0;} public function current():mixed {return \"stable\";} public function key():mixed {return \\debug_backtrace()[1][\"class\"];}}",
    "expectedSafe": true
  },
  {
    "name": "iterator aggregate key trace",
    "body": "foreach(new \\Support\\Inspector() as $key=>$value){return $key;}return \"empty\";",
    "support": "namespace Support; final class Inspector implements \\IteratorAggregate {public function getIterator(): \\Traversable {return new Items();}} final class Items implements \\Iterator {private int $n=0; public function rewind():void {$this->n=0;} public function next():void {$this->n++;} public function valid():bool {return $this->n===0;} public function current():mixed {return \"stable\";} public function key():mixed {return \\debug_backtrace()[1][\"class\"];}}",
    "expectedSafe": false
  },
  {
    "name": "plain iterator aggregate",
    "body": "foreach(new \\Support\\Inspector() as $key=>$value){return $key;}return \"empty\";",
    "support": "namespace Support; final class Inspector implements \\IteratorAggregate {public function getIterator(): \\Traversable {return new Items();}} final class Items implements \\Iterator {private int $n=0; public function rewind():void {$this->n=0;} public function next():void {$this->n++;} public function valid():bool {return $this->n===0;} public function current():mixed {return \"stable\";} public function key():mixed {return \"stable\";}}",
    "expectedSafe": true
  },
  {
    "name": "array iteration skips unused conversion",
    "body": "foreach([new \\Support\\Inspector()] as $value){return $value->value;}return \"empty\";",
    "support": "namespace Support; final class Inspector {public string $value=\"stable\"; public function __toString():string {return \\debug_backtrace()[1][\"class\"];}}",
    "expectedSafe": true
  },
  {
    "name": "backed hook isset trace",
    "body": "return \\Support\\helper();",
    "support": "namespace Support; function helper(){return isset((new Inspector())->value)?\"source\":\"target\";} final class Inspector {public string $value=\"stable\" {get {echo \\debug_backtrace()[2][\"class\"];return $this->value;}}}",
    "expectedSafe": false
  },
  {
    "name": "plain backed hook isset",
    "body": "return \\Support\\helper();",
    "support": "namespace Support; function helper(){return isset((new Inspector())->value)?\"source\":\"target\";} final class Inspector {public string $value=\"stable\" {get {return $this->value;}}}",
    "expectedSafe": true
  },
  {
    "name": "virtual hook foreach trace",
    "body": "foreach(new \\Support\\Inspector() as $value){return $value;}return \"empty\";",
    "support": "namespace Support; final class Inspector {public string $value {get => \\debug_backtrace()[1][\"class\"];}}",
    "expectedSafe": false
  },
  {
    "name": "plain virtual hook foreach",
    "body": "foreach(new \\Support\\Inspector() as $value){return $value;}return \"empty\";",
    "support": "namespace Support; final class Inspector {public string $value {get => \"stable\";}}",
    "expectedSafe": true
  },
  {
    "name": "foreach hook conversion trace",
    "body": "foreach(new \\Support\\Inspector() as $value){return $value;}return \"empty\";",
    "support": "namespace Support; final class Inspector {public string $value {get => new Text();}} final class Text {public function __toString():string {return \\debug_backtrace()[2][\"class\"];}}",
    "expectedSafe": false
  },
  {
    "name": "plain foreach hook conversion",
    "body": "foreach(new \\Support\\Inspector() as $value){return $value;}return \"empty\";",
    "support": "namespace Support; final class Inspector {public string $value {get => new Text();}} final class Text {public function __toString():string {return \"stable\";}}",
    "expectedSafe": true
  },
  {
    "name": "plain generator aggregate",
    "body": "foreach(new \\Support\\Inspector() as $value){return $value;}return \"empty\";",
    "support": "namespace Support; final class Inspector implements \\IteratorAggregate {public function getIterator(): \\Traversable {yield \"stable\";return;}}",
    "expectedSafe": true
  },
  {
    "name": "generator aggregate trace",
    "body": "foreach(new \\Support\\Inspector() as $value){return $value;}return \"empty\";",
    "support": "namespace Support; final class Inspector implements \\IteratorAggregate {public function getIterator(): \\Traversable {yield \\debug_backtrace()[1][\"class\"];return;}}",
    "expectedSafe": false
  }
];

it.each(scenarios.flatMap(scenario => [false, true].map(deferred => ({scenario, deferred}))))(
  'preserves implicit operator caller identity: $scenario.name, deferred=$deferred', ({scenario: {name: label, body, support, expectedSafe: safe}, deferred}) => {
    const source = `<?php namespace A; final class Source {public static function observe() {${body}}}`;
    const files = new Map([
      [root + 'Source.php', source],
      [root + 'Target.php', '<?php namespace B; final class Target {}'],
      [root + 'Support.php', '<?php ' + support],
      [root + 'Caller.php', '<?php return \\A\\Source::observe();'],
    ]);
    const workspace = new SemanticWorkspace(parser);
    workspace.setTargetPhpVersion('8.5');
    workspace.update('php-companion-builtin:stack', '<?php function debug_backtrace(int $options = 1, int $limit = 0): array {} function debug_print_backtrace(int $options = 0, int $limit = 0): void {} interface Traversable {} interface IteratorAggregate {public function getIterator(): Traversable;} interface Iterator {public function rewind():void; public function next():void; public function valid():bool; public function current():mixed; public function key():mixed;} interface ArrayAccess {public function offsetExists(mixed $key):bool; public function offsetGet(mixed $key):mixed; public function offsetSet(mixed $key,mixed $value):void; public function offsetUnset(mixed $key):void;}', true);
    for (const [uri, text] of files) {
      if (deferred) workspace.updateDeclarations(uri, text);
      else workspace.update(uri, text, true);
    }
    try {
      const plan = workspace.moveStaticMethod(root + 'Source.php', source.indexOf('observe(') + 1, 'B\\Target');
      if (!safe) expect(plan, label).toBeUndefined();
      else {
        expect(plan, label).toBeDefined();
        const changed = new Map([...files].map(([uri, text]) => [uri, plan!.edits.filter(edit => edit.uri === uri)
          .sort((a, b) => b.start - a.start).reduce((value, edit) => value.slice(0, edit.start) + edit.newText + value.slice(edit.end), text)]));
        expect(changed.get(root + 'Source.php')).not.toContain('function observe(');
        expect(changed.get(root + 'Target.php')).toContain('function observe(');
        expect(changed.get(root + 'Caller.php')).toContain('\\B\\Target::observe()');
        expect(changed.get(root + 'Support.php')).toBe(files.get(root + 'Support.php'));
      }
      for (const [uri, text] of files) expect(workspace.source(uri)).toBe(text);
    } finally {workspace.dispose();}
  },
);
