import {afterAll, beforeAll, expect, it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => {parser = await PhpSyntaxParser.createDefault();});
afterAll(() => parser.dispose());
const root = 'file:///move-stack/';
const scenarios = [
  {
    "name": "count hook",
    "body": "return count(new \\Support\\Inspector());",
    "support": "namespace Support; final class Inspector implements \\Countable {public function count():int {return \\array_column(\\debug_backtrace(),\"class\")[1]===\\A\\Source::class?3:4;}}",
    "expectedSafe": false
  },
  {
    "name": "serialize hook",
    "body": "return serialize(new \\Support\\Inspector());",
    "support": "namespace Support; final class Inspector {public function __serialize():array {return [\"caller\"=>\\array_column(\\debug_backtrace(),\"class\")[1]];}}",
    "expectedSafe": false
  },
  {
    "name": "sleep hook",
    "body": "return serialize(new \\Support\\Inspector());",
    "support": "namespace Support; final class Inspector {public string $value=\"stable\";public function __sleep():array {$this->value=\\array_column(\\debug_backtrace(),\"class\")[1];return [\"value\"];}}",
    "expectedSafe": false
  },
  {
    "name": "json hook",
    "body": "return json_encode(new \\Support\\Inspector());",
    "support": "namespace Support; final class Inspector implements \\JsonSerializable {public function jsonSerialize():mixed {return \\array_column(\\debug_backtrace(),\"class\")[1];}}",
    "expectedSafe": false
  },
  {
    "name": "debug info hook",
    "body": "return print_r(new \\Support\\Inspector(),true);",
    "support": "namespace Support; final class Inspector {public function __debugInfo():array {return [\"caller\"=>\\array_column(\\debug_backtrace(),\"class\")[1]];}}",
    "expectedSafe": false
  },
  {
    "name": "native exception trace",
    "body": "return (new \\Exception())->getTrace()[0][\"class\"];",
    "support": "namespace Support;",
    "expectedSafe": false
  },
  {
    "name": "plain count",
    "body": "return count(new \\Support\\Inspector());",
    "support": "namespace Support; final class Inspector implements \\Countable {public function count():int {return 3;}}",
    "expectedSafe": true
  },
  {
    "name": "plain serialize",
    "body": "return serialize(new \\Support\\Inspector());",
    "support": "namespace Support; final class Inspector {public function __serialize():array {return [\"caller\"=>\"stable\"];}}",
    "expectedSafe": true
  },
  {
    "name": "plain json",
    "body": "return json_encode(new \\Support\\Inspector());",
    "support": "namespace Support; final class Inspector implements \\JsonSerializable {public function jsonSerialize():mixed {return \"stable\";}}",
    "expectedSafe": true
  },
  {
    "name": "plain debug info",
    "body": "return print_r(new \\Support\\Inspector(),true);",
    "support": "namespace Support; final class Inspector {public function __debugInfo():array {return [\"caller\"=>\"stable\"];}}",
    "expectedSafe": true
  },
  {
    "name": "native exception message",
    "body": "return (new \\Exception(\"stable\"))->getMessage();",
    "support": "namespace Support;",
    "expectedSafe": true
  },
  {
    "name": "sizeof alias",
    "body": "return sizeof(new \\Support\\Inspector());",
    "support": "namespace Support; final class Inspector implements \\Countable {public function count():int {return \\array_column(\\debug_backtrace(),\"class\")[1]===\\A\\Source::class?3:4;}}",
    "expectedSafe": false
  },
  {
    "name": "named count argument",
    "body": "return count(value:new \\Support\\Inspector());",
    "support": "namespace Support; final class Inspector implements \\Countable {public function count():int {return \\array_column(\\debug_backtrace(),\"class\")[1]===\\A\\Source::class?3:4;}}",
    "expectedSafe": false
  },
  {
    "name": "count array ignores child Countable",
    "body": "return count([new \\Support\\Inspector()]);",
    "support": "namespace Support; final class Inspector implements \\Countable {public function count():int {return \\array_column(\\debug_backtrace(),\"class\")[1]===\\A\\Source::class?3:4;}}",
    "expectedSafe": true
  },
  {
    "name": "serialize nested array",
    "body": "return serialize([[new \\Support\\Inspector()]]);",
    "support": "namespace Support; final class Inspector {public function __serialize():array {return [\"caller\"=>\\array_column(\\debug_backtrace(),\"class\")[1]];}}",
    "expectedSafe": false
  },
  {
    "name": "serialize nested property",
    "body": "return serialize(new \\Support\\Wrapper());",
    "support": "namespace Support; final class Inspector {public function __serialize():array {return [\"caller\"=>\\array_column(\\debug_backtrace(),\"class\")[1]];}} final class Wrapper {public Inspector $child;public function __construct() {$this->child=new Inspector();}}",
    "expectedSafe": false
  },
  {
    "name": "json nested array",
    "body": "return json_encode([[new \\Support\\Inspector()]]);",
    "support": "namespace Support; final class Inspector implements \\JsonSerializable {public function jsonSerialize():mixed {return \\array_column(\\debug_backtrace(),\"class\")[1];}}",
    "expectedSafe": false
  },
  {
    "name": "json nested property",
    "body": "return json_encode(new \\Support\\Wrapper());",
    "support": "namespace Support; final class Inspector implements \\JsonSerializable {public function jsonSerialize():mixed {return \\array_column(\\debug_backtrace(),\"class\")[1];}} final class Wrapper {public Inspector $child;public function __construct() {$this->child=new Inspector();}}",
    "expectedSafe": false
  },
  {
    "name": "json hook returns nested object",
    "body": "return json_encode(new \\Support\\Wrapper());",
    "support": "namespace Support; final class Inspector implements \\JsonSerializable {public function jsonSerialize():mixed {return \\array_column(\\debug_backtrace(),\"class\")[1];}} final class Wrapper implements \\JsonSerializable {public function jsonSerialize():mixed {return new Inspector();}}",
    "expectedSafe": false
  },
  {
    "name": "serialize hook returns nested object",
    "body": "return serialize(new \\Support\\Wrapper());",
    "support": "namespace Support; final class Inspector {public function __serialize():array {return [\"caller\"=>\\array_column(\\debug_backtrace(),\"class\")[1]];}} final class Wrapper {public function __serialize():array {return [new Inspector()];}}",
    "expectedSafe": false
  },
  {
    "name": "serialize wins unused sleep",
    "body": "return serialize(new \\Support\\Inspector());",
    "support": "namespace Support; final class Inspector {public function __serialize():array {return [\"value\"=>\"stable\"];} public function __sleep():array {\\debug_backtrace();return [];}}",
    "expectedSafe": true
  },
  {
    "name": "plain typed serialize property",
    "body": "return serialize(new \\Support\\Inspector());",
    "support": "namespace Support; final class Inspector {public string $value=\"stable\";}",
    "expectedSafe": true
  },
  {
    "name": "plain typed json property",
    "body": "return json_encode(new \\Support\\Inspector());",
    "support": "namespace Support; final class Inspector {public string $value=\"stable\";}",
    "expectedSafe": true
  },
  {
    "name": "shadowed count stays user function",
    "body": "return \\Support\\count(new \\Support\\Inspector());",
    "support": "namespace Support; function count($value):int {return 3;} final class Inspector implements \\Countable {public function count():int {return \\array_column(\\debug_backtrace(),\"class\")[1]===\\A\\Source::class?3:4;}}",
    "expectedSafe": true
  },
  {
    "name": "plain sizeof",
    "body": "return sizeof(new \\Support\\Inspector());",
    "support": "namespace Support; final class Inspector implements \\Countable {public function count():int {return 3;}}",
    "expectedSafe": true
  },
  {
    "name": "var_dump debug info",
    "body": "var_dump(new \\Support\\Inspector());return \"stable\";",
    "support": "namespace Support; final class Inspector {public function __debugInfo():array {return [\"caller\"=>\\array_column(\\debug_backtrace(),\"class\")[1]];}}",
    "expectedSafe": false
  },
  {
    "name": "plain var_dump debug info",
    "body": "var_dump(new \\Support\\Inspector());return \"stable\";",
    "support": "namespace Support; final class Inspector {public function __debugInfo():array {return [\"caller\"=>\"stable\"];}}",
    "expectedSafe": true
  },
  {
    "name": "native exception escapes",
    "body": "return new \\Exception();",
    "support": "namespace Support;",
    "expectedSafe": false
  },
  {
    "name": "native exception code",
    "body": "return (new \\Exception(\"stable\",3))->getCode();",
    "support": "namespace Support;",
    "expectedSafe": true
  }
];

it.each(scenarios.flatMap(scenario => [false, true].map(deferred => ({scenario, deferred}))))(
  'preserves native operation caller identity: $scenario.name, deferred=$deferred', ({scenario: {name: label, body, support, expectedSafe: safe}, deferred}) => {
    const source = `<?php namespace A; final class Source {public static function observe() {${body}}}`;
    const files = new Map([
      [root + 'Source.php', source],
      [root + 'Target.php', '<?php namespace B; final class Target {}'],
      [root + 'Support.php', '<?php ' + support],
      [root + 'Caller.php', '<?php return \\A\\Source::observe();'],
    ]);
    const workspace = new SemanticWorkspace(parser);
    workspace.setTargetPhpVersion('8.5');
    workspace.update('php-companion-builtin:stack', "<?php function debug_backtrace(int $options=1,int $limit=0):array {} interface Countable {public function count():int;} interface JsonSerializable {public function jsonSerialize():mixed;} function count(Countable|array $value,int $mode=0):int {} function serialize(mixed $value):string {} function json_encode(mixed $value,int $flags=0,int $depth=512):string|false {} function print_r(mixed $value,bool $return=false):string|bool {} interface Throwable {} class Exception implements Throwable {public function __construct(string $message=\"\",int $code=0,?Throwable $previous=null) {} public function getTrace():array {} public function getMessage():string {} public function getCode():int {}} function sizeof(Countable|array $value,int $mode=0):int {} function var_dump(mixed $value,mixed ...$values):void {} function array_column(array $array,int|string|null $column_key,int|string|null $index_key=null):array {}", true);
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
