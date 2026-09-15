import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { semanticFacts } from '@php-companion/semantic-provider';
import { SemanticWorkspace, type SemanticCallableImplementationState } from '../src/index.js';

describe('conservative semantic workspace', () => {
  let parser: PhpSyntaxParser; let workspace: SemanticWorkspace;
  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); workspace = new SemanticWorkspace(parser); });
  afterAll(() => parser.dispose());
  it('completes only proven parameter and this members across open files', () => {
    workspace.update('file:///User.php', '<?php namespace App; class User { public function name(): string {} public function rename(string $name): void {} }');
    const source = '<?php namespace App\\Controller; use App\\User; class C { function show(User $user): void { $user->na } }';
    workspace.update('file:///C.php', source);
    expect(workspace.completeMembers('file:///C.php', source.indexOf('na }') + 2).map((item) => item.name)).toEqual(['name']);
    expect(workspace.definition('file:///C.php', source.indexOf('User $') + 1)).toMatchObject([{ uri: 'file:///User.php' }]);
  });
  it('exposes only signature-identical members across Union and DNF alternatives', () => {
    workspace.update('file:///CompositeTypes.php', `<?php namespace Composite;
      class Result { public function done(): void {} }
      class ReturnA { public function finish(): void {} public function onlyA(): void {} }
      class ReturnB { public function finish(): void {} }
      class Factory { public function choose(): ReturnA|ReturnB {} public static function chooseStatic(): ReturnA|ReturnB {} }
      interface A { public function common(): Result; public function branch(): ReturnA|ReturnB; public function fromA(): void; public function conflict(int $value): void; }
      interface B { public function common(): Result; public function branch(): ReturnA|ReturnB; public function branchShared(): void; public function fromB(): void; public function conflict(string $value): void; }
      interface C { public function branchShared(): void; }
      function choose(): (A&C)|B {}
      function maybe(): A|B|null {}
    `);
    const source = `<?php namespace Composite;
      function show(A|B $union, (A&C)|B $dnf, A&C $intersection, A|B|null $nullable, Factory $service, mixed $unknown): void {
        $union->; $union->common(); $union->fromA(); $union->conflict(1); $union->common()->do; $union->branch()->fi;
        $dnf->; $dnf->branchShared(); $dnf->fromB();
        $nullable->common(); $nullable->fromA(); $nullable?->branch()?->fi;
        $copy = $dnf; $copy->; $copy->branchShared(); $copy->fromB();
        $nullableCopy = $nullable; $nullableCopy->common();
        $factory = choose(); $factory->; $factory->branchShared(); $factory->fromB();
        $maybe = maybe(); $maybe->common();
        $memberResult = $service->choose(); $staticResult = Factory::chooseStatic(); $commonResult = $union->branch();
        $memberResult->; $staticResult->; $commonResult->;
        $intersection->; $unknown->;
      }`;
    workspace.update('file:///CompositeUse.php', source);
    expect(workspace.completeMembers('file:///CompositeUse.php', source.indexOf('$union->;') + '$union->'.length).map((item) => item.name)).toEqual(['common', 'branch']);
    expect(workspace.completeMembers('file:///CompositeUse.php', source.indexOf('$dnf->;') + '$dnf->'.length).map((item) => item.name)).toEqual(['common', 'branch', 'branchShared']);
    expect(workspace.completeMembers('file:///CompositeUse.php', source.indexOf('$intersection->;') + '$intersection->'.length).map((item) => item.name)).toEqual(['common', 'branch', 'fromA', 'conflict', 'branchShared']);
    expect(workspace.completeMembers('file:///CompositeUse.php', source.indexOf('$copy->;') + '$copy->'.length).map((item) => item.name)).toEqual(['common', 'branch', 'branchShared']);
    expect(workspace.completeMembers('file:///CompositeUse.php', source.indexOf('$factory->;') + '$factory->'.length).map((item) => item.name)).toEqual(['common', 'branch', 'branchShared']);
    expect(workspace.completeMembers('file:///CompositeUse.php', source.indexOf('$memberResult->;') + '$memberResult->'.length).map((item) => item.name)).toEqual(['finish']);
    expect(workspace.completeMembers('file:///CompositeUse.php', source.indexOf('$staticResult->;') + '$staticResult->'.length).map((item) => item.name)).toEqual(['finish']);
    expect(workspace.completeMembers('file:///CompositeUse.php', source.indexOf('$commonResult->;') + '$commonResult->'.length).map((item) => item.name)).toEqual(['finish']);
    expect(workspace.completeMembers('file:///CompositeUse.php', source.indexOf('$unknown->;') + '$unknown->'.length)).toEqual([]);
    expect(workspace.completeMembers('file:///CompositeUse.php', source.indexOf('->do') + 4).map((item) => item.name)).toEqual(['done']);
    expect(workspace.completeMembers('file:///CompositeUse.php', source.indexOf('->fi') + 4).map((item) => item.name)).toEqual(['finish']);
    expect(workspace.completeMembers('file:///CompositeUse.php', source.lastIndexOf('->fi') + 4).map((item) => item.name)).toEqual(['finish']);
    expect(workspace.definition('file:///CompositeUse.php', source.indexOf('common();') + 2)).toHaveLength(2);
    expect(workspace.definition('file:///CompositeUse.php', source.indexOf('branchShared();') + 2)).toHaveLength(2);
    expect(workspace.unresolvedMembers('file:///CompositeUse.php').map((item) => item.name)).toEqual(['fromA', 'fromB', 'fromB', 'fromB']);
    expect(workspace.nullableMemberAccesses('file:///CompositeUse.php').map((item) => item.name)).toEqual(['common', 'common', 'common']);
  });
  it('propagates PHP 8.5 pipe results only through compatible single-argument callables', () => {
    workspace.update('file:///PipeTypes.php', `<?php namespace PipeFlow;
      class Input { public function inputOnly(): void {} }
      class Middle { public function middleOnly(): void {} }
      class Output { public function outputOnly(): void {} }
      function toMiddle(Input $value): Middle {}
      function toOutput(Middle $value): Output {}
      function wrong(string $value): Output {}
      function byReference(Input &$value): Output {}
      class Transformer {
        public static function middle(Input $value): Middle {}
        public function output(Middle $value): Output {}
      }
    `);
    const membersFor = (expression: string): string[] => {
      const source = `<?php namespace PipeFlow;
        function run(Input $input, Transformer $transformer, callable $dynamic): void {
          $result = ${expression}; $result->;
        }
      `;
      workspace.update('file:///PipeUse.php', source);
      return workspace.completeMembers('file:///PipeUse.php', source.indexOf('$result->') + '$result->'.length)
        .map((item) => item.name);
    };
    expect(membersFor('$input |> toMiddle(...) |> toOutput(...)')).toEqual(['outputOnly']);
    expect(membersFor('$input |> Transformer::middle(...) |> $transformer->output(...)')).toEqual(['outputOnly']);
    expect(membersFor('$input |> (fn(Input $value): Output => new Output())')).toEqual(['outputOnly']);
    expect(membersFor('$input |> wrong(...)')).toEqual([]);
    expect(membersFor('$input |> byReference(...)')).toEqual([]);
    expect(membersFor('$input |> $dynamic')).toEqual([]);
    const incompatible = `<?php namespace PipeFlow;
      function invalid(Input $input): void {
        $result = $input |> wrong(...); $result->outputOnly();
      }
    `;
    workspace.update('file:///PipeUse.php', incompatible);
    expect(workspace.definition('file:///PipeUse.php', incompatible.indexOf('outputOnly') + 2)).toEqual([]);
  });
  it('preserves proven object types through regular and PHP 8.5 clone-with expressions', () => {
    const source = `<?php namespace CloneFlow;
      class Value { public string $name; public function valueOnly(): void {} }
      class Box { public Value $value; }
      function run(Value $value, Box $box, Value|null $nullable, string $scalar): void {
        $regular = clone $value; $regular->valueOnly();
        $with = clone($value, ['name' => 'next']); $with->valueOnly();
        $member = clone($box->value, ['name' => 'member']); $member->valueOnly();
        $wrongProperty = clone($value, ['missing' => 'value']); $wrongProperty->valueOnly();
        $wrongType = clone($value, ['name' => null]); $wrongType->valueOnly();
        $unknownNullable = clone($nullable, []); $unknownNullable->valueOnly();
        $unknownScalar = clone($scalar, []); $unknownScalar->valueOnly();
      }
    `;
    workspace.update('file:///CloneFlow.php', source);
    for (const variable of ['$regular', '$with', '$member']) {
      const access = source.indexOf(`${variable}->valueOnly()`);
      expect(workspace.completeMembers('file:///CloneFlow.php', access + variable.length + 2).map((item) => item.name)).toContain('valueOnly');
      expect(workspace.definition('file:///CloneFlow.php', access + variable.length + 4)).toHaveLength(1);
    }
    for (const variable of ['$wrongProperty', '$wrongType', '$unknownNullable', '$unknownScalar']) {
      const access = source.indexOf(`${variable}->valueOnly()`);
      expect(workspace.completeMembers('file:///CloneFlow.php', access + variable.length + 2), variable).toEqual([]);
      expect(workspace.definition('file:///CloneFlow.php', access + variable.length + 4), variable).toEqual([]);
    }
  });
  it('reports only unresolved explicit new-expression types', () => {
    workspace.update('file:///Known.php', '<?php namespace App; class Known {}');
    const source = '<?php namespace App; use Vendor\\Missing as Absent; function run(): void { $a = new Known(); $b = new Absent(); $anonymous = new class {}; $text = "new StringName"; }';
    workspace.update('file:///Unresolved.php', source);
    expect(workspace.unresolvedNewTypes('file:///Unresolved.php')).toMatchObject([{ name: 'Absent', fqcn: 'Vendor\\Missing' }]);
  });

  it('rejects only uniquely resolved non-instantiable targets', () => {
    workspace.update('file:///InstantiationTargets.php', `<?php namespace Instantiate;
      interface Contract {} trait Shared {} enum State { case Ready; }
      abstract class AbstractBase {} class Concrete {}
    `);
    workspace.update('file:///InstantiationDuplicateA.php', '<?php namespace Instantiate; interface Duplicate {}');
    workspace.update('file:///InstantiationDuplicateB.php', '<?php namespace Instantiate; class Duplicate {}');
    const source = `<?php namespace Instantiate;
      function build(): void {
        new Contract(); new Shared(); new State(); new AbstractBase();
        new Concrete(); new Missing(); new Duplicate();
      }
    `;
    workspace.update('file:///InvalidInstantiations.php', source);
    expect(workspace.invalidInstantiations('file:///InvalidInstantiations.php')).toMatchObject([
      { target: 'Instantiate\\Contract', reason: 'interface' },
      { target: 'Instantiate\\Shared', reason: 'trait' },
      { target: 'Instantiate\\State', reason: 'enum' },
      { target: 'Instantiate\\AbstractBase', reason: 'abstract-class' },
    ]);
  });

  it('reports inaccessible constructors only with complete unique class-family evidence', () => {
    workspace.update('file:///ConstructorVisibilityDuplicateA.php', '<?php namespace ConstructorVisibility; class Duplicate { private function __construct() {} }');
    workspace.update('file:///ConstructorVisibilityDuplicateB.php', '<?php namespace ConstructorVisibility; class Duplicate {}');
    const source = `<?php namespace ConstructorVisibility;
      class PrivateBase {
        private function __construct() {}
        public static function create(): self { return new self(); }
      }
      class PrivateChild extends PrivateBase { public function fail(): void { new PrivateBase(); } }
      class ProtectedBase {
        protected function __construct() {}
        public function makeChild(): ProtectedChild { return new ProtectedChild(); }
      }
      class ProtectedChild extends ProtectedBase { public function makeBase(): ProtectedBase { return new ProtectedBase(); } }
      class Other { public function fail(): void { new ProtectedBase(); } }
      class IncompleteScope extends MissingParent { public function unknown(): void { new ProtectedBase(); } }
      new PrivateBase(); new PrivateChild(); new ProtectedBase(); new ProtectedChild(); new Duplicate();
    `;
    workspace.update('file:///ConstructorVisibility.php', source);
    expect(workspace.inaccessibleInstantiations('file:///ConstructorVisibility.php').map((item) => ({
      target: item.target, constructor: item.constructor, visibility: item.visibility,
    }))).toEqual([
      { target: 'ConstructorVisibility\\PrivateBase', constructor: 'ConstructorVisibility\\PrivateBase::__construct', visibility: 'private' },
      { target: 'ConstructorVisibility\\ProtectedBase', constructor: 'ConstructorVisibility\\ProtectedBase::__construct', visibility: 'protected' },
      { target: 'ConstructorVisibility\\PrivateBase', constructor: 'ConstructorVisibility\\PrivateBase::__construct', visibility: 'private' },
      { target: 'ConstructorVisibility\\PrivateChild', constructor: 'ConstructorVisibility\\PrivateBase::__construct', visibility: 'private' },
      { target: 'ConstructorVisibility\\ProtectedBase', constructor: 'ConstructorVisibility\\ProtectedBase::__construct', visibility: 'protected' },
      { target: 'ConstructorVisibility\\ProtectedChild', constructor: 'ConstructorVisibility\\ProtectedBase::__construct', visibility: 'protected' },
    ]);
  });

  it('reports unresolved native and structural type references without guessing attributes or pseudo-types', () => {
    workspace.update('file:///KnownTypes.php', `<?php namespace Types;
      class Base {} interface Contract {} trait Shared {} class Input {}
    `);
    const source = `<?php namespace Types;
      use Types\\Input as ImportedInput;
      #[UnknownAttribute]
      class Child extends Base implements MissingContract {
        use Shared, MissingTrait;
        public function run(ImportedInput|MissingInput $input): MissingOutput {
          if ($input instanceof MissingRuntime) {}
          self::ok(); parent::ok(); MissingStatic::ok();
        }
      }
    `;
    workspace.update('file:///UnresolvedTypeReferences.php', source);
    expect(workspace.unresolvedTypeReferences('file:///UnresolvedTypeReferences.php').map((item) => ({
      name: item.name, fqcn: item.fqcn,
    }))).toEqual([
      { name: 'MissingContract', fqcn: 'Types\\MissingContract' },
      { name: 'MissingTrait', fqcn: 'Types\\MissingTrait' },
      { name: 'MissingInput', fqcn: 'Types\\MissingInput' },
      { name: 'MissingOutput', fqcn: 'Types\\MissingOutput' },
      { name: 'MissingRuntime', fqcn: 'Types\\MissingRuntime' },
      { name: 'MissingStatic', fqcn: 'Types\\MissingStatic' },
    ]);
  });
  it('reports only explicitly namespaced unresolved functions and constants', () => {
    workspace.update('file:///KnownSymbols.php', `<?php namespace Symbols;
      function knownFunction(): void {} const KNOWN_CONSTANT = 1;
    `);
    const source = `<?php namespace Symbols;
      use function MissingVendor\\gone as missingAlias;
      use const MissingVendor\\MISSING as MISSING_ALIAS;
      knownFunction(); namespace\\knownFunction();
      MissingVendor\\missingFunction(); namespace\\missingLocalFunction(); missingAlias();
      possiblyExtensionFunction();
      echo KNOWN_CONSTANT, namespace\\KNOWN_CONSTANT;
      echo MissingVendor\\MISSING_CONSTANT, namespace\\MISSING_LOCAL, MISSING_ALIAS;
      echo POSSIBLY_EXTENSION_CONSTANT;
    `;
    workspace.update('file:///UnresolvedSymbols.php', source);
    expect(workspace.unresolvedFunctions('file:///UnresolvedSymbols.php').map((item) => ({
      name: item.name, fqcn: item.fqcn,
    }))).toEqual([
      { name: 'MissingVendor\\missingFunction', fqcn: 'Symbols\\MissingVendor\\missingFunction' },
      { name: 'namespace\\missingLocalFunction', fqcn: 'Symbols\\missingLocalFunction' },
      { name: 'missingAlias', fqcn: 'MissingVendor\\gone' },
    ]);
    expect(workspace.unresolvedConstants('file:///UnresolvedSymbols.php').map((item) => ({
      name: item.name, fqcn: item.fqcn,
    }))).toEqual([
      { name: 'MissingVendor\\MISSING_CONSTANT', fqcn: 'Symbols\\MissingVendor\\MISSING_CONSTANT' },
      { name: 'namespace\\MISSING_LOCAL', fqcn: 'Symbols\\MISSING_LOCAL' },
      { name: 'MISSING_ALIAS', fqcn: 'MissingVendor\\MISSING' },
    ]);
    expect(workspace.unresolvedFunctions('file:///UnresolvedSymbols.php', new Set(['possiblyextensionfunction'])).map((item) => item.fqcn))
      .toContain('possiblyExtensionFunction');
    expect(workspace.unresolvedConstants('file:///UnresolvedSymbols.php', new Set(['POSSIBLY_EXTENSION_CONSTANT'])).map((item) => item.fqcn))
      .toContain('POSSIBLY_EXTENSION_CONSTANT');
    workspace.update('file:///GlobalPolyfill.php', '<?php function possiblyExtensionFunction(): void {} const POSSIBLY_EXTENSION_CONSTANT = 1;');
    expect(workspace.unresolvedFunctions('file:///UnresolvedSymbols.php', new Set(['possiblyextensionfunction'])).map((item) => item.fqcn))
      .not.toContain('possiblyExtensionFunction');
    expect(workspace.unresolvedConstants('file:///UnresolvedSymbols.php', new Set(['POSSIBLY_EXTENSION_CONSTANT'])).map((item) => item.fqcn))
      .not.toContain('POSSIBLY_EXTENSION_CONSTANT');
    workspace.update('file:///NestedNamespace.php', '<?php namespace Symbols\\Nested; function run(): void {}');
    expect(workspace.unresolvedConstants('file:///NestedNamespace.php')).toEqual([]);
  });
  it('enumerates global declaration identities for component-owned symbol catalogs', () => {
    workspace.update('php-companion-extension:/sample.php', '<?php namespace Extension { class Type {} function helper(): void {} const VALUE = 1; }');
    expect(workspace.workspaceTypes().filter((item) => item.uri.includes('extension:')).map((item) => item.fqcn)).toEqual(['Extension\\Type']);
    expect(workspace.workspaceFunctions().filter((item) => item.uri.includes('extension:')).map((item) => item.fqcn)).toEqual(['Extension\\helper']);
    expect(workspace.workspaceConstants().filter((item) => item.uri.includes('extension:')).map((item) => item.fqcn)).toEqual(['Extension\\VALUE']);
  });
  it('reports only definitely undefined variables in named callable scopes', () => {
    const source = `<?php namespace Variables;
      function consumeValue(mixed $value): void {}
      function initialize(mixed &$value): void {}
      function inspect(array $items, bool $flag): void {
        echo $before;
        $assigned = 1; echo $assigned;
        $reference =& $assigned; echo $reference;
        echo $later; $later = 1;
        if ($flag) { $maybe = 1; } echo $maybe;
        $compound += 1; echo $compound;
        ++$increment; echo $increment;
        foreach ($items as $key => $value) { echo $key, $value; }
        try {} catch (\\Exception $error) { echo $error; }
        global $shared; static $cached = 1; echo $shared, $cached;
        isset($safe); empty($emptySafe); unset($unsetSafe); echo $coalesce ?? 'fallback';
        consume($possibleReference); echo $possibleReference;
        consumeValue($knownMissing);
        initialize($knownReference); echo $knownReference;
        $captured = 1;
        $closure = function () use ($captured): void { echo $captured, $closureMissing; };
        $missingCapture = function () use ($captureMissing): void {};
        $byReferenceCapture = function () use (&$createdByCapture): void { $createdByCapture = 1; };
        echo $createdByCapture;
        $knownArrow = fn () => $assigned;
        $missingArrow = fn () => $arrowMissing;
      }
    `;
    workspace.update('file:///UndefinedVariables.php', source);
    expect(workspace.undefinedVariables('file:///UndefinedVariables.php').map((item) => ({
      text: source.slice(item.start, item.end), scopeId: item.scopeId,
    }))).toEqual([
      { text: '$before', scopeId: 'Variables\\inspect' },
      { text: '$later', scopeId: 'Variables\\inspect' },
      { text: '$compound', scopeId: 'Variables\\inspect' },
      { text: '$increment', scopeId: 'Variables\\inspect' },
      { text: '$knownMissing', scopeId: 'Variables\\inspect' },
      { text: '$closureMissing', scopeId: expect.stringMatching(/^closure@/) },
      { text: '$captureMissing', scopeId: expect.stringMatching(/^closure@/) },
      { text: '$arrowMissing', scopeId: expect.stringMatching(/^arrow@/) },
    ]);
  });
  it('provides documented magic properties and methods with signatures, return chains, and real-member precedence', () => {
    const definitions = `<?php namespace MagicMembers;
      class User { public string $name; }
      class Other { public string $other; }
      class Input {}
      class SpecialInput extends Input {}
      /**
       * @property User $owner resolved owner
       * @property-read User $createdBy immutable creator
       * @property-write User $payload accepted payload
       * @method User find(int $id, string $label = 'default') lookup
       * @method static User create(int $id)
       * @method User lookup(int $id)
       * @method Other lookup(string $slug, bool $active)
       * @method User locate(int $id)
       * @method Other locate(string $slug)
       * @method static User make(int $id)
       * @method static Other make(string $slug, bool $active)
       * @method User choose(Input $input)
       * @method Other choose(SpecialInput $input)
       * @method T fetch<T of User>(class-string<T> $type)
       * @method T defaulted<T = User>()
       */
      class Model {}
      /** @method User find() documented fallback */
      class Concrete { public function find(): Other { return new Other(); } }`;
    workspace.update('file:///MagicDefinitions.php', definitions);
    const source = `<?php namespace MagicMembers; function run(Model $model, Concrete $concrete, mixed $key): void {
      $model->; $model->owner->na; $model->createdBy->na; $model->find(1)->na; Model::create(1)->na; $concrete->find()->oth;
      $model->lookup(1)->na; $model->lookup('team', true)->oth; $model->locate(id: 1)->na; $model->locate(slug: 'team')->oth; $model->locate(1)->na; $model->locate($key)->na;
      Model::make(1)->na; Model::make('team', true)->oth;
      $model->choose(new Input())->na; $model->choose(new SpecialInput())->oth;
      $model->fetch(User::class)->na; $model->fetch(Other::class)->na;
      $model->defaulted()->na;
      $model->createdBy = new User(); $model->payload = new User(); $model->payload->na; $model->payload = new Other();
    }`;
    workspace.update('file:///MagicUse.php', source);
    expect(workspace.completeMembers('file:///MagicUse.php', source.indexOf('$model->;') + '$model->'.length).map((item) => item.name)).toEqual(['find', 'lookup', 'locate', 'choose', 'fetch', 'defaulted', 'owner', 'createdBy', 'payload']);
    for (const marker of ['$model->owner->na', '$model->createdBy->na', '$model->find(1)->na', 'Model::create(1)->na']) {
      expect(workspace.completeMembers('file:///MagicUse.php', source.indexOf(marker) + marker.length).map((item) => item.name)).toEqual(['name']);
    }
    expect(workspace.completeMembers('file:///MagicUse.php', source.indexOf('$concrete->find()->oth') + '$concrete->find()->oth'.length).map((item) => item.name)).toEqual(['other']);
    expect(workspace.completeMembers('file:///MagicUse.php', source.indexOf("$model->lookup(1)->na") + "$model->lookup(1)->na".length).map((item) => item.name)).toEqual(['name']);
    expect(workspace.completeMembers('file:///MagicUse.php', source.indexOf("$model->lookup('team', true)->oth") + "$model->lookup('team', true)->oth".length).map((item) => item.name)).toEqual(['other']);
    expect(workspace.completeMembers('file:///MagicUse.php', source.indexOf('$model->locate(id: 1)->na') + '$model->locate(id: 1)->na'.length).map((item) => item.name)).toEqual(['name']);
    expect(workspace.completeMembers('file:///MagicUse.php', source.indexOf("$model->locate(slug: 'team')->oth") + "$model->locate(slug: 'team')->oth".length).map((item) => item.name)).toEqual(['other']);
    expect(workspace.completeMembers('file:///MagicUse.php', source.indexOf('$model->locate(1)->na') + '$model->locate(1)->na'.length).map((item) => item.name)).toEqual(['name']);
    expect(workspace.completeMembers('file:///MagicUse.php', source.indexOf('$model->locate($key)->na') + '$model->locate($key)->na'.length)).toEqual([]);
    expect(workspace.completeMembers('file:///MagicUse.php', source.indexOf('Model::make(1)->na') + 'Model::make(1)->na'.length).map((item) => item.name)).toEqual(['name']);
    expect(workspace.completeMembers('file:///MagicUse.php', source.indexOf("Model::make('team', true)->oth") + "Model::make('team', true)->oth".length).map((item) => item.name)).toEqual(['other']);
    expect(workspace.completeMembers('file:///MagicUse.php', source.indexOf('$model->choose(new Input())->na') + '$model->choose(new Input())->na'.length).map((item) => item.name)).toEqual(['name']);
    expect(workspace.completeMembers('file:///MagicUse.php', source.indexOf('$model->choose(new SpecialInput())->oth') + '$model->choose(new SpecialInput())->oth'.length).map((item) => item.name)).toEqual(['other']);
    expect(workspace.completeMembers('file:///MagicUse.php', source.indexOf('$model->fetch(User::class)->na') + '$model->fetch(User::class)->na'.length).map((item) => item.name)).toEqual(['name']);
    expect(workspace.completeMembers('file:///MagicUse.php', source.indexOf('$model->fetch(Other::class)->na') + '$model->fetch(Other::class)->na'.length)).toEqual([]);
    expect(workspace.completeMembers('file:///MagicUse.php', source.indexOf('$model->defaulted()->na') + '$model->defaulted()->na'.length).map((item) => item.name)).toEqual(['name']);
    expect(workspace.completeMembers('file:///MagicUse.php', source.indexOf('$model->payload->na') + '$model->payload->na'.length)).toEqual([]);
    expect(workspace.signature('file:///MagicUse.php', source.indexOf('$model->find(1)') + '$model->find('.length)).toMatchObject({
      name: 'find', parameters: [{ name: 'id', type: 'int' }, { name: 'label', type: 'string', defaultValue: 'null' }], returnType: 'User',
    });
    const overloadOffset = source.indexOf('$model->locate(1)') + '$model->locate('.length;
    expect(workspace.signatures('file:///MagicUse.php', overloadOffset)).toHaveLength(2);
    expect(workspace.signature('file:///MagicUse.php', overloadOffset)).toBeUndefined();
    expect(workspace.signatures('file:///MagicUse.php', source.indexOf('$model->locate(1)') + '$model->locate(1'.length)
      .map((signature) => signature.returnType)).toEqual(['User']);
    expect(workspace.memberAt('file:///MagicUse.php', source.indexOf('$model->locate(1)') + '$model->'.length + 2)).toBeUndefined();
    expect(workspace.signatures('file:///MagicUse.php', source.indexOf('$model->locate(id: 1)') + '$model->locate(id:'.length)
      .map((signature) => signature.returnType)).toEqual(['User']);
    const definition = workspace.definition('file:///MagicUse.php', source.indexOf('owner->na') + 2);
    expect(definition).toHaveLength(1);
    expect(definitions.slice(definition[0]!.start, definition[0]!.end)).toContain('@property User $owner');
    expect(workspace.unresolvedMembers('file:///MagicUse.php')).toEqual([]);
    expect(workspace.readonlyPropertyAssignments('file:///MagicUse.php').map((item) => [item.name, item.minimumPhpVersion])).toEqual([['createdBy', '7.2']]);
    expect(workspace.incompatibleAssignments('file:///MagicUse.php').map((item) => [item.variable, item.actualType, item.expectedType])).toEqual([
      ['model->payload', 'MagicMembers\\Other', 'MagicMembers\\User'],
    ]);
    const snapshot = workspace.snapshot('file:///MagicDefinitions.php');
    expect(snapshot).toMatchObject({ schema: 74, declaration: { magicMembers: expect.arrayContaining([
      expect.objectContaining({ kind: 'property', name: 'owner', returnType: 'User' }),
      expect.objectContaining({ kind: 'property', name: 'createdBy', returnType: 'User', readable: true, writable: false }),
      expect.objectContaining({ kind: 'property', name: 'payload', writeType: 'User', readable: false, writable: true }),
      expect.objectContaining({ kind: 'method', name: 'find', returnType: 'User' }),
      expect.objectContaining({ kind: 'method', name: 'fetch', returnType: 'T', templates: [expect.objectContaining({ name: 'T', bound: 'User' })] }),
    ]) } });
    workspace.remove('file:///MagicDefinitions.php');
    expect(workspace.completeMembers('file:///MagicUse.php', source.indexOf('$model->find(1)->na') + '$model->find(1)->na'.length)).toEqual([]);
    expect(workspace.restore(snapshot, 'file:///MagicDefinitions.php')).toBe(true);
    expect(workspace.completeMembers('file:///MagicUse.php', source.indexOf('$model->find(1)->na') + '$model->find(1)->na'.length).map((item) => item.name)).toEqual(['name']);
  });
  it('reports missing members only for proven receivers with complete non-magic hierarchies', () => {
    workspace.update('file:///DiagnosticTypes.php', `<?php namespace Diagnostics;
      class Known { public function present(): void {} private function hidden(): void {} protected static function guarded(): void {} public string $value; private string $privateValue; public const READY = true; private const SECRET = false; }
      class Dynamic { private function hidden(): void {} private string $privateValue; public function __call(string $name, array $arguments): mixed {} public function __get(string $name): mixed {} }
      class Incomplete extends MissingBase {}
    `);
    const source = `<?php namespace Diagnostics; function run(Known $known, Dynamic $dynamic, Incomplete $incomplete, mixed $unknown): void {
      $known->present(); $known->missing(); $known->hidden(); $known->privateValue; Known::present(); Known::guarded(); Known::$value; Known::$absent; Known::SECRET; Known::UNKNOWN; Known::class;
      $dynamic->hidden(); $dynamic->privateValue; $dynamic->anything(); $dynamic->anything; $incomplete->missing(); $unknown->missing();
    }`;
    workspace.update('file:///MemberDiagnostics.php', source);
    expect(workspace.unresolvedMembers('file:///MemberDiagnostics.php')).toMatchObject([
      { name: 'missing', ownerFqcn: 'Diagnostics\\Known', kind: 'method' },
      { name: 'absent', ownerFqcn: 'Diagnostics\\Known', kind: 'property', static: true },
      { name: 'UNKNOWN', ownerFqcn: 'Diagnostics\\Known', kind: 'constant' },
    ]);
    expect(workspace.invalidStaticMemberAccesses('file:///MemberDiagnostics.php')).toMatchObject([
      { name: 'present', ownerFqcn: 'Diagnostics\\Known', kind: 'method' },
      { name: 'value', ownerFqcn: 'Diagnostics\\Known', kind: 'property' },
    ]);
    expect(workspace.inaccessibleMemberAccesses('file:///MemberDiagnostics.php')).toMatchObject([
      { name: 'hidden', ownerFqcn: 'Diagnostics\\Known', kind: 'method', visibility: 'private' },
      { name: 'privateValue', ownerFqcn: 'Diagnostics\\Known', kind: 'property', visibility: 'private' },
      { name: 'guarded', ownerFqcn: 'Diagnostics\\Known', kind: 'method', visibility: 'protected' },
      { name: 'SECRET', ownerFqcn: 'Diagnostics\\Known', kind: 'constant', visibility: 'private' },
    ]);
  });
  it('applies asymmetric write visibility to PHP 8.5 static property assignments', () => {
    const source = `<?php namespace StaticVisibility;
      class Manager {
        public private(set) static int $calls = 0;
        public static function record(): void { self::$calls++; }
      }
      class Child extends Manager {
        public static function reset(): void { parent::$calls = 0; }
      }
      function consume(): int {
        Manager::$calls = 1;
        return Manager::$calls;
      }
    `;
    workspace.update('file:///StaticVisibility.php', source);
    expect(workspace.inaccessibleMemberAccesses('file:///StaticVisibility.php').map((item) => [item.name, item.operation, item.static])).toEqual([
      ['calls', 'write', true],
      ['calls', 'write', true],
    ]);
  });
  it('reports only proven direct dynamic property creation candidates', () => {
    workspace.update('file:///DynamicPropertyTypes.php', `<?php namespace DynamicProperties;
      class Plain {}
      class BaseWithProperty { public int $known; }
      class InheritsProperty extends BaseWithProperty {}
      class Magic { public function __set(string $name, mixed $value): void {} }
      #[\\AllowDynamicProperties] class Allowed {}
      class AllowedChild extends Allowed {}
      readonly class ReadonlyTarget {}
      class Duplicate {}
    `);
    workspace.update('file:///DuplicateDynamicPropertyType.php', '<?php namespace DynamicProperties; class Duplicate {}');
    const source = `<?php namespace DynamicProperties;
      function mutate(Plain $plain, InheritsProperty $declared, Magic $magic, Allowed $allowed,
        AllowedChild $allowedChild, ReadonlyTarget $readonly, Duplicate $ambiguous, object $unknown, string $name): void {
        $plain->created = 1;
        $plain->readOnly;
        $declared->known = 1;
        $magic->created = 1;
        $allowed->created = 1;
        $allowedChild->created = 1;
        $readonly->created = 1;
        $ambiguous->created = 1;
        $unknown->created = 1;
        $plain->{$name} = 1;
        $local = new Plain();
        $local->second = 2;
        $plain->repeated = 1;
        $plain->repeated = 2;
        $plain->repeated = 3;
        $plain->reset = 1;
        unset($plain->reset);
        $plain->reset = 2;
        $nested = ($plain->nested = 1);
      }
    `;
    workspace.update('file:///DynamicPropertyUse.php', source);
    const diagnostics = workspace.dynamicPropertyCreations('file:///DynamicPropertyUse.php');
    expect(diagnostics).toMatchObject([
      { name: 'created', ownerFqcn: 'DynamicProperties\\Plain' },
      { name: 'second', ownerFqcn: 'DynamicProperties\\Plain' },
      { name: 'repeated', ownerFqcn: 'DynamicProperties\\Plain' },
      { name: 'reset', ownerFqcn: 'DynamicProperties\\Plain' },
      { name: 'reset', ownerFqcn: 'DynamicProperties\\Plain' },
    ]);
    expect(diagnostics.map((item) => source.slice(item.start, item.end))).toEqual(['created', 'second', 'repeated', 'reset', 'reset']);

    workspace.update('file:///IncompleteDynamicPropertyUse.php', '<?php namespace DynamicProperties; function broken(Plain $plain): void { $plain->created =');
    expect(workspace.dynamicPropertyCreations('file:///IncompleteDynamicPropertyUse.php')).toEqual([]);
    workspace.remove('file:///IncompleteDynamicPropertyUse.php');
    workspace.remove('file:///DuplicateDynamicPropertyType.php');
    workspace.remove('file:///DynamicPropertyUse.php');
    workspace.remove('file:///DynamicPropertyTypes.php');
  });
  it('models PHP 8.4 property-hook read, write, setter-type, backing, and asymmetric visibility contracts', () => {
    const definitions = `<?php declare(strict_types=1); namespace PropertyHooks;
      interface Label {}
      class Hooks {
        public string $backed { get => $this->backed; }
        public string $display { get => 'display'; }
        public string $sink { set(string|Label $value) { echo $value; } }
        public private(set) string $input { set(string|Label $value) => (string) $value; }
        public array $items { get => $this->items; }
        public array $referenceItems { &get { return $this->referenceItems; } }
        public array $virtualItems { get => []; }
      }`;
    const iteration = `<?php namespace PropertyHooks;
      class ReferenceIteration {
        public array $plain { get => $this->plain; }
        public array $allowed { &get { return $this->allowed; } }
        private array $hidden { get => $this->hidden; }
      }`;
    workspace.update('file:///PropertyHookTypes.php', definitions);
    workspace.update('file:///PropertyHookIteration.php', iteration);
    expect(workspace.undefinedVariables('file:///PropertyHookTypes.php')).toEqual([]);
    const source = `<?php declare(strict_types=1); namespace PropertyHooks;
      function mutate(array &$value): void {}
      function consume(Hooks $hooks, Label $label, array $replacement, ReferenceIteration $iteration): void {
        $hooks->display; $hooks->display = 'changed'; $hooks->display .= 'changed';
        $hooks->sink = $label; $hooks->sink = 1; $hooks->sink; $hooks->sink .= 'changed';
        $hooks->input = 'accepted'; $hooks->input; $hooks->input .= 'changed';
        $hooks->backed = 'changed'; $hooks->backed;
        $hooks->items['key'] = 'changed'; $hooks->referenceItems['key'] = 'changed'; $hooks->virtualItems['key']++;
        $right =& $hooks->items; $allowed =& $hooks->referenceItems;
        $hooks->items =& $replacement; $hooks->referenceItems =& $replacement;
        mutate($hooks->items); mutate($hooks->referenceItems);
        foreach ($hooks->items as &$item) {} foreach ($hooks->referenceItems as &$allowedItem) {}
        foreach ($iteration as &$property) {}
      }`;
    workspace.update('file:///PropertyHookUse.php', source);
    const display = source.indexOf('display;') + 2;
    expect(workspace.memberAt('file:///PropertyHookUse.php', display)).toMatchObject({
      kind: 'property', name: 'display', returnType: 'string', hooked: true, virtual: true, readable: true, writable: false,
    });
    const definition = workspace.definition('file:///PropertyHookUse.php', display);
    expect(definition).toHaveLength(1);
    expect(definitions.slice(definition[0]!.start, definition[0]!.end)).toBe('$display');
    expect(workspace.invalidPropertyOperations('file:///PropertyHookUse.php').map((item) => [item.name, item.operation, item.reason])).toEqual([
      ['display', 'write', 'unwritable'], ['display', 'write', 'unwritable'],
      ['sink', 'read', 'unreadable'], ['sink', 'read', 'unreadable'],
      ['items', 'write', 'indirect-modification'], ['virtualItems', 'write', 'indirect-modification'],
      ['items', 'write', 'indirect-modification'],
      ['items', 'write', 'reference-assignment'], ['referenceItems', 'write', 'reference-assignment'],
      ['items', 'write', 'indirect-modification'], ['items', 'write', 'indirect-modification'],
    ]);
    expect(workspace.invalidHookedObjectReferenceIterations('file:///PropertyHookUse.php')).toMatchObject([
      { ownerFqcn: 'PropertyHooks\\ReferenceIteration', propertyNames: ['plain'] },
    ]);
    expect(workspace.inaccessibleMemberAccesses('file:///PropertyHookUse.php')).toMatchObject([
      { name: 'input', operation: 'write', visibility: 'private' },
      { name: 'input', operation: 'write', visibility: 'private' },
    ]);
    expect(workspace.incompatibleAssignments('file:///PropertyHookUse.php').map((item) => [item.variable, item.actualType, item.expectedType])).toEqual([
      ['hooks->sink', 'int', 'PropertyHooks\\Label|string'],
    ]);
  });
  it('validates PHP 8.4 abstract, interface, final, and variant property-hook inheritance contracts', () => {
    const source = `<?php namespace PropertyHookInheritance;
      class Animal {} class Dog extends Animal {}
      interface Readable { public Animal $pet { get; } }
      interface Writable { public Dog $sink { set; } }
      interface Both { public Animal $both { get; set; } }
      class Covariant implements Readable { public Dog $pet; }
      class Contravariant implements Writable { public Animal $sink; }
      class Missing implements Readable {}
      class MissingGet implements Readable { public Animal $pet { set(Animal $value) { echo $value; } } }
      class BadBoth implements Both { public Dog $both; }
      class BadVisibility implements Readable { protected Animal $pet; }
      abstract class Partial { abstract public string $label { get; set { $this->label = $value; } } }
      class PartialChild extends Partial { public string $label { get => 'child'; } }
      class MissingAbstract extends Partial {}
      class FinalBase {
        final public string $closed;
        public string $name { final get => 'base'; set => $value; }
      }
      class PromotedFinalBase {
        public function __construct(public final string $promotedClosed) {}
      }
      class BadFinalProperty extends FinalBase { public string $closed; }
      class BadPromotedFinalProperty extends PromotedFinalBase { public string $promotedClosed; }
      class BadFinalHook extends FinalBase { public string $name { get => 'child'; } }
      class LegalOtherHook extends FinalBase { public string $name { set => strtoupper($value); } }
      function useInheritedHooks(PartialChild $partial, LegalOtherHook $legal): void {
        $partial->label = 'changed'; $partial->label;
        $legal->name = 'changed'; $legal->name;
      }
    `;
    workspace.update('file:///PropertyHookInheritance.php', source);
    expect(workspace.incompatiblePropertyOverrides('file:///PropertyHookInheritance.php').map((item) => [item.property, item.reason])).toEqual([
      ['PropertyHookInheritance\\MissingGet::$pet', 'the inherited get operation is not implemented'],
      ['PropertyHookInheritance\\BadBoth::$both', 'set type is not contravariant with the inherited property type'],
      ['PropertyHookInheritance\\BadVisibility::$pet', 'get visibility cannot be more restrictive than public'],
      ['PropertyHookInheritance\\BadFinalProperty::$closed', 'a final property cannot be overridden'],
      ['PropertyHookInheritance\\BadPromotedFinalProperty::$promotedClosed', 'a final property cannot be overridden'],
      ['PropertyHookInheritance\\BadFinalHook::$name', 'the final get hook cannot be overridden'],
    ]);
    expect(workspace.missingPropertyImplementations('file:///PropertyHookInheritance.php').map((item) => [item.classFqcn, item.property, item.reason])).toEqual([
      ['PropertyHookInheritance\\Missing', 'pet', 'property $pet is not implemented'],
      ['PropertyHookInheritance\\MissingAbstract', 'label', 'the inherited get operation is not implemented'],
    ]);
    const partialLabel = source.indexOf('label =');
    expect(workspace.memberAt('file:///PropertyHookInheritance.php', partialLabel)).toMatchObject({ readable: true, writable: true });
    const legalName = source.indexOf('name =', partialLabel);
    expect(workspace.memberAt('file:///PropertyHookInheritance.php', legalName)).toMatchObject({ readable: true, writable: true, getByReference: false });
    expect(workspace.invalidPropertyOperations('file:///PropertyHookInheritance.php').filter((item) => item.start >= partialLabel)).toEqual([]);
  });
  it('rejects AllowDynamicProperties on readonly and non-class declarations', () => {
    const source = `<?php namespace AttributeContracts;
      use \\AllowDynamicProperties as Dynamic;
      #[\\AllowDynamicProperties] class LegalClass {}
      #[Dynamic] readonly class ReadonlyTarget {}
      #[\\AllowDynamicProperties] interface InvalidInterface {}
      #[\\AllowDynamicProperties] trait InvalidTrait {}
      #[\\AllowDynamicProperties] enum InvalidEnum {}
      #[AllowDynamicProperties] readonly class NamespacedCustomAttribute {}
    `;
    workspace.update('file:///AllowDynamicProperties.php', source);
    const diagnostics = workspace.invalidAllowDynamicProperties('file:///AllowDynamicProperties.php');
    expect(diagnostics).toMatchObject([
      { typeFqcn: 'AttributeContracts\\ReadonlyTarget', kind: 'class', readonlyClass: true },
      { typeFqcn: 'AttributeContracts\\InvalidInterface', kind: 'interface', readonlyClass: false },
      { typeFqcn: 'AttributeContracts\\InvalidTrait', kind: 'trait', readonlyClass: false },
      { typeFqcn: 'AttributeContracts\\InvalidEnum', kind: 'enum', readonlyClass: false },
    ]);
    expect(diagnostics.map((item) => source.slice(item.start, item.end))).toEqual(['Dynamic', '\\AllowDynamicProperties', '\\AllowDynamicProperties', '\\AllowDynamicProperties']);
    workspace.update('file:///IncompleteAllowDynamicProperties.php', '<?php #[\\AllowDynamicProperties] readonly class Incomplete {');
    expect(workspace.invalidAllowDynamicProperties('file:///IncompleteAllowDynamicProperties.php')).toEqual([]);
    workspace.remove('file:///IncompleteAllowDynamicProperties.php');
    workspace.remove('file:///AllowDynamicProperties.php');
  });
  it('validates PHP 8.5 Override attributes on direct, promoted, interface, anonymous, and trait properties', () => {
    const definitions = `<?php namespace OverrideProperties;
      class Base { protected string $name; private int $secret; protected static int $count; }
      interface Contract { public string $label { get; } }
      trait MissingTrait { #[\\Override] public int $missingFromTrait; }
      trait MatchingTrait { #[\\Override] protected string $name; }
      trait NestedTrait { use MissingTrait; }
    `;
    workspace.update('file:///OverridePropertyDefinitions.php', definitions);
    const source = `<?php namespace OverrideProperties;
      use \\Override as BuiltinOverride;
      class Valid extends Base implements Contract {
        #[\\Override] protected string $name;
        #[BuiltinOverride] protected static int $count;
        #[\\Override] public string $label { get; }
      }
      class Promoted extends Base { public function __construct(#[\\Override] protected string $name) {} }
      interface ChildContract extends Contract { #[\\Override] public string $label { get; } }
      class Missing extends Base {
        #[\\Override] public int $absent;
        #[\\Override] private int $secret;
        #[Override] public int $customAttribute;
      }
      trait Standalone { #[\\Override] public int $standalone; }
      class TraitMissing extends Base { use MissingTrait; }
      class TraitMatching extends Base { use MatchingTrait; }
      class NestedTraitMissing extends Base { use NestedTrait; }
      class Incomplete extends UnknownParent { #[\\Override] public int $unknown; }
      $anonymous = new class extends Base { #[\\Override] protected string $name; };
    `;
    workspace.update('file:///OverrideProperties.php', source);
    const attributes = workspace.overridePropertyAttributes('file:///OverrideProperties.php');
    expect(attributes.map((item) => [item.property, item.declaredInTrait, item.composedFromTrait, item.matchingParentProperty])).toEqual([
      ['OverrideProperties\\Valid::$name', false, false, 'OverrideProperties\\Base::$name'],
      ['OverrideProperties\\Valid::$count', false, false, 'OverrideProperties\\Base::$count'],
      ['OverrideProperties\\Valid::$label', false, false, 'OverrideProperties\\Contract::$label'],
      ['OverrideProperties\\Promoted::$name', false, false, 'OverrideProperties\\Base::$name'],
      ['OverrideProperties\\ChildContract::$label', false, false, 'OverrideProperties\\Contract::$label'],
      ['OverrideProperties\\Missing::$absent', false, false, undefined],
      ['OverrideProperties\\Missing::$secret', false, false, undefined],
      ['OverrideProperties\\Standalone::$standalone', true, false, undefined],
      ['OverrideProperties\\TraitMissing::$missingFromTrait', false, true, undefined],
      ['OverrideProperties\\TraitMatching::$name', false, true, 'OverrideProperties\\Base::$name'],
      ['OverrideProperties\\NestedTraitMissing::$missingFromTrait', false, true, undefined],
      [expect.stringMatching(/^OverrideProperties\\@anonymous:/), false, false, 'OverrideProperties\\Base::$name'],
    ]);
    expect(attributes.some((item) => item.property.endsWith('::$customAttribute'))).toBe(false);
    expect(attributes.some((item) => item.property.endsWith('::$unknown'))).toBe(false);
    expect(attributes.filter((item) => item.composedFromTrait).map((item) => source.slice(item.start, item.end))).toEqual([
      'MissingTrait', 'MatchingTrait', 'NestedTrait',
    ]);
    workspace.remove('file:///OverrideProperties.php');
    workspace.remove('file:///OverridePropertyDefinitions.php');
  });
  it('reports only proven discarded NoDiscard results and invalid declarations', () => {
    const source = `<?php namespace NoDiscardContracts;
      use \\NoDiscard as Important;
      #[\\NoDiscard("because status matters")] function important(): int { return 1; }
      #[NoDiscard] function customAttribute(): int { return 1; }
      class ParentService { #[\\NoDiscard] public function inherited(): int { return 1; } }
      trait ImportantTrait { #[\\NoDiscard(message: "because the trait result matters")] public function fromTrait(): int { return 1; } }
      class Service extends ParentService {
        use ImportantTrait;
        public function inherited(): int { return 2; }
        #[Important] public function value(): int { return 1; }
        #[Important] public static function staticValue(): int { return 1; }
        #[Important] public function invalidVoid(): void {}
        #[Important] public function invalidNever(): never { throw new \\RuntimeException(); }
        #[Important] public function __clone() {}
        public string $name { #[Important] get => $this->name; }
      }
      #[\\NoDiscard] class InvalidClass {}
      #[\\NoDiscard] interface InvalidInterface {}
      #[\\NoDiscard] trait InvalidTrait {}
      #[\\NoDiscard] enum InvalidEnum { #[\\NoDiscard] case OLD; }
      class InvalidMembers {
        #[\\NoDiscard] public const OLD = 1;
        #[\\NoDiscard] public int $value;
        public function parameter(#[\\NoDiscard] int $value): int { return $value; }
        #[\\DelayedTargetValidation] #[\\NoDiscard] public string $delayed;
      }
      #[\\NoDiscard] const INVALID_GLOBAL = 1;
      $invalidAnonymous = new #[\\NoDiscard] class {};
      $invalidClosure = #[\\NoDiscard] function(): void {};
      $invalidArrow = #[\\NoDiscard] fn(): never => throw new \\RuntimeException();
      function consume(): void {
        important();
        $used = important();
        (bool) important();
        (void) important();
        customAttribute();
        $service = new Service();
        $service->value();
        Service::staticValue();
        $service->fromTrait();
        $service->inherited();
        for (important(), (void) important(); false; important(), (void) important()) {}
      }
      important();
    `;
    workspace.update('file:///NoDiscard.php', source);
    expect(workspace.discardedNoDiscardReturns('file:///NoDiscard.php')).toMatchObject([
      { callable: 'NoDiscardContracts\\important', message: 'because status matters' },
      { callable: 'NoDiscardContracts\\Service::value' },
      { callable: 'NoDiscardContracts\\Service::staticValue' },
      { callable: 'NoDiscardContracts\\Service::fromTrait', message: 'because the trait result matters' },
      { callable: 'NoDiscardContracts\\important', message: 'because status matters' },
      { callable: 'NoDiscardContracts\\important', message: 'because status matters' },
      { callable: 'NoDiscardContracts\\important', message: 'because status matters' },
    ]);
    expect(workspace.invalidNoDiscardDeclarations('file:///NoDiscard.php').map((item) => [item.callable, item.reason])).toEqual([
      ['NoDiscardContracts\\Service::invalidVoid', 'void-return'],
      ['NoDiscardContracts\\Service::invalidNever', 'never-return'],
      ['NoDiscardContracts\\Service::__clone', 'magic-method'],
      [expect.stringMatching(/^closure@/), 'void-return'],
      [expect.stringMatching(/^arrow function@/), 'never-return'],
    ]);
    expect(workspace.invalidNoDiscardTargets('file:///NoDiscard.php').map((item) => [item.target, item.delayedValidation])).toEqual([
      ['property-hook', false],
      ['class', false],
      ['interface', false],
      ['trait', false],
      ['enum', false],
      ['enum-case', false],
      ['class-constant', false],
      ['property', false],
      ['parameter', false],
      ['property', true],
      ['global-constant', false],
      ['anonymous-class', false],
    ]);
    workspace.remove('file:///NoDiscard.php');
  });
  it('reports proven Deprecated attribute and PHPDoc symbol uses without inheriting method metadata', () => {
    const source = `<?php namespace DeprecatedContracts;
      #[\\Deprecated(message: "use replacement()", since: "1.2")] function oldFunction(): void {}
      /** @deprecated use documentedReplacement() */ function documentedFunction(): void {}
      class Deprecated {}
      #[Deprecated] function customAttribute(): void {}
      class ParentService { #[\\Deprecated("old parent method")] public function inherited(): void {} }
      class Service extends ParentService {
        #[\\Deprecated(message: "use create()", since: "2.0")] public function __construct() {}
        #[\\Deprecated("use currentMethod()")] public function oldMethod(): void {}
        public function inherited(): void {}
        /** @deprecated use CURRENT */ public const OLD_DOC = 1;
        #[\\Deprecated("use CURRENT")] public const OLD = 1;
      }
      enum Status { #[\\Deprecated("use CURRENT case")] case OLD; case CURRENT; }
      class Hooked { public string $name { #[\\Deprecated("use readName()")] get => "name"; #[\\Deprecated("use writeName()")] set {} } }
      /** @deprecated use CurrentTrait */ trait DocumentedTrait {}
      #[\\Deprecated(message: "use CurrentTrait", since: "3.0")] trait OldTrait {}
      class Consumer { use DocumentedTrait, OldTrait; }
      #[\\Deprecated(message: "use CURRENT_GLOBAL", since: "4.0")] const OLD_GLOBAL = 1;
      function consume(): void {
        oldFunction(...);
        oldFunction();
        documentedFunction();
        customAttribute();
        $service = new Service();
        $service->oldMethod();
        $service->inherited();
        Service::OLD_DOC;
        Service::OLD;
        Status::OLD;
        OLD_GLOBAL;
        $hooked = new Hooked(); $read = $hooked->name; $hooked->name = "value";
      }
    `;
    workspace.update('file:///Deprecated.php', source);
    expect(workspace.deprecatedSymbolUses('file:///Deprecated.php').map((item) => ({
      symbol: item.symbol, kind: item.kind, message: item.message, since: item.since, minimum: item.attributeMinimumVersion,
    }))).toEqual([
      { symbol: 'DeprecatedContracts\\DocumentedTrait', kind: 'trait', message: 'use CurrentTrait', since: undefined, minimum: undefined },
      { symbol: 'DeprecatedContracts\\OldTrait', kind: 'trait', message: 'use CurrentTrait', since: '3.0', minimum: '8.5' },
      { symbol: 'DeprecatedContracts\\oldFunction', kind: 'function', message: 'use replacement()', since: '1.2', minimum: '8.4' },
      { symbol: 'DeprecatedContracts\\documentedFunction', kind: 'function', message: 'use documentedReplacement()', since: undefined, minimum: undefined },
      { symbol: 'DeprecatedContracts\\Service::__construct', kind: 'method', message: 'use create()', since: '2.0', minimum: '8.4' },
      { symbol: 'DeprecatedContracts\\Service::oldMethod', kind: 'method', message: 'use currentMethod()', since: undefined, minimum: '8.4' },
      { symbol: 'DeprecatedContracts\\Service::OLD_DOC', kind: 'constant', message: 'use CURRENT', since: undefined, minimum: undefined },
      { symbol: 'DeprecatedContracts\\Service::OLD', kind: 'constant', message: 'use CURRENT', since: undefined, minimum: '8.4' },
      { symbol: 'DeprecatedContracts\\Status::OLD', kind: 'enum-case', message: 'use CURRENT case', since: undefined, minimum: '8.4' },
      { symbol: 'DeprecatedContracts\\OLD_GLOBAL', kind: 'constant', message: 'use CURRENT_GLOBAL', since: '4.0', minimum: '8.5' },
      { symbol: 'DeprecatedContracts\\Hooked::$name::get', kind: 'property-get', message: 'use readName()', since: undefined, minimum: '8.4' },
      { symbol: 'DeprecatedContracts\\Hooked::$name::set', kind: 'property-set', message: 'use writeName()', since: undefined, minimum: '8.4' },
    ]);
    workspace.remove('file:///Deprecated.php');
  });
  it('classifies exact native Deprecated targets and excludes custom namespaced attributes', () => {
    const source = `<?php namespace DeprecatedTargets;
      #[\\Deprecated] function validFunction(): void {}
      class Container {
        #[\\Deprecated] public function validMethod(#[\\Deprecated] int $invalidParameter): void {}
        #[\\Deprecated] public const VALID_CONSTANT = 1;
        #[\\Deprecated] public string $invalidProperty;
        public string $hooked { #[\\Deprecated] get => "value"; }
      }
      enum ValidEnum { #[\\Deprecated] case OLD; }
      #[\\Deprecated] trait ValidTrait {}
      #[\\Deprecated] const VALID_GLOBAL = 1;
      #[\\Deprecated] class InvalidClass {}
      #[\\Deprecated] interface InvalidInterface {}
      #[\\Deprecated] enum InvalidEnum {}
      #[\\DelayedTargetValidation] #[\\Deprecated] class DelayedInvalidClass {}
      $closure = #[\\Deprecated] function(): void {};
      $arrow = #[\\Deprecated] fn(): int => 1;
      $anonymous = new #[\\Deprecated] class {};
      class Deprecated {}
      #[Deprecated] class CustomAttributeTarget {}
    `;
    workspace.update('file:///DeprecatedTargets.php', source);
    expect(workspace.deprecatedAttributeTargets('file:///DeprecatedTargets.php').map((item) => [
      item.target, item.valid, item.minimumPhpVersion, item.delayedValidation,
    ])).toEqual([
      ['function', true, '8.4', false],
      ['method', true, '8.4', false],
      ['parameter', false, '8.4', false],
      ['class-constant', true, '8.4', false],
      ['property', false, '8.4', false],
      ['property-hook', true, '8.4', false],
      ['enum-case', true, '8.4', false],
      ['trait', true, '8.5', false],
      ['global-constant', true, '8.5', false],
      ['class', false, '8.4', false],
      ['interface', false, '8.4', false],
      ['enum', false, '8.4', false],
      ['class', false, '8.4', true],
      ['closure', true, '8.4', false],
      ['closure', true, '8.4', false],
      ['anonymous-class', false, '8.4', false],
    ]);
    workspace.remove('file:///DeprecatedTargets.php');
  });
  it('plans typed property declarations only from proven dynamic-property values', () => {
    const definitions = '<?php namespace DynamicFix; class Target {} class Result {}';
    workspace.update('file:///DynamicFixTypes.php', definitions);
    const source = `<?php namespace DynamicFix; function mutate(Target $target): void {
      $target->count = 1;
      $target->result = new Result();
      $target->unknown = build();
    }`;
    workspace.update('file:///DynamicFixUse.php', source);
    expect(workspace.dynamicPropertyDeclaration('file:///DynamicFixUse.php', source.indexOf('count') + 1)).toEqual({
      uri: 'file:///DynamicFixTypes.php', name: 'count', ownerFqcn: 'DynamicFix\\Target',
      insertOffset: definitions.indexOf('}', definitions.indexOf('class Target')), type: 'int',
    });
    expect(workspace.dynamicPropertyDeclaration('file:///DynamicFixUse.php', source.indexOf('result') + 1)).toMatchObject({
      uri: 'file:///DynamicFixTypes.php', name: 'result', ownerFqcn: 'DynamicFix\\Target', type: '\\DynamicFix\\Result',
    });
    expect(workspace.dynamicPropertyDeclaration('file:///DynamicFixUse.php', source.indexOf('unknown') + 1)).toBeUndefined();
    workspace.remove('file:///DynamicFixUse.php');
    workspace.remove('file:///DynamicFixTypes.php');
  });
  it('reports missing required arguments only for uniquely resolved flat calls', () => {
    workspace.update('file:///ArgumentDefinitions.php', `<?php namespace Arguments;
      class Service { public function __construct(string $name, int $limit = 1) {} public function run(int $id, string ...$labels): void {} }
      function helper(string $required, ?int $optional = null): void {}
    `);
    const source = `<?php namespace Arguments; function test(Service $service, mixed $unknown): void {
      new Service(); new Service('ok'); $service->run(); $service->run(id: 1); $service->run(id: 1, custom: 'label'); helper(); helper(required: 'ok');
      $unknown->run(); missing(); helper(unknown: 'value'); helper(Required: 'case'); helper(other()); helper(required: 'one', required: 'two'); helper(required: 'one', Required: 'case'); helper(required: 'ok', 2); helper(required: 'ok', ...$labels);
    }`;
    workspace.update('file:///ArgumentCalls.php', source);
    expect(workspace.missingRequiredArguments('file:///ArgumentCalls.php')).toMatchObject([
      { callable: 'Arguments\\Service::__construct', parameters: ['name'] },
      { callable: 'Arguments\\Service::run', parameters: ['id'] },
      { callable: 'Arguments\\helper', parameters: ['required'] },
    ]);
    expect(workspace.unknownNamedArguments('file:///ArgumentCalls.php')).toMatchObject([
      { callable: 'Arguments\\helper', name: 'unknown' },
      { callable: 'Arguments\\helper', name: 'Required' },
      { callable: 'Arguments\\helper', name: 'Required' },
    ]);
    const unknownStart = source.indexOf('unknown:');
    expect(workspace.unknownNamedArguments('file:///ArgumentCalls.php')[0]).toMatchObject({ start: unknownStart, end: unknownStart + 'unknown'.length });
    expect(workspace.argumentOrderProblems('file:///ArgumentCalls.php')).toMatchObject([
      { kind: 'duplicate-named', name: 'required' },
      { kind: 'positional-after-named' },
      { kind: 'unpack-after-named' },
    ]);
  });
  it('types first-class callable acquisition as Closure without invoking its target', () => {
    const source = `<?php namespace CallableAcquisition;
      function transform(string $value): int { return strlen($value); }
      function takesClosure(\\Closure $callback): void {}
      function takesInt(int $value): void {}
      function run(): void {
        $callback = transform(...);
        takesClosure(transform(...));
        takesInt(transform(...));
      }
    `;
    workspace.update('file:///CallableAcquisition.php', source);
    expect(workspace.missingRequiredArguments('file:///CallableAcquisition.php')).toEqual([]);
    expect(workspace.incompatibleArguments('file:///CallableAcquisition.php').map((item) => [item.callable, item.actualType, item.expectedType])).toEqual([
      ['CallableAcquisition\\takesInt', 'Closure', 'int'],
    ]);
    const definition = workspace.definition('file:///CallableAcquisition.php', source.indexOf('transform(...)') + 2);
    expect(definition).toHaveLength(1);
    expect(source.slice(definition[0]!.start, definition[0]!.end)).toBe('transform');
  });
  it('identifies only guaranteed expressions with a unique compatible native never call', () => {
    workspace.update('file:///NeverDeclarations.php', `<?php namespace NeverFlow;
      class Allowed {} class Rejected {}
      class Terminator { public function stop(Allowed $value): never { throw new \\Exception(); }
        public static function halt(Allowed $value): never { throw new \\Exception(); } }
      function stop(Allowed $value): never { throw new \\Exception(); }
      /** @return never */ function documented(Allowed $value) { throw new \\Exception(); }
      function duplicate(Allowed $value): never { throw new \\Exception(); }`);
    workspace.update('file:///NeverDuplicate.php', '<?php namespace NeverFlow; function duplicate(Allowed $value): never { throw new \\Exception(); }');
    const source = `<?php namespace NeverFlow;
      function run(Allowed $allowed, Rejected $rejected, Terminator $terminator): void {
        stop($allowed); afterStop();
        $terminator->stop($allowed); afterMethod();
        Terminator::halt($allowed); afterStaticMethod();
        stop($rejected); afterRejected();
        $terminator->stop($rejected); afterRejectedMethod();
        documented($allowed); afterDocumented();
        duplicate($allowed); afterDuplicate();
        $result = stop($allowed); afterNested();
        consume(stop($allowed)); afterArgument();
        $allowed && stop($allowed); afterShortCircuit();
        stop($allowed) && $allowed; afterGuaranteedLeft();
        $allowed?->accept(stop($allowed)); afterNullsafeArgument();
        if (stop($allowed)) {} afterIfCondition();
        while (stop($allowed)) {} afterWhileCondition();
        if ($allowed && stop($allowed)) {} afterConditionalCondition();
      }`;
    workspace.update('file:///NeverUse.php', source);
    expect(workspace.neverReturningCalls('file:///NeverUse.php').map((call) => source.slice(call.start, call.end)))
      .toEqual(['stop($allowed)', '$terminator->stop($allowed)', 'Terminator::halt($allowed)', '$result = stop($allowed)',
        'consume(stop($allowed))', 'stop($allowed) && $allowed', '(stop($allowed))', '(stop($allowed))']);
  });

  it('narrows a union only inside a directly proven positive instanceof branch', () => {
    workspace.update('file:///NarrowTypes.php', '<?php namespace Narrow; class A { public function onlyA(): void {} } class B { public function onlyB(): void {} }');
    const source = '<?php namespace Narrow; function run(A|B $value): void { if ($value instanceof A) { $value->only } $value->only }';
    workspace.update('file:///Narrow.php', source); const occurrences = [...source.matchAll(/only/g)].map((item) => item.index);
    expect(workspace.completeMembers('file:///Narrow.php', occurrences[0]! + 4).map((item) => item.name)).toEqual(['onlyA']);
    expect(workspace.completeMembers('file:///Narrow.php', occurrences[1]! + 4)).toEqual([]);
  });
  it('uses standalone native assert instanceof facts until the asserted target is mutated', () => {
    workspace.update('file:///NativeAssertTypes.php', `<?php namespace NativeAssert;
      class Base {} class Ready extends Base { public function onlyReady(): void {} } class Other extends Base {}
      class Box { public Base|Other $service; public Ready|false $maybe; public function touch(): void {} }
      function mixedValue(): mixed {} function maybeReady(): ?Ready {} function acceptOther(Other $value): void {}
      function falseable(): Ready|false {} function booleanValue(): bool {}
      function acceptString(string $value): void {} function acceptInt(int $value): void {}
      function acceptFalse(false $value): void {} function acceptTrue(true $value): void {}
      function observe(mixed $value): void {} function mutate(mixed &$value): void {} function description(): string { return ''; }`);
    workspace.update('php-companion-builtin:/native-assert.php', '<?php function is_string(mixed $value): bool {}');
    const source = `<?php declare(strict_types=1); namespace NativeAssert;
      /** @param array{service: Base|Other, optional?: Ready|null, present?: Ready|null, flagged: Ready|false} $data */
      function run(Base|Other $parameter, Ready|Other $excluded, ?Ready $notNull, string|int $negativeScalar, int|float|string $numeric, Box $box, array $data): void {
        $local = mixedValue();
        assert($local instanceof Ready, 'repository expected');
        $local->only; $local->onlyReady(); acceptOther($local); observe($local); $local->only;
        mutate($local); $local->only;
        \\assert(description: null, assertion: $parameter instanceof Ready);
        $parameter->only; acceptOther($parameter); $parameter = mixedValue(); $parameter->only;
        assert($box->service instanceof Ready);
        $box->service->only; acceptOther($box->service); $box->touch(); $box->service->only;
        assert($data['service'] instanceof Ready);
        $data['service']->only; acceptOther($data['service']); $data['service'] = mixedValue(); $data['service']->only;
        $nullable = maybeReady(); assert($nullable !== null);
        $nullable->only; acceptOther($nullable); $nullable = null; $nullable->only;
        $scalar = mixedValue(); assert(is_string($scalar)); acceptInt($scalar); $scalar = 1; acceptString($scalar);
        $dynamic = mixedValue(); assert($dynamic instanceof Ready, description()); $dynamic->only; acceptOther($dynamic);
        assert(!($excluded instanceof Other)); $excluded->only; acceptOther($excluded);
        assert(!is_string($negativeScalar)); acceptString($negativeScalar);
        assert(!is_null($notNull)); $notNull->only; acceptOther($notNull);
        assert(!is_numeric($numeric)); acceptInt($numeric);
        assert(isset($data['optional'])); $data['optional']->only; acceptOther($data['optional']);
        assert(array_key_exists('present', $data)); $data['present']->only; acceptOther($data['present']);
        $falseable = falseable(); assert($falseable !== false); $falseable->only; acceptOther($falseable);
        $boolean = booleanValue(); assert(false !== $boolean); acceptFalse($boolean);
        $loose = falseable(); assert($loose != false); $loose->only; acceptOther($loose);
        assert($box->maybe !== false); $box->maybe->only; acceptOther($box->maybe); $box->touch(); $box->maybe->only;
        assert(false !== $data['flagged']); $data['flagged']->only; acceptOther($data['flagged']); $data['flagged'] = false; $data['flagged']->only;
      }
      function exactBooleanMismatch(): true { $exact = mixedValue(); assert($exact === false); return $exact; }`;
    workspace.update('file:///NativeAssertUse.php', source);
    const positions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(positions.map((position) => workspace.completeMembers('file:///NativeAssertUse.php', position).map((item) => item.name)))
      .toEqual([['onlyReady'], ['onlyReady'], [], ['onlyReady'], [], ['onlyReady'], [], ['onlyReady'], [], ['onlyReady'], [], [],
        ['onlyReady'], ['onlyReady'], ['onlyReady'], [], ['onlyReady'], [], ['onlyReady'], [], ['onlyReady'], []]);
    expect(workspace.definition('file:///NativeAssertUse.php', source.indexOf('onlyReady();', source.indexOf('assert($local')) + 2))
      .toEqual([expect.objectContaining({ uri: 'file:///NativeAssertTypes.php' })]);
    expect(workspace.incompatibleArguments('file:///NativeAssertUse.php').map((item) => [item.actualType, item.expectedType]))
      .toEqual([
        ...Array.from({ length: 5 }, () => ['NativeAssert\\Ready', 'NativeAssert\\Other']),
        ['string', 'int'], ['int', 'string'],
        ['NativeAssert\\Ready', 'NativeAssert\\Other'], ['int', 'string'], ['NativeAssert\\Ready', 'NativeAssert\\Other'],
        ['string', 'int'], ['NativeAssert\\Ready', 'NativeAssert\\Other'], ['NativeAssert\\Ready|null', 'NativeAssert\\Other'],
        ['NativeAssert\\Ready', 'NativeAssert\\Other'], ['true', 'false'],
        ['NativeAssert\\Ready', 'NativeAssert\\Other'], ['NativeAssert\\Ready', 'NativeAssert\\Other'],
      ]);
    expect(workspace.incompatibleReturns('file:///NativeAssertUse.php').map((item) => [item.actualType, item.expectedType]))
      .toEqual([['false', 'true']]);
  });
  it('narrows strict boolean literals in branches and terminating guards', () => {
    workspace.update('file:///BooleanBranchTypes.php', `<?php namespace BooleanBranch;
      class Ready { public function onlyReady(): void {} } class Other {}
      class Box { public Ready|false $maybe; }
      function falseable(): Ready|false {} function booleanValue(): bool {} function mixedValue(): mixed {}
      function acceptFalse(false $value): void {} function acceptTrue(true $value): void {}`);
    const source = `<?php declare(strict_types=1); namespace BooleanBranch;
      /** @param array{item: Ready|false} $data */
      function run(Ready|false $parameter, Box $box, array $data): void {
        if ($parameter !== false) { $parameter->only; } $parameter->only;
        $local = falseable(); if (false !== $local) { $local->only; } $local->only;
        $guard = falseable(); if ($guard === false) { return; } $guard->only;
        $alternative = falseable(); if ($alternative === false) {} else { $alternative->only; }
        $loose = falseable(); if ($loose != false) { $loose->only; }
        if ($box->maybe !== false) { $box->maybe->only; }
        if (false !== $data['item']) { $data['item']->only; }
        $mutated = falseable(); if ($mutated !== false) { $mutated = false; $mutated->only; }
        $boolean = booleanValue(); if (false !== $boolean) { acceptFalse($boolean); }
        $exact = mixedValue(); if ($exact === false) { acceptTrue($exact); }
      }`;
    workspace.update('file:///BooleanBranchUse.php', source);
    const positions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(positions.map((position) => workspace.completeMembers('file:///BooleanBranchUse.php', position).map((item) => item.name)))
      .toEqual([['onlyReady'], [], ['onlyReady'], [], ['onlyReady'], ['onlyReady'], [], ['onlyReady'], ['onlyReady'], []]);
    expect(workspace.incompatibleArguments('file:///BooleanBranchUse.php').map((item) => [item.actualType, item.expectedType]))
      .toEqual([['true', 'false'], ['false', 'true']]);
  });
  it('propagates strict false exclusion from an array root into safe shape elements', () => {
    workspace.update('file:///BooleanShapeTypes.php', `<?php namespace BooleanShape;
      class Item { public function onlyItem(): void {} } class Other {}
      /** @return array{item: Item}|false */ function record(): array|false {}
      function reject(Other $value): bool { return false; }
      function mutate(array|false &$value): bool { return true; }`);
    const source = `<?php namespace BooleanShape; function run(): void {
      $inside = record(); if ($inside !== false) { $inside['item']->only; $inside['item']->onlyItem(); reject($inside['item']); }
      $guard = record(); if (false === $guard) { return; } $guard['item']->only;
      $short = record(); if ($short !== false && reject($short['item'])) {}
      $shortMutation = record(); if (($shortMutation !== false && mutate($shortMutation)) && reject($shortMutation['item'])) {}
      $loose = record(); if ($loose != false) { $loose['item']->only; }
      $mutated = record(); if ($mutated !== false) { $mutated = false; $mutated['item']->only; }
    }`;
    workspace.update('file:///BooleanShapeUse.php', source);
    const positions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(positions.map((position) => workspace.completeMembers('file:///BooleanShapeUse.php', position).map((item) => item.name)))
      .toEqual([['onlyItem'], ['onlyItem'], [], []]);
    expect(workspace.definition('file:///BooleanShapeUse.php', source.indexOf('onlyItem();') + 2))
      .toEqual([expect.objectContaining({ uri: 'file:///BooleanShapeTypes.php' })]);
    expect(workspace.incompatibleArguments('file:///BooleanShapeUse.php').map((item) => [item.actualType, item.expectedType]))
      .toEqual([['BooleanShape\\Item', 'BooleanShape\\Other'], ['BooleanShape\\Item', 'BooleanShape\\Other']]);
  });
  it('applies strict false exclusion only inside the proven ternary arm', () => {
    workspace.update('file:///BooleanTernaryTypes.php', `<?php namespace BooleanTernary;
      class Item { public function onlyItem(): void {} } class Other {}
      /** @return array{item: Item}|false */ function record(): array|false {}
      function reject(Other $value): void {} function acceptOther(Other $value): void {}
      function mutate(array|false &$value): bool { return true; }`);
    const source = `<?php namespace BooleanTernary; function run(): void {
      $right = record(); $right === false ? acceptOther(new Other()) : reject($right['item']);
      $left = record(); $left !== false ? reject($left['item']) : acceptOther(new Other());
      $member = record(); $member === false ? null : $member['item']->only;
      $member2 = record(); $member2 !== false ? $member2['item']->onlyItem() : null;
      $loose = record(); $loose != false ? reject($loose['item']) : null;
      $mutated = record(); ($mutated !== false && mutate($mutated)) ? reject($mutated['item']) : null;
    }`;
    workspace.update('file:///BooleanTernaryUse.php', source);
    expect(workspace.incompatibleArguments('file:///BooleanTernaryUse.php').map((item) => [item.actualType, item.expectedType]))
      .toEqual([['BooleanTernary\\Item', 'BooleanTernary\\Other'], ['BooleanTernary\\Item', 'BooleanTernary\\Other']]);
    const completions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(completions.map((offset) => workspace.completeMembers('file:///BooleanTernaryUse.php', offset).map((item) => item.name)))
      .toEqual([['onlyItem']]);
    expect(workspace.definition('file:///BooleanTernaryUse.php', source.indexOf('onlyItem()') + 2))
      .toEqual([expect.objectContaining({ uri: 'file:///BooleanTernaryTypes.php' })]);
  });
  it('narrows the complementary union member inside a plain else branch', () => {
    workspace.update('file:///ElseTypes.php', '<?php namespace ElseNarrow; class A { public function onlyA(): void {} } class B { public function onlyB(): void {} }');
    const source = '<?php namespace ElseNarrow; function run(A|B $value): void { if ($value instanceof A) { $value->onlyA; } else { $value->onlyB; } }';
    workspace.update('file:///ElseUse.php', source);
    expect(workspace.completeMembers('file:///ElseUse.php', source.indexOf('onlyA;') + 5).map((item) => item.name)).toEqual(['onlyA']);
    expect(workspace.completeMembers('file:///ElseUse.php', source.indexOf('onlyB;') + 5).map((item) => item.name)).toEqual(['onlyB']);
  });
  it('removes null only inside a strict non-null positive branch', () => {
    workspace.update('file:///NullableType.php', '<?php namespace NarrowNull; class User { public function name(): string {} }');
    const source = '<?php namespace NarrowNull; function run(?User $user): void { if ($user !== null) { $user->na; } $user->na; }';
    workspace.update('file:///Nullable.php', source); const positions = [...source.matchAll(/na;/g)].map((item) => item.index + 2);
    expect(workspace.completeMembers('file:///Nullable.php', positions[0]!).map((item) => item.name)).toEqual(['name']);
    expect(workspace.completeMembers('file:///Nullable.php', positions[1]!)).toEqual([]);
  });
  it('narrows scalar unions and mixed parameters through resolved builtin type predicates', () => {
    workspace.update('php-companion-builtin:/type-predicates.php', `<?php function is_string(mixed $value): bool {}`);
    const source = `<?php declare(strict_types=1); namespace PredicateNarrow;
      function acceptInt(int $value): void {}
      function is_string(mixed $value): bool { return true; }
      function run(string|int $value, mixed $unknown): void {
        if (\\is_string($value)) { acceptInt($value); }
        if (\\is_string($unknown)) { acceptInt($unknown); }
        if (is_string($unknown)) { acceptInt($unknown); }
      }`;
    workspace.update('file:///PredicateNarrow.php', source);
    expect(workspace.incompatibleArguments('file:///PredicateNarrow.php').map((item) => [item.actualType, item.expectedType]))
      .toEqual([['string', 'int'], ['string', 'int']]);
  });
  it('narrows object-only is_a checks and preserves allow-string uncertainty', () => {
    workspace.update('php-companion-builtin:/is-a.php', '<?php function is_a(mixed $object_or_class, string $class, bool $allow_string = false): bool {}');
    const source = `<?php declare(strict_types=1); namespace IsAFlow;
      class A { public function onlyA(): void {} } class AChild extends A { public function onlyChild(): void {} public function sharedChild(): void {} }
      class AChildTwo extends A { public function sharedChild(): void {} }
      class B { public function onlyB(): void {} }
      class Box { public A|B $object; public mixed $mixed; public AChild|AChildTwo|B $subtypes; }
      function acceptA(A $value): void {} function acceptB(B $value): void {}
      /** @param array{subtypes: AChild|AChildTwo|B} $data */
      function run(A|B $direct, A|B $guard, mixed $mixed, A|string $stringEnabled, Box $box, array $data,
        AChild|B $subtype, AChild|B $subtypeFalse, AChild|AChildTwo|B $subtypes): void {
        if (is_a($direct, A::class)) { acceptB($direct); $direct->only; }
        else { acceptA($direct); $direct->only; }
        if (!is_a($guard, A::class, false)) return; acceptB($guard);
        if (is_a(object_or_class: $mixed, class: A::class, allow_string: false)) { acceptB($mixed); $mixed->only; }
        if (is_a($box->object, A::class)) { acceptB($box->object); $box->object->only; }
        else { acceptA($box->object); $box->object->only; }
        if (is_a($subtype, A::class)) { acceptB($subtype); $subtype->only; }
        if (is_a($subtypeFalse, A::class)) return; acceptA($subtypeFalse); $subtypeFalse->only;
        if (is_a($subtypes, A::class)) { $subtypes->sharedChild(); }
        if (is_a($box->subtypes, A::class)) { $box->subtypes->sharedChild(); }
        if (is_a($data['subtypes'], A::class)) { $data['subtypes']->sharedChild(); }
        if (is_a($stringEnabled, A::class, true)) { acceptA($stringEnabled); }
      }
      namespace IsAShadow;
      function is_a(mixed $value, string $class, bool $allow = false): bool { return true; }
      /** @param \\IsAFlow\\A|\\IsAFlow\\B $value */
      function shadow($value): void { if (is_a($value, \\IsAFlow\\A::class)) { $value->only; } }
      /** @param \\IsAFlow\\A|\\IsAFlow\\B $value */
      function explicitGlobal($value): void { if (\\is_a($value, \\IsAFlow\\A::class)) { $value->only; } }`;
    const uri = 'file:///IsAFlow.php'; workspace.update(uri, source);
    expect(workspace.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
      ['IsAFlow\\A', 'IsAFlow\\B'], ['IsAFlow\\B', 'IsAFlow\\A'], ['IsAFlow\\A', 'IsAFlow\\B'],
      ['IsAFlow\\A', 'IsAFlow\\B'], ['IsAFlow\\A', 'IsAFlow\\B'], ['IsAFlow\\B', 'IsAFlow\\A'],
      ['IsAFlow\\AChild', 'IsAFlow\\B'], ['IsAFlow\\B', 'IsAFlow\\A'],
      ['IsAFlow\\A|string', 'IsAFlow\\A'],
    ]);
    const completions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers(uri, completions[0]!).map((item) => item.name)).toEqual(['onlyA']);
    expect(workspace.completeMembers(uri, completions[1]!).map((item) => item.name)).toEqual(['onlyB']);
    expect(workspace.completeMembers(uri, completions[2]!).map((item) => item.name)).toEqual(['onlyA']);
    expect(workspace.completeMembers(uri, completions[3]!).map((item) => item.name)).toEqual(['onlyA']);
    expect(workspace.completeMembers(uri, completions[4]!).map((item) => item.name)).toEqual(['onlyB']);
    expect(workspace.completeMembers(uri, completions[5]!).map((item) => item.name)).toEqual(['onlyA', 'onlyChild']);
    expect(workspace.completeMembers(uri, completions[6]!).map((item) => item.name)).toEqual(['onlyB']);
    expect(workspace.completeMembers(uri, completions[7]!)).toEqual([]);
    expect(workspace.completeMembers(uri, completions[8]!).map((item) => item.name)).toEqual(['onlyA']);
    const sharedChildren = [...source.matchAll(/->sharedChild/g)].map((item) => item.index + 8);
    expect(sharedChildren).toHaveLength(3);
    for (const sharedChild of sharedChildren) {
      expect(workspace.completeMembers(uri, sharedChild).map((item) => item.name)).toEqual(['sharedChild']);
      const sharedDefinitions = workspace.definition(uri, sharedChild + 2);
      expect(sharedDefinitions).toHaveLength(2);
      expect(sharedDefinitions.every((item) => source.slice(item.start, item.end) === 'sharedChild')).toBe(true);
    }
  });
  it('uses strict subclass relations for object-only is_subclass_of checks', () => {
    workspace.update('php-companion-builtin:/is-subclass-of.php', '<?php function is_subclass_of(mixed $object_or_class, string $class, bool $allow_string = true): bool {}');
    const source = `<?php declare(strict_types=1); namespace SubclassFlow;
      class BaseType { public function onlyBase(): void {} }
      class ChildType extends BaseType { public function onlyChild(): void {} public function sharedSubclass(): void {} }
      class SecondChildType extends BaseType { public function sharedSubclass(): void {} }
      class OtherType { public function onlyOther(): void {} }
      class Box { public ChildType|OtherType $choice; public ChildType|SecondChildType|OtherType $children; }
      function acceptChild(ChildType $value): void {} function acceptOther(OtherType $value): void {}
      /** @param array{choice: ChildType|OtherType, children: ChildType|SecondChildType|OtherType} $data */
      function run(ChildType|OtherType $direct, ChildType|OtherType $guard, ChildType|string $defaultAllowed,
        ChildType|string $enabled, mixed $mixed, Box $box, array $data,
        ChildType|SecondChildType|OtherType $children): void {
        if (is_subclass_of($direct, BaseType::class, false)) { acceptOther($direct); $direct->only; }
        else { acceptChild($direct); $direct->only; }
        if (!is_subclass_of($guard, BaseType::class, false)) return; acceptOther($guard);
        if (is_subclass_of($box->choice, BaseType::class, false)) { acceptOther($box->choice); $box->choice->only; }
        else { acceptChild($box->choice); $box->choice->only; }
        if (is_subclass_of($data['choice'], BaseType::class, false)) { acceptOther($data['choice']); $data['choice']->only; }
        else { acceptChild($data['choice']); $data['choice']->only; }
        if (is_subclass_of($defaultAllowed, BaseType::class)) { acceptChild($defaultAllowed); }
        if (is_subclass_of($enabled, BaseType::class, true)) { acceptChild($enabled); }
        if (is_subclass_of($mixed, BaseType::class, false)) { $mixed->only; }
        if (is_subclass_of($children, BaseType::class, false)) { $children->sharedSubclass(); }
        if (is_subclass_of($box->children, BaseType::class, false)) { $box->children->sharedSubclass(); }
        if (is_subclass_of($data['children'], BaseType::class, false)) { $data['children']->sharedSubclass(); }
      }
      namespace SubclassShadow;
      function is_subclass_of(mixed $value, string $class, bool $allow = true): bool { return true; }
      /** @param \\SubclassFlow\\ChildType|\\SubclassFlow\\OtherType $value */
      function shadow($value): void { if (is_subclass_of($value, \\SubclassFlow\\BaseType::class, false)) { $value->only; } }
      /** @param \\SubclassFlow\\ChildType|\\SubclassFlow\\OtherType $value */
      function explicitGlobal($value): void { if (\\is_subclass_of($value, \\SubclassFlow\\BaseType::class, false)) { $value->only; } }`;
    const uri = 'file:///SubclassFlow.php'; workspace.update(uri, source);
    expect(workspace.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
      ['SubclassFlow\\ChildType', 'SubclassFlow\\OtherType'], ['SubclassFlow\\OtherType', 'SubclassFlow\\ChildType'],
      ['SubclassFlow\\ChildType', 'SubclassFlow\\OtherType'], ['SubclassFlow\\ChildType', 'SubclassFlow\\OtherType'],
      ['SubclassFlow\\OtherType', 'SubclassFlow\\ChildType'], ['SubclassFlow\\ChildType', 'SubclassFlow\\OtherType'],
      ['SubclassFlow\\OtherType', 'SubclassFlow\\ChildType'], ['SubclassFlow\\ChildType|string', 'SubclassFlow\\ChildType'],
      ['SubclassFlow\\ChildType|string', 'SubclassFlow\\ChildType'],
    ]);
    const completions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers(uri, completions[0]!).map((item) => item.name)).toEqual(['onlyBase', 'onlyChild']);
    expect(workspace.completeMembers(uri, completions[1]!).map((item) => item.name)).toEqual(['onlyOther']);
    expect(workspace.completeMembers(uri, completions[2]!).map((item) => item.name)).toEqual(['onlyBase', 'onlyChild']);
    expect(workspace.completeMembers(uri, completions[3]!).map((item) => item.name)).toEqual(['onlyOther']);
    expect(workspace.completeMembers(uri, completions[4]!).map((item) => item.name)).toEqual(['onlyBase', 'onlyChild']);
    expect(workspace.completeMembers(uri, completions[5]!).map((item) => item.name)).toEqual(['onlyOther']);
    expect(workspace.completeMembers(uri, completions[6]!)).toEqual([]);
    expect(workspace.completeMembers(uri, completions[7]!)).toEqual([]);
    expect(workspace.completeMembers(uri, completions[8]!).map((item) => item.name)).toEqual(['onlyBase', 'onlyChild']);
    const sharedSubclasses = [...source.matchAll(/->sharedSubclass/g)].map((item) => item.index + 8);
    expect(sharedSubclasses).toHaveLength(3);
    for (const sharedSubclass of sharedSubclasses) {
      expect(workspace.completeMembers(uri, sharedSubclass).map((item) => item.name)).toEqual(['sharedSubclass']);
      const subclassDefinitions = workspace.definition(uri, sharedSubclass + 2);
      expect(subclassDefinitions).toHaveLength(2);
      expect(subclassDefinitions.every((item) => source.slice(item.start, item.end) === 'sharedSubclass')).toBe(true);
    }
  });
  it('narrows is_callable only when syntax-only mode is disabled', () => {
    const source = `<?php declare(strict_types=1); namespace CallableFlow;
      class InvokableHandler { public function __invoke(): void {} public function onlyInvoke(): void {} }
      class CallableOther { public function otherOnly(): void {} }
      class Box {
        /** @var callable|int */ public mixed $handler;
        /** @var InvokableHandler|CallableOther */ public mixed $objectHandler;
        /** @var InvokableHandler */ public int $invalidHandler;
      }
      function acceptCallable(callable $value): void {} function acceptInt(int $value): void {}
      /** @param array{handler: callable|int, objectHandler: InvokableHandler|CallableOther} $data */
      function run(callable|int $default, callable|int $explicit, callable|int $guard,
        callable|int $syntax, callable|int $dynamic, bool $flag, Box $box, array $data,
        InvokableHandler|CallableOther $invokable): void {
        if (is_callable($default)) { acceptInt($default); } else { acceptCallable($default); }
        if (is_callable($explicit, false)) { acceptInt($explicit); }
        if (!is_callable($guard, false)) return; acceptInt($guard);
        if (is_callable($box->handler, false)) { acceptInt($box->handler); }
        if (is_callable($data['handler'], false)) { acceptInt($data['handler']); }
        if (is_callable($invokable)) { $invokable->onlyInvoke(); }
        if (is_callable($box->objectHandler, false)) { $box->objectHandler->onlyInvoke(); }
        if (is_callable($data['objectHandler'], false)) { $data['objectHandler']->onlyInvoke(); }
        if (is_callable($box->invalidHandler)) { $box->invalidHandler->onlyInvoke(); }
        if (is_callable($syntax, true)) { acceptCallable($syntax); }
        if (is_callable($dynamic, $flag)) { acceptCallable($dynamic); }
      }
      namespace CallableShadow;
      function is_callable(mixed $value, bool $syntaxOnly = false): bool { return true; }
      /** @param callable|int $value */
      function shadow($value): void { if (is_callable($value)) { CallableFlowacceptCallable($value); } }
      /** @param callable|int $value */
      function explicitGlobal($value): void { if (is_callable($value, false)) { CallableFlowacceptInt($value); } }`;
    const uri = 'file:///CallableFlow.php'; workspace.update(uri, source);
    expect(workspace.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
      ['callable', 'int'], ['int', 'callable'], ['callable', 'int'], ['callable', 'int'],
      ['callable', 'int'], ['callable', 'int'], ['callable|int', 'callable'], ['callable|int', 'callable'],
    ]);
    for (const expression of ['$invokable->onlyInvoke', '$box->objectHandler->onlyInvoke', "$data['objectHandler']->onlyInvoke"]) {
      const offset = source.indexOf(expression) + expression.indexOf('onlyInvoke') - 2;
      const names = workspace.completeMembers(uri, offset + 8).map((item) => item.name);
      expect(names, `missing concrete callable member for ${expression}`).toContain('onlyInvoke');
      expect(names).not.toContain('otherOnly');
      expect(workspace.definition(uri, offset + 4)).toMatchObject([{ uri }]);
    }
    const invalid = source.indexOf('$box->invalidHandler->onlyInvoke') + '$box->invalidHandler'.length;
    expect(workspace.completeMembers(uri, invalid + 8)).toEqual([]);
  });
  it('preserves the concrete object alternative after is_object checks', () => {
    const source = `<?php declare(strict_types=1); namespace ObjectFlow;
      class ConcreteObject { public function onlyObject(): void {} public function shared(): void {} }
      class SecondObject { public function onlySecond(): void {} public function shared(): void {} }
      function acceptObject(ConcreteObject $value): void {} function acceptString(string $value): void {}
      function run(ConcreteObject|string $direct, ConcreteObject|string $guard, ConcreteObject|SecondObject|string $multiple): void {
        if (is_object($direct)) { acceptString($direct); $direct->onlyObject(); }
        else { acceptObject($direct); }
        if (!is_object($guard)) return; acceptString($guard); $guard->onlyObject();
        if (is_object($multiple)) { $multiple->shared(); }
      }
      namespace ObjectShadow;
      function is_object(mixed $value): bool { return true; }
      /** @param \\ObjectFlow\\ConcreteObject|string $value */
      function shadow($value): void { if (is_object($value)) { $value->onlyObject(); } }
      /** @param \\ObjectFlow\\ConcreteObject|string $value */
      function explicitGlobal($value): void { if (\\is_object($value)) { $value->onlyObject(); } }`;
    const uri = 'file:///ObjectFlow.php'; workspace.update(uri, source);
    expect(workspace.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
      ['ObjectFlow\\ConcreteObject', 'string'], ['string', 'ObjectFlow\\ConcreteObject'],
      ['ObjectFlow\\ConcreteObject', 'string'],
    ]);
    const completions = [...source.matchAll(/->onlyObject/g)].map((item) => item.index + 6);
    expect(workspace.completeMembers(uri, completions[0]!).map((item) => item.name)).toEqual(['onlyObject']);
    expect(workspace.completeMembers(uri, completions[1]!).map((item) => item.name)).toEqual(['onlyObject']);
    expect(workspace.completeMembers(uri, completions[2]!)).toEqual([]);
    expect(workspace.completeMembers(uri, completions[3]!).map((item) => item.name)).toEqual(['onlyObject']);
    for (const index of [0, 1, 3]) {
      expect(workspace.definition(uri, completions[index]! - 2)
        .some((item) => source.slice(item.start, item.end) === 'onlyObject')).toBe(true);
    }
    const shared = source.indexOf('->shared') + 5;
    expect(workspace.completeMembers(uri, shared).map((item) => item.name)).toEqual(['shared']);
    const sharedDefinitions = workspace.definition(uri, shared + 1);
    expect(sharedDefinitions).toHaveLength(2);
    expect(sharedDefinitions.every((item) => source.slice(item.start, item.end) === 'shared')).toBe(true);
  });
  it('preserves concrete Countable and Traversable implementations after composite predicates', () => {
    workspace.update('php-companion-builtin:/composite-object-predicates.php', `<?php
      interface Countable { public function count(): int; }
      interface Traversable {}
      interface IteratorAggregate extends Traversable { public function getIterator(): Traversable; }
      function is_countable(mixed $value): bool {} function is_iterable(mixed $value): bool {}`);
    const source = `<?php namespace CompositePredicateFlow;
      class Counted implements \\Countable { public function count(): int { return 1; } public function countedOnly(): void {} }
      class Iterated implements \\IteratorAggregate { public function getIterator(): \\Traversable {} public function iteratedOnly(): void {} }
      class Other { public function otherOnly(): void {} }
      class Uncertain extends MissingParent { public function uncertainOnly(): void {} }
      class Box { public Uncertain|Other $choice; }
      function run(Counted|Other $counted, Iterated|Other $iterated): void {
        if (is_countable($counted)) { $counted->countedOnly(); }
        if (is_iterable($iterated)) { $iterated->iteratedOnly(); }
      }
      /** @param array{choice: Uncertain|Other} $data */
      function uncertain(Uncertain|Other $value, Box $box, array $data): void {
        if (is_countable($value)) {} else { $value->otherOnly(); }
        if (is_countable($box->choice)) {} else { $box->choice->otherOnly(); }
        if (is_countable($data['choice'])) {} else { $data['choice']->otherOnly(); }
      }`;
    const uri = 'file:///CompositePredicateFlow.php'; workspace.update(uri, source);
    for (const member of ['countedOnly', 'iteratedOnly']) {
      const offset = source.indexOf(`->${member}`) + 2;
      const names = workspace.completeMembers(uri, offset + member.length).map((item) => item.name);
      expect(names).toContain(member);
      expect(names).not.toContain('otherOnly');
      expect(workspace.definition(uri, offset + 2)).toMatchObject([{ uri }]);
    }
    for (const match of source.matchAll(/->otherOnly/g)) {
      expect(workspace.completeMembers(uri, match.index + 7)).toEqual([]);
      expect(workspace.definition(uri, match.index + 4)).toEqual([]);
    }
  });
  it('subtracts predicate types in else, negated guard and false disjunction branches', () => {
    workspace.update('php-companion-builtin:/type-predicate-complements.php', `<?php
      function is_string(mixed $value): bool {} function is_int(mixed $value): bool {}`);
    const source = `<?php declare(strict_types=1); namespace PredicateComplement;
      function acceptString(string $value): void {} function acceptInt(int $value): void {}
      function run(string|int|bool $value, mixed $unknown): void {
        if (!\\is_string($value)) { acceptString($value); } else { acceptInt($value); }
        if (\\is_int($value)) return; acceptInt($value);
        if (\\is_string($value) || \\is_int($value)) return; acceptString($value);
        if (!\\is_string($unknown)) { acceptString($unknown); }
      }`;
    workspace.update('file:///PredicateComplement.php', source);
    expect(workspace.incompatibleArguments('file:///PredicateComplement.php').map((item) => [item.actualType, item.expectedType]))
      .toEqual([['bool|int', 'string'], ['string', 'int'], ['bool|string', 'int'], ['bool', 'string']]);
  });
  it('combines predicate facts across elseif branches and terminating chains', () => {
    workspace.update('php-companion-builtin:/type-predicate-elseif.php', `<?php
      function is_string(mixed $value): bool {} function is_int(mixed $value): bool {}`);
    const source = `<?php declare(strict_types=1); namespace PredicateElseIf;
      function acceptString(string $value): void {} function acceptInt(int $value): void {}
      function run(string|int|bool $value): void {
        if (\\is_string($value)) { acceptInt($value); }
        elseif (\\is_int($value)) { acceptString($value); }
        else { acceptInt($value); }
        if (\\is_string($value)) return;
        elseif (\\is_int($value)) return;
        acceptString($value);
      }`;
    workspace.update('file:///PredicateElseIf.php', source);
    expect(workspace.incompatibleArguments('file:///PredicateElseIf.php').map((item) => [item.actualType, item.expectedType]))
      .toEqual([['string', 'int'], ['int', 'string'], ['bool', 'int'], ['bool', 'string']]);
  });
  it('narrows proven local values and invalidates the fact after local reassignment', () => {
    workspace.update('php-companion-builtin:/type-predicate-locals.php', `<?php function is_string(mixed $value): bool {}`);
    const source = `<?php declare(strict_types=1); namespace PredicateLocal;
      function acceptString(string $value): void {} function acceptInt(int $value): void {}
      function run(string|int $input, mixed $unknown): void {
        $local = $input;
        if (\\is_string($local)) { acceptInt($local); }
        else { acceptString($local); }
        $fromMixed = $unknown;
        if (\\is_string($fromMixed)) { acceptInt($fromMixed); }
        if (\\is_string($local)) { $local = 1; acceptString($local); }
      }`;
    workspace.update('file:///PredicateLocal.php', source);
    expect(workspace.incompatibleArguments('file:///PredicateLocal.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['string', 'int'], ['int', 'string'], ['string', 'int'], ['int', 'string'],
    ]);
  });
  it('narrows direct visible property paths and invalidates facts after possible mutation', () => {
    workspace.update('php-companion-builtin:/type-predicate-properties.php', `<?php function is_string(mixed $value): bool {}`);
    const source = `<?php declare(strict_types=1); namespace PredicateProperty;
      class Inner { public string|int $value; }
      class Box { public string|int $value; public mixed $unknown; public Inner $inner; public function mutate(): void {} }
      function acceptString(string $value): void {} function acceptInt(int $value): void {}
      function inspect(Box $box): void {}
      function run(Box $box): void {
        if (\\is_string($box->value)) { acceptInt($box->value); acceptString($box->value); }
        else { acceptString($box->value); }
        if (\\is_string($box->inner->value)) { acceptInt($box->inner->value); }
        if (\\is_string($box->unknown)) { acceptInt($box->unknown); }
        if (!\\is_string($box->unknown)) { acceptString($box->unknown); }
        if (\\is_string($box->value)) { $box->value = 1; acceptString($box->value); }
        if (\\is_string($box->value)) { $box->mutate(); acceptInt($box->value); }
        if (\\is_string($box->value)) { inspect($box); acceptInt($box->value); }
      }
      function is_string(mixed $value): bool { return true; }
      function shadowed(Box $box): void { if (is_string($box->value)) { acceptInt($box->value); } }`;
    workspace.update('file:///PredicateProperty.php', source);
    expect(workspace.incompatibleArguments('file:///PredicateProperty.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['string', 'int'], ['int', 'string'], ['string', 'int'], ['string', 'int'],
      ['int|string', 'string'], ['int|string', 'int'], ['int|string', 'int'], ['int|string', 'int'],
    ]);
  });
  it('applies non-null and instanceof facts to property diagnostics and member completion', () => {
    const source = `<?php declare(strict_types=1); namespace PropertyObjectFlow;
      class A { public function onlyA(): void {} } class B { public function onlyB(): void {} }
      class Box { public A|B $object; public ?A $nullable; public function mutate(): void {} }
      function acceptA(A $value): void {} function acceptB(B $value): void {}
      function run(Box $box): void {
        if ($box->object instanceof A) { acceptB($box->object); $box->object->only; }
        else { acceptA($box->object); $box->object->only; }
        if ($box->nullable !== null) { acceptB($box->nullable); $box->nullable->only; }
        if ($box->object instanceof A) { $box->mutate(); acceptB($box->object); }
      }`;
    workspace.update('file:///PropertyObjectFlow.php', source);
    expect(workspace.incompatibleArguments('file:///PropertyObjectFlow.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['PropertyObjectFlow\\A', 'PropertyObjectFlow\\B'], ['PropertyObjectFlow\\B', 'PropertyObjectFlow\\A'],
      ['PropertyObjectFlow\\A', 'PropertyObjectFlow\\B'], ['PropertyObjectFlow\\A|PropertyObjectFlow\\B', 'PropertyObjectFlow\\B'],
    ]);
    const positions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///PropertyObjectFlow.php', positions[0]!).map((item) => item.name)).toEqual(['onlyA']);
    expect(workspace.completeMembers('file:///PropertyObjectFlow.php', positions[1]!).map((item) => item.name)).toEqual(['onlyB']);
    expect(workspace.completeMembers('file:///PropertyObjectFlow.php', positions[2]!).map((item) => item.name)).toEqual(['onlyA']);
  });
  it('uses proven isset operands as non-null facts without inferring false branches', () => {
    const source = `<?php declare(strict_types=1); namespace IssetFlow;
      class Item { public function onlyItem(): void {} }
      class Box { public ?string $value; public ?Item $item; }
      function acceptString(string $value): void {} function acceptInt(int $value): void {}
      function run(?string $text, Box $box): void {
        if (isset($text)) { acceptInt($text); }
        if (isset($box->value)) { acceptInt($box->value); }
        if (isset($box->item)) { $box->item->only; }
        if (!isset($box->value)) return; acceptInt($box->value);
        if (isset($text, $box->value)) { acceptInt($text); acceptInt($box->value); }
        if (isset($box->value)) { $box->value = null; acceptString($box->value); }
      }`;
    workspace.update('file:///IssetFlow.php', source);
    expect(workspace.incompatibleArguments('file:///IssetFlow.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['string', 'int'], ['string', 'int'], ['string', 'int'], ['string', 'int'], ['string', 'int'], ['null|string', 'string'],
    ]);
    const completion = source.indexOf('only;') + 4;
    expect(workspace.completeMembers('file:///IssetFlow.php', completion).map((item) => item.name)).toEqual(['onlyItem']);
  });
  it('uses false empty paths as non-null facts while preserving true-path uncertainty', () => {
    const source = `<?php declare(strict_types=1); namespace EmptyFlow;
      class Item { public function onlyItem(): void {} }
      class Box { public ?string $value; public ?Item $item; }
      function acceptString(string $value): void {} function acceptInt(int $value): void {}
      /** @param array{label?: string|null, item?: Item|null} $data */
      function run(?string $text, Box $box, array $data): void {
        if (!empty($text)) { acceptInt($text); }
        if (empty($box->value)) return; acceptInt($box->value);
        if (!empty($box->item)) { $box->item->only; }
        if (empty($data['label'])) return; acceptInt($data['label']);
        if (!empty($data['item'])) { $data['item']->only; }
      }
      function truePath(?string $text): void { if (empty($text)) { acceptString($text); } }`;
    workspace.update('file:///EmptyFlow.php', source);
    expect(workspace.incompatibleArguments('file:///EmptyFlow.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['string', 'int'], ['string', 'int'], ['string', 'int'], ['null|string', 'string'],
    ]);
    const completions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///EmptyFlow.php', completions[0]!).map((item) => item.name)).toEqual(['onlyItem']);
    expect(workspace.completeMembers('file:///EmptyFlow.php', completions[1]!).map((item) => item.name)).toEqual(['onlyItem']);
  });
  it('uses direct truthy paths as non-null facts without narrowing falsy paths', () => {
    const source = `<?php declare(strict_types=1); namespace TruthyFlow;
      class Item { public function onlyItem(): void {} }
      class Box { public ?string $value; public ?Item $item; }
      function acceptString(string $value): void {} function acceptInt(int $value): void {}
      /** @param array{label?: string|null, item?: Item|null} $data */
      function run(?string $text, Box $box, array $data): void {
        if ($text) { acceptInt($text); }
        if (!$box->value) return; acceptInt($box->value);
        if ($box->item) { $box->item->only; }
        if (!$data['label']) return; acceptInt($data['label']);
        if ($data['item']) { $data['item']->only; }
      }
      function falsy(?string $text): void { if (!$text) { acceptString($text); } }`;
    workspace.update('file:///TruthyFlow.php', source);
    expect(workspace.incompatibleArguments('file:///TruthyFlow.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['string', 'int'], ['string', 'int'], ['string', 'int'], ['null|string', 'string'],
    ]);
    const completions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///TruthyFlow.php', completions[0]!).map((item) => item.name)).toEqual(['onlyItem']);
    expect(workspace.completeMembers('file:///TruthyFlow.php', completions[1]!).map((item) => item.name)).toEqual(['onlyItem']);
  });
  it('narrows literal array offsets after isset and invalidates them on possible writes', () => {
    workspace.update('php-companion-builtin:/array-predicate.php', `<?php function is_string(mixed $value): bool {}`);
    const source = `<?php declare(strict_types=1); namespace ArrayIssetFlow;
      class Item { public function onlyItem(): void {} }
      class A { public function onlyA(): void {} } class B { public function onlyB(): void {} }
      function acceptString(string $value): void {} function acceptInt(int $value): void {}
      function acceptA(A $value): void {} function acceptB(B $value): void {}
      /** @param array{label?: string|null, item?: Item|null, other?: string|null, value: string|int, object: A|B, nullable: A|null} $data */
      function run(array $data, string $key): void {
        if (isset($data['label'])) { acceptInt($data['label']); }
        if (isset($data['item'])) { $data['item']->only; }
        if (!isset($data['other'])) return; acceptInt($data['other']);
        if (\\is_string($data['value'])) { acceptInt($data['value']); }
        else { acceptString($data['value']); }
        if ($data['object'] instanceof A) { acceptB($data['object']); $data['object']->only; }
        else { acceptA($data['object']); $data['object']->only; }
        if ($data['nullable'] !== null) { acceptB($data['nullable']); $data['nullable']->only; }
        if (isset($data['label'])) { $data[$key] = null; acceptString($data['label']); }
      }`;
    workspace.update('file:///ArrayIssetFlow.php', source);
    expect(workspace.incompatibleArguments('file:///ArrayIssetFlow.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['string', 'int'], ['string', 'int'], ['string', 'int'], ['int', 'string'],
      ['ArrayIssetFlow\\A', 'ArrayIssetFlow\\B'], ['ArrayIssetFlow\\B', 'ArrayIssetFlow\\A'],
      ['ArrayIssetFlow\\A', 'ArrayIssetFlow\\B'],
    ]);
    const completions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///ArrayIssetFlow.php', completions[0]!).map((item) => item.name)).toEqual(['onlyItem']);
    expect(workspace.completeMembers('file:///ArrayIssetFlow.php', completions[1]!).map((item) => item.name)).toEqual(['onlyA']);
    expect(workspace.completeMembers('file:///ArrayIssetFlow.php', completions[2]!).map((item) => item.name)).toEqual(['onlyB']);
    expect(workspace.completeMembers('file:///ArrayIssetFlow.php', completions[3]!).map((item) => item.name)).toEqual(['onlyA']);
  });
  it('narrows nested safe literal array paths and invalidates them on root offset writes', () => {
    const source = `<?php declare(strict_types=1); namespace NestedArrayFlow;
      class Item { public function onlyItem(): void {} }
      class A { public function onlyA(): void {} } class B { public function onlyB(): void {} }
      function acceptString(string $value): void {} function acceptInt(int $value): void {}
      function acceptA(A $value): void {} function acceptB(B $value): void {}
      /** @param array{meta: array{label?: string|null, item?: Item|null, value: string|int, object: A|B, nullable: A|null}} $data */
      function run(array $data): void {
        if (isset($data['meta']['label'])) { acceptInt($data['meta']['label']); }
        if (isset($data['meta']['item'])) { $data['meta']['item']->only; }
        if (\\is_string($data['meta']['value'])) { acceptInt($data['meta']['value']); }
        else { acceptString($data['meta']['value']); }
        if ($data['meta']['object'] instanceof A) { acceptB($data['meta']['object']); $data['meta']['object']->only; }
        else { acceptA($data['meta']['object']); $data['meta']['object']->only; }
        if ($data['meta']['nullable'] != null) { acceptB($data['meta']['nullable']); $data['meta']['nullable']->only; }
        if (isset($data['meta']['label'])) { $data['other'] = null; acceptString($data['meta']['label']); }
        if (isset($data['meta']['label'])) { $data['meta']['label'] = null; acceptInt($data['meta']['label']); }
        if (isset($data['meta']['item'])) { $data['meta']['item'] = null; $data['meta']['item']->only; }
      }`;
    workspace.update('file:///NestedArrayFlow.php', source);
    expect(workspace.incompatibleArguments('file:///NestedArrayFlow.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['string', 'int'], ['string', 'int'], ['int', 'string'],
      ['NestedArrayFlow\\A', 'NestedArrayFlow\\B'], ['NestedArrayFlow\\B', 'NestedArrayFlow\\A'],
      ['NestedArrayFlow\\A', 'NestedArrayFlow\\B'],
    ]);
    const completions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///NestedArrayFlow.php', completions[0]!).map((item) => item.name)).toEqual(['onlyItem']);
    expect(workspace.completeMembers('file:///NestedArrayFlow.php', completions[1]!).map((item) => item.name)).toEqual(['onlyA']);
    expect(workspace.completeMembers('file:///NestedArrayFlow.php', completions[2]!).map((item) => item.name)).toEqual(['onlyB']);
    expect(workspace.completeMembers('file:///NestedArrayFlow.php', completions[3]!).map((item) => item.name)).toEqual(['onlyA']);
    expect(workspace.completeMembers('file:///NestedArrayFlow.php', completions[4]!)).toEqual([]);
  });
  it('distinguishes array-key presence from a nullable field value', () => {
    const source = `<?php declare(strict_types=1); namespace ArrayKeyExistsFlow;
      class Item { public function onlyItem(): void {} }
      function acceptString(string $value): void {} function acceptInt(int $value): void {}
      /** @param array{label?: string, nullable?: string|null, item?: Item, explicitItem?: Item|null, meta?: array{nested?: Item}} $data */
      function run(array $data): void {
        if (array_key_exists('label', $data)) { acceptInt($data['label']); }
        if (key_exists('item', $data)) { $data['item']->only; }
        if (array_key_exists('explicitItem', $data)) { $data['explicitItem']->only; }
        if (array_key_exists('nullable', $data)) { acceptString($data['nullable']); }
        if (!array_key_exists('meta', $data)) return;
        if (array_key_exists('nested', $data['meta'])) { $data['meta']['nested']->only; }
        if (array_key_exists('item', $data)) { $data['item'] = null; $data['item']->only; }
      }
      namespace ArrayKeyExistsShadow;
      function array_key_exists(string $key, array $data): bool { return true; }
      /** @param array{item?: \\ArrayKeyExistsFlow\\Item} $data */
      function shadow(array $data): void { if (array_key_exists('item', $data)) { $data['item']->only; } }
      /** @param array{item?: \\ArrayKeyExistsFlow\\Item} $data */
      function explicitGlobal(array $data): void { if (\\array_key_exists('item', $data)) { $data['item']->only; } }`;
    workspace.update('php-companion-builtin:/array-key-exists.php', '<?php function array_key_exists($key, array $array): bool {} function key_exists($key, array $array): bool {}');
    workspace.update('file:///ArrayKeyExistsFlow.php', source);
    expect(workspace.incompatibleArguments('file:///ArrayKeyExistsFlow.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['string', 'int'], ['null|string', 'string'],
    ]);
    const completions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///ArrayKeyExistsFlow.php', completions[0]!).map((item) => item.name)).toEqual(['onlyItem']);
    expect(workspace.completeMembers('file:///ArrayKeyExistsFlow.php', completions[1]!)).toEqual([]);
    expect(workspace.completeMembers('file:///ArrayKeyExistsFlow.php', completions[2]!).map((item) => item.name)).toEqual(['onlyItem']);
    expect(workspace.completeMembers('file:///ArrayKeyExistsFlow.php', completions[3]!)).toEqual([]);
    expect(workspace.completeMembers('file:///ArrayKeyExistsFlow.php', completions[4]!)).toEqual([]);
    expect(workspace.completeMembers('file:///ArrayKeyExistsFlow.php', completions[5]!).map((item) => item.name)).toEqual(['onlyItem']);
  });
  it('applies strict non-null and instanceof facts to argument types and local aliases', () => {
    workspace.update('file:///FlowNarrowTypes.php', `<?php namespace FlowNarrow;
      class A {} class B {} function acceptA(A $value): void {} function acceptB(B $value): void {}
      function acceptString(string $value): void {} function acceptInt(int $value): void {}`);
    const source = `<?php declare(strict_types=1); namespace FlowNarrow;
      function run(?string $text, A|B $object): void {
        if ($text !== null) { acceptString($text); }
        acceptString($text);
        if ($object instanceof A) { acceptB($object); }
        else { acceptA($object); }
        if (!($object instanceof B)) { acceptB($object); }
        $local = $text;
        if ($local !== null) { acceptInt($local); }
      }`;
    workspace.update('file:///FlowNarrowUse.php', source);
    expect(workspace.incompatibleArguments('file:///FlowNarrowUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['null|string', 'string'], ['FlowNarrow\\A', 'FlowNarrow\\B'], ['FlowNarrow\\B', 'FlowNarrow\\A'],
      ['FlowNarrow\\A', 'FlowNarrow\\B'], ['string', 'int'],
    ]);
  });
  it('removes null in strict and loose null-comparison complements', () => {
    workspace.update('file:///NullableElseType.php', '<?php namespace NarrowNullElse; class User { public function name(): string {} }');
    const source = '<?php namespace NarrowNullElse; function run(?User $user): void { if ($user === null) { echo "missing"; } else { $user->na; } if (!($user === null)) { $user->na; } if ($user == null) {} else { $user->na; } }';
    workspace.update('file:///NullableElse.php', source);
    const positions = [...source.matchAll(/na;/g)].map((item) => item.index + 2);
    expect(workspace.completeMembers('file:///NullableElse.php', positions[0]!).map((item) => item.name)).toEqual(['name']);
    expect(workspace.completeMembers('file:///NullableElse.php', positions[1]!).map((item) => item.name)).toEqual(['name']);
    expect(workspace.completeMembers('file:///NullableElse.php', positions[2]!).map((item) => item.name)).toEqual(['name']);
  });
  it('uses loose null-comparison non-null paths in argument diagnostics', () => {
    const source = `<?php declare(strict_types=1); namespace LooseNullFlow;
      class Box { public ?string $value; }
      function acceptString(string $value): void {} function acceptInt(int $value): void {}
      /** @param array{label?: string|null} $data */
      function run(?string $text, Box $box, array $data): void {
        if ($text != null) { acceptInt($text); }
        if ($box->value == null) return; acceptInt($box->value);
        if ($data['label'] != null) { acceptInt($data['label']); }
      }
      function uncertain(?string $text): void { if ($text == null) { acceptString($text); } }`;
    workspace.update('file:///LooseNullFlow.php', source);
    expect(workspace.incompatibleArguments('file:///LooseNullFlow.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['string', 'int'], ['string', 'int'], ['string', 'int'], ['null|string', 'string'],
    ]);
  });
  it('invalidates branch and parameter types after an unproven reassignment', () => {
    workspace.update('file:///ReassignmentType.php', '<?php namespace Reassignment; class User { public function name(): string {} } function unknown() {}');
    const source = '<?php namespace Reassignment; function run(?User $user): void { if ($user !== null) { $user->na; $user = unknown(); $user->na; } $user = 1; $user->na; }';
    workspace.update('file:///Reassignment.php', source);
    const positions = [...source.matchAll(/na;/g)].map((item) => item.index + 2);
    expect(workspace.completeMembers('file:///Reassignment.php', positions[0]!).map((item) => item.name)).toEqual(['name']);
    expect(workspace.completeMembers('file:///Reassignment.php', positions[1]!)).toEqual([]);
    expect(workspace.completeMembers('file:///Reassignment.php', positions[2]!)).toEqual([]);
  });
  it('follows nullable values only through explicit nullsafe access', () => {
    workspace.update('file:///NullsafeTypes.php', '<?php namespace Nullsafe; class Profile { public function label(): string {} } class User { public function name(): string {} public function profile(): ?Profile {} }');
    const source = '<?php namespace Nullsafe; function run(?User $user): void { $user?->na; $user->na; $user?->profile()?->la; $user?->profile()->la; }';
    workspace.update('file:///Nullsafe.php', source);
    const positions = [...source.matchAll(/(?:na|la);/g)].map((item) => item.index + 2);
    expect(workspace.completeMembers('file:///Nullsafe.php', positions[0]!).map((item) => item.name)).toEqual(['name']);
    expect(workspace.completeMembers('file:///Nullsafe.php', positions[1]!)).toEqual([]);
    expect(workspace.completeMembers('file:///Nullsafe.php', positions[2]!).map((item) => item.name)).toEqual(['label']);
    expect(workspace.completeMembers('file:///Nullsafe.php', positions[3]!)).toEqual([]);
    const signatureOffset = source.indexOf('profile()') + 'profile('.length;
    expect(workspace.signature('file:///Nullsafe.php', signatureOffset)).toMatchObject({ name: 'profile' });
  });
  it('narrows after a negative guard only when its body exits', () => {
    workspace.update('file:///GuardTypes.php', '<?php namespace Guard; class A { public function onlyA(): void {} } class B {}');
    const source = '<?php namespace Guard; function run(A|B $value, ?A $nullable, A|B $unsafe): void { if (!($value instanceof A)) { return; } $value->only; if ($nullable === null) throw new \\Exception(); $nullable->only; if (!($unsafe instanceof A)) { echo "continue"; } $unsafe->only; }';
    workspace.update('file:///Guards.php', source);
    const positions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///Guards.php', positions[0]!).map((item) => item.name)).toEqual(['onlyA']);
    expect(workspace.completeMembers('file:///Guards.php', positions[1]!).map((item) => item.name)).toEqual(['onlyA']);
    expect(workspace.completeMembers('file:///Guards.php', positions[2]!)).toEqual([]);
  });
  it('narrows after a guard whose top-level sequence ends in return or exit', () => {
    workspace.update('file:///GuardSequenceType.php', '<?php namespace GuardSequence; class A { public function onlyA(): void {} }');
    const source = '<?php namespace GuardSequence; function run(?A $returned, ?A $exited, ?A $unsafe): void { if ($returned === null) { logIt(); return; } $returned->only; if ($exited === null) exit(1); $exited->only; if ($unsafe === null) { if (maybe()) return; } $unsafe->only; }';
    workspace.update('file:///GuardSequence.php', source);
    const positions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///GuardSequence.php', positions[0]!).map((item) => item.name)).toEqual(['onlyA']);
    expect(workspace.completeMembers('file:///GuardSequence.php', positions[1]!).map((item) => item.name)).toEqual(['onlyA']);
    expect(workspace.completeMembers('file:///GuardSequence.php', positions[2]!)).toEqual([]);
  });
  it('narrows direct while-loop entry conditions only inside the loop body', () => {
    workspace.update('file:///LoopType.php', '<?php namespace LoopNarrow; class A { public function onlyA(): void {} } class B {}');
    const source = '<?php namespace LoopNarrow; function run(?A $nullable, A|B $union): void { while ($nullable !== null) { $nullable->only; } $nullable->only; while ($union instanceof A) { $union->only; $union = unknown(); $union->only; } $union->only; }';
    workspace.update('file:///Loop.php', source);
    const positions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///Loop.php', positions[0]!).map((item) => item.name)).toEqual(['onlyA']);
    expect(workspace.completeMembers('file:///Loop.php', positions[1]!)).toEqual([]);
    expect(workspace.completeMembers('file:///Loop.php', positions[2]!).map((item) => item.name)).toEqual(['onlyA']);
    expect(workspace.completeMembers('file:///Loop.php', positions[3]!)).toEqual([]);
    expect(workspace.completeMembers('file:///Loop.php', positions[4]!)).toEqual([]);
  });
  it('narrows all mandatory variables in positive conjunctions and rejects disjunction inference', () => {
    workspace.update('file:///ConjunctionTypes.php', '<?php namespace Conjunction; class A { public function onlyA(): void {} } class B {}');
    const source = '<?php namespace Conjunction; function run(?A $left, A|B $right, ?A $uncertain): void { if ($left !== null && $right instanceof A) { $left->only; $right->only; } if ($left !== null || $uncertain !== null) { $left->only; $uncertain->only; } while ($left !== null && $right instanceof A) { $left->only; $right->only; } }';
    workspace.update('file:///Conjunction.php', source);
    const positions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///Conjunction.php', positions[0]!).map((item) => item.name)).toEqual(['onlyA']);
    expect(workspace.completeMembers('file:///Conjunction.php', positions[1]!).map((item) => item.name)).toEqual(['onlyA']);
    expect(workspace.completeMembers('file:///Conjunction.php', positions[2]!)).toEqual([]);
    expect(workspace.completeMembers('file:///Conjunction.php', positions[3]!)).toEqual([]);
    expect(workspace.completeMembers('file:///Conjunction.php', positions[4]!).map((item) => item.name)).toEqual(['onlyA']);
    expect(workspace.completeMembers('file:///Conjunction.php', positions[5]!).map((item) => item.name)).toEqual(['onlyA']);
  });
  it('narrows declared parameters after unconditional assertions and inside direct conditional assertion branches', () => {
    workspace.update('file:///AssertionTypes.php', `<?php namespace Assertions;
      class Base {} class Ready extends Base { public function onlyReady(): void {} } class Other extends Base {}
      /** @phpstan-assert Ready $value */ function assertReady(Base $value): void {}
      /** @psalm-assert Ready $subject */ function assertNamed(Base $subject): void {}
      /** @phpstan-assert-if-true Ready $value */ function isReady(Base $value): bool { return true; }
      /** @psalm-assert-if-false Ready $value */ function isNotReady(Base $value): bool { return false; }
      function mutate(Base &$value): void {}`);
    const source = `<?php namespace Assertions;
      function run(Base $direct, Base $named, Base $conditional, Base $falseBranch, Base $negated, Base $conjunction,
        Base $disjunction, Base $unbraced, Base $mutated, Base $reassigned): void {
        assertReady($direct); $direct->only; echo $direct; $direct->only;
        assertNamed(subject: $named); $named->only; $named->onlyReady();
        if (isReady($conditional)) { $conditional->only; } $conditional->only;
        if (isNotReady($falseBranch)) { echo 'other'; } else { $falseBranch->only; }
        if (!isReady($negated)) { echo 'other'; } else { $negated->only; }
        if (isReady($conjunction) && rand(0, 1)) { $conjunction->only; } else { $conjunction->only; }
        if (isNotReady($disjunction) || rand(0, 1)) { $disjunction->only; } else { $disjunction->only; }
        if (rand(0, 1)) assertReady($unbraced); $unbraced->only;
        assertReady($mutated); mutate($mutated); $mutated->only;
        assertReady($reassigned); $reassigned = new Other(); $reassigned->only;
      }`;
    workspace.update('file:///AssertionUse.php', source);
    const positions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///AssertionUse.php', positions[0]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///AssertionUse.php', positions[1]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///AssertionUse.php', positions[2]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.definition('file:///AssertionUse.php', source.indexOf('$named->onlyReady') + '$named->'.length + 2)).toHaveLength(1);
    expect(workspace.completeMembers('file:///AssertionUse.php', positions[3]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///AssertionUse.php', positions[4]!)).toEqual([]);
    expect(workspace.completeMembers('file:///AssertionUse.php', positions[5]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///AssertionUse.php', positions[6]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///AssertionUse.php', positions[7]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///AssertionUse.php', positions[8]!)).toEqual([]);
    expect(workspace.completeMembers('file:///AssertionUse.php', positions[9]!)).toEqual([]);
    expect(workspace.completeMembers('file:///AssertionUse.php', positions[10]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///AssertionUse.php', positions[11]!)).toEqual([]);
    expect(workspace.completeMembers('file:///AssertionUse.php', positions[12]!)).toEqual([]);
    expect(workspace.completeMembers('file:///AssertionUse.php', positions[13]!)).toEqual([]);
  });
  it('narrows parameters through uniquely resolved instance and static assertion methods', () => {
    workspace.update('file:///MethodAssertionTypes.php', `<?php namespace MethodAssertions;
      class Base {} class Ready extends Base { public function onlyReady(): void {} }
      class Guard {
        /** @phpstan-assert Ready $value */ public function requireReady(Base $value): void {}
        /** @psalm-assert-if-true Ready $value */ public static function accepts(Base $value): bool { return true; }
      }`);
    const source = `<?php namespace MethodAssertions;
      function run(Guard $guard, Base $direct, Base $conditional): void {
        $guard->requireReady($direct); $direct->only;
        if (Guard::accepts($conditional)) { $conditional->only; } $conditional->only;
      }`;
    workspace.update('file:///MethodAssertionUse.php', source);
    const positions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///MethodAssertionUse.php', positions[0]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///MethodAssertionUse.php', positions[1]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///MethodAssertionUse.php', positions[2]!)).toEqual([]);
  });
  it('applies conditional assertions while evaluating logically implied short-circuit operands', () => {
    workspace.update('file:///ShortCircuitAssertionTypes.php', `<?php namespace ShortCircuitAssertions;
      class Base {} class Ready extends Base { public function onlyReady(): bool { return true; } }
      /** @phpstan-assert-if-true Ready $value */ function isReady(Base $value): bool { return true; }
      /** @psalm-assert-if-false Ready $value */ function isNotReady(Base $value): bool { return false; }
      function other(): bool { return true; }
      function mutate(Base $value): bool { return true; }`);
    const source = `<?php namespace ShortCircuitAssertions;
      function run(Base $and, Base $or, Base $nested, Base $negated, Base $mutated, Base $unknownTrue, Base $unknownFalse): void {
        if (isReady($and) && $and->only) {}
        if (isNotReady($or) || $or->only) {}
        if ((isReady($nested) && other()) && $nested->only) {}
        if (!isReady($negated) || $negated->only) {}
        if (isReady($mutated) && mutate($mutated) && $mutated->only) {}
        if (isReady($unknownTrue) || $unknownTrue->only) {}
        if (isNotReady($unknownFalse) && $unknownFalse->only) {}
      }`;
    workspace.update('file:///ShortCircuitAssertionUse.php', source);
    const positions = [...source.matchAll(/only\)/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///ShortCircuitAssertionUse.php', positions[0]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///ShortCircuitAssertionUse.php', positions[1]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///ShortCircuitAssertionUse.php', positions[2]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///ShortCircuitAssertionUse.php', positions[3]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///ShortCircuitAssertionUse.php', positions[4]!)).toEqual([]);
    expect(workspace.completeMembers('file:///ShortCircuitAssertionUse.php', positions[5]!)).toEqual([]);
    expect(workspace.completeMembers('file:///ShortCircuitAssertionUse.php', positions[6]!)).toEqual([]);
  });
  it('applies conditional assertions inside while and for bodies without leaking through mutation or loop exit', () => {
    workspace.update('file:///LoopAssertionTypes.php', `<?php namespace LoopAssertions;
      class Base {} class Ready extends Base { public function onlyReady(): bool { return true; } }
      /** @phpstan-assert-if-true Ready $value */ function isReady(Base $value): bool { return true; }
      /** @psalm-assert-if-false Ready $value */ function isNotReady(Base $value): bool { return false; }
      function mutate(Base $value): void {}`);
    const source = `<?php namespace LoopAssertions;
      function run(Base $while, Base $negative, Base $for, Base $short, Base $mutated, Base $do, Base $doShort): void {
        while (isReady($while)) { $while->only; } $while->only;
        while (!isNotReady($negative)) { $negative->only; } $negative->only;
        for (; isReady($for); ) { $for->only; } $for->only;
        while (isReady($short) && $short->only) { break; }
        while (isReady($mutated)) { $mutated->only; mutate($mutated); $mutated->only; }
        do { $do->only; } while (isReady($do));
        do {} while (isReady($doShort) && $doShort->only);
      }`;
    workspace.update('file:///LoopAssertionUse.php', source);
    const positions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///LoopAssertionUse.php', positions[0]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///LoopAssertionUse.php', positions[1]!)).toEqual([]);
    expect(workspace.completeMembers('file:///LoopAssertionUse.php', positions[2]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///LoopAssertionUse.php', positions[3]!)).toEqual([]);
    expect(workspace.completeMembers('file:///LoopAssertionUse.php', positions[4]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///LoopAssertionUse.php', positions[5]!)).toEqual([]);
    const short = source.indexOf('$short->only') + '$short->only'.length;
    expect(workspace.completeMembers('file:///LoopAssertionUse.php', short).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///LoopAssertionUse.php', positions[6]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///LoopAssertionUse.php', positions[7]!)).toEqual([]);
    expect(workspace.completeMembers('file:///LoopAssertionUse.php', positions[8]!)).toEqual([]);
    const doShort = source.indexOf('$doShort->only') + '$doShort->only'.length;
    expect(workspace.completeMembers('file:///LoopAssertionUse.php', doShort).map((item) => item.name)).toEqual(['onlyReady']);
  });
  it('applies conditional assertions after proven terminating guards within the same block', () => {
    workspace.update('file:///GuardAssertionTypes.php', `<?php namespace GuardAssertions;
      class Base {} class Ready extends Base { public function onlyReady(): void {} }
      /** @phpstan-assert-if-true Ready $value */ function isReady(Base $value): bool { return true; }
      /** @psalm-assert-if-false Ready $value */ function isNotReady(Base $value): bool { return false; }
      function other(): bool { return true; }
      function mutate(Base $value): void {}`);
    const source = `<?php namespace GuardAssertions;
      function run(bool $flag, Base $direct, Base $falseTag, Base $compound, Base $nested,
        Base $nonterminal, Base $alternative, Base $elseTerminates, Base $multiFalse, Base $multiTrue,
        Base $ambiguous, Base $alternativeMutation, Base $mutated, Base $jumped,
        Base $nestedTerminating, Base $nestedElseIf, Base $nestedIncomplete,
        Base $tryTerminating, Base $finallyTerminating, Base $catchContinues,
        Base $finallyMutation, Base $reassigned, Base $switchTerminating,
        Base $switchFallthrough, Base $switchBreak, Base $switchMissingDefault,
        Base $whileTrue, Base $doTerminating, Base $foreverFor, Base $loopBreak,
        Base $dynamicWhile): void {
        if (!isReady($direct)) { return; } $direct->only;
        if (isNotReady($falseTag)) { throw new \\RuntimeException(); } $falseTag->only;
        if (!isReady($compound) || other()) { exit; } $compound->only;
        if ($flag) { if (!isReady($nested)) return; $nested->only; } $nested->only;
        if (!isReady($nonterminal)) { echo 'continue'; } $nonterminal->only;
        if (!isReady($alternative)) { return; } else { echo 'alternative'; } $alternative->only;
        if (isReady($elseTerminates)) { echo 'ready'; } else { return; } $elseTerminates->only;
        if (!isReady($multiFalse)) { return; } elseif (other()) { throw new \\RuntimeException(); } else { echo 'ready'; } $multiFalse->only;
        if (other()) { return; } elseif (isReady($multiTrue)) { echo 'ready'; } else { exit; } $multiTrue->only;
        if (isReady($ambiguous)) { echo 'first'; } elseif (other()) { echo 'second'; } else { return; } $ambiguous->only;
        if (!isReady($alternativeMutation)) { return; } else { mutate($alternativeMutation); } $alternativeMutation->only;
        if (!isReady($mutated)) { return; } mutate($mutated); $mutated->only;
        if (!isReady($jumped)) { goto jumped; return; } jumped: $jumped->only;
        if (!isReady($nestedTerminating)) { if ($flag) { return; } else { throw new \\RuntimeException(); } } $nestedTerminating->only;
        if (!isReady($nestedElseIf)) { if ($flag) { return; } elseif (other()) { exit; } else { throw new \\RuntimeException(); } } $nestedElseIf->only;
        if (!isReady($nestedIncomplete)) { if ($flag) { return; } } $nestedIncomplete->only;
        if (!isReady($tryTerminating)) { try { return; } catch (\\RuntimeException $error) { throw $error; } finally { echo 'done'; } } $tryTerminating->only;
        if (!isReady($finallyTerminating)) { try { echo 'work'; } catch (\\RuntimeException $error) { echo 'caught'; } finally { exit; } } $finallyTerminating->only;
        if (!isReady($catchContinues)) { try { return; } catch (\\RuntimeException $error) { echo 'continue'; } } $catchContinues->only;
        if (!isReady($finallyMutation)) { try { return; } finally { mutate($finallyMutation); } } $finallyMutation->only;
        if (!isReady($reassigned)) { return; } $reassigned = new Base(); $reassigned->only;
        if (!isReady($switchTerminating)) { switch (random_int(1, 2)) { case 1: return; default: throw new \\RuntimeException(); } } $switchTerminating->only;
        if (!isReady($switchFallthrough)) { switch (random_int(1, 3)) { case 1: echo 'fallthrough'; case 2: return; default: exit; } } $switchFallthrough->only;
        if (!isReady($switchBreak)) { switch (random_int(1, 2)) { case 1: return; default: break; } } $switchBreak->only;
        if (!isReady($switchMissingDefault)) { switch (random_int(1, 2)) { case 1: return; } } $switchMissingDefault->only;
        if (!isReady($whileTrue)) { while (true) { return; } } $whileTrue->only;
        if (!isReady($doTerminating)) { do { throw new \\RuntimeException(); } while ($flag); } $doTerminating->only;
        if (!isReady($foreverFor)) { for (;;) { if ($flag) { return; } else { exit; } } } $foreverFor->only;
        if (!isReady($loopBreak)) { while (true) { break; } } $loopBreak->only;
        if (!isReady($dynamicWhile)) { while ($flag) { return; } } $dynamicWhile->only;
      }`;
    workspace.update('file:///GuardAssertionUse.php', source);
    const positions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[0]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[1]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[2]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[3]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[4]!)).toEqual([]);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[5]!)).toEqual([]);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[6]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[7]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[8]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[9]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[10]!)).toEqual([]);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[11]!)).toEqual([]);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[12]!)).toEqual([]);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[13]!)).toEqual([]);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[14]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[15]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[16]!)).toEqual([]);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[17]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[18]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[19]!)).toEqual([]);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[20]!)).toEqual([]);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[21]!)).toEqual([]);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[22]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[23]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[24]!)).toEqual([]);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[25]!)).toEqual([]);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[26]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[27]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[28]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[29]!)).toEqual([]);
    expect(workspace.completeMembers('file:///GuardAssertionUse.php', positions[30]!)).toEqual([]);
  });
  it('maps method $this property assertions to direct non-null receivers', () => {
    workspace.update('file:///ThisAssertionTypes.php', `<?php namespace ThisAssertions;
      class Base {} class Ready extends Base { public function onlyReady(): void {} } class Other extends Base {}
      class Holder {
        public Base $value; private Base $hidden;
        /** @phpstan-assert Ready $this->value */ public function requireReady(): void {}
        /** @psalm-assert-if-true Ready $this->value */ public function isReady(): bool { return true; }
        /** @phpstan-assert Ready $this->hidden */ private function requireHidden(): void {}
        public function consume(): void { $this->requireHidden(); $this->hidden->only; }
      }`);
    const source = `<?php namespace ThisAssertions;
      function run(Holder $direct, Holder $conditional, ?Holder $nullable, Holder $mutated): void {
        $direct->requireReady(); $direct->value->only;
        if ($conditional->isReady()) { $conditional->value->only; } $conditional->value->only;
        $nullable?->requireReady(); $nullable?->value->only;
        $mutated->requireReady(); $mutated->value = new Other(); $mutated->value->only;
      }`;
    workspace.update('file:///ThisAssertionUse.php', source);
    const positions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///ThisAssertionUse.php', positions[0]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///ThisAssertionUse.php', positions[1]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///ThisAssertionUse.php', positions[2]!)).toEqual([]);
    expect(workspace.completeMembers('file:///ThisAssertionUse.php', positions[3]!)).toEqual([]);
    expect(workspace.completeMembers('file:///ThisAssertionUse.php', positions[4]!)).toEqual([]);
    const owner = workspace.source('file:///ThisAssertionTypes.php')!;
    expect(workspace.completeMembers('file:///ThisAssertionTypes.php', owner.indexOf('$this->hidden->only') + '$this->hidden->only'.length)
      .map((item) => item.name)).toEqual(['onlyReady']);
  });
  it('subtracts null or a fully resolved object hierarchy from conditional assertion parameters', () => {
    workspace.update('file:///NegativeAssertionTypes.php', `<?php namespace NegativeAssertions;
      class Base {} class Ready extends Base { public function onlyReady(): void {} }
      class Other extends Base {} class Rejected extends Base {} class RejectedChild extends Rejected {}
      interface Marker { public function onlyMarker(): void; }
      class GenericUser { public function onlyUser(): void {} } class GenericOther {}
      /** @template T of object */ class Box { /** @return T */ public function get() {} }
      class GenericBase {} class GenericChild extends GenericBase {} class GenericOutside { public function onlyOutside(): void {} }
      /** @template-covariant T of object */ class Producer { /** @return T */ public function get() {} }
      /** @phpstan-assert !null $value */ function assertPresent(?Ready $value): void {}
      /** @phpstan-assert-if-true !null $value */ function isPresent(?Ready $value): bool { return true; }
      /** @psalm-assert-if-true !Rejected $value */ function isAccepted(Base $value): bool { return true; }
      /** @phpstan-assert-if-true !false $value */ function isFound(Ready|false $value): bool { return true; }
      /** @phpstan-assert-if-true !true $value */ function isNotTrue(Ready|true $value): bool { return true; }
      /** @phpstan-assert-if-true !bool $value */ function isNotBoolean(Ready|bool $value): bool { return true; }
      /** @phpstan-assert-if-true !(Rejected|Other) $value */ function isOnlyReady(Ready|Rejected|Other $value): bool { return true; }
      /** @phpstan-assert-if-true !false $value */ function hasGenericValue($value): bool { return true; }
      /** @phpstan-assert-if-true !Box<GenericOther> $value */ function excludesGenericOther($value): bool { return true; }
      /** @phpstan-assert-if-true !Producer<GenericBase> $value */ function excludesBaseProducer($value): bool { return true; }
      /** @phpstan-assert-if-true !(Rejected&Marker) $value */ function excludesRejectedMarker($value): bool { return true; }`);
    const source = `<?php namespace NegativeAssertions;
      /** @param Box<GenericUser>|false $generic
       * @param Box<GenericUser>|Box<GenericOther>|false $genericAmbiguous
       * @param Box<GenericUser>|Box<GenericOther> $genericExcluded
       * @param Producer<GenericChild>|Producer<GenericOutside> $covariantExcluded
       * @param Ready|(Rejected&Marker) $intersectionExcluded
       * @param Ready|(Rejected&Marker) $intersectionByMember
       * @param (Ready&Marker)|Rejected $remainingIntersection */
      function run(?Ready $standalone, ?Ready $nullable, Ready|RejectedChild $union, Ready|Other|Rejected $ambiguous, Base $broad,
        Ready|false $falseable, Ready|true $trueable, Ready|bool $boolean, Ready|Rejected|Other $unionRemoval,
        Ready|Other|false $stillAmbiguous, $generic, $genericAmbiguous, $genericExcluded, $covariantExcluded,
        $intersectionExcluded, $intersectionByMember, $remainingIntersection): void {
        assertPresent($standalone); $standalone->only;
        if (isPresent($nullable)) { $nullable->only; } $nullable->only;
        if (isAccepted($union)) { $union->only; }
        if (isAccepted($ambiguous)) { $ambiguous->only; }
        if (isAccepted($broad)) { $broad->only; }
        if (isFound($falseable)) { $falseable->only; }
        if (isNotTrue($trueable)) { $trueable->only; }
        if (isNotBoolean($boolean)) { $boolean->only; }
        if (isOnlyReady($unionRemoval)) { $unionRemoval->only; }
        if (isFound($stillAmbiguous)) { $stillAmbiguous->only; }
        if (hasGenericValue($generic)) { $generic->get()->onlyUser; }
        if (hasGenericValue($genericAmbiguous)) { $genericAmbiguous->get()->onlyUser; }
        if (excludesGenericOther($genericExcluded)) { $genericExcluded->get()->onlyUser; }
        if (excludesBaseProducer($covariantExcluded)) { $covariantExcluded->get()->onlyOutside; }
        if (excludesRejectedMarker($intersectionExcluded)) { $intersectionExcluded->only; }
        if (isAccepted($intersectionByMember)) { $intersectionByMember->only; }
        if (isAccepted($remainingIntersection)) { $remainingIntersection->onlyReady; $remainingIntersection->onlyMarker; }
      }`;
    workspace.update('file:///NegativeAssertionUse.php', source);
    const positions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///NegativeAssertionUse.php', positions[0]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///NegativeAssertionUse.php', positions[1]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///NegativeAssertionUse.php', positions[2]!)).toEqual([]);
    expect(workspace.completeMembers('file:///NegativeAssertionUse.php', positions[3]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///NegativeAssertionUse.php', positions[4]!)).toEqual([]);
    expect(workspace.completeMembers('file:///NegativeAssertionUse.php', positions[5]!)).toEqual([]);
    expect(workspace.completeMembers('file:///NegativeAssertionUse.php', positions[6]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///NegativeAssertionUse.php', positions[7]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///NegativeAssertionUse.php', positions[8]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///NegativeAssertionUse.php', positions[9]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///NegativeAssertionUse.php', positions[10]!)).toEqual([]);
    expect(workspace.completeMembers('file:///NegativeAssertionUse.php', positions[11]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///NegativeAssertionUse.php', positions[12]!).map((item) => item.name)).toEqual(['onlyReady']);
    const genericPositions = [...source.matchAll(/onlyUser;/g)].map((item) => item.index + 'onlyUser'.length);
    expect(workspace.completeMembers('file:///NegativeAssertionUse.php', genericPositions[0]!).map((item) => item.name)).toEqual(['onlyUser']);
    expect(workspace.completeMembers('file:///NegativeAssertionUse.php', genericPositions[1]!)).toEqual([]);
    expect(workspace.completeMembers('file:///NegativeAssertionUse.php', genericPositions[2]!).map((item) => item.name)).toEqual(['onlyUser']);
    const covariantPosition = source.indexOf('onlyOutside;') + 'onlyOutside'.length;
    expect(workspace.completeMembers('file:///NegativeAssertionUse.php', covariantPosition).map((item) => item.name)).toEqual(['onlyOutside']);
    const remainingIntersectionPositions = ['onlyReady;', 'onlyMarker;'].map((marker) => source.lastIndexOf(marker) + marker.length - 1);
    expect(workspace.completeMembers('file:///NegativeAssertionUse.php', remainingIntersectionPositions[0]! ).map((item) => item.name)).toContain('onlyReady');
    expect(workspace.completeMembers('file:///NegativeAssertionUse.php', remainingIntersectionPositions[1]! ).map((item) => item.name)).toContain('onlyMarker');
  });
  it('specializes assertion object types from a uniquely proven callable template witness', () => {
    workspace.update('file:///TemplateAssertionTypes.php', `<?php namespace TemplateAssertions;
      class Base {} class Ready extends Base { public function onlyReady(): void {} } class Unrelated {}
      /**
       * @template T of Base
       * @param class-string<T> $type
      * @phpstan-assert T $value
      */
      function assertType(string $type, Base $value): void {}
      /**
       * @template T of Base
       * @param class-string<T> $type
       * @phpstan-assert-if-true T $value
       */
      function isType(string $type, Base $value): bool { return true; }`);
    const source = `<?php namespace TemplateAssertions;
      function run(Base $direct, Base $named, Base $conditional, Base $invalid, Base $dynamic, string $dynamicType): void {
        assertType(Ready::class, $direct); $direct->only;
        assertType(value: $named, type: Ready::class); $named->only; $named->onlyReady();
        if (isType(Ready::class, $conditional)) { $conditional->only; } $conditional->only;
        assertType(Unrelated::class, $invalid); $invalid->only;
        assertType($dynamicType, $dynamic); $dynamic->only;
      }`;
    workspace.update('file:///TemplateAssertionUse.php', source);
    const positions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///TemplateAssertionUse.php', positions[0]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///TemplateAssertionUse.php', positions[1]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.definition('file:///TemplateAssertionUse.php', source.indexOf('$named->onlyReady') + '$named->'.length + 2)).toHaveLength(1);
    expect(workspace.completeMembers('file:///TemplateAssertionUse.php', positions[2]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///TemplateAssertionUse.php', positions[3]!)).toEqual([]);
    expect(workspace.completeMembers('file:///TemplateAssertionUse.php', positions[4]!)).toEqual([]);
    expect(workspace.completeMembers('file:///TemplateAssertionUse.php', positions[5]!)).toEqual([]);
  });
  it('applies direct single-property assertions only while the object state remains unchanged', () => {
    workspace.update('file:///PropertyAssertionTypes.php', `<?php namespace PropertyAssertions;
      class Base {} class Ready extends Base { public function onlyReady(): void {} } class Other extends Base {}
      class Holder { public Base $value; private Base $hidden; public function touch(): void {} }
      /** @phpstan-assert Ready $holder->value */ function assertHolder(Holder $holder): void {}
      /** @psalm-assert-if-true Ready $holder->value */ function isHolderReady(Holder $holder): bool { return true; }
      /** @phpstan-assert Ready $holder->hidden */ function assertHidden(Holder $holder): void {}
      function mutateHolder(Holder $holder): void { $holder->value = new Other(); }`);
    const source = `<?php namespace PropertyAssertions;
      function run(Holder $direct, Holder $local, Holder $conditional, Holder $read, Holder $assigned,
        Holder $methodCall, Holder $functionCall, Holder $hidden): void {
        assertHolder($direct); $direct->value->only;
        assertHolder($local); $copy = $local->value; $copy->only;
        if (isHolderReady($conditional)) { $conditional->value->only; } $conditional->value->only;
        assertHolder($read); echo $read->value; $read->value->only;
        assertHolder($assigned); $assigned->value = new Other(); $assigned->value->only;
        assertHolder($methodCall); $methodCall->touch(); $methodCall->value->only;
        assertHolder($functionCall); mutateHolder($functionCall); $functionCall->value->only;
        assertHidden($hidden); $hidden->hidden->only;
      }`;
    workspace.update('file:///PropertyAssertionUse.php', source);
    const positions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///PropertyAssertionUse.php', positions[0]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///PropertyAssertionUse.php', positions[1]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///PropertyAssertionUse.php', positions[2]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///PropertyAssertionUse.php', positions[3]!)).toEqual([]);
    expect(workspace.completeMembers('file:///PropertyAssertionUse.php', positions[4]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///PropertyAssertionUse.php', positions[5]!)).toEqual([]);
    expect(workspace.completeMembers('file:///PropertyAssertionUse.php', positions[6]!)).toEqual([]);
    expect(workspace.completeMembers('file:///PropertyAssertionUse.php', positions[7]!)).toEqual([]);
    expect(workspace.completeMembers('file:///PropertyAssertionUse.php', positions[8]!)).toEqual([]);
  });
  it('applies visible multi-level property assertions and invalidates ancestor mutations', () => {
    workspace.update('file:///NestedPropertyAssertionTypes.php', `<?php namespace NestedPropertyAssertions;
      class Base {} class Ready extends Base { public function onlyReady(): void {} } class Other extends Base {}
      class Child { public Base $value; public function touch(): void {} }
      class Holder { public Child $child; private Child $hidden; }
      /** @phpstan-assert Ready $holder->child->value */ function assertNested(Holder $holder): void {}
      /** @phpstan-assert Ready $holder->hidden->value */ function assertHidden(Holder $holder): void {}`);
    const source = `<?php namespace NestedPropertyAssertions;
      function run(Holder $direct, Holder $local, Holder $ancestorWrite, Holder $nestedMethod, Holder $hidden): void {
        assertNested($direct); $direct->child->value->only;
        assertNested($local); $copy = $local->child->value; $copy->only;
        assertNested($ancestorWrite); $ancestorWrite->child = new Child(); $ancestorWrite->child->value->only;
        assertNested($nestedMethod); $nestedMethod->child->touch(); $nestedMethod->child->value->only;
        assertHidden($hidden); $hidden->hidden->value->only;
      }`;
    workspace.update('file:///NestedPropertyAssertionUse.php', source);
    const positions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///NestedPropertyAssertionUse.php', positions[0]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///NestedPropertyAssertionUse.php', positions[1]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///NestedPropertyAssertionUse.php', positions[2]!)).toEqual([]);
    expect(workspace.completeMembers('file:///NestedPropertyAssertionUse.php', positions[3]!)).toEqual([]);
    expect(workspace.completeMembers('file:///NestedPropertyAssertionUse.php', positions[4]!)).toEqual([]);
  });
  it('subtracts null and finite object unions from visible property paths', () => {
    workspace.update('file:///NegativePropertyAssertionTypes.php', `<?php namespace NegativePropertyAssertions;
      class Base {} class Ready extends Base { public function onlyReady(): void {} }
      class Rejected extends Base {} class RejectedChild extends Rejected {} class Other extends Base {}
      class Child { public ?Ready $nullable; public Ready|RejectedChild $choice; public Ready|Other|Rejected $ambiguous; public Ready|false $maybe; }
      class Holder { public Child $child; }
      /** @phpstan-assert !null $holder->child->nullable */ function requirePresent(Holder $holder): void {}
      /** @phpstan-assert-if-true !Rejected $holder->child->choice */ function acceptsChoice(Holder $holder): bool { return true; }
      /** @phpstan-assert !Rejected $holder->child->ambiguous */ function rejectAmbiguous(Holder $holder): void {}
      /** @phpstan-assert-if-true !false $holder->child->maybe */ function hasValue(Holder $holder): bool { return true; }`);
    const source = `<?php namespace NegativePropertyAssertions;
      function run(Holder $present, Holder $choice, Holder $ambiguous, Holder $literal): void {
        requirePresent($present); $present->child->nullable->only;
        if (acceptsChoice($choice)) { $choice->child->choice->only; } $choice->child->choice->only;
        rejectAmbiguous($ambiguous); $ambiguous->child->ambiguous->only;
        if (hasValue($literal)) { $literal->child->maybe->only; } $literal->child->maybe->only;
      }`;
    workspace.update('file:///NegativePropertyAssertionUse.php', source);
    const positions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///NegativePropertyAssertionUse.php', positions[0]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///NegativePropertyAssertionUse.php', positions[1]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///NegativePropertyAssertionUse.php', positions[2]!)).toEqual([]);
    expect(workspace.completeMembers('file:///NegativePropertyAssertionUse.php', positions[3]!)).toEqual([]);
    expect(workspace.completeMembers('file:///NegativePropertyAssertionUse.php', positions[4]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///NegativePropertyAssertionUse.php', positions[5]!)).toEqual([]);
  });
  it('specializes positive and negative template assertions on property paths', () => {
    workspace.update('file:///TemplatePropertyAssertionTypes.php', `<?php namespace TemplatePropertyAssertions;
      class Base {} class Ready extends Base { public function onlyReady(): void {} }
      class Rejected extends Base {} class Unrelated {}
      class Holder {
        public Base $value; public Ready|Rejected $choice;
        /** @template T of Base
         * @param class-string<T> $type
         * @phpstan-assert T $this->value */
        public function requireType(string $type): void {}
      }
      /** @template T of Base
       * @param class-string<T> $type
       * @phpstan-assert T $holder->value */
      function requirePropertyType(string $type, Holder $holder): void {}
      /** @template T of Base
       * @param class-string<T> $type
       * @phpstan-assert !T $holder->choice */
      function excludePropertyType(string $type, Holder $holder): void {}`);
    const source = `<?php namespace TemplatePropertyAssertions;
      function run(Holder $function, Holder $method, Holder $negative, Holder $invalid): void {
        requirePropertyType(Ready::class, $function); $function->value->only;
        $method->requireType(Ready::class); $method->value->only;
        excludePropertyType(Rejected::class, $negative); $negative->choice->only;
        requirePropertyType(Unrelated::class, $invalid); $invalid->value->only;
      }`;
    workspace.update('file:///TemplatePropertyAssertionUse.php', source);
    const positions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
    expect(workspace.completeMembers('file:///TemplatePropertyAssertionUse.php', positions[0]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///TemplatePropertyAssertionUse.php', positions[1]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///TemplatePropertyAssertionUse.php', positions[2]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///TemplatePropertyAssertionUse.php', positions[3]!)).toEqual([]);
  });
  it('types single and multi-catch variables only in their bodies', () => {
    workspace.update('file:///CatchTypes.php', '<?php namespace CatchFlow; class Failure { public function report(): void {} } class First { public function report(): void {} public function onlyFirst(): void {} } class Second { public function report(): void {} }');
    const source = '<?php namespace CatchFlow; function run(): void { try { work(); } catch (Failure $error) { $error->rep; } catch (First|Second $unknown) { $unknown->rep; $unknown->report(); $unknown->onlyFirst(); } $error->rep; $unknown->rep; }';
    workspace.update('file:///Catch.php', source);
    const positions = [...source.matchAll(/rep;/g)].map((item) => item.index + 3);
    expect(workspace.completeMembers('file:///Catch.php', positions[0]!).map((item) => item.name)).toEqual(['report']);
    expect(workspace.completeMembers('file:///Catch.php', positions[1]!).map((item) => item.name)).toEqual(['report']);
    expect(workspace.completeMembers('file:///Catch.php', positions[2]!)).toEqual([]);
    expect(workspace.completeMembers('file:///Catch.php', positions[3]!)).toEqual([]);
    expect(workspace.definition('file:///Catch.php', source.indexOf('report', source.indexOf('$unknown->rep')) + 2)).toHaveLength(2);
    expect(workspace.unresolvedMembers('file:///Catch.php').map((item) => item.name)).toEqual(['onlyFirst']);
  });
  it('includes inherited public members and hides inaccessible members', () => {
    workspace.update('file:///Base.php', '<?php namespace App; class Base { public function shown(): void {} protected function family(): void {} private function hidden(): void {} }');
    workspace.update('file:///Child.php', '<?php namespace App; class Child extends Base { function own(): void { $this-> } }');
    const external = '<?php namespace App; function useIt(Child $child): void { $child-> }';
    workspace.update('file:///External.php', external);
    expect(workspace.completeMembers('file:///External.php', external.indexOf('->') + 2).map((item) => item.name).sort()).toEqual(['own', 'shown']);
    const child = workspace.source('file:///Child.php')!;
    expect(workspace.completeMembers('file:///Child.php', child.indexOf('->') + 2).map((item) => item.name).sort()).toEqual(['family', 'own', 'shown']);
  });
  it('composes traits with precedence, aliases and host visibility', () => {
    workspace.update('file:///Traits.php', `<?php namespace App;
      trait A { private function hidden(): void {} public function run(): void {} }
      trait B { public function run(): void {} }
      class UsesTraits { use A, B { A::run insteadof B; B::run as protected otherRun; A::hidden as public exposed; } function inside(): void { $this-> } }
    `);
    const internal = workspace.source('file:///Traits.php')!;
    expect(workspace.completeMembers('file:///Traits.php', internal.indexOf('$this->') + 7).map((item) => item.name).sort()).toEqual(['exposed', 'hidden', 'inside', 'otherRun', 'run']);
    const external = '<?php namespace App; function call(UsesTraits $value): void { $value-> }';
    workspace.update('file:///TraitConsumer.php', external);
    expect(workspace.completeMembers('file:///TraitConsumer.php', external.indexOf('->') + 2).map((item) => item.name).sort()).toEqual(['exposed', 'inside', 'run']);
  });
  it('infers local variables from new and direct variable assignments', () => {
    workspace.update('file:///User.php', '<?php namespace App; class User { public function name(): string {} }');
    const source = '<?php namespace App; function run(): void { $user = new User(); $copy = $user; $copy->na }';
    workspace.update('file:///Local.php', source);
    expect(workspace.completeMembers('file:///Local.php', source.indexOf('na }') + 2).map((item) => item.name)).toEqual(['name']);
    expect(workspace.inlayTypeHints('file:///Local.php', 0, source.length)).toMatchObject([{ label: ': User' }, { label: ': User' }]);
  });
  it('uses explicit adjacent local @var assertions until the next assignment', () => {
    const source = `<?php namespace LocalVarDoc;
      class Service { public function execute(): void {} }
      class Other {}
      function provide(): mixed {}
      function acceptOther(Other $value): void {}
      function run(): void {
        /** @var Service $service */
        $service = provide();
        $service->exe;
        $service->execute();
        acceptOther($service);
        $service = provide();
        $service->bad;
        /** @var Service $different */
        $wrong = provide();
        $wrong->bad;
        /** @var Service */
        $unscoped = provide();
        $unscoped->bad;
        /** @var array{service: Service} $data */
        $data = provide();
        $data['service']->exe;
        $data['service']->execute();
        acceptOther($data['service']);
        $data['service'] = provide();
        $data['service']->mutated;
        $data = provide();
        $data['service']->bad;
      }`;
    const uri = 'file:///LocalVarDoc.php'; workspace.update(uri, source);
    expect(workspace.completeMembers(uri, source.indexOf('$service->exe') + '$service->exe'.length).map((item) => item.name)).toEqual(['execute']);
    expect(workspace.definition(uri, source.indexOf('$service->execute') + '$service->'.length + 2)).toMatchObject([{ uri }]);
    for (const marker of ['$service->bad', '$wrong->bad', '$unscoped->bad']) {
      expect(workspace.completeMembers(uri, source.indexOf(marker) + marker.length)).toEqual([]);
    }
    expect(workspace.completeMembers(uri, source.indexOf("$data['service']->exe") + "$data['service']->exe".length)
      .map((item) => item.name)).toEqual(['execute']);
    const arrayDefinitionOffset = source.indexOf("$data['service']->execute") + "$data['service']->".length + 2;
    expect(workspace.definition(uri, arrayDefinitionOffset)).toMatchObject([{ uri }]);
    expect(workspace.completeMembers(uri, source.indexOf("$data['service']->mutated") + "$data['service']->mutated".length)).toEqual([]);
    expect(workspace.completeMembers(uri, source.indexOf("$data['service']->bad") + "$data['service']->bad".length)).toEqual([]);
    expect(workspace.incompatibleArguments(uri)).toMatchObject([
      { callable: 'LocalVarDoc\\acceptOther', actualType: 'LocalVarDoc\\Service', expectedType: 'LocalVarDoc\\Other' },
      { callable: 'LocalVarDoc\\acceptOther', actualType: 'LocalVarDoc\\Service', expectedType: 'LocalVarDoc\\Other' },
    ]);
  });
  it('uses standalone local @var assertions only in the same block and until mutation', () => {
    const source = `<?php namespace StandaloneVarDoc;
      class Service { public function execute(): void {} }
      class Other {}
      function provide(): mixed {}
      function observe(mixed $value): void {}
      function mutate(mixed &$value): void {}
      function acceptOther(Other $value): void {}
      function run(): void {
        $value = provide();
        /** @var Service $value */
        $value->exe;
        $value->execute();
        acceptOther($value);
        observe($value);
        $value->execute();
        mutate($value);
        $value->mutated;

        $data = provide();
        /** @var array{service: Service} $data */
        $data['service']->exe;
        $data['service']->execute();
        acceptOther($data['service']);
        $data['service'] = provide();
        $data['service']->mutated;

        if (true) {
          /** @var Service $branch */
          $branch->execute();
        }
        $branch->outside;

        /** @var Service $broken */
        $broken->execute();
        /** @var Service| $broken */
        $broken->malformed;
      }`;
    const uri = 'file:///StandaloneVarDoc.php'; workspace.update(uri, source);
    expect(workspace.completeMembers(uri, source.indexOf('$value->exe') + '$value->exe'.length).map((item) => item.name)).toEqual(['execute']);
    for (const marker of ['$value->execute();', "$data['service']->execute();", '$branch->execute();', '$broken->execute();']) {
      const offset = source.indexOf(marker) + marker.lastIndexOf('execute') + 2;
      expect(workspace.definition(uri, offset)).toMatchObject([{ uri }]);
    }
    expect(workspace.definition(uri, source.indexOf('$value->execute();', source.indexOf('observe($value)')) + '$value->'.length + 2)).toMatchObject([{ uri }]);
    expect(workspace.completeMembers(uri, source.indexOf("$data['service']->exe") + "$data['service']->exe".length)
      .map((item) => item.name)).toEqual(['execute']);
    for (const marker of ['$value->mutated', "$data['service']->mutated", '$branch->outside', '$broken->malformed']) {
      expect(workspace.completeMembers(uri, source.indexOf(marker) + marker.length)).toEqual([]);
    }
    expect(workspace.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
      ['StandaloneVarDoc\\Service', 'StandaloneVarDoc\\Other'],
      ['StandaloneVarDoc\\Service', 'StandaloneVarDoc\\Other'],
    ]);
  });
  it('propagates direct property assignments with visibility and nullability', () => {
    const source = `<?php namespace PropertyFlow;
      class Repository { public function find(): void {} }
      class Holder { public Repository $repository; public ?Repository $optional; private Repository $hidden; }
      function run(Holder $ready, ?Holder $holder): void {
        $a = $ready->repository; $a->fi;
        $b = $ready->optional; $b?->fi;
        $c = $holder?->repository; $c?->fi;
        $private = $ready->hidden; $private->bad;
        $unsafe = $holder->repository; $unsafe->bad;
      }`;
    workspace.update('file:///PropertyFlow.php', source);
    for (const position of [...source.matchAll(/fi;/g)].map((item) => item.index + 2)) {
      expect(workspace.completeMembers('file:///PropertyFlow.php', position).map((item) => item.name)).toEqual(['find']);
    }
    for (const position of [...source.matchAll(/bad;/g)].map((item) => item.index + 3)) expect(workspace.completeMembers('file:///PropertyFlow.php', position)).toEqual([]);
  });
  it('propagates fully proven property and method chains into local assignments', () => {
    const source = `<?php namespace ChainFlow;
      class User { public function name(): void {} }
      class Repository { public function find(): User {} }
      class Provider { public Repository $repository; }
      class Service { public function provider(): Provider {} }
      function run(Service $service, ?Service $maybe): void {
        $user = $service->provider()->repository->find(); $user->na;
        $safe = $maybe?->provider()?->repository?->find(); $safe?->na;
        $unsafe = $maybe?->provider()->repository->find(); $unsafe->bad;
      }`;
    workspace.update('file:///ChainFlow.php', source);
    for (const position of [...source.matchAll(/na;/g)].map((item) => item.index + 2)) expect(workspace.completeMembers('file:///ChainFlow.php', position).map((item) => item.name)).toEqual(['name']);
    expect(workspace.completeMembers('file:///ChainFlow.php', source.indexOf('bad;') + 3)).toEqual([]);
  });
  it('propagates proven function, static factory and member-call return assignments', () => {
    workspace.update('file:///CallTypes.php', `<?php namespace Calls;
      class User { public function name(): string {} }
      class Repository { public function find(): User {} }
      class Factory { public static function make(): User {} }
      function current(): User {}
    `);
    const source = '<?php namespace Calls; function run(Repository $repository): void { $a = current(); $b = Factory::make(); $c = $repository->find(); $a->na; $b->na; $c->na; }';
    workspace.update('file:///CallAssignments.php', source);
    for (const position of [...source.matchAll(/na;/g)].map((item) => item.index + 2)) {
      expect(workspace.completeMembers('file:///CallAssignments.php', position).map((item) => item.name)).toEqual(['name']);
    }
  });
  it('propagates proven PHPDoc iterable element types through foreach values', () => {
    workspace.update('file:///IterableUser.php', '<?php namespace Iteration; class User { public function name(): string {} }');
    const source = `<?php namespace Iteration;
      /** @param list<User> $users
       * @param array<string, User> $mapped
       * @param array{first: User, second: User} $shape
       * @param array{user: User, count: int} $mixed */
      function run(array $users, array $mapped, array $shape, array $mixed): void {
        foreach ($users as $user) { $user->na; }
        foreach ($mapped as $key => $item) { $item->na; }
        foreach ($shape as $shaped) { $shaped->na; }
        foreach ($mixed as $unknown) { $unknown->na; }
        $user->na;
      }`;
    workspace.update('file:///IterableUse.php', source);
    const positions = [...source.matchAll(/na;/g)].map((item) => item.index + 2);
    expect(workspace.completeMembers('file:///IterableUse.php', positions[0]!).map((item) => item.name)).toEqual(['name']);
    expect(workspace.completeMembers('file:///IterableUse.php', positions[1]!).map((item) => item.name)).toEqual(['name']);
    expect(workspace.completeMembers('file:///IterableUse.php', positions[2]!).map((item) => item.name)).toEqual(['name']);
    expect(workspace.completeMembers('file:///IterableUse.php', positions[3]!)).toEqual([]);
    expect(workspace.completeMembers('file:///IterableUse.php', positions[4]!)).toEqual([]);
  });
  it('propagates generic collection values through PHPStan template inheritance', () => {
    workspace.update('file:///ReadableCollection.php', `<?php namespace Doctrine\\Common\\Collections;
      use IteratorAggregate;
      /** @phpstan-template TKey of array-key
       * @template-covariant TValue
       * @template-extends IteratorAggregate<TKey, TValue> */
      interface ReadableCollection extends IteratorAggregate {}`);
    workspace.update('file:///Collection.php', `<?php namespace Doctrine\\Common\\Collections; use Closure;
      /** @phpstan-template TKey of array-key
       * @phpstan-template TValue
       * @template-extends ReadableCollection<TKey, TValue> */
      interface Collection extends ReadableCollection {
        /** @return mixed
         * @phpstan-return TValue|null */
        public function get(int|string $key);
        /** @return Collection<mixed>
         * @phpstan-return Collection<TKey, TValue> */
        public function filter(callable $predicate);
        /** @phpstan-template U of object
         * @phpstan-param Closure(TValue): U $func
         * @phpstan-return Collection<TKey, U> */
        public function map(Closure $func);
      }`);
    workspace.update('file:///GenericIterableUser.php', '<?php namespace GenericIteration; class User { public function name(): string {} } class View { public function title(): string {} } class Other {}');
    const source = `<?php namespace GenericIteration;
      use Doctrine\\Common\\Collections\\Collection;
      /** @param Collection<int, User> $users */
      function run(Collection $users): void {
        foreach ($users as $user) { $user->na; }
        $users->get(0)?->na;
        $users->filter(fn(User $user): bool => true)->get(0)?->na;
        $users->map(fn(User $user): View => new View())->get(0)?->ti;
        $views = $users->map(fn(User $user): View => new View());
        $views->get(0)?->ti;
        $users->map(static function(User $user): View { return new View(); })->get(0)?->ti;
        $closureViews = $users->map(function(User $user): View { return new View(); });
        $closureViews->get(0)?->ti;
        $users->map(fn(User $user) => new View())->get(0)?->ti;
        $inferredViews = $users->map(function(User $user) { return new View(); });
        $inferredViews->get(0)?->ti;
        $users->map(fn(Other $other): View => new View())->get(0)?->unsafe;
        $users->map(fn(User $user): View => new View(), new Other())->get(0)?->extra;
        $users->map(function(User $user) { return makeView($user); })->get(0)?->untyped;
      }`;
    workspace.update('file:///GenericIterableUse.php', source);
    for (const position of [...source.matchAll(/na;/g)].map((item) => item.index + 2)) {
      expect(workspace.completeMembers('file:///GenericIterableUse.php', position).map((item) => item.name)).toEqual(['name']);
    }
    for (const position of [...source.matchAll(/ti;/g)].map((item) => item.index + 2)) {
      expect(workspace.completeMembers('file:///GenericIterableUse.php', position).map((item) => item.name)).toEqual(['title']);
    }
    expect(workspace.completeMembers('file:///GenericIterableUse.php', source.indexOf('unsafe;') + 6)).toEqual([]);
    expect(workspace.completeMembers('file:///GenericIterableUse.php', source.indexOf('extra;') + 5)).toEqual([]);
    expect(workspace.completeMembers('file:///GenericIterableUse.php', source.indexOf('untyped;') + 7)).toEqual([]);
  });
  it('projects concrete iterable metadata from a non-template named class', () => {
    workspace.update('file:///ConcreteIterator.php', `<?php
      /** @template TKey
       * @template TValue */
      interface Iterator {}
      namespace ConcreteIteration;
      class Item { public function label(): string {} }
      /** @template-implements \\Iterator<string, Item> */
      class Items implements \\Iterator {}`);
    const source = `<?php namespace ConcreteIteration;
      function inspect(Items $items): void {
        foreach ($items as $key => $item) { $item->lab; }
      }`;
    const uri = 'file:///ConcreteIteratorUse.php'; workspace.update(uri, source);
    expect(workspace.completeMembers(uri, source.indexOf('lab;') + 3).map((item) => item.name)).toEqual(['label']);
  });
  it('projects custom generic iterable entries through foreach array offsets without guessing ambiguous parents', () => {
    workspace.update('file:///GenericIterator.php', `<?php
      /** @template TKey
       * @template TValue */
      interface Iterator {}`);
    workspace.update('file:///GenericEntryIterator.php', `<?php namespace GenericEntries;
      class Item { public function label(): string {} }
      class Other { public function other(): string {} }
      /** @template TInnerKey
       * @template TValue
       * @template-implements \\Iterator<array<array-key, TInnerKey|null>, array<array-key, TValue|null>> */
      class EntryIterator implements \\Iterator {}
      /** @template TInnerKey
       * @template TValue
       * @template-implements \\Iterator<array<array-key, TInnerKey|null>, array<array-key, TValue|null>>
       * @template-implements \\Iterator<array<array-key, TInnerKey|null>, array<array-key, Other|null>> */
      class AmbiguousEntryIterator implements \\Iterator {}`);
    const source = `<?php namespace GenericEntries;
      /** @param EntryIterator<string, Item> $entries
       * @param AmbiguousEntryIterator<string, Item> $ambiguous */
      function inspect(EntryIterator $entries, AmbiguousEntryIterator $ambiguous): void {
        foreach ($entries as $values) {
          $item = $values['left']; if ($item !== null) { $item->lab; }
        }
        foreach ($ambiguous as $values) {
          $unknown = $values['left']; if ($unknown !== null) { $unknown->noGuess; }
        }
      }`;
    const uri = 'file:///GenericEntryUse.php'; workspace.update(uri, source);
    expect(workspace.completeMembers(uri, source.indexOf('lab;') + 3).map((item) => item.name)).toEqual(['label']);
    expect(workspace.completeMembers(uri, source.indexOf('noGuess;') + 7)).toEqual([]);
  });
  it('binds function-call assignments in the containing namespace of multi-namespace files', () => {
    const source = '<?php namespace First { class User { public function firstOnly(): void {} } function current(): User {} } namespace Second { class User { public function secondOnly(): void {} } function current(): User {} function run(): void { $value = current(); $value->second; } }';
    workspace.update('file:///MultipleNamespaces.php', source);
    expect(workspace.completeMembers('file:///MultipleNamespaces.php', source.indexOf('second;') + 6).map((item) => item.name)).toEqual(['secondOnly']);
  });
  it('completes anonymous-class own and inherited members without exposing a global type candidate', () => {
    workspace.update('file:///AnonymousBase.php', '<?php namespace Anonymous; class Base { public function inherited(): void {} }');
    const source = '<?php namespace Anonymous; function run(): void { $value = new class extends Base { public function local(): void {} }; $value-> }';
    workspace.update('file:///AnonymousUse.php', source);
    expect(workspace.completeMembers('file:///AnonymousUse.php', source.indexOf('->') + 2).map((item) => item.name).sort()).toEqual(['inherited', 'local']);
    expect(workspace.workspaceSymbols('@anonymous')).toEqual([]);
  });
  it('uses the smallest closure or arrow scope and prevents outer assignment leakage', () => {
    workspace.update('file:///ScopedUser.php', '<?php namespace Scoped; class User { public function name(): string {} } class Inner { public function inside(): void {} }');
    const source = `<?php namespace Scoped; function run(): void {
      $outer = new User();
      $closure = function(Inner $inner): void { $local = new Inner(); $inner->ins; $local->ins; $outer->na; };
      $arrow = fn(Inner $item) => $item->ins;
    }`;
    workspace.update('file:///Scopes.php', source);
    expect(workspace.completeMembers('file:///Scopes.php', source.indexOf('$inner->ins') + '$inner->ins'.length).map((item) => item.name)).toEqual(['inside']);
    expect(workspace.completeMembers('file:///Scopes.php', source.indexOf('$local->ins') + '$local->ins'.length).map((item) => item.name)).toEqual(['inside']);
    expect(workspace.completeMembers('file:///Scopes.php', source.indexOf('$outer->na') + '$outer->na'.length)).toEqual([]);
    expect(workspace.completeMembers('file:///Scopes.php', source.indexOf('$item->ins') + '$item->ins'.length).map((item) => item.name)).toEqual(['inside']);
  });
  it('types unannotated closure parameters only from one concrete PHPDoc callable contract', () => {
    workspace.update('file:///ContextualCallableContract.php', `<?php namespace ContextualCallable;
      class User { public function name(): string {} }
      class Other { public function other(): string {} }
      class View { public function title(): string {} }
      /** @param callable(User): void $visit */ function visit(callable $visit): void {}
      /** @param callable(User, string): void $visit */ function visitPair(callable $visit): void {}
      /** @template T @param callable(T): void $visit */ function visitTemplate(callable $visit): void {}
      /** @template T
       * @param callable(T): void $visit
       * @param list<T> $values */ function visitEach(callable $visit, array $values): void {}
      /** @template T
       * @template R
       * @param callable(T): R $map
       * @param list<T> $values
       * @return list<R> */ function transform(callable $map, array $values): array {}
      /** @template T
       * @param callable(T): void $visit
       * @param list<T> $left
       * @param list<T> $right */ function visitBoth(callable $visit, array $left, array $right): void {}
      /** @param callable(Missing): void $visit */ function visitMissing(callable $visit): void {}
      /** @param callable(User): void $callback */ function named(int $mode, callable $callback): void {}
      function acceptOther(Other $other): void {}
      function duplicate(callable $visit): void {}
    `);
    workspace.update('file:///ContextualCallableDuplicate.php', `<?php namespace ContextualCallable;
      /** @param callable(Other): void $visit */ function duplicate(callable $visit): void {}`);
    const source = `<?php namespace ContextualCallable;
      visit(fn($user) => $user->name());
      visit(function($user): void { $user->na; });
      named(callback: fn($user) => $user->na, mode: 1);
      visit(fn($user) => acceptOther($user));
      visitPair(fn($user) => $user->na);
      visitTemplate(fn($value) => $value->na);
      visitMissing(fn($value) => $value->na);
      duplicate(fn($value) => $value->na);
      /** @param list<User> $users
       * @param list<Other> $others */
      function contextualGenerics(array $users, array $others, mixed $unknown): void {
        visitEach(function($user): void { $user->nam; }, $users);
        visitEach(fn($user) => $user->nam, $users);
        visitEach(values: $users, visit: fn($user) => $user->nam);
        visitEach(fn($value) => $value->nam, $unknown);
        visitBoth(fn($value) => $value->nam, $users, $others);
        $views = transform(fn($user) => new View(), $users);
        $views[0]->tit;
        $definedViews = transform(fn($user) => new View(), $users);
        $definedViews[0]->title();
        $wrongViews = transform(fn($user) => new View(), $users);
        acceptOther($wrongViews[0]);
        $closureViews = transform(function($user) { return new View(); }, $users);
        $closureViews[0]->tit;
        $definedClosureViews = transform(function($user) { return new View(); }, $users);
        $definedClosureViews[0]->title();
        $wrongClosureViews = transform(function($user) { return new View(); }, $users);
        acceptOther($wrongClosureViews[0]);
        $unknownViews = transform(fn($user) => new View(), $unknown);
        $unknownViews[0]->tit;
        acceptOther($unknownViews[0]);
        $unknownReturn = transform(fn($user) => missingView($user), $users);
        $unknownReturn[0]->tit;
        acceptOther($unknownReturn[0]);
        $earlyClosureReturn = transform(function($user) { if ($user) { return new View(); } return new View(); }, $users);
        $earlyClosureReturn[0]->tit;
        acceptOther($earlyClosureReturn[0]);
      }
    `;
    workspace.update('file:///ContextualCallableUse.php', source);
    const positions = [...source.matchAll(/->na(?!m)/g)].map((match) => match.index + 4);
    expect(positions.map((position) => workspace.completeMembers('file:///ContextualCallableUse.php', position).map((item) => item.name)))
      .toEqual([['name'], ['name'], [], [], [], []]);
    const incompatible = workspace.incompatibleArguments('file:///ContextualCallableUse.php')
      .map((item) => [item.actualType, item.expectedType]);
    expect(incompatible).toContainEqual(['ContextualCallable\\User', 'ContextualCallable\\Other']);
    expect(incompatible).toContainEqual(['ContextualCallable\\View', 'ContextualCallable\\Other']);
    expect(workspace.definition('file:///ContextualCallableUse.php', source.indexOf('name()') + 2))
      .toMatchObject([{ uri: 'file:///ContextualCallableContract.php' }]);
    const genericPositions = [...source.matchAll(/->nam(?!e)/g)].map((match) => match.index + 5);
    expect(genericPositions.map((position) => workspace.completeMembers('file:///ContextualCallableUse.php', position).map((item) => item.name)))
      .toEqual([['name'], ['name'], ['name'], [], []]);
    const resultPositions = [...source.matchAll(/->tit(?!l)/g)].map((match) => match.index + 5);
    expect(resultPositions.map((position) => workspace.completeMembers('file:///ContextualCallableUse.php', position).map((item) => item.name)))
      .toEqual([['title'], ['title'], [], [], ['title']]);
    expect(workspace.definition('file:///ContextualCallableUse.php', source.indexOf('title()') + 2))
      .toMatchObject([{ uri: 'file:///ContextualCallableContract.php' }]);
    expect(workspace.definition('file:///ContextualCallableUse.php', source.lastIndexOf('title()') + 2))
      .toMatchObject([{ uri: 'file:///ContextualCallableContract.php' }]);
  }, 15_000);
  it('binds closure return templates only when complete conditional paths return proven types', () => {
    workspace.update('file:///ConditionalClosureContract.php', `<?php namespace ConditionalClosure;
      class User { public function active(): bool {} }
      class ViewA { public function title(): string {} }
      class ViewB { public function title(): string {} }
      class ViewC { public function title(): string {} }
      class Other {}
      /** @template T
       * @template R
       * @param callable(T):R $map
       * @param list<T> $values
       * @return list<R> */
      function transform(callable $map, array $values): array {}
      function reject(Other $value): void {}`);
    const source = `<?php namespace ConditionalClosure;
      /** @param list<User> $users */ function map(array $users): void {
        $mapped = transform(function($user) {
          if ($user->active()) { return new ViewA(); }
          elseif (!$user->active()) { return new ViewB(); }
          else { return new ViewA(); }
        }, $users);
        $mapped[0]->tit;
        $defined = transform(function($user) {
          if ($user->active()) { return new ViewA(); }
          else { return new ViewB(); }
        }, $users);
        $defined[0]->title();
        $wrong = transform(function($user) {
          if ($user->active()) { return new ViewA(); }
          else { return new ViewB(); }
        }, $users);
        reject($wrong[0]);
        $incomplete = transform(function($user) { if ($user->active()) { return new ViewA(); } }, $users);
        $incomplete[0]->tit;
        reject($incomplete[0]);
        $extra = transform(function($user) { $view = new ViewA(); return $view; }, $users);
        $extra[0]->tit;
        $wrongExtra = transform(function($user) { $view = new ViewA(); return $view; }, $users);
        reject($wrongExtra[0]);
        $early = transform(function($user) { if ($user->active()) { return new ViewC(); } return new ViewA(); }, $users);
        $early[0]->tit;
        $definedEarly = transform(function($user) { if ($user->active()) { return new ViewC(); } return new ViewA(); }, $users);
        $definedEarly[0]->title();
        $wrongEarly = transform(function($user) { if ($user->active()) { return new ViewC(); } return new ViewA(); }, $users);
        reject($wrongEarly[0]);
        $unknownEarly = transform(function($user) { if ($user->active()) { return missingView($user); } return new ViewA(); }, $users);
        $unknownEarly[0]->tit;
        $loopEarly = transform(function($user) { while ($user->active()) { return new ViewC(); } return new ViewA(); }, $users);
        $loopEarly[0]->tit;
      }`;
    workspace.update('file:///ConditionalClosureUse.php', source);
    const completions = [...source.matchAll(/->tit(?!l)/g)].map((match) => match.index + 5)
      .map((offset) => workspace.completeMembers('file:///ConditionalClosureUse.php', offset).map((item) => item.name));
    expect(completions).toEqual([['title'], [], ['title'], ['title'], [], ['title']]);
    expect(workspace.definition('file:///ConditionalClosureUse.php', source.indexOf('title()') + 2))
      .toEqual([expect.objectContaining({ uri: 'file:///ConditionalClosureContract.php' }),
        expect.objectContaining({ uri: 'file:///ConditionalClosureContract.php' })]);
    const earlyDefinition = source.indexOf('$definedEarly[0]->title()') + '$definedEarly[0]->'.length + 2;
    expect(workspace.definition('file:///ConditionalClosureUse.php', earlyDefinition))
      .toEqual([expect.objectContaining({ uri: 'file:///ConditionalClosureContract.php' }),
        expect.objectContaining({ uri: 'file:///ConditionalClosureContract.php' })]);
    expect(workspace.incompatibleArguments('file:///ConditionalClosureUse.php').map((item) => [item.actualType, item.expectedType]))
      .toEqual([['ConditionalClosure\\ViewA|ConditionalClosure\\ViewB', 'ConditionalClosure\\Other'],
        ['ConditionalClosure\\ViewA', 'ConditionalClosure\\Other'],
        ['ConditionalClosure\\ViewA|ConditionalClosure\\ViewC', 'ConditionalClosure\\Other']]);
  }, 15_000);
  it('merges proven closure returns while excluding proven terminal paths', () => {
    workspace.update('file:///TerminatingClosureContract.php', `<?php namespace TerminatingClosure;
      class User { public function active(): bool {} }
      class ViewA { public function title(): string {} }
      class ViewB { public function title(): string {} }
      class Other {}
      class Terminator { public static function stop(User $user): never { throw new \\RuntimeException(); } }
      function fail(User $user): never { throw new \\RuntimeException(); }
      /** @return never */ function documentedFail(User $user) { throw new \\RuntimeException(); }
      /** @template T
       * @template R
       * @param callable(T):R $map
       * @param list<T> $values
       * @return list<R> */
      function transform(callable $map, array $values): array {}
      function reject(Other $value): void {}`);
    const source = `<?php namespace TerminatingClosure;
      /** @param list<User> $users */ function map(array $users): void {
        $returnOrThrow = transform(function($user) { if ($user->active()) { return new ViewA(); } throw new \\RuntimeException(); }, $users);
        $returnOrThrow[0]->tit;
        $definedReturnOrThrow = transform(function($user) { if ($user->active()) { return new ViewA(); } throw new \\RuntimeException(); }, $users);
        $definedReturnOrThrow[0]->title();
        $wrongReturnOrThrow = transform(function($user) { if ($user->active()) { return new ViewA(); } throw new \\RuntimeException(); }, $users);
        reject($wrongReturnOrThrow[0]);
        $throwGuard = transform(function($user) { if (!$user->active()) { throw new \\RuntimeException(); } return new ViewB(); }, $users);
        $throwGuard[0]->tit;
        $returnOrExit = transform(function($user) { if ($user->active()) { return new ViewA(); } else { exit(1); } }, $users);
        $returnOrExit[0]->tit;
        $exitGuard = transform(function($user) { if (!$user->active()) { exit(1); } return new ViewB(); }, $users);
        $exitGuard[0]->tit;
        $allTerminating = transform(function($user) { if ($user->active()) { throw new \\RuntimeException(); } exit(1); }, $users);
        $allTerminating[0]->tit;
        $nativeNever = transform(function($user) { if ($user->active()) { return new ViewA(); } fail($user); }, $users);
        $nativeNever[0]->tit;
        $staticNever = transform(function($user) { if ($user->active()) { return new ViewB(); } Terminator::stop($user); }, $users);
        $staticNever[0]->tit;
        $documentedNever = transform(function($user) { if ($user->active()) { return new ViewA(); } documentedFail($user); }, $users);
        $documentedNever[0]->tit;
        $invalidNever = transform(function($user) { if ($user->active()) { return new ViewA(); } fail(new Other()); }, $users);
        $invalidNever[0]->tit;
      }`;
    workspace.update('file:///TerminatingClosureUse.php', source);
    const completions = [...source.matchAll(/->tit(?!l)/g)].map((match) => match.index + 5)
      .map((offset) => workspace.completeMembers('file:///TerminatingClosureUse.php', offset).map((item) => item.name));
    expect(completions).toEqual([['title'], ['title'], ['title'], ['title'], [], ['title'], ['title'], [], []]);
    expect(workspace.definition('file:///TerminatingClosureUse.php', source.indexOf('title()') + 2))
      .toEqual([expect.objectContaining({ uri: 'file:///TerminatingClosureContract.php' })]);
    expect(workspace.incompatibleArguments('file:///TerminatingClosureUse.php').map((item) => [item.actualType, item.expectedType]))
      .toEqual([['TerminatingClosure\\ViewA', 'TerminatingClosure\\Other'],
        ['TerminatingClosure\\Other', 'TerminatingClosure\\User']]);
  }, 15_000);
  it('merges proven closure returns across try catch and finally control flow', () => {
    workspace.update('file:///TryClosureContract.php', `<?php namespace TryClosure;
      class User { public function active(): bool {} }
      class ViewA { public function title(): string {} }
      class ViewB { public function title(): string {} }
      class ViewC { public function title(): string {} }
      class Other {}
      /** @template T
       * @template R
       * @param callable(T):R $map
       * @param list<T> $values
       * @return list<R> */
      function transform(callable $map, array $values): array {}
      function reject(Other $value): void {}`);
    const source = `<?php namespace TryClosure;
      /** @param list<User> $users */ function map(array $users): void {
        $tryCatch = transform(function($user) {
          try { if ($user->active()) { return new ViewA(); } throw new \\RuntimeException(); }
          catch (\\RuntimeException $error) { return new ViewB(); }
        }, $users);
        $tryCatch[0]->tit;
        $definedTryCatch = transform(function($user) {
          try { return new ViewA(); } catch (\\RuntimeException $error) { return new ViewB(); }
        }, $users);
        $definedTryCatch[0]->title();
        $wrongTryCatch = transform(function($user) {
          try { return new ViewA(); } catch (\\RuntimeException $error) { return new ViewB(); }
        }, $users);
        reject($wrongTryCatch[0]);
        $finallyOverride = transform(function($user) {
          try { return new ViewA(); } finally { return new ViewC(); }
        }, $users);
        $finallyOverride[0]->tit;
        $finallyPartial = transform(function($user) {
          try { return new ViewA(); } finally { if ($user->active()) { return new ViewC(); } }
        }, $users);
        $finallyPartial[0]->tit;
        $definedFinallyPartial = transform(function($user) {
          try { return new ViewA(); } finally { if ($user->active()) { return new ViewC(); } }
        }, $users);
        $definedFinallyPartial[0]->title();
        $wrongFinallyOverride = transform(function($user) {
          try { return new ViewA(); } finally { return new ViewC(); }
        }, $users);
        reject($wrongFinallyOverride[0]);
        $finallyPass = transform(function($user) {
          try { return new ViewB(); } finally { $seen = true; }
        }, $users);
        $finallyPass[0]->tit;
        $incompleteCatch = transform(function($user) {
          try { return new ViewA(); } catch (\\RuntimeException $error) { consume($error); }
        }, $users);
        $incompleteCatch[0]->tit;
        $unknownCatch = transform(function($user) {
          try { return new ViewA(); } catch (\\RuntimeException $error) { return missingView($error); }
        }, $users);
        $unknownCatch[0]->tit;
      }`;
    workspace.update('file:///TryClosureUse.php', source);
    const completions = [...source.matchAll(/->tit(?!l)/g)].map((match) => match.index + 5)
      .map((offset) => workspace.completeMembers('file:///TryClosureUse.php', offset).map((item) => item.name));
    expect(completions).toEqual([['title'], ['title'], ['title'], ['title'], [], []]);
    expect(workspace.definition('file:///TryClosureUse.php', source.indexOf('title()') + 2))
      .toEqual([expect.objectContaining({ uri: 'file:///TryClosureContract.php' }),
        expect.objectContaining({ uri: 'file:///TryClosureContract.php' })]);
    expect(workspace.definition('file:///TryClosureUse.php', source.lastIndexOf('title()') + 2))
      .toEqual([expect.objectContaining({ uri: 'file:///TryClosureContract.php' }),
        expect.objectContaining({ uri: 'file:///TryClosureContract.php' })]);
    expect(workspace.incompatibleArguments('file:///TryClosureUse.php').map((item) => [item.actualType, item.expectedType]))
      .toEqual([['TryClosure\\ViewA|TryClosure\\ViewB', 'TryClosure\\Other'],
        ['TryClosure\\ViewC', 'TryClosure\\Other']]);
  }, 15_000);
  it('merges proven closure returns across complete and falling-through switch flow', () => {
    workspace.update('file:///SwitchClosureContract.php', `<?php namespace SwitchClosure;
      class User { public function active(): bool {} }
      class ViewA { public function title(): string {} }
      class ViewB { public function title(): string {} }
      class ViewC { public function title(): string {} }
      class Other {}
      /** @template T
       * @template R
       * @param callable(T):R $map
       * @param list<T> $values
       * @return list<R> */
      function transform(callable $map, array $values): array {}
      function reject(Other $value): void {}`);
    const source = `<?php namespace SwitchClosure;
      /** @param list<User> $users */ function map(array $users): void {
        $complete = transform(function($user) {
          switch ($user->active()) {
            case true: return new ViewA();
            default: return new ViewB();
          }
        }, $users);
        $complete[0]->tit;
        $defined = transform(function($user) {
          switch ($user->active()) {
            case true: return new ViewA();
            default: return new ViewB();
          }
        }, $users);
        $defined[0]->title();
        $fallthrough = transform(function($user) {
          switch ($user->active()) {
            case true: if ($user->active()) { return new ViewA(); }
            case false: return new ViewB();
            default: return new ViewC();
          }
        }, $users);
        $fallthrough[0]->tit;
        $finalReturn = transform(function($user) {
          switch ($user->active()) { case true: return new ViewA(); }
          return new ViewB();
        }, $users);
        $finalReturn[0]->tit;
        $breakThenFinal = transform(function($user) {
          switch ($user->active()) { case true: return new ViewA(); default: break; }
          return new ViewB();
        }, $users);
        $breakThenFinal[0]->tit;
        $wrong = transform(function($user) {
          switch ($user->active()) { case true: return new ViewA(); default: return new ViewB(); }
        }, $users);
        reject($wrong[0]);
        $breakPath = transform(function($user) {
          switch ($user->active()) { case true: return new ViewA(); default: break; }
        }, $users);
        $breakPath[0]->tit;
        $unknown = transform(function($user) {
          switch ($user->active()) { case true: return new ViewA(); default: return missingView(); }
        }, $users);
        $unknown[0]->tit;
        $nestedBreak = transform(function($user) {
          switch ($user->active()) {
            case true: if ($user->active()) { break; } return new ViewA();
            default: return new ViewB();
          }
        }, $users);
        $nestedBreak[0]->tit;
        $outerBreak = transform(function($user) {
          switch ($user->active()) { case true: return new ViewA(); default: break 2; }
          return new ViewB();
        }, $users);
        $outerBreak[0]->tit;
      }`;
    workspace.update('file:///SwitchClosureUse.php', source);
    const completions = [...source.matchAll(/->tit(?!l)/g)].map((match) => match.index + 5)
      .map((offset) => workspace.completeMembers('file:///SwitchClosureUse.php', offset).map((item) => item.name));
    expect(completions).toEqual([['title'], ['title'], ['title'], ['title'], [], [], [], []]);
    expect(workspace.definition('file:///SwitchClosureUse.php', source.indexOf('title()') + 2))
      .toEqual([expect.objectContaining({ uri: 'file:///SwitchClosureContract.php' }),
        expect.objectContaining({ uri: 'file:///SwitchClosureContract.php' })]);
    expect(workspace.incompatibleArguments('file:///SwitchClosureUse.php').map((item) => [item.actualType, item.expectedType]))
      .toEqual([['SwitchClosure\\ViewA|SwitchClosure\\ViewB', 'SwitchClosure\\Other']]);
  }, 15_000);
  it('merges proven closure returns across bounded loop flow', () => {
    workspace.update('file:///LoopClosureContract.php', `<?php namespace LoopClosure;
      class User { public function active(): bool {} }
      class ViewA { public function title(): string {} }
      class ViewB { public function title(): string {} }
      class Other {}
      /** @template T
       * @template R
       * @param callable(T):R $map
       * @param list<T> $values
       * @return list<R> */
      function transform(callable $map, array $values): array {}
      function reject(Other $value): void {}`);
    const source = `<?php namespace LoopClosure;
      /** @param list<User> $users */ function map(array $users): void {
        $whileDynamic = transform(function($user) {
          while ($user->active()) { return new ViewA(); }
          return new ViewB();
        }, $users);
        $whileDynamic[0]->tit;
        $definedWhile = transform(function($user) {
          while ($user->active()) { return new ViewA(); }
          return new ViewB();
        }, $users);
        $definedWhile[0]->title();
        $whileFalse = transform(function($user) {
          while (false) { return new ViewA(); }
          return new ViewB();
        }, $users);
        $whileFalse[0]->tit;
        $whileTrue = transform(function($user) {
          while (true) {
            if ($user->active()) { return new ViewA(); }
            else { return new ViewB(); }
          }
        }, $users);
        $whileTrue[0]->tit;
        $forEver = transform(function($user) { for (;;) { return new ViewA(); } }, $users);
        $forEver[0]->tit;
        $doOnce = transform(function($user) { do { return new ViewB(); } while ($user->active()); }, $users);
        $doOnce[0]->tit;
        $foreachNonEmpty = transform(function($user) { foreach ([new User()] as $item) { return new ViewA(); } }, $users);
        $foreachNonEmpty[0]->tit;
        $foreachEmpty = transform(function($user) {
          foreach ([] as $item) { return new ViewA(); }
          return new ViewB();
        }, $users);
        $foreachEmpty[0]->tit;
        $wrong = transform(function($user) {
          while ($user->active()) { return new ViewA(); }
          return new ViewB();
        }, $users);
        reject($wrong[0]);
        $unknownLoop = transform(function($user) {
          while ($user->active()) { return missingView(); }
          return new ViewB();
        }, $users);
        $unknownLoop[0]->tit;
      }`;
    workspace.update('file:///LoopClosureUse.php', source);
    const completionExpectations: Array<[string, string[]]> = [
      ['$whileDynamic[0]->tit', ['title']], ['$whileFalse[0]->tit', ['title']], ['$whileTrue[0]->tit', ['title']],
      ['$forEver[0]->tit', ['title']], ['$doOnce[0]->tit', ['title']], ['$foreachNonEmpty[0]->tit', ['title']],
      ['$foreachEmpty[0]->tit', ['title']], ['$unknownLoop[0]->tit', []],
    ];
    for (const [marker, expected] of completionExpectations) {
      const offset = source.indexOf(marker) + marker.length;
      expect(workspace.completeMembers('file:///LoopClosureUse.php', offset).map((item) => item.name), marker).toEqual(expected);
    }
    expect(workspace.definition('file:///LoopClosureUse.php', source.indexOf('title()') + 2))
      .toEqual([expect.objectContaining({ uri: 'file:///LoopClosureContract.php' }),
        expect.objectContaining({ uri: 'file:///LoopClosureContract.php' })]);
    expect(workspace.incompatibleArguments('file:///LoopClosureUse.php').map((item) => [item.actualType, item.expectedType]))
      .toEqual([['LoopClosure\\ViewA|LoopClosure\\ViewB', 'LoopClosure\\Other']]);
  }, 15_000);
  it('rejoins direct loop break paths without accepting nested or outer breaks', () => {
    workspace.update('file:///LoopBreakContract.php', `<?php namespace LoopBreak;
      class User { public function active(): bool {} }
      class ViewA { public function title(): string {} }
      class ViewB { public function title(): string {} }
      class Other {}
      /** @template T
       * @template R
       * @param callable(T):R $map
       * @param list<T> $values
       * @return list<R> */
      function transform(callable $map, array $values): array {}
      function reject(Other $value): void {}`);
    const source = `<?php namespace LoopBreak;
      /** @param list<User> $users */ function map(array $users): void {
        $direct = transform(function($user) {
          while ($user->active()) { break; }
          return new ViewB();
        }, $users);
        $direct[0]->tit;
        $returnOrBreak = transform(function($user) {
          while ($user->active()) {
            if ($user->active()) { return new ViewA(); }
            break;
          }
          return new ViewB();
        }, $users);
        $returnOrBreak[0]->tit;
        $defined = transform(function($user) {
          while ($user->active()) {
            if ($user->active()) { return new ViewA(); }
            break 1;
          }
          return new ViewB();
        }, $users);
        $defined[0]->title();
        $wrong = transform(function($user) {
          while ($user->active()) {
            if ($user->active()) { return new ViewA(); }
            break;
          }
          return new ViewB();
        }, $users);
        reject($wrong[0]);
        $nested = transform(function($user) {
          while ($user->active()) {
            if ($user->active()) { break; }
            return new ViewA();
          }
          return new ViewB();
        }, $users);
        $nested[0]->tit;
        $outer = transform(function($user) {
          do { break 2; } while ($user->active());
          return new ViewB();
        }, $users);
        $outer[0]->tit;
      }`;
    workspace.update('file:///LoopBreakUse.php', source);
    for (const [marker, expected] of [
      ['$direct[0]->tit', ['title']], ['$returnOrBreak[0]->tit', ['title']], ['$nested[0]->tit', []], ['$outer[0]->tit', []],
    ] as Array<[string, string[]]>) {
      const offset = source.indexOf(marker) + marker.length;
      expect(workspace.completeMembers('file:///LoopBreakUse.php', offset).map((item) => item.name), marker).toEqual(expected);
    }
    expect(workspace.definition('file:///LoopBreakUse.php', source.indexOf('title()') + 2))
      .toEqual([expect.objectContaining({ uri: 'file:///LoopBreakContract.php' }),
        expect.objectContaining({ uri: 'file:///LoopBreakContract.php' })]);
    expect(workspace.incompatibleArguments('file:///LoopBreakUse.php').map((item) => [item.actualType, item.expectedType]))
      .toEqual([['LoopBreak\\ViewA|LoopBreak\\ViewB', 'LoopBreak\\Other']]);
  });
  it('inherits only safe explicit closure captures and implicit arrow captures', () => {
    workspace.update('file:///CapturedUser.php', '<?php namespace Captures; class User { public function name(): string {} }');
    const source = `<?php namespace Captures; function run(User $parameter): void {
      $local = new User();
      $explicit = function() use ($local, &$parameter): void { $local->na; $parameter->na; };
      $missing = function(): void { $local->na; };
      $arrow = fn() => $local->na;
    }`;
    workspace.update('file:///Captures.php', source);
    const positions = [...source.matchAll(/na;/g)].map((item) => item.index + 2);
    expect(workspace.completeMembers('file:///Captures.php', positions[0]!).map((item) => item.name)).toEqual(['name']);
    expect(workspace.completeMembers('file:///Captures.php', positions[1]!)).toEqual([]);
    expect(workspace.completeMembers('file:///Captures.php', positions[2]!)).toEqual([]);
    expect(workspace.completeMembers('file:///Captures.php', positions[3]!).map((item) => item.name)).toEqual(['name']);
  });
  it('filters static completion and resolves static signatures', () => {
    workspace.update('file:///Factory.php', '<?php namespace App; class Factory { public static function create(string $name): Factory {} public function instance(): void {} }');
    const source = '<?php namespace App; function run(): void { Factory::cr }';
    workspace.update('file:///Static.php', source);
    expect(workspace.completeMembers('file:///Static.php', source.indexOf('cr }') + 2).map((item) => item.name)).toEqual(['create']);
    const call = '<?php namespace App; function run(): void { Factory::create(';
    workspace.update('file:///StaticCall.php', call);
    expect(workspace.signature('file:///StaticCall.php', call.length)).toMatchObject({ name: 'create', activeParameter: 0 });
  });
  it('resolves constructor and imported function signatures', () => {
    workspace.update('file:///Signatures.php', '<?php namespace Domain; class Invoice { public function __construct(string $number, int $total) {} } function createInvoice(string $number): Invoice {}');
    const source = '<?php namespace App; use Domain\\Invoice; use function Domain\\createInvoice as create; $a = new Invoice("A", 1); $b = create("B"); $c = \\Domain\\createInvoice("C");';
    workspace.update('file:///SignatureConsumer.php', source);
    expect(workspace.signature('file:///SignatureConsumer.php', source.indexOf('1);') + 1)).toMatchObject({ name: 'Invoice', activeParameter: 1, parameters: [{ name: 'number' }, { name: 'total' }] });
    expect(workspace.signature('file:///SignatureConsumer.php', source.indexOf('"B"') + 2)).toMatchObject({ name: 'createInvoice', activeParameter: 0, returnType: 'Invoice' });
    expect(workspace.signature('file:///SignatureConsumer.php', source.indexOf('"C"') + 2)).toMatchObject({ name: 'createInvoice', activeParameter: 0, returnType: 'Invoice' });
  });
  it('maps out-of-order named arguments and completes only unused parameter names', () => {
    workspace.update('file:///Named.php', '<?php namespace Named; class Builder { public function __construct(string $first, int $second, bool $third = false) {} }');
    const source = '<?php namespace Named; $value = new Builder(second: 2, fi';
    workspace.update('file:///NamedUse.php', source);
    expect(workspace.signature('file:///NamedUse.php', source.length)).toMatchObject({ activeParameter: 1, namedArgumentPrefix: 'fi', usedNamedArguments: ['second'] });
    expect(workspace.completeNamedArguments('file:///NamedUse.php', source.length)).toMatchObject([{ name: 'first', type: 'string' }]);
    const selected = '<?php namespace Named; $value = new Builder(second: 2';
    workspace.update('file:///NamedSelected.php', selected);
    expect(workspace.signature('file:///NamedSelected.php', selected.length)).toMatchObject({ activeParameter: 1 });
  });
  it('offers only imported or same-namespace types in proven class contexts', () => {
    workspace.update('file:///User.php', '<?php namespace Domain; class User {}');
    workspace.update('file:///Local.php', '<?php namespace App; class Utility {}');
    const source = '<?php namespace App; use Domain\\User as DomainUser; function run(): void { $a = new Dom; $b = new Uti; }';
    workspace.update('file:///Types.php', source);
    expect(workspace.completeTypes('file:///Types.php', source.indexOf('Dom;') + 3).map((item) => item.name)).toEqual(['DomainUser']);
    expect(workspace.completeTypes('file:///Types.php', source.indexOf('Uti;') + 3).map((item) => item.name)).toEqual(['Utility']);
  });
  it('offers indexed external types with an exact import insertion and suppresses alias collisions', () => {
    workspace.update('file:///Invoice.php', '<?php namespace Domain\\Billing; class Invoice {}');
    const source = '<?php\r\nnamespace App;\r\n\r\nuse Existing\\Thing;\r\n\r\nfunction run(): void { $invoice = new Inv; }';
    workspace.update('file:///AutoImport.php', source);
    const candidate = workspace.completeTypes('file:///AutoImport.php', source.indexOf('Inv;') + 3).find((item) => item.fqcn === 'Domain\\Billing\\Invoice');
    expect(candidate).toMatchObject({ name: 'Invoice', importFqcn: 'Domain\\Billing\\Invoice' });
    const insertion = workspace.importInsertion('file:///AutoImport.php', source.indexOf('Inv;'), candidate!.importFqcn!);
    expect(insertion && `${source.slice(0, insertion.offset)}${insertion.text}${source.slice(insertion.offset)}`).toContain('use Existing\\Thing;\r\nuse Domain\\Billing\\Invoice;');
  });
  it('ranks visible and namespace-near type completions deterministically', () => {
    workspace.update('file:///LocalService.php', '<?php namespace App\\Controller\\Admin; class RankedLocal {}');
    workspace.update('file:///NearService.php', '<?php namespace App\\Controller; class RankedNear {}');
    workspace.update('file:///MidService.php', '<?php namespace App; class RankedMid {}');
    workspace.update('file:///FarService.php', '<?php namespace Vendor; class RankedFar {} class Imported {}');
    const source = '<?php namespace App\\Controller\\Admin; use Vendor\\Imported as RankedImported; function run(): void { new Ranked; }';
    workspace.update('file:///RankedTypes.php', source);
    const candidates = workspace.completeTypes('file:///RankedTypes.php', source.indexOf('Ranked;') + 6);
    expect(candidates.map((item) => item.fqcn)).toEqual([
      'App\\Controller\\Admin\\RankedLocal',
      'Vendor\\Imported',
      'App\\Controller\\RankedNear',
      'App\\RankedMid',
      'Vendor\\RankedFar',
    ]);
    expect(candidates.map((item) => Boolean(item.importFqcn))).toEqual([false, false, true, true, true]);
  });
  it('requires imports for global classes inside a namespace while preserving qualified access', () => {
    workspace.update('file:///GlobalOnlyType.php', '<?php class GlobalOnlyType {}');
    workspace.update('file:///QualifiedGlobalType.php', '<?php namespace GlobalVendor; class QualifiedGlobalType { public function globalMember(): void {} public static function globalStatic(): void {} }');
    const source = '<?php namespace GlobalTypeConsumer; function run(): void { new GlobalOnlyT; new GlobalOnlyType(); new \\GlobalOnlyType(); $relative = new GlobalVendor\\QualifiedGlobalType(); $relative->globalM; $absolute = new \\GlobalVendor\\QualifiedGlobalType(); $absolute->globalM; GlobalVendor\\QualifiedGlobalType::globalS; \\GlobalVendor\\QualifiedGlobalType::globalS; }';
    workspace.update('file:///GlobalTypeConsumer.php', source);
    expect(workspace.completeTypes('file:///GlobalTypeConsumer.php', source.indexOf('GlobalOnlyT;') + 'GlobalOnlyT'.length))
      .toMatchObject([{ name: 'GlobalOnlyType', fqcn: 'GlobalOnlyType', importFqcn: 'GlobalOnlyType' }]);
    expect(workspace.definition('file:///GlobalTypeConsumer.php', source.indexOf('GlobalOnlyType();') + 2)).toEqual([]);
    expect(workspace.unresolvedNewTypes('file:///GlobalTypeConsumer.php')).toMatchObject([
      { name: 'GlobalOnlyT', fqcn: 'GlobalTypeConsumer\\GlobalOnlyT' },
      { name: 'GlobalOnlyType', fqcn: 'GlobalTypeConsumer\\GlobalOnlyType' },
      { name: 'GlobalVendor\\QualifiedGlobalType', fqcn: 'GlobalTypeConsumer\\GlobalVendor\\QualifiedGlobalType' },
    ]);
    expect(workspace.definition('file:///GlobalTypeConsumer.php', source.lastIndexOf('GlobalOnlyType();') + 2)).toMatchObject([{ uri: 'file:///GlobalOnlyType.php' }]);
    expect(workspace.definition('file:///GlobalTypeConsumer.php', source.indexOf('GlobalVendor\\QualifiedGlobalType();') + 2)).toEqual([]);
    expect(workspace.completeMembers('file:///GlobalTypeConsumer.php', source.indexOf('$relative->globalM') + '$relative->globalM'.length)).toEqual([]);
    expect(workspace.completeMembers('file:///GlobalTypeConsumer.php', source.indexOf('$absolute->globalM') + '$absolute->globalM'.length)).toMatchObject([{ name: 'globalMember' }]);
    expect(workspace.completeMembers('file:///GlobalTypeConsumer.php', source.indexOf('::globalS') + '::globalS'.length)).toEqual([]);
    expect(workspace.completeMembers('file:///GlobalTypeConsumer.php', source.lastIndexOf('::globalS') + '::globalS'.length)).toMatchObject([{ name: 'globalStatic' }]);
    const imported = '<?php namespace GlobalTypeConsumer; use GlobalOnlyType; new GlobalOnlyType();';
    workspace.update('file:///ImportedGlobalType.php', imported);
    expect(workspace.completeTypes('file:///ImportedGlobalType.php', imported.lastIndexOf('GlobalOnlyType();') + 'GlobalOnlyT'.length))
      .toMatchObject([{ name: 'GlobalOnlyType', fqcn: 'GlobalOnlyType', importFqcn: undefined }]);
    expect(workspace.definition('file:///ImportedGlobalType.php', imported.lastIndexOf('GlobalOnlyType();') + 2)).toMatchObject([{ uri: 'file:///GlobalOnlyType.php' }]);
  });
  it('exposes exact import-command candidates and validates explicit aliases', () => {
    workspace.update('file:///ImportCommandOne.php', '<?php namespace ImportCommand\\One; class Service {}');
    workspace.update('file:///ImportCommandTwo.php', '<?php namespace ImportCommand\\Two; class Service {}');
    const source = '<?php namespace ImportCommand\\Consumer; class Service {} function run(): void { new Service(); }';
    workspace.update('file:///ImportCommandUse.php', source);
    const candidates = workspace.typeImportCandidates('file:///ImportCommandUse.php', source.indexOf('new Service') + 4, 'Service');
    expect(candidates.map((item) => item.fqcn)).toEqual(expect.arrayContaining(['ImportCommand\\One\\Service', 'ImportCommand\\Two\\Service']));
    expect(candidates.every((item) => item.aliasRequired)).toBe(true);
    const candidate = candidates.find((item) => item.fqcn === 'ImportCommand\\One\\Service')!;
    expect(workspace.importInsertion('file:///ImportCommandUse.php', source.indexOf('new Service'), candidate.fqcn, 'class')).toBeUndefined();
    expect(workspace.importInsertion('file:///ImportCommandUse.php', source.indexOf('new Service'), candidate.fqcn, 'class', 'ExternalService')?.text)
      .toContain('use ImportCommand\\One\\Service as ExternalService;');
    expect(workspace.importInsertion('file:///ImportCommandUse.php', source.indexOf('new Service'), candidate.fqcn, 'class', 'Service')).toBeUndefined();
  });
  it('captures copied type identities and plans batched imports without partial conflicts', () => {
    workspace.update('file:///CopyType.php', '<?php namespace CopyType; class Model {}');
    const copied = '<?php namespace CopyConsumer; use CopyType\\Model as Stable; function copy(Stable $value): Stable { return $value; }';
    workspace.update('file:///CopyUse.php', copied);
    expect(workspace.typeCopySymbols('file:///CopyUse.php', [{ start: copied.indexOf('Stable $'), end: copied.length }]))
      .toEqual(expect.arrayContaining([expect.objectContaining({ fqcn: 'CopyType\\Model', alias: 'Stable' })]));
    const unresolved = '<?php namespace CopyConsumer; function pending(Model $value): MissingType {}';
    workspace.update('file:///UnresolvedImports.php', unresolved);
    expect(workspace.unresolvedTypeNames('file:///UnresolvedImports.php')).toMatchObject([
      { name: 'Model' }, { name: 'MissingType' },
    ]);
    const target = '<?php namespace PasteTarget; use Existing\\Thing; function paste(): void {}';
    workspace.update('file:///PasteTarget.php', target);
    const plan = workspace.planTypeImports('file:///PasteTarget.php', target.indexOf('function'), [
      { fqcn: 'CopyType\\Model', sourceAlias: 'Model' }, { fqcn: 'Other\\Result', sourceAlias: 'Result' },
    ]);
    expect(plan?.text).toContain('use CopyType\\Model;\nuse Other\\Result;');
    expect(workspace.planTypeImports('file:///PasteTarget.php', target.indexOf('function'), [
      { fqcn: 'CopyType\\Model', sourceAlias: 'Thing' },
    ])?.conflict).toEqual({ fqcn: 'CopyType\\Model', sourceAlias: 'Thing' });
    const aliased = workspace.planTypeImports('file:///PasteTarget.php', target.indexOf('function'), [
      { fqcn: 'CopyType\\Model', sourceAlias: 'Thing', alias: 'CopiedModel' },
    ]);
    expect(aliased).toMatchObject({ replacements: { Thing: 'CopiedModel' } });
    expect(aliased?.conflict).toBeUndefined();
  });
  it('completes functions by namespace or alias and inserts use function for external candidates', () => {
    workspace.update('file:///RemoteFunctions.php', '<?php namespace Domain\\Factory; function createInvoice(string $number): string {}');
    const source = '<?php namespace App; function localHelper(): void {} function run(): void { $a = localH; $b = createI; }';
    workspace.update('file:///FunctionCompletion.php', source);
    expect(workspace.completeFunctions('file:///FunctionCompletion.php', source.indexOf('localH;') + 6)).toMatchObject([{ name: 'localHelper', importFqfn: undefined }]);
    const external = workspace.completeFunctions('file:///FunctionCompletion.php', source.indexOf('createI;') + 7).find((item) => item.fqcn === 'Domain\\Factory\\createInvoice')!;
    expect(external).toMatchObject({ name: 'createInvoice', fqcn: 'Domain\\Factory\\createInvoice', importFqfn: 'Domain\\Factory\\createInvoice' });
    expect(workspace.importInsertion('file:///FunctionCompletion.php', source.indexOf('createI;'), external.importFqfn!, 'function')?.text).toContain('use function Domain\\Factory\\createInvoice;');
    const aliasSource = '<?php namespace App; use function Domain\\Factory\\createInvoice as makeInvoice; $value = makeI;';
    workspace.update('file:///FunctionAliasCompletion.php', aliasSource);
    expect(workspace.completeFunctions('file:///FunctionAliasCompletion.php', aliasSource.indexOf('makeI;') + 5)).toMatchObject([{ name: 'makeInvoice', importFqfn: undefined }]);
  });
  it('ranks same-namespace, imported, global, and namespace-near function completions deterministically', () => {
    workspace.update('file:///RankedFunctionLocal.php', '<?php namespace RankedFunction\\Controller\\Admin; function ranked_function_local(): void {}');
    workspace.update('file:///RankedFunctionNear.php', '<?php namespace RankedFunction\\Controller; function ranked_function_near(): void {}');
    workspace.update('file:///RankedFunctionMid.php', '<?php namespace RankedFunction; function ranked_function_mid(): void {}');
    workspace.update('file:///RankedFunctionGlobal.php', '<?php function ranked_function_global(): void {}');
    workspace.update('file:///RankedFunctionFar.php', '<?php namespace Vendor\\Functions; function ranked_function_far(): void {} function imported_original(): void {}');
    const source = '<?php namespace RankedFunction\\Controller\\Admin; use function Vendor\\Functions\\imported_original as ranked_function_imported; ranked_function';
    workspace.update('file:///RankedFunctionConsumer.php', source);
    const candidates = workspace.completeFunctions('file:///RankedFunctionConsumer.php', source.length);
    expect(candidates.map((item) => item.fqcn)).toEqual([
      'RankedFunction\\Controller\\Admin\\ranked_function_local',
      'Vendor\\Functions\\imported_original',
      'ranked_function_global',
      'RankedFunction\\Controller\\ranked_function_near',
      'RankedFunction\\ranked_function_mid',
      'Vendor\\Functions\\ranked_function_far',
    ]);
    expect(candidates.map((item) => Boolean(item.importFqfn))).toEqual([false, false, false, true, true, true]);
  });
  it('offers types in parameter, return, property, catch and attribute positions only', () => {
    workspace.update('file:///RemoteType.php', '<?php namespace Domain; class Invoice {}');
    for (const fragment of ['function run(Inv', 'function run(): Inv', 'class C { public Inv', 'try {} catch (Inv', '#[Inv']) {
      const source = `<?php namespace App; ${fragment}`;
      workspace.update(`file:///Context-${fragment.length}.php`, source);
      expect(workspace.completeTypes(`file:///Context-${fragment.length}.php`, source.length).map((item) => item.name)).toContain('Invoice');
    }
    const expression = '<?php namespace App; function run(): void { echo Inv';
    workspace.update('file:///NotAType.php', expression);
    expect(workspace.completeTypes('file:///NotAType.php', expression.length)).toEqual([]);
  });
  it('follows proven method return types through a call chain', () => {
    workspace.update('file:///Profile.php', '<?php namespace App; class Profile { public function label(): string {} }');
    workspace.update('file:///User.php', '<?php namespace App; class User { public function profile(): Profile {} }');
    const source = '<?php namespace App; function run(User $user): void { $user->profile()->la }';
    workspace.update('file:///Chain.php', source);
    expect(workspace.completeMembers('file:///Chain.php', source.indexOf('la }') + 2).map((item) => item.name)).toEqual(['label']);
    expect(workspace.typeDefinition('file:///Chain.php', source.indexOf('$user') + 2)).toMatchObject([{ uri: 'file:///User.php', fqcn: 'App\\User' }]);
    expect(workspace.typeDefinition('file:///Chain.php', source.indexOf('profile') + 2)).toMatchObject([{ uri: 'file:///Profile.php', fqcn: 'App\\Profile' }]);
  });
  it('binds self, parent and late-static return types without guessing unrelated classes', () => {
    workspace.update('file:///Hierarchy.php', `<?php namespace Hierarchy;
      class Base { public function baseOnly(): void {} }
      class Middle extends Base { public function parentResult(): parent {} public function selfResult(): self {} public function staticResult(): static {} public function middleOnly(): void {} }
      class Child extends Middle { public function childOnly(): void {} }
    `);
    const source = '<?php namespace Hierarchy; function call(Child $child): void { $child->parentResult()->bas; $child->selfResult()->mid; $child->staticResult()->chi; }';
    workspace.update('file:///SpecialTypes.php', source);
    expect(workspace.completeMembers('file:///SpecialTypes.php', source.indexOf('bas;') + 3).map((item) => item.name)).toEqual(['baseOnly']);
    expect(workspace.completeMembers('file:///SpecialTypes.php', source.indexOf('mid;') + 3).map((item) => item.name)).toEqual(['middleOnly']);
    expect(workspace.completeMembers('file:///SpecialTypes.php', source.indexOf('chi;') + 3).map((item) => item.name)).toEqual(['childOnly']);
  });
  it('finds only references that resolve to the same method declaration', () => {
    workspace.update('file:///One.php', '<?php namespace App; class One { public function run(): void {} }');
    workspace.update('file:///Two.php', '<?php namespace App; class Two { public function run(): void {} }');
    const source = '<?php namespace App; function call(One $one, Two $two): void { $one->run(); $two->run(); }';
    workspace.update('file:///Calls.php', source);
    const references = workspace.references('file:///Calls.php', source.indexOf('run();') + 1);
    expect(references).toHaveLength(2);
    expect(references.some((item) => item.uri === 'file:///Two.php')).toBe(false);
    const fromDeclaration = workspace.references('file:///One.php', workspace.source('file:///One.php')!.indexOf('run') + 1);
    expect(fromDeclaration).toHaveLength(2);
  });
  it('finds type references across aliases, native signatures and PHPDoc', () => {
    workspace.update('file:///DomainUser.php', '<?php namespace Domain; class User {}');
    const source = `<?php namespace App; use Domain\\User as Account;
      /** @return Account */ function find(Account $account): Account { return new Account(); }
    `;
    workspace.update('file:///TypeRefs.php', source);
    const references = workspace.references('file:///DomainUser.php', workspace.source('file:///DomainUser.php')!.indexOf('User') + 1);
    expect(references.filter((item) => item.uri === 'file:///TypeRefs.php')).toHaveLength(5);
  });
  it('incrementally replaces, removes, and restores reference candidate postings without same-name leakage', () => {
    const declarationUri = 'file:///IndexedReferenceTarget.php';
    const declaration = '<?php namespace IndexedReference; class Target { public function act(): void {} }';
    const useUri = 'file:///IndexedReferenceUse.php';
    const use = `<?php namespace IndexedReferenceUse; use IndexedReference\\Target as Alias;
      function consume(Alias $target): void { $target->act(); }`;
    const noiseUri = 'file:///IndexedReferenceNoise.php';
    const noise = '<?php namespace IndexedReferenceNoise; class Target { public function act(): void {} } function consume(Target $target): void { $target->act(); }';
    workspace.update(declarationUri, declaration); workspace.update(useUri, use); workspace.update(noiseUri, noise);
    const snapshot = workspace.snapshot(useUri)!;
    const targetOffset = declaration.indexOf('Target') + 1; const methodOffset = declaration.indexOf('act') + 1;
    expect(workspace.references(declarationUri, targetOffset).some((item) => item.uri === useUri)).toBe(true);
    expect(workspace.references(declarationUri, targetOffset).some((item) => item.uri === noiseUri)).toBe(false);
    expect(workspace.references(declarationUri, methodOffset).some((item) => item.uri === useUri)).toBe(true);
    expect(workspace.references(declarationUri, methodOffset).some((item) => item.uri === noiseUri)).toBe(false);

    workspace.update(useUri, '<?php namespace IndexedReferenceUse; function consume(): void {}');
    expect(workspace.references(declarationUri, targetOffset).some((item) => item.uri === useUri)).toBe(false);
    expect(workspace.references(declarationUri, methodOffset).some((item) => item.uri === useUri)).toBe(false);
    workspace.remove(useUri); expect(workspace.restore(snapshot, useUri)).toBe(true);
    expect(workspace.references(declarationUri, targetOffset).some((item) => item.uri === useUri)).toBe(true);
    expect(workspace.references(declarationUri, methodOffset).some((item) => item.uri === useUri)).toBe(true);
    workspace.remove(useUri); workspace.remove(noiseUri); workspace.remove(declarationUri);
  });
  it('finds transitive type and method implementations through interfaces', () => {
    workspace.update('file:///ImplementationContract.php', '<?php namespace Navigation; interface Contract { public function run(): void; }');
    workspace.update('file:///ImplementationBase.php', '<?php namespace Navigation; abstract class Base implements Contract { abstract public function run(): void; }');
    workspace.update('file:///ImplementationConcrete.php', '<?php namespace Navigation; class Concrete extends Base { public function run(): void {} }');
    const contract = workspace.source('file:///ImplementationContract.php')!;
    expect(workspace.implementations('file:///ImplementationContract.php', contract.indexOf('Contract') + 1)).toMatchObject([
      { uri: 'file:///ImplementationBase.php' }, { uri: 'file:///ImplementationConcrete.php' },
    ]);
    expect(workspace.implementations('file:///ImplementationContract.php', contract.indexOf('run') + 1)).toMatchObject([
      { uri: 'file:///ImplementationBase.php' }, { uri: 'file:///ImplementationConcrete.php' },
    ]);
    expect(workspace.directSubtypes('Navigation\\Contract')).toMatchObject([{ fqcn: 'Navigation\\Base' }]);
    expect(workspace.directSubtypes('Navigation\\Base')).toMatchObject([{ fqcn: 'Navigation\\Concrete' }]);
    expect(workspace.directSupertypes('Navigation\\Concrete')).toMatchObject([{ fqcn: 'Navigation\\Base' }]);
  });
  it('finds only interface methods missing from the concrete class hierarchy', () => {
    workspace.update('file:///GenerateContracts.php', '<?php namespace Generate; interface ParentContract { public function inherited(string $name): string; public function pending(): void; } interface Contract extends ParentContract { public function run(int &$count, string ...$labels): void; }');
    workspace.update('file:///GenerateBase.php', '<?php namespace Generate; abstract class Base { public function inherited(string $name): string { return $name; } abstract public function pending(): void; }');
    const source = '<?php namespace Generate; class Worker extends Base implements Contract { }';
    workspace.update('file:///GenerateWorker.php', source);
    expect(workspace.missingInterfaceImplementation('file:///GenerateWorker.php', source.indexOf('Worker'))).toMatchObject({
      classFqcn: 'Generate\\Worker', methods: [
        { name: 'run', fqcn: 'Generate\\Contract::run' },
        { name: 'pending', fqcn: 'Generate\\ParentContract::pending' },
      ],
    });
    const complete = '<?php namespace Generate; class Complete extends Base implements Contract { public function run(int &$count, string ...$labels): void {} public function pending(): void {} }';
    workspace.update('file:///GenerateComplete.php', complete);
    expect(workspace.missingInterfaceImplementation('file:///GenerateComplete.php', complete.indexOf('Complete'))).toBeUndefined();
  });
  it('finds exact abstract parent methods still missing from a concrete hierarchy', () => {
    workspace.update('file:///AbstractGrand.php', '<?php namespace AbstractGenerate; abstract class Grand { abstract protected function reset(int $value = 0): int; abstract public function done(): void; }');
    workspace.update('file:///AbstractBase.php', '<?php namespace AbstractGenerate; abstract class Base extends Grand { public function done(): void {} }');
    const source = '<?php namespace AbstractGenerate; class Worker extends Base { } abstract class Deferred extends Base { }';
    workspace.update('file:///AbstractWorker.php', source);
    expect(workspace.missingAbstractImplementation('file:///AbstractWorker.php', source.indexOf('Worker'))).toMatchObject({
      classFqcn: 'AbstractGenerate\\Worker', abstract: false, methods: [{ name: 'reset', declarationText: 'abstract protected function reset(int $value = 0): int;' }],
    });
    expect(workspace.missingAbstractImplementation('file:///AbstractWorker.php', source.indexOf('Deferred'))).toMatchObject({ abstract: true });
  });
  it('resolves imported function definitions and references without matching same-name functions', () => {
    workspace.update('file:///FunctionOne.php', '<?php namespace Functions\\One; function build(string $name): string {}');
    workspace.update('file:///FunctionTwo.php', '<?php namespace Functions\\Two; function build(): void {}');
    const source = '<?php namespace Consumer; use function Functions\\One\\build as make; $value = make("x");';
    workspace.update('file:///FunctionUse.php', source);
    const callOffset = source.indexOf('make(') + 1;
    expect(workspace.functionAt('file:///FunctionUse.php', callOffset)).toMatchObject({ fqcn: 'Functions\\One\\build', returnType: 'string' });
    expect(workspace.definition('file:///FunctionUse.php', callOffset)).toMatchObject([{ uri: 'file:///FunctionOne.php' }]);
    const references = workspace.references('file:///FunctionUse.php', callOffset);
    expect(references.some((item) => item.uri === 'file:///FunctionTwo.php')).toBe(false);
    expect(references.filter((item) => item.uri === 'file:///FunctionUse.php')).toHaveLength(2);
  });
  it('completes and resolves namespace constants with use const aliases', () => {
    workspace.update('file:///Constants.php', '<?php namespace Config; const API_KEY = "secret";');
    const imported = '<?php namespace Consumer; use const Config\\API_KEY as KEY; echo KEY;';
    workspace.update('file:///ConstantImported.php', imported);
    expect(workspace.completeConstants('file:///ConstantImported.php', imported.lastIndexOf('KEY') + 2)).toMatchObject([{ name: 'KEY', fqcn: 'Config\\API_KEY' }]);
    expect(workspace.definition('file:///ConstantImported.php', imported.lastIndexOf('KEY') + 1)).toMatchObject([{ uri: 'file:///Constants.php' }]);
    expect(workspace.semanticTokenConstantUses('file:///ConstantImported.php').map((range) => imported.slice(range.start, range.end))).toEqual(['KEY']);
    expect(workspace.references('file:///ConstantImported.php', imported.lastIndexOf('KEY') + 1)).toHaveLength(3);
    const external = '<?php namespace Consumer; echo API_;'; workspace.update('file:///ConstantExternal.php', external);
    expect(workspace.completeConstants('file:///ConstantExternal.php', external.indexOf('API_') + 4)).toMatchObject([{ name: 'API_KEY', importFqcn: 'Config\\API_KEY' }]);
    expect(workspace.importInsertion('file:///ConstantExternal.php', external.length, 'Config\\API_KEY', 'const')?.text).toContain('use const Config\\API_KEY;');
    workspace.update('file:///DuplicateConstants.php', '<?php namespace Config; const API_KEY = "duplicate";');
    expect(workspace.constantAt('file:///ConstantImported.php', imported.lastIndexOf('KEY') + 1)).toBeUndefined();
    expect(workspace.semanticTokenConstantUses('file:///ConstantImported.php')).toEqual([]);
    workspace.remove('file:///DuplicateConstants.php');
  });
  it('resolves explicit current-namespace and qualified function, constant, and type names without global fallback', () => {
    workspace.update('file:///ExplicitCurrentSymbols.php', `<?php namespace ExplicitCurrent;
      class LocalType { public function localMember(): void {} }
      function localFunction(int $value): string {}
      const LOCAL_CONSTANT = 'local';
    `);
    workspace.update('file:///GlobalQualifiedSymbols.php', `<?php namespace Vendor\\Tools;
      function helper(string $value): string {}
      const FLAG = 'global';
    `);
    workspace.update('file:///RelativeQualifiedSymbols.php', `<?php namespace Consumer\\Vendor\\Tools;
      function helper(int $value): int {}
      const FLAG = 'relative';
    `);
    const explicit = `<?php namespace ExplicitCurrent;
      function consume(namespace\\LocalType $value): void {
        $value->localM;
        namespace\\localFunction(1);
        echo namespace\\LOCAL_CONSTANT;
      }
    `;
    workspace.update('file:///ExplicitCurrentConsumer.php', explicit);
    expect(workspace.completeMembers('file:///ExplicitCurrentConsumer.php', explicit.indexOf('localM;') + 6)).toMatchObject([{ name: 'localMember' }]);
    expect(workspace.definition('file:///ExplicitCurrentConsumer.php', explicit.indexOf('namespace\\LocalType') + 'namespace\\'.length + 2))
      .toMatchObject([{ uri: 'file:///ExplicitCurrentSymbols.php' }]);
    expect(workspace.functionAt('file:///ExplicitCurrentConsumer.php', explicit.indexOf('localFunction') + 2))
      .toMatchObject({ fqcn: 'ExplicitCurrent\\localFunction', returnType: 'string' });
    expect(workspace.constantAt('file:///ExplicitCurrentConsumer.php', explicit.indexOf('LOCAL_CONSTANT') + 2))
      .toMatchObject({ fqcn: 'ExplicitCurrent\\LOCAL_CONSTANT', value: "'local'" });

    const relative = '<?php namespace Consumer; Vendor\\Tools\\helper(1); echo Vendor\\Tools\\FLAG;';
    workspace.update('file:///RelativeQualifiedConsumer.php', relative);
    expect(workspace.functionAt('file:///RelativeQualifiedConsumer.php', relative.indexOf('helper') + 2))
      .toMatchObject({ fqcn: 'Consumer\\Vendor\\Tools\\helper', returnType: 'int' });
    expect(workspace.constantAt('file:///RelativeQualifiedConsumer.php', relative.indexOf('FLAG') + 2))
      .toMatchObject({ fqcn: 'Consumer\\Vendor\\Tools\\FLAG', value: "'relative'" });

    const imported = '<?php namespace Consumer; use Vendor\\Tools as Tools; Tools\\helper("x"); echo Tools\\FLAG;';
    workspace.update('file:///QualifiedAliasConsumer.php', imported);
    expect(workspace.functionAt('file:///QualifiedAliasConsumer.php', imported.indexOf('helper') + 2))
      .toMatchObject({ fqcn: 'Vendor\\Tools\\helper', returnType: 'string' });
    expect(workspace.constantAt('file:///QualifiedAliasConsumer.php', imported.indexOf('FLAG') + 2))
      .toMatchObject({ fqcn: 'Vendor\\Tools\\FLAG', value: "'global'" });
  });
  it('keeps namespace and class constant identities case-sensitive', () => {
    workspace.update('file:///CaseSensitiveConstants.php', `<?php namespace CaseSensitive;
      const FLAG = 'upper'; const flag = 'lower';
      class Holder { public const FLAG = 'class-upper'; public const flag = 'class-lower'; }
    `);
    const local = '<?php namespace CaseSensitive; echo FLAG; echo flag; echo Holder::FLAG; echo Holder::flag;';
    workspace.update('file:///CaseSensitiveConstantUse.php', local);
    expect(workspace.constantAt('file:///CaseSensitiveConstantUse.php', local.indexOf('echo FLAG') + 6))
      .toMatchObject({ fqcn: 'CaseSensitive\\FLAG', value: "'upper'" });
    expect(workspace.constantAt('file:///CaseSensitiveConstantUse.php', local.indexOf('echo flag') + 6))
      .toMatchObject({ fqcn: 'CaseSensitive\\flag', value: "'lower'" });
    expect(workspace.memberAt('file:///CaseSensitiveConstantUse.php', local.indexOf('Holder::FLAG') + 'Holder::'.length + 1))
      .toMatchObject({ fqcn: 'CaseSensitive\\Holder::FLAG', value: "'class-upper'" });
    expect(workspace.memberAt('file:///CaseSensitiveConstantUse.php', local.indexOf('Holder::flag') + 'Holder::'.length + 1))
      .toMatchObject({ fqcn: 'CaseSensitive\\Holder::flag', value: "'class-lower'" });
    expect(workspace.references('file:///CaseSensitiveConstants.php', workspace.source('file:///CaseSensitiveConstants.php')!.indexOf('const FLAG') + 7)
      .some((item) => item.uri === 'file:///CaseSensitiveConstantUse.php' && local.slice(item.start, item.end) === 'flag')).toBe(false);

    const imported = '<?php namespace AliasConsumer; use const CaseSensitive\\FLAG as AliasFlag; echo AliasFlag; echo aliasflag;';
    workspace.update('file:///CaseSensitiveAlias.php', imported);
    expect(workspace.constantAt('file:///CaseSensitiveAlias.php', imported.indexOf('echo AliasFlag') + 7)).toMatchObject({ fqcn: 'CaseSensitive\\FLAG' });
    expect(workspace.constantAt('file:///CaseSensitiveAlias.php', imported.indexOf('echo aliasflag') + 7)).toBeUndefined();
  });
  it('resolves and propagates only statically proven PHP 8.3 dynamic class constants', () => {
    const definitions = `<?php namespace DynamicClassConstants;
      class Flags { public const OK = 1; public const LABEL = 'bad'; private const SECRET = 2; }
      class Names { public const OK = 'OK'; }
      function acceptInt(int $value): void {}
    `;
    workspace.update('file:///DynamicClassConstantTypes.php', definitions);
    const source = `<?php declare(strict_types=1); namespace DynamicClassConstants;
      function run(string $input): void {
        $name = 'OK'; acceptInt(Flags::{$name});
        $literal = Flags::{'OK'}; acceptInt($literal);
        $folded = Flags::{('O' . 'K')}; acceptInt($folded);
        $fromConstant = Flags::{Names::OK}; acceptInt($fromConstant);
        $bad = 'LABEL'; acceptInt(Flags::{$bad});
        $changed = 'OK'; $changed = $input; acceptInt(Flags::{$changed});
        $used = 'OK'; echo $used; acceptInt(Flags::{$used});
        acceptInt(Flags::{'SECRET'});
      }
    `;
    workspace.update('file:///DynamicClassConstantUse.php', source);
    expect(workspace.definition('file:///DynamicClassConstantUse.php', source.indexOf('$name}') + 2))
      .toMatchObject([{ uri: 'file:///DynamicClassConstantTypes.php', start: definitions.indexOf('OK = 1') }]);
    expect(workspace.definition('file:///DynamicClassConstantUse.php', source.indexOf("'OK'}") + 2))
      .toMatchObject([{ uri: 'file:///DynamicClassConstantTypes.php', start: definitions.indexOf('OK = 1') }]);
    expect(workspace.definition('file:///DynamicClassConstantUse.php', source.indexOf("'SECRET'") + 2)).toEqual([]);
    expect(workspace.incompatibleArguments('file:///DynamicClassConstantUse.php').map((item) => [item.actualType, item.expectedType]))
      .toEqual([["'bad'", 'int']]);
    expect(workspace.constantRename('file:///DynamicClassConstantTypes.php', definitions.indexOf('OK = 1') + 1, 'READY')).toBeUndefined();
    workspace.remove('file:///DynamicClassConstantUse.php'); workspace.remove('file:///DynamicClassConstantTypes.php');
  });
  it('ranks same-namespace, imported, global, and namespace-near constant completions deterministically', () => {
    workspace.update('file:///RankedConstantLocal.php', '<?php namespace RankedConstant\\Controller\\Admin; const RANKED_CONSTANT_LOCAL = 1;');
    workspace.update('file:///RankedConstantNear.php', '<?php namespace RankedConstant\\Controller; const RANKED_CONSTANT_NEAR = 1;');
    workspace.update('file:///RankedConstantMid.php', '<?php namespace RankedConstant; const RANKED_CONSTANT_MID = 1;');
    workspace.update('file:///RankedConstantGlobal.php', '<?php const RANKED_CONSTANT_GLOBAL = 1;');
    workspace.update('file:///RankedConstantFar.php', '<?php namespace Vendor\\Constants; const RANKED_CONSTANT_FAR = 1; const IMPORTED_ORIGINAL = 1;');
    const source = '<?php namespace RankedConstant\\Controller\\Admin; use const Vendor\\Constants\\IMPORTED_ORIGINAL as RANKED_CONSTANT_IMPORTED; echo RANKED_CONSTANT';
    workspace.update('file:///RankedConstantConsumer.php', source);
    const candidates = workspace.completeConstants('file:///RankedConstantConsumer.php', source.length);
    expect(candidates.map((item) => item.fqcn)).toEqual([
      'RankedConstant\\Controller\\Admin\\RANKED_CONSTANT_LOCAL',
      'Vendor\\Constants\\IMPORTED_ORIGINAL',
      'RANKED_CONSTANT_GLOBAL',
      'RankedConstant\\Controller\\RANKED_CONSTANT_NEAR',
      'RankedConstant\\RANKED_CONSTANT_MID',
      'Vendor\\Constants\\RANKED_CONSTANT_FAR',
    ]);
    expect(candidates.map((item) => Boolean(item.importFqcn))).toEqual([false, false, false, true, true, true]);
  });
  it('resolves a concrete type kind only when the workspace declaration is unique', () => {
    workspace.update('file:///TypeKind.php', '<?php namespace Kinds; interface Contract {} enum State {} class Service {}');
    const source = '<?php namespace Consumer; use Kinds\\Contract; function run(Contract $value): void {}';
    workspace.update('file:///TypeKindUse.php', source);
    expect(workspace.typeAt('file:///TypeKindUse.php', source.lastIndexOf('Contract') + 1)).toMatchObject({ kind: 'interface', fqcn: 'Kinds\\Contract' });
    workspace.update('file:///DuplicateTypeKind.php', '<?php namespace Kinds; interface Contract {}');
    expect(workspace.typeAt('file:///TypeKindUse.php', source.lastIndexOf('Contract') + 1)).toBeUndefined();
    workspace.remove('file:///DuplicateTypeKind.php');
  });
  it('plans precise type renames while preserving explicit aliases and PHPDoc policy', () => {
    const declaration = '<?php namespace RenameType; class OldName {}';
    const direct = `<?php namespace RenameType\\Consumer;
      use RenameType\\OldName;
      #[OldName] final class UsesType { public function run(OldName $value): \\RenameType\\OldName { return $value; } }
      /** @return OldName */ function documented(): OldName { return new OldName(); }
    `;
    const aliased = '<?php namespace RenameType\\Alias; use RenameType\\OldName as Stable; function make(Stable $value): Stable { return $value; }';
    workspace.update('file:///RenameType/OldName.php', declaration);
    workspace.update('file:///RenameType/UsesType.php', direct);
    workspace.update('file:///RenameType/Aliased.php', aliased);
    const target = workspace.typeRename('file:///RenameType/UsesType.php', direct.indexOf('OldName;') + 2, 'NewName');
    expect(target).toMatchObject({ name: 'OldName', fqcn: 'RenameType\\OldName', kind: 'class' });
    const texts = target?.locations.map((location) => workspace.source(location.uri)!.slice(location.start, location.end));
    expect(texts?.every((text) => text === 'OldName')).toBe(true);
    expect(target?.locations.some((location) => location.uri.endsWith('Aliased.php')
      && aliased.slice(location.start, location.end) === 'Stable')).toBe(false);
    expect(target?.locations.some((location) => location.uri.endsWith('Aliased.php')
      && aliased.slice(location.start, location.end) === 'OldName')).toBe(true);
    expect(workspace.typeRename('file:///RenameType/Aliased.php', aliased.indexOf('Stable;') + 2, 'NewName')).toBeUndefined();
    const withoutDocs = workspace.typeRename('file:///RenameType/OldName.php', declaration.indexOf('OldName') + 2, 'NewName', false);
    expect(withoutDocs?.locations.some((location) => location.uri.endsWith('UsesType.php')
      && direct.slice(Math.max(0, location.start - 12), location.end).includes('@return OldName'))).toBe(false);
    workspace.update('file:///RenameType/NewName.php', '<?php namespace RenameType; class NewName {}');
    expect(workspace.typeRename('file:///RenameType/OldName.php', declaration.indexOf('OldName') + 2, 'NewName')).toBeUndefined();
  });
  it('plans atomic type moves with namespace, import and proven reference edits', () => {
    const declaration = '<?php namespace MoveType\\Legacy; class Runner { public static function make(): Runner { return new \\MoveType\\Legacy\\Runner(); } }';
    const sameNamespace = '<?php namespace MoveType\\Legacy; final class Consumer { public const TYPE = Runner::class; }';
    const imported = '<?php namespace MoveType\\Consumer; use MoveType\\Legacy\\Runner as Stable; final class Imported { public const TYPE = Stable::class; }';
    workspace.update('file:///src/Legacy/Runner.php', declaration);
    workspace.update('file:///src/Legacy/Consumer.php', sameNamespace);
    workspace.update('file:///src/Consumer/Imported.php', imported);
    const result = workspace.planTypeMoves([{ oldUri: 'file:///src/Legacy/Runner.php', newUri: 'file:///src/Service/Runner.php', newNamespace: 'MoveType\\Service' }]);
    expect(result.error).toBeUndefined();
    expect(result.plan?.declarations).toEqual([{
      oldUri: 'file:///src/Legacy/Runner.php', newUri: 'file:///src/Service/Runner.php',
      oldFqcn: 'MoveType\\Legacy\\Runner', newFqcn: 'MoveType\\Service\\Runner',
    }]);
    expect(result.plan?.edits).toEqual(expect.arrayContaining([
      expect.objectContaining({ uri: 'file:///src/Service/Runner.php', newText: 'MoveType\\Service' }),
      expect.objectContaining({ uri: 'file:///src/Service/Runner.php', newText: '\\MoveType\\Service\\Runner' }),
      expect.objectContaining({ uri: 'file:///src/Legacy/Consumer.php', newText: '\\MoveType\\Service\\Runner' }),
      expect.objectContaining({ uri: 'file:///src/Consumer/Imported.php', newText: 'MoveType\\Service\\Runner' }),
    ]));
    expect(result.plan?.edits.some((edit) => edit.uri.endsWith('/Imported.php') && edit.newText === 'Stable')).toBe(false);
    workspace.update('file:///src/Service/Occupied.php', '<?php namespace MoveType\\Service; class Runner {}');
    expect(workspace.planTypeMoves([{ oldUri: 'file:///src/Legacy/Runner.php', newUri: 'file:///src/Service/Runner.php', newNamespace: 'MoveType\\Service' }]).error)
      .toContain('already exists');
    workspace.remove('file:///src/Service/Occupied.php');
    workspace.remove('file:///src/Legacy/Runner.php');
    workspace.update('file:///src/Service/Runner.php', declaration);
    workspace.update('file:///src/Consumer/Imported.php', `<?php namespace MoveType\\Consumer;
use MoveType\\Legacy\\Runner as Stable;
use MoveType\\Service\\Runner as Stable;
final class Imported { public const TYPE = Stable::class; }`);
    const reconciled = workspace.planTypeMoveReconciliation([{
      newUri: 'file:///src/Service/Runner.php', newNamespace: 'MoveType\\Service',
      declarations: [{ oldFqcn: 'MoveType\\Legacy\\Runner', newFqcn: 'MoveType\\Service\\Runner' }],
    }]);
    expect(reconciled.error).toBeUndefined();
    expect(reconciled.plan?.edits).toEqual(expect.arrayContaining([
      expect.objectContaining({ uri: 'file:///src/Service/Runner.php', newText: 'MoveType\\Service' }),
      expect.objectContaining({ uri: 'file:///src/Legacy/Consumer.php', newText: '\\MoveType\\Service\\Runner' }),
      expect.objectContaining({ uri: 'file:///src/Consumer/Imported.php', newText: '' }),
    ]));
  });
  it('renames a unique namespace constant across imports and resolved uses while preserving explicit aliases', () => {
    const declaration = '<?php namespace ConstantRename; const API_KEY = "secret";';
    const uses = `<?php namespace ConstantConsumer;
      use const ConstantRename\\API_KEY;
      use const ConstantRename\\API_KEY as KEY;
      echo API_KEY; echo KEY; echo \\ConstantRename\\API_KEY;
    `;
    workspace.update('file:///RenameGlobalConstant.php', declaration);
    workspace.update('file:///RenameGlobalConstantUses.php', uses);
    const rename = workspace.constantRename('file:///RenameGlobalConstant.php', declaration.indexOf('API_KEY') + 2, 'ACCESS_TOKEN');
    expect(rename?.locations.filter((item) => item.uri === 'file:///RenameGlobalConstant.php')).toHaveLength(1);
    expect(rename?.locations.filter((item) => item.uri === 'file:///RenameGlobalConstantUses.php')).toHaveLength(4);
    expect(rename?.locations.some((item) => uses.slice(item.start, item.end) === 'KEY')).toBe(false);
    const useStart = uses.indexOf('API_KEY', uses.indexOf('echo'));
    expect(workspace.constantRename('file:///RenameGlobalConstantUses.php', useStart + 2, 'ACCESS_TOKEN')).toMatchObject({ uri: 'file:///RenameGlobalConstantUses.php', start: useStart, end: useStart + 7 });
    const aliasStart = uses.indexOf('KEY', uses.indexOf('echo KEY'));
    expect(workspace.constantRename('file:///RenameGlobalConstantUses.php', aliasStart + 1, 'TOKEN')).toBeUndefined();
    workspace.update('file:///RenameGlobalConstantCollision.php', '<?php namespace ConstantRename; const ACCESS_TOKEN = "occupied";');
    expect(workspace.constantRename('file:///RenameGlobalConstant.php', declaration.indexOf('API_KEY') + 2, 'ACCESS_TOKEN')).toBeUndefined();
  });
  it('renames a class constant through exact inherited accesses and rejects semantic redirects', () => {
    const declarations = `<?php namespace ClassConstantRename;
      class Base { public const STATUS = 'ready'; public function own(): string { return self::STATUS; } }
      class Child extends Base {}
      class Other { public const STATUS = 'other'; }
    `;
    const uses = `<?php namespace ClassConstantRename; function read(): string {
      return Base::STATUS . Child::STATUS . Other::STATUS;
    }`;
    workspace.update('file:///RenameClassConstant.php', declarations);
    workspace.update('file:///RenameClassConstantUses.php', uses);
    const declarationStart = declarations.indexOf('STATUS');
    const rename = workspace.constantRename('file:///RenameClassConstant.php', declarationStart + 2, 'PHASE');
    expect(rename?.locations.filter((item) => item.uri === 'file:///RenameClassConstant.php')).toHaveLength(2);
    expect(rename?.locations.filter((item) => item.uri === 'file:///RenameClassConstantUses.php')).toHaveLength(2);
    const childUse = uses.indexOf('STATUS', uses.indexOf('Child::'));
    expect(workspace.constantRename('file:///RenameClassConstantUses.php', childUse + 2, 'PHASE')).toMatchObject({ uri: 'file:///RenameClassConstantUses.php', start: childUse, end: childUse + 6 });
    workspace.update('file:///RenameClassConstantCollision.php', '<?php namespace ClassConstantRename; class Collision extends Child { public const PHASE = "occupied"; }');
    expect(workspace.constantRename('file:///RenameClassConstant.php', declarationStart + 2, 'PHASE')).toBeUndefined();
    workspace.remove('file:///RenameClassConstantCollision.php');
    workspace.update('file:///RenameClassConstantDynamic.php', '<?php namespace ClassConstantRename; function dynamic(string $name): mixed { return Base::{$name}; }');
    expect(workspace.constantRename('file:///RenameClassConstant.php', declarationStart + 2, 'PHASE')).toBeUndefined();
    workspace.remove('file:///RenameClassConstantDynamic.php');
    const trait = '<?php namespace ClassConstantRename; trait Shared { public const STATUS = "trait"; public function traitStatus(): string { return self::STATUS; } }';
    workspace.update('file:///RenameTraitConstant.php', trait);
    const traitConsumers = '<?php namespace ClassConstantRename; class TraitHost { use Shared; } class TraitChild extends TraitHost {} function traitStatus(): string { return TraitHost::STATUS . TraitChild::STATUS; }';
    workspace.update('file:///RenameTraitConstantUses.php', traitConsumers);
    const traitRename = workspace.constantRename('file:///RenameTraitConstant.php', trait.indexOf('STATUS') + 2, 'PHASE');
    expect(traitRename?.locations.filter((item) => item.uri === 'file:///RenameTraitConstant.php')).toHaveLength(2);
    expect(traitRename?.locations.filter((item) => item.uri === 'file:///RenameTraitConstantUses.php')).toHaveLength(2);
    const traitUse = traitConsumers.indexOf('STATUS');
    expect(workspace.constantRename('file:///RenameTraitConstantUses.php', traitUse + 2, 'PHASE')?.locations).toEqual(traitRename?.locations);
    workspace.update('file:///RenameTraitConstantConflict.php', '<?php namespace ClassConstantRename; trait OtherShared { public const STATUS = "other"; } class Ambiguous { use Shared, OtherShared; }');
    expect(workspace.constantRename('file:///RenameTraitConstant.php', trait.indexOf('STATUS') + 2, 'PHASE')).toBeUndefined();
  });

  it('renames an enum case with case-sensitive identity and rejects dynamic or reflected names', () => {
    const declaration = `<?php namespace EnumCaseRename;
      enum Status: string { case Ready = 'ready'; case ready = 'lower'; public const Label = 'status'; }
    `;
    const uses = `<?php namespace EnumCaseRename;
      function values(): array { return [Status::Ready, Status::ready, Status::Label]; }
    `;
    workspace.update('file:///RenameEnumCase.php', declaration);
    workspace.update('file:///RenameEnumCaseUses.php', uses);
    workspace.update('file:///RenameEnumCaseMissing.php', '<?php namespace EnumCaseRename; function missing(): mixed { return Status::Missing; }');
    const declarationStart = declaration.indexOf('Ready');
    const rename = workspace.constantRename('file:///RenameEnumCase.php', declarationStart + 2, 'Pending');
    expect(rename?.locations.filter((item) => item.uri === 'file:///RenameEnumCase.php')).toHaveLength(1);
    expect(rename?.locations.filter((item) => item.uri === 'file:///RenameEnumCaseUses.php')).toHaveLength(1);
    expect(rename?.locations.some((item) => uses.slice(item.start, item.end) === 'ready')).toBe(false);
    expect(workspace.definition('file:///RenameEnumCaseUses.php', uses.indexOf('Ready') + 2)).toMatchObject([{ uri: 'file:///RenameEnumCase.php', start: declarationStart }]);
    expect(workspace.unresolvedMembers('file:///RenameEnumCaseMissing.php')).toMatchObject([{ name: 'Missing', ownerFqcn: 'EnumCaseRename\\Status', kind: 'constant' }]);
    const useStart = uses.indexOf('Ready');
    expect(workspace.constantRename('file:///RenameEnumCaseUses.php', useStart + 2, 'Pending')).toMatchObject({
      uri: 'file:///RenameEnumCaseUses.php', start: useStart, end: useStart + 5,
    });
    expect(workspace.constantRename('file:///RenameEnumCase.php', declarationStart + 2, 'ready')).toBeUndefined();
    workspace.update('file:///RenameEnumCaseDynamic.php', '<?php namespace EnumCaseRename; function dynamic(string $name): Status { return Status::{$name}; }');
    expect(workspace.constantRename('file:///RenameEnumCase.php', declarationStart + 2, 'Pending')).toBeUndefined();
    workspace.remove('file:///RenameEnumCaseDynamic.php');
    workspace.update('file:///RenameEnumCaseReflection.php', "<?php namespace EnumCaseRename; function reflected(\\ReflectionEnum $enum): mixed { return $enum->getCase('Ready'); }");
    expect(workspace.constantRename('file:///RenameEnumCase.php', declarationStart + 2, 'Pending')).toBeUndefined();
  });

  it('models exact unit and backed enum members and chained return types', () => {
    workspace.update('file:///EnumMembers.php', `<?php namespace EnumMembers;
      enum UnitState { case Ready; }
      enum BackedState: string { case Ready = 'ready'; }
    `);
    const source = `<?php namespace EnumMembers;
      function inspect(UnitState $unit, BackedState $backed): void {
        $unit->; $backed->; UnitState::; BackedState::; BackedState::from('ready')->;
        BackedState::from(); BackedState::tryFrom('missing')->name; BackedState::tryFrom('missing')?->name;
      }
    `;
    workspace.update('file:///EnumMemberUses.php', source);
    const completionsAt = (needle: string, adjustment: number): string[] => workspace.completeMembers('file:///EnumMemberUses.php', source.indexOf(needle) + adjustment).map((item) => item.name);
    expect(completionsAt('$unit->', '$unit->'.length)).toEqual(['name']);
    expect(completionsAt('$backed->', '$backed->'.length)).toEqual(['name', 'value']);
    expect(completionsAt('UnitState::', 'UnitState::'.length)).toEqual(['cases', 'Ready']);
    expect(completionsAt('BackedState::', 'BackedState::'.length)).toEqual(['cases', 'from', 'tryFrom', 'Ready']);
    expect(completionsAt("BackedState::from('ready')->", "BackedState::from('ready')->".length)).toEqual(['name', 'value']);
    const fromOffset = source.indexOf("'ready'") + 2;
    expect(workspace.signature('file:///EnumMemberUses.php', fromOffset)).toMatchObject({ name: 'from', returnType: 'static', parameters: [{ name: 'value', type: 'string' }] });
    expect(workspace.missingRequiredArguments('file:///EnumMemberUses.php')).toMatchObject([{ callable: 'EnumMembers\\BackedState::from', parameters: ['value'] }]);
    expect(workspace.nullableMemberAccesses('file:///EnumMemberUses.php').map((item) => [item.name, source.slice(item.operatorStart, item.operatorEnd)])).toEqual([['name', '->']]);
    expect(workspace.unresolvedMembers('file:///EnumMemberUses.php')).toEqual([]);
  });

  it('checks backed enum factory literals with the caller strict-types mode', () => {
    workspace.update('file:///EnumFactory.php', `<?php namespace EnumFactory; enum State: string { case Ready = 'ready'; }`);
    const strict = `<?php declare(strict_types=1); namespace EnumFactory; function strictUse(): void { State::from(1); State::tryFrom(2); }`;
    workspace.update('file:///EnumFactoryStrict.php', strict);
    expect(workspace.incompatibleArguments('file:///EnumFactoryStrict.php').map((item) => [item.callable, item.actualType, item.expectedType])).toEqual([
      ['EnumFactory\\State::from', 'int', 'string'], ['EnumFactory\\State::tryFrom', 'int', 'string'],
    ]);
    const weak = `<?php namespace EnumFactory; function weakUse(): void { State::from(1); State::tryFrom(2); }`;
    workspace.update('file:///EnumFactoryWeak.php', weak);
    expect(workspace.incompatibleArguments('file:///EnumFactoryWeak.php')).toEqual([]);
  });

  it('completes properties and constants with exact access and visibility rules', () => {
    workspace.update('file:///Model.php', `<?php namespace App; class Model {
      public readonly string $name;
      protected static int $count;
      public const string KIND = 'model';
      private string $secret;
      public function __construct(public int $id) {}
    }`);
    const source = '<?php namespace App; function show(Model $model): void { $model->name; $model->; Model::; }';
    workspace.update('file:///UseModel.php', source);
    expect(workspace.completeMembers('file:///UseModel.php', source.indexOf('->') + 2).map((item) => [item.kind, item.name])).toEqual([
      ['property', 'name'], ['property', 'id'],
    ]);
    expect(workspace.completeMembers('file:///UseModel.php', source.indexOf('::') + 2).map((item) => [item.kind, item.name])).toEqual([
      ['constant', 'KIND'],
    ]);
    expect(workspace.definition('file:///UseModel.php', source.indexOf('name;') + 1)).toMatchObject([{ uri: 'file:///Model.php' }]);
  });

  it('uses adjacent PHPDoc for missing types and binds named property tags precisely', () => {
    workspace.update('file:///Profile.php', '<?php namespace App; class Profile { public string $label; }');
    workspace.update('file:///User.php', `<?php namespace App; class User {
      /** @return Profile */ public function profile() {}
      /** @var Profile */ public $fallback;
    }
    class ProfileSlots {
      /** @var Profile $first */ public mixed $first, $second;
      /** @var Profile */ public mixed $third, $fourth;
    }`);
    const source = `<?php namespace App;
      /** @param User $user */ function show($user): void { $user->profile()->la }
    `;
    workspace.update('file:///PhpDocUse.php', source);
    expect(workspace.completeMembers('file:///PhpDocUse.php', source.indexOf('la }') + 2).map((item) => item.name)).toEqual(['label']);
    const propertySource = '<?php namespace App; function property(User $user): void { $user->fall }';
    workspace.update('file:///PhpDocProperty.php', propertySource);
    expect(workspace.completeMembers('file:///PhpDocProperty.php', propertySource.indexOf('fall }') + 4)).toMatchObject([{ kind: 'property', name: 'fallback', returnType: 'Profile' }]);
    const slots = '<?php namespace App; function slots(ProfileSlots $slots): void { $slots->first->la; $slots->second->la; $slots->third->la; $slots->fourth->la; }';
    workspace.update('file:///PhpDocPropertySlots.php', slots);
    const labels = [...slots.matchAll(/->la/g)].map((match) => workspace.completeMembers('file:///PhpDocPropertySlots.php', match.index + 4).map((item) => item.name));
    expect(labels).toEqual([['label'], [], ['label'], ['label']]);
  });
  it('reuses safe constructor PHPDoc refinements for promoted properties', () => {
    const source = `<?php namespace PromotedDoc;
      class Service { public function serviceOnly(): void {} }
      class Consumer {
        /**
         * @param Service $service
         * @param Service $invalid
         */
        public function __construct(public mixed $service, public int $invalid) {}
      }
      function inspect(Consumer $consumer): void {
        $consumer->service->serviceOnly();
        $consumer->invalid->serviceOnly();
      }`;
    const uri = 'file:///PromotedPhpDoc.php'; workspace.update(uri, source);
    const valid = source.indexOf('$consumer->service->serviceOnly') + '$consumer->service->'.length;
    expect(workspace.completeMembers(uri, valid + 7).map((item) => item.name)).toContain('serviceOnly');
    expect(workspace.definition(uri, valid + 2)).toMatchObject([{ uri }]);
    const invalid = source.indexOf('$consumer->invalid->serviceOnly') + '$consumer->invalid->'.length;
    expect(workspace.completeMembers(uri, invalid + 7)).toEqual([]);
    expect(workspace.definition(uri, invalid + 2)).toEqual([]);
  });
  it('reports only proven PHPDoc types outside native runtime boundaries', () => {
    const uri = 'file:///PhpDocConflicts.php';
    const source = `<?php namespace DocConflicts;
      class ParentType {} class ChildType extends ParentType {} class OtherType {}
      class Example {
        /** @var ParentType */ public ChildType $property;
        /** @var ChildType */ public ParentType $narrowProperty;
        /** @var OtherType $namedProperty */ public ChildType $namedProperty, $untaggedProperty;
        /**
         * @param ParentType $wide
         * @param ChildType $narrow
         * @param list<string> $items
         * @param class-string<ChildType> $class
         * @param float $number
         * @return OtherType
         */
        public function conflict(ChildType $wide, ParentType $narrow, iterable $items, string $class, int $number): ChildType {}
        /** @return ChildType */ public function legalReturn(): ParentType {}
        /** @param ChildType[] $items */ public function arrays(array $items): void {}
        /** @param MissingType $value */ public function unresolved(ParentType $value): void {}
        /** @param array< $value */ public function malformed(ChildType $value): void {}
      }
    `;
    workspace.update(uri, source);
    const conflicts = workspace.phpDocTypeConflicts(uri);
    expect(conflicts.map((item) => [item.kind, item.subject, item.nativeType, item.phpDocType])).toEqual([
      ['parameter', '$wide', 'DocConflicts\\ChildType', 'ParentType'],
      ['parameter', '$number', 'int', 'float'],
      ['return', 'DocConflicts\\Example::conflict', 'DocConflicts\\ChildType', 'OtherType'],
      ['property', 'DocConflicts\\Example::$property', 'DocConflicts\\ChildType', 'ParentType'],
      ['property', 'DocConflicts\\Example::$namedProperty', 'DocConflicts\\ChildType', 'OtherType'],
    ]);
    for (const conflict of conflicts) expect(source.slice(conflict.start, conflict.end)).toBe(conflict.phpDocType);
  });
  it('preserves structured PHPDoc returns within nullable native array boundaries', () => {
    const uri = 'file:///NullableArrayReturn.php';
    const source = `<?php namespace NullableArrayReturn;
      /** @return array{type:int, message:string}|null */
      function lastError(): ?array {}
      $last = lastError();
    `;
    workspace.update(uri, source);
    expect(workspace.signature(uri, source.lastIndexOf('lastError()') + 'lastError('.length)?.returnType)
      .toBe('array{type: int, message: string}|null');
  });
  it('preserves same-scalar PHPDoc literal unions within native return boundaries', () => {
    const uri = 'file:///LiteralUnionReturn.php';
    const source = `<?php namespace LiteralUnionReturn;
      /** @return 0|1|2 */ function status(): int {}
      /** @return true|false */ function switchState(): bool {}
      /** @return 0|'invalid' */ function invalidStatus(): int {}
      status(); switchState(); invalidStatus();
    `;
    workspace.update(uri, source);
    const returnType = (call: string): string | undefined => workspace.signature(uri,
      source.lastIndexOf(call) + call.length - 1)?.returnType;
    expect(returnType('status()')).toBe('0|1|2');
    expect(returnType('switchState()')).toBe('true|false');
    expect(returnType('invalidStatus()')).toBe('int');
  });
  it('invalidates PHPDoc conflict relations after hierarchy edits and suppresses over-budget types', () => {
    const hierarchyUri = 'file:///PhpDocHierarchy.php'; const useUri = 'file:///PhpDocHierarchyUse.php';
    workspace.update(hierarchyUri, '<?php namespace DocBudget; class ParentType {} class ChildType extends ParentType {}');
    workspace.update(useUri, '<?php namespace DocBudget; /** @param ChildType $value */ function refine(ParentType $value): void {}');
    expect(workspace.phpDocTypeConflicts(useUri)).toEqual([]);
    workspace.update(hierarchyUri, '<?php namespace DocBudget; class ParentType {} class ChildType {}');
    expect(workspace.phpDocTypeConflicts(useUri)).toMatchObject([{ kind: 'parameter', subject: '$value' }]);
    workspace.update(hierarchyUri, '<?php namespace DocBudget; class ParentType {} class ChildType extends ParentType {}');
    expect(workspace.phpDocTypeConflicts(useUri)).toEqual([]);

    const nested = `${'list<'.repeat(300)}string${'>'.repeat(300)}`;
    const deepUri = 'file:///PhpDocDeepType.php';
    workspace.update(deepUri, `<?php namespace DocBudget; /** @param ${nested} $value */ function deep(array $value): void {}`);
    expect(workspace.phpDocTypeConflicts(deepUri)).toEqual([]);
  });
  it('checks PHPDoc template bounds transitively with callable shadowing and cycle suppression', () => {
    const uri = 'file:///PhpDocTemplateConflicts.php';
    const source = `<?php namespace DocTemplates;
      class ParentType {} class ChildType extends ParentType {}
      /** @template T of ParentType */
      class Box {
        /** @var T */ public ChildType $conflictingProperty;
        /**
         * @template T of ChildType
         * @param T $value
         */ public function shadowed(ParentType $value): void {}
      }
      /**
       * @template U of ParentType
       * @template T of U
       * @param T $value
       */
      function transitive(ChildType $value): void {}
      /**
       * @template T
       * @param T $value
       */ function unbounded(object $value): void {}
      /**
       * @template T of U
       * @template U of T
       * @param T $value
       */ function cyclic(ChildType $value): void {}
    `;
    workspace.update(uri, source);
    expect(workspace.phpDocTypeConflicts(uri).map((item) => [item.kind, item.subject, item.phpDocType])).toEqual([
      ['parameter', '$value', 'T'],
      ['parameter', '$value', 'T'],
      ['property', 'DocTemplates\\Box::$conflictingProperty', 'T'],
    ]);
  });
  it('bounds semantic graph traversal and preserves results inside the supported depth', () => {
    const bounded = new SemanticWorkspace(parser);
    const classes = Array.from({ length: 71 }, (_, index) => index === 0
      ? 'class C0 { public function leaf(): void {} }'
      : `class C${index} extends C${index - 1} {}`).join('\n');
    bounded.update('file:///DeepGraph.php', `<?php namespace DeepGraph; ${classes}`);
    expect(bounded.isSubtype('DeepGraph\\C63', 'DeepGraph\\C0')).toBe(true);
    expect(bounded.isSubtype('DeepGraph\\C65', 'DeepGraph\\C0')).toBe(false);

    const assignments = Array.from({ length: 70 }, (_, index) => `$value${index + 1} = $value${index};`).join(' ');
    const source = `<?php namespace DeepGraph; function aliases(C0 $value0): void { ${assignments} $value60->le; $value70->le; }`;
    bounded.update('file:///DeepAliases.php', source);
    expect(bounded.completeMembers('file:///DeepAliases.php', source.indexOf('$value60->le') + '$value60->le'.length).map((item) => item.name)).toEqual(['leaf']);
    expect(bounded.completeMembers('file:///DeepAliases.php', source.indexOf('$value70->le') + '$value70->le'.length)).toEqual([]);
  });
  it('proves named iterable and invokable classes against native primitive boundaries', () => {
    const uri = 'file:///NamedPrimitiveRelations.php';
    const source = `<?php namespace NamedPrimitive;
      class Collection implements \\IteratorAggregate { public function getIterator(): \\Traversable {} }
      class Handler { public function __invoke(): void {} }
      class Plain {}
      /** @param Collection $value */ function documentedIterable(iterable $value): void {}
      /** @param Handler $value */ function documentedCallable(callable $value): void {}
      /** @param Plain $value */ function invalidIterable(iterable $value): void {}
      /** @param Plain $value */ function invalidCallable(callable $value): void {}
      function acceptIterable(iterable $value): void {}
      function acceptCallable(callable $value): void {}
      function run(Collection $collection, Handler $handler, Plain $plain): void {
        acceptIterable($collection); acceptIterable($plain); acceptCallable($handler); acceptCallable($plain);
      }
    `;
    workspace.update(uri, source);
    expect(workspace.phpDocTypeConflicts(uri).map((item) => item.subject)).toEqual(['$value', '$value']);
    expect(workspace.incompatibleArguments(uri).map((item) => [item.callable, item.actualType, item.expectedType])).toEqual([
      ['NamedPrimitive\\acceptIterable', 'NamedPrimitive\\Plain', 'iterable'],
      ['NamedPrimitive\\acceptCallable', 'NamedPrimitive\\Plain', 'callable'],
    ]);
  });
  it('projects supported PHPDoc pseudo-types only for native runtime-boundary checks', () => {
    const uri = 'file:///PhpDocPseudoTypeConflicts.php';
    const source = `<?php namespace DocPseudo;
      /** @param positive-int $value */ function positive(int $value): void {}
      /** @param non-empty-string $value */ function text(string $value): void {}
      /** @param non-empty-array<string, int> $value */ function entries(iterable $value): void {}
      /** @param numeric $value */ function numericFloat(float $value): void {}
      /** @param array-key $value */ function keyUnion(int|string $value): void {}
      /** @param numeric $value */ function invalidNumeric(int $value): void {}
      /** @param array-key $value */ function invalidKey(string $value): void {}
    `;
    workspace.update(uri, source);
    expect(workspace.phpDocTypeConflicts(uri).map((item) => [item.subject, item.nativeType, item.phpDocType])).toEqual([
      ['$value', 'int', 'numeric'],
      ['$value', 'string', 'array-key'],
    ]);
  });
  it('checks PHPDoc generic array key, value, and non-empty constraints structurally', () => {
    const uri = 'file:///GenericArrayConstraints.php';
    const source = `<?php declare(strict_types=1); namespace GenericArrays;
      /** @param array<string, int> $value */ function stringKeys(array $value): void {}
      /** @param non-empty-array<string, int> $value */ function requiredEntries(array $value): void {}
      function run(): void {
        stringKeys(['id' => 1]); stringKeys([1]); stringKeys(['id' => 'wrong']);
        requiredEntries(['id' => 1]); requiredEntries(['id' => 'wrong']);
      }
    `;
    workspace.update(uri, source);
    expect(workspace.incompatibleArguments(uri).map((item) => [item.callable, item.actualType, item.expectedType])).toEqual([
      ['GenericArrays\\stringKeys', 'non-empty-list<int>', 'array<string, int>'],
      ['GenericArrays\\stringKeys', 'array{id: string}', 'array<string, int>'],
      ['GenericArrays\\requiredEntries', 'array{id: string}', 'non-empty-array<string, int>'],
    ]);
  });
  it('checks PHPDoc integer ranges only for exact safe integer values', () => {
    const uri = 'file:///IntegerRangeConstraints.php';
    const source = `<?php declare(strict_types=1); namespace IntegerRanges;
      /** @param int<0, 10> $value */ function digit(int $value): void {}
      /** @param int<min, -1> $value */ function negative(int $value): void {}
      /** @param int<10, 0> $value */ function invalidRange(int $value): void {}
      /** @param int<0, 10> $value */ function invalidNative(string $value): void {}
      function run(int $dynamic): void { digit(0); digit(10); digit(-1); digit(11); digit($dynamic); negative(-1); negative(0); }
    `;
    workspace.update(uri, source);
    expect(workspace.phpDocTypeConflicts(uri).map((item) => [item.subject, item.nativeType, item.phpDocType])).toEqual([
      ['$value', 'string', 'int<0, 10>'],
    ]);
    expect(workspace.incompatibleArguments(uri).map((item) => [item.callable, item.actualType, item.expectedType])).toEqual([
      ['IntegerRanges\\digit', '-1', 'int<0, 10>'],
      ['IntegerRanges\\digit', '11', 'int<0, 10>'],
      ['IntegerRanges\\negative', '0', 'int<min, -1>'],
    ]);
  });
  it('resolves key-of and value-of only for closed PHPDoc array shapes', () => {
    const uri = 'file:///ShapeProjectionConstraints.php';
    const source = `<?php declare(strict_types=1); namespace ShapeProjection;
      /** @param key-of<array{draft: int, published?: string, 10: bool}> $key */
      function acceptKey(string|int $key): void {}
      /** @param value-of<array{draft: int, published?: string}> $value */
      function acceptValue(mixed $value): void {}
      class ProjectionMap { public const VALUES = ['draft' => 1, 10 => 'ten']; public const DYNAMIC = UNKNOWN_VALUE; }
      class ScalarConstants { public const DRAFT = 'draft'; public const READY = 1; }
      class ArrayConstants { public const FIRST = ['draft' => 1]; public const SECOND = [10 => 'ten']; }
      class DynamicConstants { public const READY = 'ready'; public const UNKNOWN = UNKNOWN_VALUE; }
      enum Delivery: string { case Draft = 'draft'; case Ready = 'ready'; }
      enum UnitDelivery { case Draft; }
      /** @param key-of<ProjectionMap::VALUES> $key */ function acceptConstantKey(string|int $key): void {}
      /** @param value-of<ProjectionMap::VALUES> $value */ function acceptConstantValue(mixed $value): void {}
      /** @param key-of<ProjectionMap::DYNAMIC> $key */ function acceptDynamicConstant(string|int $key): void {}
      /** @param value-of<ScalarConstants::*> $value */ function acceptWildcardValue(mixed $value): void {}
      /** @param key-of<ArrayConstants::*> $key */ function acceptWildcardKey(string|int $key): void {}
      /** @param value-of<DynamicConstants::*> $value */ function acceptDynamicWildcard(mixed $value): void {}
      /** @param value-of<Delivery> $value */ function acceptDelivery(string $value): void {}
      /** @param value-of<UnitDelivery> $value */ function acceptUnitDelivery(mixed $value): void {}
      /** @param key-of<array<string, int>> $key */ function acceptOpenKey(string $key): void {}
      /** @param value-of<array<string, int>> $value */ function acceptOpenValue(int $value): void {}
      /** @param key-of<list<string>> $key */ function acceptListKey(int $key): void {}
      /** @param value-of<list<string>> $value */ function acceptListValue(string $value): void {}
      function run(string $dynamic): void {
        acceptKey('draft'); acceptKey('published'); acceptKey(10); acceptKey('missing'); acceptKey(11); acceptKey($dynamic);
        acceptValue(1); acceptValue('ready'); acceptValue(true);
        acceptConstantKey('draft'); acceptConstantKey(10); acceptConstantKey('missing'); acceptConstantKey(11); acceptConstantKey($dynamic);
        acceptConstantValue(1); acceptConstantValue('ten'); acceptConstantValue(true);
        acceptDynamicConstant('anything');
        acceptWildcardValue('draft'); acceptWildcardValue(1); acceptWildcardValue(true); acceptWildcardValue($dynamic);
        acceptWildcardKey('draft'); acceptWildcardKey(10); acceptWildcardKey('missing'); acceptWildcardKey(11); acceptWildcardKey($dynamic);
        acceptDynamicWildcard(false);
        acceptDelivery('draft'); acceptDelivery('ready'); acceptDelivery('missing'); acceptDelivery($dynamic);
        acceptUnitDelivery('anything');
        acceptOpenKey('draft'); acceptOpenKey($dynamic); acceptOpenKey(1);
        acceptOpenValue(1); acceptOpenValue('wrong');
        acceptListKey(0); acceptListKey('0');
        acceptListValue('ready'); acceptListValue(false);
      }
    `;
    workspace.update(uri, source);
    expect(workspace.incompatibleArguments(uri).map((item) => [item.callable, item.actualType, item.expectedType])).toEqual([
      ['ShapeProjection\\acceptKey', "'missing'", "10|'draft'|'published'"],
      ['ShapeProjection\\acceptKey', '11', "10|'draft'|'published'"],
      ['ShapeProjection\\acceptValue', 'bool', 'int|string'],
      ['ShapeProjection\\acceptConstantKey', "'missing'", "10|'draft'"],
      ['ShapeProjection\\acceptConstantKey', '11', "10|'draft'"],
      ['ShapeProjection\\acceptConstantValue', 'bool', 'int|string'],
      ['ShapeProjection\\acceptWildcardValue', 'bool', "1|'draft'"],
      ['ShapeProjection\\acceptWildcardKey', "'missing'", "10|'draft'"],
      ['ShapeProjection\\acceptWildcardKey', '11', "10|'draft'"],
      ['ShapeProjection\\acceptDelivery', "'missing'", "'draft'|'ready'"],
      ['ShapeProjection\\acceptOpenKey', 'int', 'string'],
      ['ShapeProjection\\acceptOpenValue', 'string', 'int'],
      ['ShapeProjection\\acceptListKey', 'string', 'int'],
      ['ShapeProjection\\acceptListValue', 'bool', 'string'],
    ]);
    const nested = `${'['.repeat(300)}1${']'.repeat(300)}`;
    const deepUri = 'file:///DeepConstantProjection.php';
    workspace.update(deepUri, `<?php namespace DeepProjection; class Map { public const VALUES = ['key' => ${nested}]; }
      /** @param value-of<Map::VALUES> $value */ function acceptValue(mixed $value): void {} function run(): void { acceptValue(false); }`);
    expect(workspace.incompatibleArguments(deepUri)).toEqual([]);
  });
  it('resolves proven PHPDoc array-shape object fields and optional nullsafe access', () => {
    workspace.update('file:///ShapeUser.php', '<?php namespace Shapes; class User { public function name(): string {} }');
    const source = `<?php namespace Shapes;
      /** @param array{user: User, optional?: User} $data */
      function show($data): void { $data['user']->na; $data['optional']->na; $data['optional']?->na; $data['missing']->na; }
    `;
    workspace.update('file:///ShapeUse.php', source); const positions = [...source.matchAll(/na;/g)].map((item) => item.index + 2);
    expect(workspace.completeMembers('file:///ShapeUse.php', positions[0]!).map((item) => item.name)).toEqual(['name']);
    expect(workspace.completeMembers('file:///ShapeUse.php', positions[1]!)).toEqual([]);
    expect(workspace.completeMembers('file:///ShapeUse.php', positions[2]!).map((item) => item.name)).toEqual(['name']);
    expect(workspace.completeMembers('file:///ShapeUse.php', positions[3]!)).toEqual([]);
  });
  it('propagates a known PHPDoc array-shape element through local assignment', () => {
    const source = `<?php namespace Shapes;
      /** @param array{user: User} $data */ function assigned($data): void { $user = $data['user']; $user->na; }
    `;
    workspace.update('file:///ShapeAssignment.php', source);
    expect(workspace.completeMembers('file:///ShapeAssignment.php', source.indexOf('na;') + 2).map((item) => item.name)).toEqual(['name']);
  });
  it('propagates a generic array element through local assignment and a non-null guard', () => {
    const source = `<?php namespace GenericArrayElement;
      class User { public function name(): string {} }
      /** @return array<string, User|null> */ function users(): array { return []; }
      function assigned(): void { $users = users(); $user = $users['primary']; if ($user !== null) { $user->na; } }
    `;
    workspace.update('file:///GenericArrayElement.php', source);
    expect(workspace.completeMembers('file:///GenericArrayElement.php', source.indexOf('na;') + 2).map((item) => item.name)).toEqual(['name']);
  });
  it('propagates a PHPDoc callable return through a local invocation assignment', () => {
    workspace.update('file:///CallableUser.php', '<?php namespace CallableTypes; class User { public function name(): string {} }');
    const source = `<?php namespace CallableTypes;
      /** @param callable(): User $factory */ function show($factory): void { $user = $factory(); $user->na; }
    `;
    workspace.update('file:///CallableUse.php', source);
    expect(workspace.completeMembers('file:///CallableUse.php', source.indexOf('na;') + 2).map((item) => item.name)).toEqual(['name']);
  });
  it('uses replaceable external framework method facts without inventing unknown methods', () => {
    workspace.update('file:///DoctrineTypes.php', '<?php namespace DoctrineFacts; class User { public function name(): string {} } class UserRepository {}');
    expect(workspace.replaceExternalFacts(semanticFacts('doctrine', '1', { methods: [
      { ownerFqcn: 'DoctrineFacts\\UserRepository', name: 'find', returnType: 'DoctrineFacts\\User|null', uri: 'file:///DoctrineTypes.php', start: 90, end: 104 },
      { ownerFqcn: 'DoctrineFacts\\UserRepository', name: 'findAll', returnType: 'array<int, DoctrineFacts\\User>', uri: 'file:///DoctrineTypes.php', start: 90, end: 104 },
    ] }))).toBe(true);
    const source = '<?php namespace DoctrineFacts; function show(UserRepository $repo): void { $user = $repo->find(1); $repo->fi; $user?->na; foreach ($repo->findAll() as $found) { $found->na; } $repo->custom; }';
    workspace.update('file:///DoctrineUse.php', source);
    expect(workspace.completeMembers('file:///DoctrineUse.php', source.indexOf('fi;') + 2).map((item) => item.name)).toEqual(['find', 'findAll']);
    for (const position of [...source.matchAll(/na;/g)].map((item) => item.index + 2)) {
      expect(workspace.completeMembers('file:///DoctrineUse.php', position).map((item) => item.name)).toEqual(['name']);
    }
    expect(workspace.completeMembers('file:///DoctrineUse.php', source.indexOf('custom;') + 6)).toEqual([]);
    expect(workspace.replaceExternalFacts(semanticFacts('doctrine', '2'))).toBe(true);
    expect(workspace.completeMembers('file:///DoctrineUse.php', source.indexOf('fi;') + 2)).toEqual([]);
  });
  it('atomically replaces, validates and removes one semantic provider contribution', () => {
    workspace.update('file:///ProviderTypes.php', '<?php namespace ProviderFacts; class Item { public function label(): string {} } class Model {}');
    const source = '<?php namespace ProviderFacts; function useModel(Model $model): void { $model->old; $model->current; }';
    workspace.update('file:///ProviderUse.php', source);
    const location = { uri: 'file:///provider.json', start: 0, end: 1 };
    const first = semanticFacts('vendor.provider', '1', { methods: [{ ownerFqcn: 'ProviderFacts\\Model', name: 'old', returnType: 'ProviderFacts\\Item', ...location }] });
    expect(workspace.replaceExternalFacts(first)).toBe(true);
    (first.methods as Array<{ name: string }>)[0]!.name = 'mutated';
    expect(workspace.completeMembers('file:///ProviderUse.php', source.indexOf('old;') + 3).map((item) => item.name)).toEqual(['old']);
    expect(workspace.replaceExternalFacts(semanticFacts('vendor.provider', '2', { properties: [{ ownerFqcn: 'ProviderFacts\\Model', name: 'current', returnType: 'ProviderFacts\\Item', visibility: 'public', ...location }] }))).toBe(true);
    expect(workspace.completeMembers('file:///ProviderUse.php', source.indexOf('old;') + 3)).toEqual([]);
    expect(workspace.completeMembers('file:///ProviderUse.php', source.indexOf('current;') + 7).map((item) => item.name)).toEqual(['current']);
    const malformed = { ...semanticFacts('vendor.provider', '3'), methods: [{ ownerFqcn: 'ProviderFacts\\Model', name: 'broken', uri: '', start: 2, end: 1 }] };
    expect(workspace.replaceExternalFacts(malformed)).toBe(false);
    expect(workspace.completeMembers('file:///ProviderUse.php', source.indexOf('current;') + 7).map((item) => item.name)).toEqual(['current']);
    expect(workspace.removeExternalFacts('vendor.provider')).toBe(true);
    expect(workspace.removeExternalFacts('vendor.provider')).toBe(false);
    expect(workspace.completeMembers('file:///ProviderUse.php', source.indexOf('current;') + 7)).toEqual([]);
  });
  it('resolves only literal or untouched local-string dynamic member names', () => {
    const definitions = `<?php namespace DynamicNames; class Service {
      public string $title; public function load(int $id): Item {} public static function build(): Item {}
    } class Item { public function label(): string {} }`;
    workspace.update('file:///DynamicNameTypes.php', definitions);
    const source = `<?php namespace DynamicNames; function run(Service $service, string $input): void {
      $method = 'load'; $property = "title";
      $service->{'load'}(1); $service->{$method}(1); $service->{$property}; Service::{'build'}();
      $changed = 'load'; $changed = $input; $service->{$changed}(1);
      $used = 'load'; echo $used; $service->{$used}(1);
      $service->{makeName()}();
    }`;
    workspace.update('file:///DynamicNameUse.php', source);
    const definition = (needle: string, occurrence = 0): ReturnType<SemanticWorkspace['definition']> => {
      let start = -1; for (let index = 0; index <= occurrence; index += 1) start = source.indexOf(needle, start + 1);
      return workspace.definition('file:///DynamicNameUse.php', start + Math.max(1, needle.length - 1));
    };
    expect(definition("'load'", 1)).toMatchObject([{ uri: 'file:///DynamicNameTypes.php', start: definitions.indexOf('load') }]);
    expect(definition('$method', 1)).toMatchObject([{ uri: 'file:///DynamicNameTypes.php', start: definitions.indexOf('load') }]);
    expect(definition('$property', 1)).toMatchObject([{ uri: 'file:///DynamicNameTypes.php', start: definitions.indexOf('$title') }]);
    expect(definition("'build'", 0)).toMatchObject([{ uri: 'file:///DynamicNameTypes.php', start: definitions.indexOf('build') }]);
    const dynamicCallOffset = source.indexOf('$method}(1)') + '$method}('.length;
    expect(workspace.signatures('file:///DynamicNameUse.php', dynamicCallOffset).map((item) => item.name)).toEqual(['load']);
    expect(workspace.signatures('file:///DynamicNameUse.php', dynamicCallOffset)[0]?.parameters).toMatchObject([{ name: 'id', type: 'int' }]);
    expect(definition('$changed', 2)).toEqual([]);
    expect(definition('$used', 2)).toEqual([]);
    workspace.remove('file:///DynamicNameUse.php'); workspace.remove('file:///DynamicNameTypes.php');
  });
  it('resolves and renames parenthesized literal-concatenated dynamic members only when fully constant', () => {
    const definitions = `<?php namespace DynamicExpressions; class Service { public string $title; public function load(): Item {} } class Item { public string $name; }`;
    workspace.update('file:///DynamicExpressionTypes.php', definitions);
    const source = `<?php namespace DynamicExpressions; function run(Service $service, string $part): void {
      $loaded = $service->{(('lo').('ad'))}(); $loaded->na;
      $service->{('ti' . "tle")};
      $service->{('lo' . $part)}();
      $service->{('lo' /* keep */ . 'ad')}();
    }`;
    workspace.update('file:///DynamicExpressionUse.php', source);
    expect(workspace.completeMembers('file:///DynamicExpressionUse.php', source.indexOf('$loaded->na') + '$loaded->na'.length).map((item) => item.name)).toEqual(['name']);
    expect(workspace.definition('file:///DynamicExpressionUse.php', source.indexOf("lo').('ad") + 2)).toMatchObject([{ uri: 'file:///DynamicExpressionTypes.php', start: definitions.indexOf('load') }]);
    expect(workspace.propertyRename('file:///DynamicExpressionTypes.php', definitions.indexOf('$title') + 1, 'heading')?.locations)
      .toContainEqual(expect.objectContaining({ uri: 'file:///DynamicExpressionUse.php', start: source.indexOf(`ti' . "tle`), end: source.indexOf(`ti' . "tle`) + `ti' . "tle`.length }));
    expect(workspace.definition('file:///DynamicExpressionUse.php', source.indexOf('$part') + 2)).toEqual([]);
    expect(workspace.methodRename('file:///DynamicExpressionTypes.php', definitions.indexOf('load'), 'fetch')).toBeUndefined();
    workspace.update('file:///DynamicExpressionUse.php', source.replace("$service->{('lo' . $part)}();", '').replace("$service->{('lo' /* keep */ . 'ad')}();", ''));
    expect(workspace.methodRename('file:///DynamicExpressionTypes.php', definitions.indexOf('load'), 'fetch')?.locations)
      .toContainEqual(expect.objectContaining({ uri: 'file:///DynamicExpressionUse.php', start: source.indexOf("lo').('ad"), end: source.indexOf("lo').('ad") + "lo').('ad".length }));
    workspace.remove('file:///DynamicExpressionUse.php'); workspace.remove('file:///DynamicExpressionTypes.php');
  });
  it('resolves literal class/global constants and backed enum values with cycle-safe rename sources', () => {
    const definitions = `<?php namespace DynamicConstants;
      const METHOD_NAME = 'load';
      class Names { public const LOAD = 'load'; public const ALIAS = self::LOAD; public const LOOP_A = self::LOOP_B; public const LOOP_B = self::LOOP_A; }
      enum Method: string { case Fetch = 'load'; case Load = 'other'; }
      class Service { public function load(): Item {} } class Item { public string $name; }`;
    workspace.update('file:///DynamicConstantTypes.php', definitions);
    const source = `<?php namespace DynamicConstants; function run(Service $service): void {
      $a = $service->{METHOD_NAME}(); $a->na;
      $b = $service->{Names::LOAD}(); $b->na;
      $c = $service->{Names::ALIAS}(); $c->na;
      $d = $service->{Method::Fetch->value}(); $d->na;
      $service->{Method::Load->name}();
      $service->{Names::LOOP_A}();
    }`;
    workspace.update('file:///DynamicConstantUse.php', source);
    for (const marker of ['$a->na', '$b->na', '$c->na', '$d->na']) {
      expect(workspace.completeMembers('file:///DynamicConstantUse.php', source.indexOf(marker) + marker.length).map((item) => item.name)).toEqual(['name']);
    }
    expect(workspace.definition('file:///DynamicConstantUse.php', source.indexOf('Names::LOAD') + 8)).toMatchObject([{ uri: 'file:///DynamicConstantTypes.php', start: definitions.indexOf('load():') }]);
    expect(workspace.methodRename('file:///DynamicConstantTypes.php', definitions.indexOf('load():'), 'fetch')).toBeUndefined();
    const safe = source.replace('$service->{Method::Load->name}();', '').replace('$service->{Names::LOOP_A}();', '');
    workspace.update('file:///DynamicConstantUse.php', safe);
    const rename = workspace.methodRename('file:///DynamicConstantTypes.php', definitions.indexOf('load():'), 'fetch');
    expect(rename?.locations.map((location) => workspace.source(location.uri)?.slice(location.start, location.end))).toEqual(['load', 'load', 'load', 'load']);
    workspace.remove('file:///DynamicConstantUse.php'); workspace.remove('file:///DynamicConstantTypes.php');
  });
  it('propagates only compatible and unambiguous dynamic call results', () => {
    const definitions = `<?php namespace DynamicResults;
      class User { public string $name; } class Other { public string $other; }
      class Service { public function load(int $id): User {} }
      /**
       * @method T fetch<T of User>(class-string<T> $type)
       * @method User choose(int $id)
       * @method Other choose(string $id)
       * @method static User make()
       */
      class Model {}`;
    workspace.update('file:///DynamicResultTypes.php', definitions);
    const source = `<?php declare(strict_types=1); namespace DynamicResults;
      function run(Service $service, ?Service $maybe, Model $model, string $input): void {
        $method = 'load'; $assigned = $service->{$method}(1); $assigned->na;
        $direct = 'load'; $service->{$direct}(1)->na;
        $literal = $service->{'load'}(1); $literal->na;
        $wrong = $service->{$method}('bad'); $wrong->na;
        $fetch = 'fetch'; $generic = $model->{$fetch}(User::class); $generic->na;
        $invalidFetch = 'fetch'; $invalidGeneric = $model->{$invalidFetch}(Other::class); $invalidGeneric->na;
        $choose = 'choose'; $chosen = $model->{$choose}('slug'); $chosen->oth;
        $nullableName = 'load'; $nullable = $maybe?->{$nullableName}(1); $nullable?->na; $nullable->na;
        $directNullableName = 'load'; $maybe?->{$directNullableName}(1)?->na;
        $unknown = 'load'; echo $unknown; $unsafe = $service->{$unknown}(1); $unsafe->na;
        Model::{'make'}()->na;
      }`;
    workspace.update('file:///DynamicResultUse.php', source);
    const completion = (marker: string): string[] => workspace.completeMembers('file:///DynamicResultUse.php', source.indexOf(marker) + marker.length).map((item) => item.name);
    expect(completion('$assigned->na')).toEqual(['name']);
    expect(completion('$service->{$direct}(1)->na')).toEqual(['name']);
    expect(completion('$literal->na')).toEqual(['name']);
    expect(completion('$wrong->na')).toEqual([]);
    expect(completion('$generic->na')).toEqual(['name']);
    expect(completion('$invalidGeneric->na')).toEqual([]);
    expect(completion('$chosen->oth')).toEqual(['other']);
    expect(completion('$nullable?->na')).toEqual(['name']);
    expect(completion('$nullable->na')).toEqual([]);
    expect(completion('$maybe?->{$directNullableName}(1)?->na')).toEqual(['name']);
    expect(completion('$unsafe->na')).toEqual([]);
    expect(completion("Model::{'make'}()->na")).toEqual(['name']);
    workspace.remove('file:///DynamicResultUse.php'); workspace.remove('file:///DynamicResultTypes.php');
  });
  it('suppresses conflicting external provider facts independent of registration order', () => {
    workspace.update('file:///ProviderConflictTypes.php', '<?php namespace ProviderConflict; class First { public function one(): void {} } class Second { public function two(): void {} } class Model {} interface Container { public function get(string $id): mixed; }');
    const source = '<?php namespace ProviderConflict; function useConflict(Model $model, Container $container): void { $model->resolve()->one; $container->get("service")->one; }';
    workspace.update('file:///ProviderConflictUse.php', source);
    const location = { uri: 'file:///provider.json', start: 0, end: 1 };
    expect(workspace.replaceExternalFacts(semanticFacts('provider.first', '1', {
      methods: [{ ownerFqcn: 'ProviderConflict\\Model', name: 'resolve', returnType: 'ProviderConflict\\First', ...location }],
      literalMethodReturns: [{ ownerFqcn: 'ProviderConflict\\Container', name: 'get', argument: 'service', returnType: 'ProviderConflict\\First', ...location }],
    }))).toBe(true);
    expect(workspace.replaceExternalFacts(semanticFacts('provider.second', '1', {
      methods: [{ ownerFqcn: 'ProviderConflict\\Model', name: 'resolve', returnType: 'ProviderConflict\\Second', ...location }],
      literalMethodReturns: [{ ownerFqcn: 'ProviderConflict\\Container', name: 'get', argument: 'service', returnType: 'ProviderConflict\\Second', ...location }],
    }))).toBe(true);
    for (const position of [...source.matchAll(/one;/g)].map((match) => match.index + 3)) expect(workspace.completeMembers('file:///ProviderConflictUse.php', position)).toEqual([]);
    workspace.removeExternalFacts('provider.first'); workspace.removeExternalFacts('provider.second');
  });
  it('uses replaceable literal method return facts only for matching receivers and arguments', () => {
    workspace.update('file:///ContainerTypes.php', `<?php namespace Psr\\Container;
      interface ContainerInterface { public function get(string $id): mixed; }
      class OtherContainer { public function get(string $id): mixed {} }
      namespace Services; class Mailer { public function send(): void {} }`);
    workspace.replaceExternalLiteralMethodReturns('symfony', [{ ownerFqcn: 'Psr\\Container\\ContainerInterface', name: 'get', argument: 'mailer', returnType: 'Services\\Mailer', uri: 'file:///services.yaml', start: 10, end: 16 }]);
    const source = `<?php namespace Consumer; use Psr\\Container\\ContainerInterface; use Psr\\Container\\OtherContainer;
      function run(ContainerInterface $container, OtherContainer $other, string $dynamic): void {
        $container->get('mailer')->se; $mailer = $container->get("mailer"); $mailer->se;
        $container->get('missing')->se; $container->get($dynamic)->se; $other->get('mailer')->se;
      }`;
    workspace.update('file:///ContainerUse.php', source);
    const positions = [...source.matchAll(/se;/g)].map((item) => item.index + 2);
    expect(workspace.completeMembers('file:///ContainerUse.php', positions[0]!).map((item) => item.name)).toEqual(['send']);
    expect(workspace.completeMembers('file:///ContainerUse.php', positions[1]!).map((item) => item.name)).toEqual(['send']);
    for (const position of positions.slice(2)) expect(workspace.completeMembers('file:///ContainerUse.php', position)).toEqual([]);
    workspace.replaceExternalLiteralMethodReturns('symfony', []);
    expect(workspace.completeMembers('file:///ContainerUse.php', positions[0]!)).toEqual([]);
  });
  it('renames local parameters and variables only inside one safe named scope', () => {
    const source = `<?php /** @param string $value */
      function one(string $value): void { $copy = $value; echo $copy; }
      function two(string $value): void { echo $value; }`;
    workspace.update('file:///LocalRename.php', source);
    workspace.update('file:///LocalRenameCaller.php', `<?php one(value: 'x');`);
    const parameter = workspace.localVariableRename('file:///LocalRename.php', source.indexOf('$value', source.indexOf('function one')) + 2, 'input');
    expect(parameter).toMatchObject({ name: 'value', scopeId: 'one' });
    expect(parameter?.locations.map((item) => workspace.source(item.uri)?.slice(item.start, item.end))).toEqual(['value', 'value', 'value', 'value']);
    const caller = workspace.source('file:///LocalRenameCaller.php')!; const namedStart = caller.indexOf('value');
    expect(workspace.localVariableRename('file:///LocalRenameCaller.php', namedStart + 2, 'input')).toMatchObject({ uri: 'file:///LocalRenameCaller.php', start: namedStart, end: namedStart + 5, locations: parameter?.locations });
    expect(workspace.localVariableRename('file:///LocalRename.php', source.indexOf('$copy') + 2, 'value')).toBeUndefined();
    expect(workspace.localVariableRename('file:///LocalRename.php', source.lastIndexOf('$value') + 2, 'other')).toMatchObject({ scopeId: 'two' });
  });
  it('renames an inherited method parameter family and its resolved named arguments by position', () => {
    const declarations = `<?php namespace FamilyRename;
      interface Contract { /** @param string $value */ public function run(string $value): void; }
      class First implements Contract { /** @phpstan-param string $payload */ public function run(string $payload): void { echo $payload; } }
      class Second implements Contract { public function run(string $data): void { $occupied = $data; echo $occupied; } }
      class Unrelated { public function run(string $value): void { echo $value; } }`;
    const calls = `<?php namespace FamilyRename; function invoke(Contract $contract, First $first, Second $second): void {
      $contract->run(value: 'a'); $first->run(payload: 'b'); $second->run(data: 'c');
    }`;
    workspace.update('file:///FamilyDeclarations.php', declarations);
    workspace.update('file:///FamilyCalls.php', calls);
    const offset = declarations.indexOf('$value', declarations.indexOf('function run')) + 2;
    const rename = workspace.localVariableRename('file:///FamilyDeclarations.php', offset, 'message');
    expect(rename?.locations).toHaveLength(10);
    expect(rename?.locations.map((location) => workspace.source(location.uri)?.slice(location.start, location.end))).toEqual(expect.arrayContaining([
      'value', 'payload', 'payload', 'data', 'data', 'value', 'payload', 'data',
    ]));
    expect(rename?.locations.some((location) => workspace.source(location.uri)?.slice(location.start, location.end) === 'occupied')).toBe(false);
    const namedStart = calls.indexOf('payload');
    const fromNamedArgument = workspace.localVariableRename('file:///FamilyCalls.php', namedStart + 2, 'message');
    expect(fromNamedArgument).toMatchObject({ uri: 'file:///FamilyCalls.php', start: namedStart, end: namedStart + 7, name: 'payload' });
    const locationKey = (location: { uri: string; start: number; end: number }): string => `${location.uri}:${location.start}:${location.end}`;
    expect(fromNamedArgument?.locations.map(locationKey).sort()).toEqual(rename?.locations.map(locationKey).sort());
    expect(workspace.localVariableRename('file:///FamilyDeclarations.php', offset, 'occupied')).toBeUndefined();
    workspace.update('file:///DynamicFamilyCall.php', `<?php namespace FamilyRename; function dynamic(object $service): void {
      $service->run(payload: 'x');
    }`);
    expect(workspace.localVariableRename('file:///FamilyDeclarations.php', offset, 'message')).toBeUndefined();
    workspace.remove('file:///DynamicFamilyCall.php');
    workspace.update('file:///IncompleteFamily.php', '<?php namespace FamilyRename; class Incomplete extends MissingBase implements Contract { public function run(string $arg): void {} }');
    expect(workspace.localVariableRename('file:///FamilyDeclarations.php', offset, 'message')).toBeUndefined();
  });
  it('renames a private non-promoted property only from its declaration and rejects collisions', () => {
    const source = '<?php class PrivateState { private string $label; private string $occupied; function show(): string { return $this->label; } } class OtherState { private string $label; }';
    workspace.update('file:///PrivatePropertyRename.php', source);
    const declaration = source.indexOf('$label') + 2;
    expect(workspace.privatePropertyRename('file:///PrivatePropertyRename.php', declaration, 'title')).toMatchObject({
      name: 'label', fqcn: 'PrivateState::$label', locations: [{ start: source.indexOf('$label') + 1 }, { start: source.indexOf('->label') + 2 }],
    });
    expect(workspace.privatePropertyRename('file:///PrivatePropertyRename.php', declaration, 'occupied')).toBeUndefined();
    expect(workspace.privatePropertyRename('file:///PrivatePropertyRename.php', source.indexOf('->label') + 3, 'other')).toBeUndefined();
  });
  it('renames a public property across a complete hierarchy and resolved accesses', () => {
    const declarations = `<?php namespace PropertyFamily;
      class Base { public string $label = ''; public static string $status = ''; protected string $token = ''; public function token(): string { return $this->token; } }
      class Child extends Base { public string $label = ''; public function childToken(): string { return $this->token; } }
      class Other { public string $label = ''; }
    `;
    const accesses = `<?php namespace PropertyFamily; function read(Base $base, Child $child, Other $other): string {
      return $base->label . $child->label . $other->label . Base::$status . Child::$status;
    }`;
    workspace.update('file:///PropertyFamily.php', declarations);
    workspace.update('file:///PropertyAccesses.php', accesses);
    const offset = declarations.indexOf('$label') + 2;
    const rename = workspace.propertyRename('file:///PropertyFamily.php', offset, 'title');
    expect(rename?.locations.filter((item) => item.uri === 'file:///PropertyFamily.php')).toHaveLength(2);
    expect(rename?.locations.filter((item) => item.uri === 'file:///PropertyAccesses.php')).toHaveLength(2);
    const accessStart = accesses.indexOf('label');
    expect(workspace.propertyRename('file:///PropertyAccesses.php', accessStart + 1, 'title')).toMatchObject({ uri: 'file:///PropertyAccesses.php', start: accessStart, end: accessStart + 5, locations: rename?.locations });
    const staticOffset = declarations.indexOf('$status') + 2;
    expect(workspace.propertyRename('file:///PropertyFamily.php', staticOffset, 'phase')?.locations).toHaveLength(3);
    const protectedOffset = declarations.indexOf('$token') + 2;
    expect(workspace.memberAt('file:///PropertyFamily.php', declarations.lastIndexOf('->token') + 3)).toMatchObject({ kind: 'property', name: 'token' });
    expect(workspace.propertyRename('file:///PropertyFamily.php', protectedOffset, 'secret')?.locations).toHaveLength(3);
    workspace.update('file:///PropertyCollision.php', '<?php namespace PropertyFamily; class Collision extends Child { protected string $title = ""; }');
    expect(workspace.propertyRename('file:///PropertyFamily.php', offset, 'title')).toBeUndefined();
  });
  it('rejects non-private property rename for dynamic or incomplete hierarchy cases', () => {
    const source = '<?php namespace UnsafeProperty; class Base { public string $label = ""; }';
    workspace.update('file:///UnsafeProperty.php', source);
    const offset = source.indexOf('$label') + 2;
    workspace.update('file:///DynamicProperty.php', '<?php function read(object $value, string $field): mixed { return $value->$field; }');
    expect(workspace.propertyRename('file:///UnsafeProperty.php', offset, 'title')).toBeUndefined();
    workspace.remove('file:///DynamicProperty.php');
    workspace.update('file:///IncompleteProperty.php', '<?php namespace UnsafeProperty; class Child extends Base implements MissingContract {}');
    expect(workspace.propertyRename('file:///UnsafeProperty.php', offset, 'title')).toBeUndefined();
    workspace.remove('file:///IncompleteProperty.php');
    workspace.update('file:///PromotedProperty.php', '<?php namespace UnsafeProperty; class Promoted { public function __construct(public string $label) {} }');
    const promoted = workspace.source('file:///PromotedProperty.php')!;
    expect(workspace.propertyRename('file:///PromotedProperty.php', promoted.indexOf('$label') + 2, 'title')).toMatchObject({ name: 'label' });
  });
  it('renames a trait property through proven host and descendant accesses', () => {
    const trait = `<?php namespace TraitProperty; trait Shared {
      private string $label = '';
      public function own(): string { return $this->label; }
    }`;
    const consumers = `<?php namespace TraitProperty;
      class Host { use Shared; public function read(): string { return $this->label; } }
      class Child extends Host { public function child(): string { return $this->label; } }
    `;
    workspace.update('file:///TraitPropertyShared.php', trait);
    workspace.update('file:///TraitPropertyConsumers.php', consumers);
    const rename = workspace.propertyRename('file:///TraitPropertyShared.php', trait.indexOf('$label') + 2, 'title');
    expect(rename?.locations.filter((item) => item.uri === 'file:///TraitPropertyShared.php')).toHaveLength(2);
    expect(rename?.locations.filter((item) => item.uri === 'file:///TraitPropertyConsumers.php')).toHaveLength(2);
    const hostAccess = consumers.indexOf('label');
    expect(workspace.propertyRename('file:///TraitPropertyConsumers.php', hostAccess + 1, 'title')).toMatchObject({ uri: 'file:///TraitPropertyConsumers.php', start: hostAccess, end: hostAccess + 5, locations: rename?.locations });
  });
  it('rejects trait property rename for host collisions or multiple contributors', () => {
    const trait = '<?php namespace TraitPropertyConflict; trait A { public string $label = ""; }';
    workspace.update('file:///TraitPropertyA.php', trait);
    workspace.update('file:///TraitPropertyHostCollision.php', '<?php namespace TraitPropertyConflict; class Collision { use A; protected string $title = ""; }');
    expect(workspace.propertyRename('file:///TraitPropertyA.php', trait.indexOf('$label') + 2, 'title')).toBeUndefined();
    workspace.remove('file:///TraitPropertyHostCollision.php');
    workspace.update('file:///TraitPropertyContributors.php', '<?php namespace TraitPropertyConflict; trait B { public string $label = ""; } class Host { use A, B; }');
    expect(workspace.propertyRename('file:///TraitPropertyA.php', trait.indexOf('$label') + 2, 'title')).toBeUndefined();
  });
  it('renames a promoted property through constructor scope, PHPDoc, inherited named construction, and property accesses', () => {
    const declarations = `<?php namespace PromotedFamily;
      class Base {
        /** @param string $label */
        public function __construct(public string $label, string $other = '') { echo $label; }
      }
      class Child extends Base {}
    `;
    const uses = `<?php namespace PromotedFamily; function build(Base $base, Child $child): string {
      new Base(label: 'base'); new Child(label: 'child'); return $base->label . $child->label;
    }`;
    workspace.update('file:///PromotedDeclarations.php', declarations);
    workspace.update('file:///PromotedUses.php', uses);
    const offset = declarations.indexOf('$label', declarations.indexOf('__construct')) + 2;
    const rename = workspace.propertyRename('file:///PromotedDeclarations.php', offset, 'title');
    expect(rename?.locations.filter((item) => item.uri === 'file:///PromotedDeclarations.php')).toHaveLength(3);
    expect(rename?.locations.filter((item) => item.uri === 'file:///PromotedUses.php')).toHaveLength(4);
    const accessStart = uses.indexOf('label', uses.indexOf('return'));
    expect(workspace.propertyRename('file:///PromotedUses.php', accessStart + 1, 'title')).toMatchObject({ uri: 'file:///PromotedUses.php', start: accessStart, end: accessStart + 5, locations: rename?.locations });
    const namedStart = uses.indexOf('label');
    expect(workspace.localVariableRename('file:///PromotedUses.php', namedStart + 1, 'title')).toMatchObject({ uri: 'file:///PromotedUses.php', start: namedStart, end: namedStart + 5, locations: rename?.locations });
    expect(workspace.signature('file:///PromotedUses.php', uses.indexOf("label: 'child'") + 2)).toMatchObject({ fqcn: 'PromotedFamily\\Base::__construct', calledOnFqcn: 'PromotedFamily\\Child' });
    expect(workspace.propertyRename('file:///PromotedDeclarations.php', offset, 'other')).toBeUndefined();
    workspace.update('file:///PromotedRedeclaration.php', '<?php namespace PromotedFamily; class Redeclared extends Child { public string $label = ""; }');
    expect(workspace.propertyRename('file:///PromotedDeclarations.php', offset, 'title')).toBeUndefined();
  });
  it('renames a private promoted property while keeping parameter and property identities together', () => {
    const source = `<?php class Secret {
      public function __construct(private string $token) { echo $token; }
      public function reveal(): string { return $this->token; }
    }
    function create(): Secret { return new Secret(token: 'x'); }`;
    workspace.update('file:///PrivatePromoted.php', source);
    const offset = source.indexOf('$token') + 2;
    const rename = workspace.propertyRename('file:///PrivatePromoted.php', offset, 'secret');
    expect(rename?.locations).toHaveLength(4);
    expect(rename?.locations.map((item) => source.slice(item.start, item.end))).toEqual(['token', 'token', 'token', 'token']);
    const namedStart = source.indexOf('token', source.indexOf('new Secret'));
    expect(workspace.localVariableRename('file:///PrivatePromoted.php', namedStart + 1, 'secret')).toMatchObject({ start: namedStart, end: namedStart + 5, locations: rename?.locations });
  });
  it('renames a unique named function across resolved calls and import paths while retaining explicit aliases', () => {
    workspace.update('file:///FunctionDefinition.php', '<?php namespace Functions; function formatValue(string $value): string { return $value; } function occupied(): void {}');
    const source = `<?php namespace Consumer; use function Functions\\formatValue; use function Functions\\formatValue as formatAlias;
      function run(): void { formatValue('a'); formatAlias('b'); \\Functions\\formatValue('c'); $text = "formatValue("; }`;
    workspace.update('file:///FunctionConsumer.php', source);
    const rename = workspace.functionRename('file:///FunctionDefinition.php', workspace.source('file:///FunctionDefinition.php')!.indexOf('formatValue') + 2, 'normalizeValue');
    expect(rename?.locations.map((item) => `${item.uri}:${(workspace.source(item.uri) ?? '').slice(item.start, item.end)}`)).toEqual(expect.arrayContaining([
      'file:///FunctionDefinition.php:formatValue', 'file:///FunctionConsumer.php:formatValue',
    ]));
    expect(rename?.locations.filter((item) => item.uri === 'file:///FunctionConsumer.php')).toHaveLength(4);
    const callStart = source.indexOf('formatValue', source.indexOf('function run'));
    expect(workspace.functionRename('file:///FunctionConsumer.php', callStart + 2, 'normalizeValue')).toMatchObject({ uri: 'file:///FunctionConsumer.php', start: callStart, end: callStart + 'formatValue'.length, locations: rename?.locations });
    const aliasStart = source.indexOf('formatAlias', source.indexOf('function run'));
    expect(workspace.functionRename('file:///FunctionConsumer.php', aliasStart + 2, 'normalizeAlias')).toBeUndefined();
    expect(workspace.functionRename('file:///FunctionDefinition.php', workspace.source('file:///FunctionDefinition.php')!.indexOf('formatValue') + 2, 'occupied')).toBeUndefined();
  });
  it('provides parameter hints only for uniquely resolved flat positional calls', () => {
    workspace.update('file:///HintDefinition.php', '<?php namespace Hints; function format(string $prefix, int $count = 1): void {} function variadic(string ...$values): void {}');
    const source = `<?php namespace Hints; function run(string $prefix): void { format('x', 2); format($prefix); format(prefix: 'x'); variadic('x'); format(strtolower('x')); }`;
    workspace.update('file:///HintUse.php', source);
    expect(workspace.inlayParameterHints('file:///HintUse.php', 0, source.length).map((item) => item.label)).toEqual(['$prefix:', '$count:']);
  });
  it('reports only proven object and null argument incompatibilities', () => {
    workspace.update('file:///ArgumentTypeDefinitions.php', `<?php namespace ArgumentTypes;
      interface Marker {} class Base {} class Child extends Base implements Marker {} class Other {} class Wrong {}
      function accept(Base $value, ?Base $optional): void {} function acceptDnf((Base&Marker)|Other $value): void {}`);
    const source = `<?php namespace ArgumentTypes; function run(Base $base, Child $child, Other $other, Wrong $wrong, mixed $unknown): void {
      accept($base, null); accept($child, $base); accept($other, null); accept(null, null); accept(optional: $other, value: $base); accept(new Other(), new Other()); accept($unknown, null);
      acceptDnf($child); acceptDnf($other); acceptDnf($base); acceptDnf($wrong);
    }`;
    workspace.update('file:///ArgumentTypeUse.php', source);
    expect(workspace.incompatibleArguments('file:///ArgumentTypeUse.php')).toMatchObject([
      { parameter: 'value', actualType: 'ArgumentTypes\\Other', expectedType: 'ArgumentTypes\\Base' },
      { parameter: 'value', actualType: 'null', expectedType: 'ArgumentTypes\\Base' },
      { parameter: 'optional', actualType: 'ArgumentTypes\\Other', expectedType: 'ArgumentTypes\\Base|null' },
      { parameter: 'value', actualType: 'ArgumentTypes\\Other', expectedType: 'ArgumentTypes\\Base' },
      { parameter: 'optional', actualType: 'ArgumentTypes\\Other', expectedType: 'ArgumentTypes\\Base|null' },
      { parameter: 'value', actualType: 'ArgumentTypes\\Base', expectedType: '(ArgumentTypes\\Base&ArgumentTypes\\Marker)|ArgumentTypes\\Other' },
      { parameter: 'value', actualType: 'ArgumentTypes\\Wrong', expectedType: '(ArgumentTypes\\Base&ArgumentTypes\\Marker)|ArgumentTypes\\Other' },
    ]);
  });
  it('checks PHPDoc class-string bounds only for resolved class constant arguments', () => {
    workspace.update('file:///ClassStringDefinitions.php', `<?php namespace ClassStrings;
      class Base {} class Child extends Base {} class Other {}
      /** @param class-string<Base> $type */ function acceptClass(string $type): void {}
      /** @param class-string $type */ function acceptAnyClass(string $type): void {}`);
    const source = `<?php namespace ClassStrings; function run(string $dynamic): void {
      acceptClass(Base::class); acceptClass(Child::class); acceptClass(Other::class); acceptClass('ClassStrings\\Base'); acceptClass($dynamic);
      acceptAnyClass(Other::class);
    }`;
    workspace.update('file:///ClassStringUse.php', source);
    expect(workspace.incompatibleArguments('file:///ClassStringUse.php')).toMatchObject([
      { parameter: 'type', actualType: 'class-string<ClassStrings\\Other>', expectedType: 'class-string<ClassStrings\\Base>' },
    ]);
  });
  it('specializes class-string returns from object-bounded callable templates', () => {
    workspace.update('file:///ClassStringReturn.php', `<?php namespace ClassStringReturns;
      class Base {} class Child extends Base {} class Other {}
      /** @template T of object
       * @param T $object
       * @return class-string<T> */ function className(object $object): string {}
      /** @param class-string<Base> $type */ function acceptBase(string $type): void {}
      /** @param class-string<Other> $type */ function acceptOther(string $type): void {}
      function run(Child $child): void { acceptBase(className($child)); acceptOther(className($child)); }
    `);
    expect(workspace.incompatibleArguments('file:///ClassStringReturn.php')).toMatchObject([
      { callable: 'ClassStringReturns\\acceptOther', actualType: 'class-string<ClassStringReturns\\Child>', expectedType: 'class-string<ClassStringReturns\\Other>' },
    ]);
  });
  it('checks PHPDoc list element and non-empty constraints for flat scalar array literals', () => {
    workspace.update('file:///ListDefinitions.php', `<?php namespace Lists;
      /** @param list<int> $values */ function acceptInts(array $values): void {}
      /** @param non-empty-list<string> $values */ function acceptLabels(array $values): void {}`);
    const source = `<?php namespace Lists; function run(array $dynamic): void {
      acceptInts([1, 2]); acceptInts(['wrong']); acceptInts([1, 'wrong']); acceptInts($dynamic); acceptInts(['a' => 1]);
      acceptLabels(['ready']); acceptLabels([]); acceptLabels(['comma,value']);
    }`;
    workspace.update('file:///ListUse.php', source);
    expect(workspace.incompatibleArguments('file:///ListUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['non-empty-list<string>', 'list<int>'],
      ['non-empty-list<int|string>', 'list<int>'],
      ['array{a: int}', 'list<int>'],
      ['array{}', 'non-empty-list<string>'],
    ]);
  });
  it('checks required and typed PHPDoc array-shape fields for flat associative literals', () => {
    workspace.update('file:///ShapeDefinitions.php', `<?php namespace Shapes;
      /** @param array{id: int, name?: string} $payload */ function acceptPayload(array $payload): void {}`);
    const source = `<?php namespace Shapes; function run(array $dynamic): void {
      acceptPayload(['id' => 1]); acceptPayload(['id' => 1, 'name' => 'ready']);
      acceptPayload(['id' => 'wrong']); acceptPayload(['name' => 'missing']);
      acceptPayload($dynamic); acceptPayload(['id' => nested()]);
    }`;
    workspace.update('file:///ShapeUse.php', source);
    expect(workspace.incompatibleArguments('file:///ShapeUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['array{id: string}', 'array{id: int, name?: string}'],
      ['array{name: string}', 'array{id: int, name?: string}'],
    ]);
  });
  it('checks nested PHPDoc array-shape and list fields for nested static literals', () => {
    workspace.update('file:///NestedShapeDefinitions.php', `<?php namespace Shapes;
      /** @param array{id: int, meta: array{active: bool, label?: string}, tags: list<string>} $payload */
      function acceptNestedPayload(array $payload): void {}`);
    const source = `<?php namespace Shapes; function run(array $dynamic): void {
      acceptNestedPayload(['id' => 1, 'meta' => ['active' => true], 'tags' => ['one', 'two']]);
      acceptNestedPayload(['id' => 1, 'meta' => ['active' => 'wrong'], 'tags' => ['one']]);
      acceptNestedPayload(['id' => 1, 'meta' => ['label' => 'missing'], 'tags' => ['one']]);
      acceptNestedPayload(['id' => 1, 'meta' => ['active' => true], 'tags' => [1]]);
      acceptNestedPayload(['id' => 1, 'meta' => nested(), 'tags' => ['one']]);
      acceptNestedPayload(['id' => 1, $dynamic => ['active' => true], 'tags' => ['one']]);
    }`;
    workspace.update('file:///NestedShapeUse.php', source);
    expect(workspace.incompatibleArguments('file:///NestedShapeUse.php').map((item) => item.actualType)).toEqual([
      'array{id: int, meta: array{active: string}, tags: non-empty-list<string>}',
      'array{id: int, meta: array{label: string}, tags: non-empty-list<string>}',
      'array{id: int, meta: array{active: bool}, tags: non-empty-list<int>}',
    ]);
  });
  it('propagates same-block local array literals across only proven harmless statements', () => {
    workspace.update('file:///LocalArrayDefinitions.php', `<?php namespace LocalArrays;
      /** @param list<int> $values */ function acceptInts(array $values): void {}
      /** @param array{id: int} $payload */ function acceptPayload(array $payload): void {}`);
    const source = `<?php namespace LocalArrays; function run(bool $flag, array $dynamic): void {
      $valid = [1, 2]; acceptInts($valid);
      $badList = ['wrong']; acceptInts($badList);
      $badShape = ['id' => 'wrong']; acceptPayload($badShape);
      if ($flag) { $branch = ['id' => 'wrong']; } acceptPayload($branch);
      $afterEcho = ['id' => 'wrong']; echo 'safe'; acceptPayload($afterEcho);
      $afterLiteral = ['id' => 'wrong']; $other = [1, 2]; acceptPayload($afterLiteral);
      $unsafe = ['id' => 'wrong']; mutate(); acceptPayload($unsafe);
      $overwritten = ['id' => 'wrong']; $overwritten = $dynamic; acceptPayload($overwritten);
    }`;
    workspace.update('file:///LocalArrayUse.php', source);
    expect(workspace.incompatibleArguments('file:///LocalArrayUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['non-empty-list<string>', 'list<int>'],
      ['array{id: string}', 'array{id: int}'],
      ['array{id: string}', 'array{id: int}'],
      ['array{id: string}', 'array{id: int}'],
    ]);
  });
  it('propagates same-block local literals and complete call results across harmless statements', () => {
    workspace.update('file:///LocalValueDefinitions.php', `<?php namespace LocalValues;
      class ParentType {} class ChildType extends ParentType {} class OtherType {}
      function child(): ChildType {} function other(): OtherType {}
      /** @return list<string> */ function strings() {}
      function acceptParent(ParentType $value): void {} function acceptCount(int $value): void {}
      /** @param list<int> $value */ function acceptInts(array $value): void {}`);
    const source = `<?php declare(strict_types=1); namespace LocalValues; function run(): void {
      $valid = child(); acceptParent($valid);
      $object = other(); echo 'safe'; acceptParent($object);
      $count = 'wrong'; acceptCount($count);
      $items = strings(); acceptInts($items);
      $unsafe = strings(); mutate(); acceptInts($unsafe);
      $copied = strings(); $alias = $copied; acceptInts($alias);
    }`;
    workspace.update('file:///LocalValueUse.php', source);
    expect(workspace.incompatibleArguments('file:///LocalValueUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['LocalValues\\OtherType', 'LocalValues\\ParentType'],
      ['string', 'int'],
      ['list<string>', 'list<int>'],
      ['list<string>', 'list<int>'],
    ]);
  });
  it('applies deterministic same-block array writes with proven values and safe zero indexes', () => {
    workspace.update('file:///ArrayMutationDefinitions.php', `<?php namespace ArrayMutations;
      /** @param list<int> $values */ function acceptInts(array $values): void {}
      /** @param array{id: int, name?: string} $value */ function acceptShape(array $value): void {}`);
    const source = `<?php namespace ArrayMutations; function run(mixed $dynamic, string $label): void {
      $items = []; $items[] = 1; $items[] = 'wrong'; acceptInts($items);
      $shape = []; $shape['id'] = 'wrong'; acceptShape($shape);
      $corrected = ['id' => 'wrong']; $corrected['id'] = 1; acceptShape($corrected);
      $named = ['id' => 1]; $named['name'] = 'ready'; acceptShape($named);
      $fromParameter = []; $fromParameter[] = $label; acceptInts($fromParameter);
      $localValue = 'wrong'; $fromLocal = []; $fromLocal[] = $localValue; acceptInts($fromLocal);
      $shapeVariable = []; $shapeVariable['id'] = $label; acceptShape($shapeVariable);
      $indexed = [1]; $indexed[0] = $label; acceptInts($indexed);
      $first = []; $first[0] = $label; acceptInts($first);
      $unknown = []; $unknown[] = $dynamic; acceptInts($unknown);
      $unsafe = []; $unsafe[] = 'wrong'; mutate(); acceptInts($unsafe);
      $mixed = ['id' => 1]; $mixed[] = 'wrong'; acceptShape($mixed);
    }`;
    workspace.update('file:///ArrayMutationUse.php', source);
    expect(workspace.incompatibleArguments('file:///ArrayMutationUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['non-empty-list<int|string>', 'list<int>'],
      ['array{id: string}', 'array{id: int, name?: string}'],
      ['non-empty-list<string>', 'list<int>'],
      ['non-empty-list<string>', 'list<int>'],
      ['array{id: string}', 'array{id: int, name?: string}'],
      ['non-empty-list<int|string>', 'list<int>'],
      ['non-empty-list<string>', 'list<int>'],
    ]);
  });
  it('checks complete multi-step member call results passed directly as arguments', () => {
    workspace.update('file:///ChainResultDefinitions.php', `<?php namespace ChainResults;
      class ParentType {} class ChildType extends ParentType {} class OtherType {}
      class Provider {
        public function nested(): Provider {} public function maybe(): ?Provider {}
        public function child(): ChildType {} public function other(): OtherType {}
        public function requires(int $value): Provider {}
        public function label(): string {} public function count(): int {}
        /** @return list<string> */ public function labels() {}
      }
      function acceptParent(ParentType $value): void {} function acceptNullableParent(?ParentType $value): void {}
      function acceptInt(int $value): void {} function acceptNullableInt(?int $value): void {}
      /** @param list<int> $value */ function acceptInts(array $value): void {}`);
    const source = `<?php declare(strict_types=1); namespace ChainResults; function run(Provider $provider): void {
      acceptParent($provider->nested()->child());
      acceptParent($provider->nested()->other());
      acceptParent($provider->maybe()?->child());
      acceptNullableParent($provider->maybe()?->child());
      acceptParent($provider->requires()->other());
      acceptParent($provider->missing()->other());
      acceptInt($provider->nested()->label());
      acceptInt($provider->maybe()?->count());
      acceptNullableInt($provider->maybe()?->count());
      acceptInts($provider->nested()->labels());
    }`;
    workspace.update('file:///ChainResultUse.php', source);
    expect(workspace.incompatibleArguments('file:///ChainResultUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['ChainResults\\OtherType', 'ChainResults\\ParentType'],
      ['ChainResults\\ChildType|null', 'ChainResults\\ParentType'],
      ['string', 'int'],
      ['int|null', 'int'],
      ['list<string>', 'list<int>'],
    ]);
  });
  it('propagates precise null-coalescing result types through arguments and local aliases', () => {
    workspace.update('file:///CoalescingDefinitions.php', `<?php namespace Coalescing;
      class Repository { public function onlyRepository(): void {} }
      class User { public function email(): string {} }
      function acceptInt(int $value): void {} function acceptRepository(Repository $value): void {}`);
    const source = `<?php declare(strict_types=1); namespace Coalescing;
      function unknown() {}
      function run(?User $user, ?string $provided, ?Repository $repo, Repository $certain): void {
        $email = $user?->email() ?? ''; acceptInt($email);
        $chosen = $provided ?? 'fallback'; acceptInt($chosen);
        $effective = $repo ?? new Repository(); $effective->only;
        $definition = $repo ?? new Repository(); $definition->onlyRepository();
        $parenthesized = ($repo ?? new Repository()); $parenthesized->only;
        $rightAssociative = $repo ?? null ?? new Repository(); $rightAssociative->only;
        $retainedFalse = $repo ?? false; acceptRepository($retainedFalse); $retainedFalse->only;
        $certainChoice = $certain ?? unknown(); $certainChoice->only;
        $unsafe = $repo ?? unknown(); $unsafe->only;
      }`;
    workspace.update('file:///CoalescingUse.php', source);
    const completionOffsets = [...source.matchAll(/->only;/g)].map((item) => item.index + '->only'.length);
    expect(completionOffsets.map((offset) => workspace.completeMembers('file:///CoalescingUse.php', offset).map((item) => item.name))).toEqual([
      ['onlyRepository'], ['onlyRepository'], ['onlyRepository'], [], ['onlyRepository'], [],
    ]);
    expect(workspace.definition('file:///CoalescingUse.php', source.indexOf('$definition->onlyRepository') + '$definition->'.length + 2))
      .toMatchObject([{ uri: 'file:///CoalescingDefinitions.php' }]);
    expect(workspace.incompatibleArguments('file:///CoalescingUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['string', 'int'], ['string', 'int'], ['bool|Coalescing\\Repository', 'Coalescing\\Repository'],
    ]);
  });
  it('merges complete ternary arm types and skips unreachable literal-condition arms', () => {
    workspace.update('file:///TernaryValueDefinitions.php', `<?php namespace TernaryValues;
      class SharedResult { public function shared(): void {} }
      class LeftResult extends SharedResult { public function onlyLeft(): void {} }
      class RightResult extends SharedResult { public function onlyRight(): void {} }
      function left(): LeftResult {} function right(): RightResult {} function unknown() {}
      function acceptString(string $value): void {}`);
    const source = `<?php declare(strict_types=1); namespace TernaryValues;
      function run(bool $condition): void {
        $choice = $condition ? left() : right(); $choice->sha; $choice->onlyLeft();
        $leftOnly = true ? left() : unknown(); $leftOnly->only;
        $rightOnly = false ? unknown() : right(); $rightOnly->only;
        $unknownArm = $condition ? left() : unknown(); $unknownArm->shared();
        $parenthesized = ($condition ? left() : right()); $parenthesized->sha;
        $scalar = $condition ? 1 : 'value'; acceptString($scalar);
        $elvis = $condition ?: left(); $elvis->shared();
      }`;
    const uri = 'file:///TernaryValueUse.php'; workspace.update(uri, source);
    const completions = [...source.matchAll(/->(?:sha|only);/g)].map((item) => item.index + item[0].length - 1);
    expect(completions.map((offset) => workspace.completeMembers(uri, offset).map((item) => item.name))).toEqual([
      ['shared'], ['onlyLeft'], ['onlyRight'], ['shared'],
    ]);
    expect(workspace.definition(uri, source.indexOf('$choice->onlyLeft') + '$choice->'.length + 2)).toEqual([]);
    expect(workspace.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType]))
      .toEqual([['int|string', 'string']]);
  });
  it('merges every proven arm of a default-complete match expression', () => {
    workspace.update('file:///MatchValueDefinitions.php', `<?php namespace MatchValues;
      class SharedResult { public function shared(): void {} }
      class LeftResult extends SharedResult { public function onlyLeft(): void {} }
      class RightResult extends SharedResult { public function onlyRight(): void {} }
      function left(): LeftResult {} function right(): RightResult {} function unknown() {}
      function acceptString(string $value): void {}`);
    const source = `<?php declare(strict_types=1); namespace MatchValues;
      function run(int $mode): void {
        $choice = match ($mode) { 1 => left(), 2, 3 => right(), default => right() }; $choice->sha;
        $same = match ($mode) { 1 => left(), default => left() }; $same->only;
        $throwDefault = match ($mode) { 1 => left(), default => throw new \\RuntimeException() }; $throwDefault->only;
        $definition = match ($mode) { 1 => left(), default => right() }; $definition->shared();
        $unknownArm = match ($mode) { 1 => left(), default => unknown() }; $unknownArm->shared();
        $incomplete = match ($mode) { 1 => left() }; $incomplete->shared();
        $parenthesized = (match ($mode) { 1 => left(), default => right() }); $parenthesized->sha;
        $scalar = match ($mode) { 1 => 1, default => 'value' }; acceptString($scalar);
      }`;
    const uri = 'file:///MatchValueUse.php'; workspace.update(uri, source);
    const completions = [...source.matchAll(/->(?:sha|only);/g)].map((item) => item.index + item[0].length - 1);
    expect(completions.map((offset) => workspace.completeMembers(uri, offset).map((item) => item.name)))
      .toEqual([['shared'], ['onlyLeft'], ['onlyLeft'], ['shared']]);
    expect(workspace.definition(uri, source.indexOf('$definition->shared') + '$definition->'.length + 2))
      .toMatchObject([{ uri: 'file:///MatchValueDefinitions.php' }]);
    expect(workspace.definition(uri, source.indexOf('$unknownArm->shared') + '$unknownArm->'.length + 2)).toEqual([]);
    expect(workspace.definition(uri, source.indexOf('$incomplete->shared') + '$incomplete->'.length + 2)).toEqual([]);
    expect(workspace.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType]))
      .toEqual([['int|string', 'string']]);
  });
  it('checks multi-step member chains only when every composite receiver branch agrees', () => {
    workspace.update('file:///CompositeChainDefinitions.php', `<?php namespace CompositeChains;
      class ParentType {} class OtherType {}
      class Shared { public function other(): OtherType {} }
      interface Left { public function next(): Shared; }
      interface Right { public function next(): Shared; }
      class LeftResult {} class RightResult {}
      interface DivergentLeft { public function next(): LeftResult; }
      interface DivergentRight { public function next(): RightResult; }
      function acceptParent(ParentType $value): void {}`);
    const source = `<?php namespace CompositeChains;
      function run(Left|Right $receiver, Left|Right|null $maybe, DivergentLeft|DivergentRight $divergent): void {
        acceptParent($receiver->next()->other());
        acceptParent($maybe?->next()?->other());
        acceptParent($divergent->next()->missing());
      }`;
    workspace.update('file:///CompositeChainUse.php', source);
    expect(workspace.incompatibleArguments('file:///CompositeChainUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['CompositeChains\\OtherType', 'CompositeChains\\ParentType'],
      ['CompositeChains\\OtherType|null', 'CompositeChains\\ParentType'],
    ]);
  });
  it('merges complete same-block if elseif else local assignments into a union', () => {
    workspace.update('file:///ConditionalValueDefinitions.php', `<?php namespace ConditionalValues;
      class ParentType {} class ChildType extends ParentType {} class OtherType {}
      function child(): ChildType {} function other(): OtherType {}
      /** @return list<string> */ function strings() {}
      function acceptParent(ParentType $value): void {} function acceptInt(int $value): void {}
      /** @param list<int> $value */ function acceptInts(array $value): void {}`);
    const source = `<?php declare(strict_types=1); namespace ConditionalValues;
      function run(bool $first, bool $second): void {
        if ($first) { $scalar = 1; } elseif ($second) { $scalar = 'wrong'; } else { $scalar = 2; }
        acceptInt($scalar);
        if ($first) { $object = child(); } else { echo 'branch'; $object = other(); }
        echo 'after'; acceptParent($object);
        if ($first) { $nested = child(); } else { if ($second) { $nested = child(); } else { $nested = other(); } }
        acceptParent($nested);
        if ($first) { $missing = strings(); } acceptInts($missing);
        if ($first) { $abrupt = strings(); } else { throw new \\RuntimeException(); } acceptInts($abrupt);
        if ($first) { $unsafe = strings(); } else { $unsafe = strings(); } mutate(); acceptInts($unsafe);
      }`;
    workspace.update('file:///ConditionalValueUse.php', source);
    expect(workspace.incompatibleArguments('file:///ConditionalValueUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['int|string', 'int'],
      ['ConditionalValues\\ChildType|ConditionalValues\\OtherType', 'ConditionalValues\\ParentType'],
      ['ConditionalValues\\ChildType|ConditionalValues\\OtherType', 'ConditionalValues\\ParentType'],
    ]);
  });
  it('bounds recursive local value-flow analysis while preserving supported nesting', () => {
    workspace.update('file:///LocalValueBudgetDefinitions.php', `<?php namespace LocalValueBudget;
      function acceptInt(int $value): void {}`);
    const nested = (count: number): string => {
      let body = "$value = 'wrong';";
      for (let index = 0; index < count; index += 1) body = `if ($flag) { ${body} } else { $value = 'wrong'; }`;
      return body;
    };
    const supported = `<?php declare(strict_types=1); namespace LocalValueBudget; function supported(bool $flag): void { ${nested(8)} acceptInt($value); }`;
    workspace.update('file:///LocalValueBudgetSupported.php', supported);
    expect(workspace.incompatibleArguments('file:///LocalValueBudgetSupported.php').map((item) => item.actualType)).toEqual([
      'string',
    ]);
    const excessive = `<?php declare(strict_types=1); namespace LocalValueBudget; function excessive(bool $flag): void { ${nested(20)} acceptInt($value); }`;
    workspace.update('file:///LocalValueBudgetExcessive.php', excessive);
    expect(workspace.incompatibleArguments('file:///LocalValueBudgetExcessive.php')).toEqual([]);
  });
  it('merges complete same-block switch assignments including fallthrough into a union', () => {
    workspace.update('file:///SwitchValueDefinitions.php', `<?php namespace SwitchValues;
      class ParentType {} class ChildType extends ParentType {} class OtherType {}
      function child(): ChildType {} function other(): OtherType {}
      /** @return list<string> */ function strings() {}
      function acceptParent(ParentType $value): void {} function acceptInt(int $value): void {}
      /** @param list<int> $value */ function acceptInts(array $value): void {}`);
    const source = `<?php declare(strict_types=1); namespace SwitchValues;
      function run(int $mode, int $inner): void {
        switch ($mode) { case 1: $scalar = 1; break; case 2: $scalar = 'wrong'; break; default: $scalar = 2; }
        acceptInt($scalar);
        switch ($mode) { case 1: echo 'fallthrough'; case 2: $object = child(); break; default: $object = other(); }
        acceptParent($object);
        switch ($mode) { case 1: switch ($inner) { case 1: $nested = child(); break; default: $nested = other(); } break; default: $nested = child(); }
        acceptParent($nested);
        switch ($mode) { case 1: $missingDefault = strings(); break; } acceptInts($missingDefault);
        switch ($mode) { case 1: break; default: $missingAssignment = strings(); } acceptInts($missingAssignment);
        switch ($mode) { case 1: $unsafe = strings(); break 2; default: $unsafe = strings(); } acceptInts($unsafe);
      }`;
    workspace.update('file:///SwitchValueUse.php', source);
    expect(workspace.incompatibleArguments('file:///SwitchValueUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['int|string', 'int'],
      ['SwitchValues\\ChildType|SwitchValues\\OtherType', 'SwitchValues\\ParentType'],
      ['SwitchValues\\ChildType|SwitchValues\\OtherType', 'SwitchValues\\ParentType'],
    ]);
  });
  it('merges complete same-block try catch assignments and applies finally overrides', () => {
    workspace.update('file:///TryValueDefinitions.php', `<?php namespace TryValues;
      class ParentType {} class ChildType extends ParentType {} class OtherType {}
      function child(): ChildType {} function other(): OtherType {}
      /** @return list<string> */ function strings() {}
      function acceptParent(ParentType $value): void {} function acceptInt(int $value): void {}
      /** @param list<int> $value */ function acceptInts(array $value): void {}`);
    const source = `<?php declare(strict_types=1); namespace TryValues;
      function run(bool $nested): void {
        try { $scalar = 1; } catch (\\RuntimeException $error) { $scalar = 'wrong'; } acceptInt($scalar);
        try { $object = child(); } catch (\\RuntimeException $error) { $object = other(); } finally { echo 'done'; } acceptParent($object);
        try { if ($nested) { $nestedObject = child(); } else { $nestedObject = other(); } } catch (\\RuntimeException $error) { $nestedObject = child(); } acceptParent($nestedObject);
        try { $override = strings(); } catch (\\RuntimeException $error) { echo 'caught'; } finally { $override = ['wrong']; } acceptInts($override);
        try { $missing = strings(); } catch (\\RuntimeException $error) { echo 'missing'; } acceptInts($missing);
        try { $unsafe = strings(); } catch (\\RuntimeException $error) { $unsafe = strings(); } finally { mutate(); } acceptInts($unsafe);
      }`;
    workspace.update('file:///TryValueUse.php', source);
    expect(workspace.incompatibleArguments('file:///TryValueUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['int|string', 'int'],
      ['TryValues\\ChildType|TryValues\\OtherType', 'TryValues\\ParentType'],
      ['TryValues\\ChildType|TryValues\\OtherType', 'TryValues\\ParentType'],
      ['non-empty-list<string>', 'list<int>'],
    ]);
  });
  it('propagates deterministic local assignments from a guaranteed do while iteration', () => {
    workspace.update('file:///DoValueDefinitions.php', `<?php namespace DoValues;
      class ParentType {} class ChildType extends ParentType {} class OtherType {}
      function child(): ChildType {} function other(): OtherType {}
      /** @return list<string> */ function strings() {}
      function acceptParent(ParentType $value): void {} function acceptInt(int $value): void {}
      /** @param list<int> $value */ function acceptInts(array $value): void {}`);
    const source = `<?php declare(strict_types=1); namespace DoValues;
      function run(bool $again, bool $branch): void {
        do { $scalar = 'wrong'; } while ($again); acceptInt($scalar);
        do { if ($branch) { $object = child(); } else { $object = other(); } } while (false); acceptParent($object);
        while ($again) { $possiblyMissing = strings(); } acceptInts($possiblyMissing);
        do { $singleBreak = strings(); break; } while ($again); acceptInts($singleBreak);
        do { $unsafeCondition = strings(); } while (mutate()); acceptInts($unsafeCondition);
      }`;
    workspace.update('file:///DoValueUse.php', source);
    expect(workspace.incompatibleArguments('file:///DoValueUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['string', 'int'],
      ['DoValues\\ChildType|DoValues\\OtherType', 'DoValues\\ParentType'],
      ['list<string>', 'list<int>'],
    ]);
  });
  it('propagates deterministic assignments from proven nonempty for and single-pass while loops', () => {
    workspace.update('file:///LoopValueDefinitions.php', `<?php namespace LoopValues;
      class ParentType {} class ChildType extends ParentType {} class OtherType {}
      function child(): ChildType {} function other(): OtherType {}
      /** @return list<string> */ function strings() {}
      function acceptParent(ParentType $value): void {} function acceptInt(int $value): void {}
      /** @param list<int> $value */ function acceptInts(array $value): void {}`);
    const source = `<?php declare(strict_types=1); namespace LoopValues;
      function run(bool $branch, bool $maybe): void {
        for ($index = 0; $index < 2; $index++) { $scalar = 'wrong'; } acceptInt($scalar);
        for ($index = 2; $index >= 1; --$index) { if ($branch) { $object = child(); } else { $object = other(); } } acceptParent($object);
        while (true) { $singleWhile = other(); break; } acceptParent($singleWhile);
        for (;;) { $singleFor = other(); break; } acceptParent($singleFor);
        $optionalWhile = child(); while ($maybe) { $optionalWhile = other(); } acceptParent($optionalWhile);
        $optionalFor = child(); for ($dynamic = makeStart(); $dynamic < 2; $dynamic++) { $optionalFor = other(); } acceptParent($optionalFor);
        for ($index = 2; $index < 1; $index++) { $zero = strings(); } acceptInts($zero);
        while ($maybe) { $unknownWhile = strings(); } acceptInts($unknownWhile);
        for ($dynamic = makeStart(); $dynamic < 2; $dynamic++) { $unknownFor = strings(); } acceptInts($unknownFor);
      }`;
    workspace.update('file:///LoopValueUse.php', source);
    expect(workspace.incompatibleArguments('file:///LoopValueUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['string', 'int'],
      ['LoopValues\\ChildType|LoopValues\\OtherType', 'LoopValues\\ParentType'],
      ['LoopValues\\OtherType', 'LoopValues\\ParentType'],
      ['LoopValues\\OtherType', 'LoopValues\\ParentType'],
      ['LoopValues\\ChildType|LoopValues\\OtherType', 'LoopValues\\ParentType'],
      ['LoopValues\\ChildType|LoopValues\\OtherType', 'LoopValues\\ParentType'],
    ]);
  });
  it('propagates deterministic assignments from proven nonempty foreach sources', () => {
    workspace.update('file:///ForeachValueDefinitions.php', `<?php namespace ForeachValues;
      class ParentType {} class ChildType extends ParentType {} class OtherType {}
      function child(): ChildType {} function other(): OtherType {}
      /** @return non-empty-list<int> */ function items() {}
      /** @return list<int> */ function maybeItems() {}
      /** @return list<string> */ function strings() {}
      function acceptParent(ParentType $value): void {} function acceptInt(int $value): void {}
      /** @param list<int> $value */ function acceptInts(array $value): void {}`);
    const source = `<?php declare(strict_types=1); namespace ForeachValues;
      function run(bool $branch): void {
        foreach ([1] as $item) { $scalar = 'wrong'; } acceptInt($scalar);
        $localItems = [1, 2]; foreach ($localItems as $item) { if ($branch) { $object = child(); } else { $object = other(); } } acceptParent($object);
        foreach (items() as $item) { $called = other(); } acceptParent($called);
        foreach (['id' => 1] as $item) { $shaped = other(); break; } acceptParent($shaped);
        $optional = child(); foreach (maybeItems() as $item) { $optional = other(); } acceptParent($optional);
        $emptyRetained = child(); foreach ([] as $item) { $emptyRetained = other(); } acceptParent($emptyRetained);
        foreach ([] as $item) { $empty = strings(); } acceptInts($empty);
        foreach (maybeItems() as $item) { $possiblyEmpty = strings(); } acceptInts($possiblyEmpty);
      }`;
    workspace.update('file:///ForeachValueUse.php', source);
    expect(workspace.incompatibleArguments('file:///ForeachValueUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['string', 'int'],
      ['ForeachValues\\ChildType|ForeachValues\\OtherType', 'ForeachValues\\ParentType'],
      ['ForeachValues\\OtherType', 'ForeachValues\\ParentType'],
      ['ForeachValues\\OtherType', 'ForeachValues\\ParentType'],
      ['ForeachValues\\ChildType|ForeachValues\\OtherType', 'ForeachValues\\ParentType'],
    ]);
  });
  it('checks explicit closure signatures against PHPDoc callable variance', () => {
    workspace.update('file:///CallableDefinitions.php', `<?php namespace CallableArguments;
      class Base {} class Child extends Base {} class Other {}
      /** @param callable(Child): Base $transform */ function acceptTransform(callable $transform): void {}`);
    const source = `<?php namespace CallableArguments; function run(callable $dynamic): void {
      acceptTransform(fn (Base $value): Child => new Child());
      acceptTransform(function (Base $value): Child { return new Child(); });
      acceptTransform(fn (Other $value): Child => new Child());
      acceptTransform(fn (Base $value): Other => new Other());
      acceptTransform(fn ($value): Child => new Child());
      acceptTransform(fn (Base $value) => new Child());
      acceptTransform($dynamic);
    }`;
    workspace.update('file:///CallableArgumentUse.php', source);
    expect(workspace.incompatibleArguments('file:///CallableArgumentUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['callable(CallableArguments\\Other): CallableArguments\\Child', 'callable(CallableArguments\\Child): CallableArguments\\Base'],
      ['callable(CallableArguments\\Base): CallableArguments\\Other', 'callable(CallableArguments\\Child): CallableArguments\\Base'],
    ]);
  });
  it('uses declared PHPDoc template variance for generic parameter forwarding', () => {
    workspace.update('file:///VarianceDefinitions.php', `<?php namespace GenericVariance;
      class ParentType {} class ChildType extends ParentType {}
      /** @template-covariant T */ class Producer {}
      /** @template-contravariant T */ class Consumer {}
      /** @template T */ class Box {}
      /** @param Producer<ParentType> $value */ function acceptProducer(Producer $value): void {}
      /** @param Consumer<ChildType> $value */ function acceptConsumer(Consumer $value): void {}
      /** @param Box<ParentType> $value */ function acceptBox(Box $value): void {}`);
    const source = `<?php namespace GenericVariance;
      /** @param Producer<ChildType> $childProducer
       * @param Producer<ParentType> $parentProducer
       * @param Consumer<ParentType> $parentConsumer
       * @param Consumer<ChildType> $childConsumer
       * @param Box<ChildType> $childBox */
      function run(Producer $childProducer, Producer $parentProducer, Consumer $parentConsumer, Consumer $childConsumer, Box $childBox): void {
        acceptProducer($childProducer); acceptProducer($parentProducer);
        acceptConsumer($parentConsumer); acceptConsumer($childConsumer);
        acceptBox($childBox);
      }`;
    workspace.update('file:///VarianceUse.php', source);
    expect(workspace.incompatibleArguments('file:///VarianceUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['GenericVariance\\Box<GenericVariance\\ChildType>', 'GenericVariance\\Box<GenericVariance\\ParentType>'],
    ]);
    expect(workspace.snapshot('file:///VarianceDefinitions.php')).toMatchObject({ schema: 74, declaration: { templates: expect.arrayContaining([
      { ownerFqcn: 'GenericVariance\\Producer', name: 'T', variance: 'covariant' },
      { ownerFqcn: 'GenericVariance\\Consumer', name: 'T', variance: 'contravariant' },
      { ownerFqcn: 'GenericVariance\\Box', name: 'T', variance: 'invariant' },
    ]) } });
  });
  it('substitutes reordered generic arguments through direct and recursive PHPDoc inheritance', () => {
    workspace.update('file:///GenericInheritanceDefinitions.php', `<?php namespace GenericInheritance;
      class ParentType {} class ChildType extends ParentType {}
      /**
       * @template-covariant A
       * @template-covariant B
       */ class Pair {}
      /**
       * @template X
       * @template Y
       * @extends Pair<Y, X>
       */ class Reversed extends Pair {}
      /**
       * @template Z
       * @extends Reversed<Z, Z>
       */ class Mirrored extends Reversed {}
      /**
       * @template T
       * @extends Pair<T, T>
       */ class Forged extends Reversed {}
      /** @template-covariant T */ interface GenericContract {}
      /**
       * @template T
       * @implements GenericContract<T>
       */ class GenericImplementation implements GenericContract {}
      /** @param Pair<ParentType, ChildType> $value */ function acceptPair(Pair $value): void {}
      /** @param GenericContract<ChildType> $value */ function acceptContract(GenericContract $value): void {}`);
    const source = `<?php namespace GenericInheritance;
      /**
       * @param Reversed<ChildType, ChildType> $valid
       * @param Reversed<ParentType, ChildType> $invalid
       * @param Mirrored<ChildType> $recursive
       * @param Forged<ParentType> $forged
       * @param GenericImplementation<ChildType> $validImplementation
       * @param GenericImplementation<ParentType> $invalidImplementation
       */
      function run(Reversed $valid, Reversed $invalid, Mirrored $recursive, Forged $forged, GenericImplementation $validImplementation, GenericImplementation $invalidImplementation): void {
        acceptPair($valid); acceptPair($invalid); acceptPair($recursive);
        acceptPair($forged); acceptContract($validImplementation); acceptContract($invalidImplementation);
      }`;
    workspace.update('file:///GenericInheritanceUse.php', source);
    expect(workspace.incompatibleArguments('file:///GenericInheritanceUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['GenericInheritance\\Reversed<GenericInheritance\\ParentType, GenericInheritance\\ChildType>', 'GenericInheritance\\Pair<GenericInheritance\\ParentType, GenericInheritance\\ChildType>'],
      ['GenericInheritance\\GenericImplementation<GenericInheritance\\ParentType>', 'GenericInheritance\\GenericContract<GenericInheritance\\ChildType>'],
    ]);
  });
  it('checks uniquely resolved function and member call results as arguments', () => {
    workspace.update('file:///CallResultDefinitions.php', `<?php namespace CallResults;
      class ParentType {} class ChildType extends ParentType {} class OtherType {}
      function child(): ChildType {} function other(): OtherType {} function otherFor(ChildType $value): OtherType {}
      /** @return list<int> */ function integers() {}
      /** @return list<string> */ function strings() {}
      class Provider { public function child(): ChildType {} public function other(): OtherType {} public function otherFor(ChildType $value): OtherType {} }
      function acceptParent(ParentType $value): void {}
      /** @param list<int> $value */ function acceptIntegers(array $value): void {}`);
    const source = `<?php namespace CallResults;
      function run(Provider $provider, array $dynamicArguments): void {
        acceptParent(child()); acceptParent(other());
        acceptParent($provider->child()); acceptParent($provider->other());
        acceptIntegers(integers()); acceptIntegers(strings());
        acceptParent(otherFor(new ChildType())); acceptParent(otherFor(value: new ChildType()));
        acceptParent(otherFor(...[new ChildType()])); acceptParent(otherFor(...['value' => new ChildType()]));
        $arguments = [new ChildType()]; acceptParent(otherFor(...$arguments));
        acceptParent(otherFor(new OtherType())); acceptParent(otherFor(missing: new ChildType())); acceptParent(otherFor());
        acceptParent(otherFor(...[new OtherType()])); acceptParent(otherFor(...$dynamicArguments));
        $builtPositionalArguments = [new ChildType()]; $builtPositionalArguments[] = new ChildType(); acceptParent(otherFor(...$builtPositionalArguments));
        acceptParent($provider->otherFor(new ChildType())); acceptParent($provider->otherFor(new OtherType()));
      }`;
    workspace.update('file:///CallResultUse.php', source);
    expect(workspace.incompatibleArguments('file:///CallResultUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['CallResults\\OtherType', 'CallResults\\ParentType'],
      ['CallResults\\OtherType', 'CallResults\\ParentType'],
      ['list<string>', 'list<int>'],
      ['CallResults\\OtherType', 'CallResults\\ParentType'],
      ['CallResults\\OtherType', 'CallResults\\ParentType'],
      ['CallResults\\OtherType', 'CallResults\\ParentType'],
      ['CallResults\\OtherType', 'CallResults\\ParentType'],
      ['CallResults\\OtherType', 'CallResults\\ParentType'],
      ['CallResults\\OtherType', 'CallResults\\ChildType'],
      ['CallResults\\OtherType', 'CallResults\\ParentType'],
      ['CallResults\\OtherType', 'CallResults\\ParentType'],
      ['CallResults\\OtherType', 'CallResults\\ChildType'],
    ]);
  });
  it('expands only static or linearly built local argument arrays for call results and template inference', () => {
    workspace.update('file:///StaticUnpackDefinitions.php', `<?php namespace StaticUnpack;
      class ParentType {} class ChildType extends ParentType {} class OtherType {}
      function acceptChild(ChildType $value): void {}
      function resultFor(ChildType $value): OtherType {}
      /** @template T
       * @param T $value
       * @return T */ function identity($value) {}`);
    const source = `<?php namespace StaticUnpack;
      function dynamicKey(): string { return 'value'; }
      /**
       * @param array{value: ChildType} $namedArguments
       * @param array{value: OtherType} $wrongNamedArguments
       * @param array{value?: ChildType} $optionalNamedArguments
       * @param array{0: ChildType} $positionalArguments
       * @param array{value: ChildType} $usedNamedArguments
       * @param array{value: OtherType} $genericNamedArguments
       */
      function run(array $dynamicArguments, array $namedArguments, array $wrongNamedArguments, array $optionalNamedArguments,
        array $positionalArguments, array $usedNamedArguments, array $genericNamedArguments): void {
        acceptChild(resultFor(...[new ChildType()]));
        $resultArguments = [new ChildType()]; acceptChild(resultFor(...$resultArguments));
        acceptChild(identity(...[new OtherType()]));
        $templateArguments = [new OtherType()]; acceptChild(identity(...$templateArguments));
        acceptChild(resultFor(...$namedArguments));
        acceptChild(identity(...$genericNamedArguments));
        acceptChild(resultFor(...[dynamicKey() => new ChildType()]));
        acceptChild(resultFor(...$dynamicArguments));
        $builtArguments = []; $builtArguments[] = new OtherType(); acceptChild(identity(...$builtArguments));
        $extendedArguments = [new ChildType()]; $extendedArguments[] = new ChildType(); acceptChild(resultFor(...$extendedArguments));
        $sparseArguments = []; $sparseArguments[1] = new OtherType(); acceptChild(identity(...$sparseArguments));
        $key = 0; $dynamicBuiltArguments = []; $dynamicBuiltArguments[$key] = new OtherType(); acceptChild(identity(...$dynamicBuiltArguments));
        $usedBuiltArguments = []; $usedBuiltArguments[] = new OtherType(); count($usedBuiltArguments); acceptChild(identity(...$usedBuiltArguments));
        acceptChild(identity(...[...[new OtherType()]]));
        acceptChild(resultFor(...$wrongNamedArguments));
        acceptChild(resultFor(...$optionalNamedArguments));
        acceptChild(resultFor(...$positionalArguments));
        count($usedNamedArguments); acceptChild(resultFor(...$usedNamedArguments));
      }`;
    workspace.update('file:///StaticUnpackUse.php', source);
    expect(workspace.incompatibleArguments('file:///StaticUnpackUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['StaticUnpack\\OtherType', 'StaticUnpack\\ChildType'],
      ['StaticUnpack\\OtherType', 'StaticUnpack\\ChildType'],
      ['StaticUnpack\\OtherType', 'StaticUnpack\\ChildType'],
      ['StaticUnpack\\OtherType', 'StaticUnpack\\ChildType'],
      ['StaticUnpack\\OtherType', 'StaticUnpack\\ChildType'],
      ['StaticUnpack\\OtherType', 'StaticUnpack\\ChildType'],
      ['StaticUnpack\\OtherType', 'StaticUnpack\\ChildType'],
      ['StaticUnpack\\OtherType', 'StaticUnpack\\ChildType'],
    ]);
  });
  it('binds self, static, parent and nullsafe call result types before argument checks', () => {
    workspace.update('file:///LateCallResultDefinitions.php', `<?php namespace LateCallResults;
      class Root {}
      class BaseType extends Root {
        public function selfResult(): self {}
        public function staticResult(): static {}
      }
      class ChildType extends BaseType { public function parentResult(): parent {} }
      function acceptChild(ChildType $value): void {}
      function acceptNullableChild(?ChildType $value): void {}`);
    const source = `<?php namespace LateCallResults;
      function run(ChildType $child, ?ChildType $maybe): void {
        acceptChild($child->staticResult());
        acceptChild($child->selfResult());
        acceptChild($child->parentResult());
        acceptChild($maybe?->staticResult());
        acceptNullableChild($maybe?->staticResult());
      }`;
    workspace.update('file:///LateCallResultUse.php', source);
    expect(workspace.incompatibleArguments('file:///LateCallResultUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['LateCallResults\\BaseType', 'LateCallResults\\ChildType'],
      ['LateCallResults\\BaseType', 'LateCallResults\\ChildType'],
      ['LateCallResults\\ChildType|null', 'LateCallResults\\ChildType'],
    ]);
  });
  it('uses an untouched zero-required-argument PHPDoc Callable parameter result', () => {
    workspace.update('file:///CallableResultDefinitions.php', `<?php namespace CallableResults;
      class ParentType {} class ChildType extends ParentType {} class OtherType {}
      function acceptParent(ParentType $value): void {}
      /** @param list<int> $value */ function acceptIntegers(array $value): void {}`);
    const source = `<?php namespace CallableResults;
      /**
       * @param callable(): ChildType $valid
       * @param callable(): OtherType $invalid
       * @param callable(): list<string> $strings
       * @param callable(): OtherType $used
       * @param callable(ChildType, string=): OtherType $withArguments
       * @param callable(ChildType): OtherType $missingArgument
       * @param callable(ChildType $child, string $label=): OtherType $named
       * @param callable(ChildType $child, string $label=): OtherType $unpacked
       * @param callable(ChildType $child, string $label=): OtherType $namedUnpacked
       * @param callable(ChildType $child, string $label=): OtherType $badName
       * @param callable(ChildType $child, string $label=): OtherType $missingNamed
       * @param callable(): OtherType $aliased
       * @param callable(): OtherType $usedAliasSource
       * @param callable(): OtherType $reassignedAliasSource
       * @param callable(ChildType $child, string $label=): OtherType $variableUnpacked
       * @param callable(ChildType $child, string $label=): OtherType $dynamicUnpacked
       * @param callable(ChildType $child, string $label=): OtherType $mutatedUnpacked
       * @param callable(ParentType $child): OtherType $subclassArgument
       * @param callable(ChildType ...$children): OtherType $variadic
       * @param callable(ChildType ...$children): OtherType $namedVariadic
       * @param callable(mixed $value): OtherType $mixedArgument
       * @param callable(ChildType $child): OtherType $wrongArgument
       * @param callable(ChildType $child): OtherType $wrongNamedType
       * @param callable(ChildType $child): OtherType $wrongUnpackedType
       * @param callable(ChildType $child): OtherType $wrongVariableUnpackedType
       * @param callable(ChildType ...$children): OtherType $wrongVariadic
       * @param callable(ChildType ...$children): OtherType $wrongNamedVariadic
       * @param callable(ChildType $child): OtherType $shapedUnpacked
       * @param callable(ChildType $child): OtherType $builtShapeUnpacked
       * @param array{child: ChildType} $shapedArguments
       */
      function run(callable $valid, callable $invalid, callable $strings, callable $used, callable $withArguments, callable $missingArgument,
        callable $named, callable $unpacked, callable $namedUnpacked, callable $badName, callable $missingNamed,
        callable $aliased, callable $usedAliasSource, callable $reassignedAliasSource,
        callable $variableUnpacked, callable $dynamicUnpacked, callable $mutatedUnpacked,
        callable $subclassArgument, callable $variadic, callable $namedVariadic, callable $mixedArgument, callable $wrongArgument, callable $wrongNamedType,
        callable $wrongUnpackedType, callable $wrongVariableUnpackedType, callable $wrongVariadic, callable $wrongNamedVariadic, callable $shapedUnpacked,
        callable $builtShapeUnpacked, array $dynamicArguments, array $shapedArguments): void {
        acceptParent($valid()); acceptParent($invalid()); acceptIntegers($strings());
        echo is_callable($used); acceptParent($used());
        acceptParent($withArguments(new ChildType())); acceptParent($missingArgument());
        acceptParent($named(child: new ChildType()));
        acceptParent($unpacked(...[new ChildType(), 'ready']));
        acceptParent($namedUnpacked(...['child' => new ChildType()]));
        acceptParent($shapedUnpacked(...$shapedArguments));
        $builtNamedArguments = []; $builtNamedArguments['child'] = new ChildType(); acceptParent($builtShapeUnpacked(...$builtNamedArguments));
        acceptParent($badName(missing: new ChildType())); acceptParent($missingNamed(label: 'ready'));
        $alias = $aliased; acceptParent($alias());
        echo is_callable($usedAliasSource); $usedAlias = $usedAliasSource; acceptParent($usedAlias());
        $reassignedAlias = $reassignedAliasSource; $reassignedAlias = otherCallable(); acceptParent($reassignedAlias());
        $arguments = [new ChildType(), 'ready']; acceptParent($variableUnpacked(...$arguments));
        acceptParent($dynamicUnpacked(...$dynamicArguments));
        $builtPositionalArguments = [new ChildType()]; $builtPositionalArguments[] = 'ready'; acceptParent($mutatedUnpacked(...$builtPositionalArguments));
        acceptParent($subclassArgument(new ChildType()));
        acceptParent($variadic(new ChildType(), new ChildType()));
        acceptParent($namedVariadic(extra: new ChildType()));
        acceptParent($mixedArgument(unknownValue()));
        acceptParent($wrongArgument('wrong'));
        acceptParent($wrongNamedType(child: 'wrong'));
        acceptParent($wrongUnpackedType(...['wrong']));
        $wrongArguments = ['wrong']; acceptParent($wrongVariableUnpackedType(...$wrongArguments));
        acceptParent($wrongVariadic(new ChildType(), 'wrong'));
        acceptParent($wrongNamedVariadic(extra: 'wrong'));
      }`;
    workspace.update('file:///CallableResultUse.php', source);
    expect(workspace.incompatibleArguments('file:///CallableResultUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['CallableResults\\OtherType', 'CallableResults\\ParentType'],
      ['list<string>', 'list<int>'],
      ['CallableResults\\OtherType', 'CallableResults\\ParentType'],
      ['CallableResults\\OtherType', 'CallableResults\\ParentType'],
      ['CallableResults\\OtherType', 'CallableResults\\ParentType'],
      ['CallableResults\\OtherType', 'CallableResults\\ParentType'],
      ['CallableResults\\OtherType', 'CallableResults\\ParentType'],
      ['CallableResults\\OtherType', 'CallableResults\\ParentType'],
      ['CallableResults\\OtherType', 'CallableResults\\ParentType'],
      ['CallableResults\\OtherType', 'CallableResults\\ParentType'],
      ['CallableResults\\OtherType', 'CallableResults\\ParentType'],
      ['CallableResults\\OtherType', 'CallableResults\\ParentType'],
      ['CallableResults\\OtherType', 'CallableResults\\ParentType'],
      ['CallableResults\\OtherType', 'CallableResults\\ParentType'],
      ['CallableResults\\OtherType', 'CallableResults\\ParentType'],
    ]);
  });
  it('evaluates PHPDoc conditional return types on untouched Callable variables', () => {
    workspace.update('file:///ConditionalCallableTypes.php', `<?php namespace ConditionalCallable;
      class CommonResult { public function common(): void {} }
      class ReadyResult extends CommonResult { public function onlyReady(): void {} public function shared(): void {} }
      class OtherResult extends CommonResult { public function onlyOther(): void {} public function shared(): void {} }
      class ImpossibleResult { public function shared(): void {} }
      function acceptReady(ReadyResult $value): void {}`);
    const source = `<?php namespace ConditionalCallable;
      /**
       * @param callable(bool $flag): ($flag is true ? ReadyResult : OtherResult) $chooseReady
       * @param callable(bool $flag): ($flag is true ? ReadyResult : OtherResult) $chooseOther
       * @param callable(bool $flag): ($flag is true ? ReadyResult : OtherResult) $chooseUnknown
       * @param callable(bool $flag): ($flag is true ? ReadyResult : OtherResult) $chooseInvalid
       * @param callable(bool $flag): ($flag is true ? ReadyResult : OtherResult) $chooseMismatch
       * @param callable(bool $left, bool $right): ($left is true ? ($right is false ? ImpossibleResult : ReadyResult) : OtherResult) $chooseCross
       */
      function run(callable $chooseReady, callable $chooseOther, callable $chooseUnknown, callable $chooseInvalid,
        callable $chooseMismatch, callable $chooseCross, bool $dynamic, bool $otherDynamic): void {
        $ready = $chooseReady(true); $ready->only;
        $other = $chooseOther(flag: false); $other->only;
        $unknown = $chooseUnknown($dynamic); $unknown->com;
        $invalid = $chooseInvalid(new OtherResult()); $invalid->missing;
        acceptReady($chooseMismatch(false));
        $crossAlias = $chooseCross($dynamic, $dynamic); $crossAlias->shared();
        $crossIndependent = $chooseCross($dynamic, $otherDynamic); $crossIndependent->shared();
      }`;
    workspace.update('file:///ConditionalCallableUse.php', source);
    expect(workspace.completeMembers('file:///ConditionalCallableUse.php', source.indexOf('$ready->only') + '$ready->only'.length).map((item) => item.name))
      .toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///ConditionalCallableUse.php', source.indexOf('$other->only') + '$other->only'.length).map((item) => item.name))
      .toEqual(['onlyOther']);
    expect(workspace.completeMembers('file:///ConditionalCallableUse.php', source.indexOf('$unknown->com') + '$unknown->com'.length).map((item) => item.name))
      .toEqual(['common']);
    expect(workspace.completeMembers('file:///ConditionalCallableUse.php', source.indexOf('$invalid->missing') + '$invalid->missing'.length)).toEqual([]);
    expect(workspace.definition('file:///ConditionalCallableUse.php', source.indexOf('$crossAlias->shared') + '$crossAlias->shared'.length)).toHaveLength(2);
    expect(workspace.completeMembers('file:///ConditionalCallableUse.php', source.indexOf('$crossIndependent->shared') + '$crossIndependent->shared'.length)).toEqual([]);
    expect(workspace.incompatibleArguments('file:///ConditionalCallableUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['ConditionalCallable\\OtherResult', 'ConditionalCallable\\ReadyResult'],
    ]);
  });
  it('uses caller strictness when validating scalar arguments before propagating a PHPDoc Callable result', () => {
    workspace.update('file:///WeakCallableDefinitions.php', `<?php namespace WeakCallableTypes;
      class ParentType {} class OtherType {} function acceptParent(ParentType $value): void {}`);
    workspace.update('file:///WeakCallableUse.php', `<?php namespace WeakCallableTypes;
      /** @param callable(int): OtherType $callable */
      function run(callable $callable): void { acceptParent($callable('1')); }`);
    expect(workspace.incompatibleArguments('file:///WeakCallableUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['WeakCallableTypes\\OtherType', 'WeakCallableTypes\\ParentType'],
    ]);

    workspace.update('file:///StrictCallableDefinitions.php', `<?php namespace StrictCallableTypes;
      class ParentType {} class OtherType {} function acceptParent(ParentType $value): void {}`);
    workspace.update('file:///StrictCallableUse.php', `<?php declare(strict_types=1); namespace StrictCallableTypes;
      /** @param callable(int): OtherType $callable */
      function run(callable $callable): void { acceptParent($callable('1')); }`);
    expect(workspace.incompatibleArguments('file:///StrictCallableUse.php')).toEqual([]);
  });
  it('infers callable templates from direct and nested proven arguments before resolving return types', () => {
    workspace.update('file:///CallTemplateDefinitions.php', `<?php namespace CallTemplates;
      class ParentType {} class ChildType extends ParentType {} class OtherType { public function onlyOther(): void {} }
      /** @template T */ class Box {}
      /** @template TValue */ class Fixed {
        /** @template T
         * @param list<T> $values
         * @return Fixed<T> */ public static function fromArray(array $values) {}
        /** @return TValue */ public function current() {}
      }
      function acceptChild(ChildType $value): void {}
      /** @template T
       * @param T $value
       * @return T */ function identity($value) {}
      /** @template T
       * @param list<T> $values
       * @return T */ function first(array $values) {}
      /** @template T
       * @param Box<T> $box
       * @return T */ function unwrap(Box $box) {}
      /** @template T of ParentType
       * @param T $value
       * @return T */ function bounded($value) {}
      /** @template T
       * @param T $left
       * @param T $right
       * @return T */ function same($left, $right) {}
      /** @template T
       * @param T ...$values
       * @return T */ function all(...$values) {}
      /** @template T
       * @param array{id: int, value: T} $record
       * @return T */ function shapeValue(array $record) {}
      class Methods { /** @template T
       * @param T $value
       * @return T */ public function keep($value) {} }
    `);
    const source = `<?php namespace CallTemplates;
      /** @param Box<OtherType> $box */
      function run(Box $box, Methods $methods, array $dynamicArguments): void {
        acceptChild(identity(new OtherType()));
        acceptChild(first(['wrong']));
        acceptChild(unwrap($box));
        acceptChild($methods->keep(new OtherType()));
        acceptChild(identity(value: new OtherType()));
        acceptChild(all(new OtherType(), new OtherType()));
        acceptChild(shapeValue(['id' => 1, 'value' => 'wrong']));
        acceptChild(identity(...[new OtherType()]));
        acceptChild(identity(...['value' => new OtherType()]));
        $arguments = [new OtherType()]; acceptChild(identity(...$arguments));
        $builtNamedArguments = []; $builtNamedArguments['value'] = new OtherType(); acceptChild(identity(...$builtNamedArguments));
        acceptChild(all(...[new OtherType(), new OtherType()]));
        acceptChild(identity(new ChildType()));
        acceptChild(bounded(new OtherType()));
        acceptChild(same(new ChildType(), new OtherType()));
        acceptChild(identity(new OtherType(), new OtherType()));
        acceptChild(shapeValue(['id' => 'wrong', 'value' => 'wrong']));
        acceptChild(identity(...$dynamicArguments));
        $mutatedArguments = [new OtherType()]; $mutatedArguments[] = new OtherType(); acceptChild(identity(...$mutatedArguments));
        $fixed = Fixed::fromArray([new OtherType()]); $fixedItem = $fixed->current(); $fixedItem->onlyO;
      }`;
    workspace.update('file:///CallTemplateUse.php', source);
    expect(workspace.completeMembers('file:///CallTemplateUse.php', source.indexOf('$fixedItem->onlyO') + '$fixedItem->onlyO'.length)
      .map((item) => item.name)).toEqual(['onlyOther']);
    expect(workspace.incompatibleArguments('file:///CallTemplateUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['CallTemplates\\OtherType', 'CallTemplates\\ChildType'],
      ['string', 'CallTemplates\\ChildType'],
      ['CallTemplates\\OtherType', 'CallTemplates\\ChildType'],
      ['CallTemplates\\OtherType', 'CallTemplates\\ChildType'],
      ['CallTemplates\\OtherType', 'CallTemplates\\ChildType'],
      ['CallTemplates\\OtherType', 'CallTemplates\\ChildType'],
      ['string', 'CallTemplates\\ChildType'],
      ['CallTemplates\\OtherType', 'CallTemplates\\ChildType'],
      ['CallTemplates\\OtherType', 'CallTemplates\\ChildType'],
      ['CallTemplates\\OtherType', 'CallTemplates\\ChildType'],
      ['CallTemplates\\OtherType', 'CallTemplates\\ChildType'],
      ['CallTemplates\\OtherType', 'CallTemplates\\ChildType'],
    ]);
  });
  it('evaluates proven PHPDoc conditional return types and unions unknown branches', () => {
    workspace.update('file:///ConditionalReturnTypes.php', `<?php namespace ConditionalReturns;
      class Base {} class Ready extends Base { public function onlyReady(): void {} public function common(): void {} }
      class Other extends Base { public function onlyOther(): void {} public function common(): void {} }
      /** @return ($ready is true ? Ready : Other) */ function choose(bool $ready) {}
      /** @return ($ready is true ? Ready : Other) */ function chooseDefault(bool $ready = true) {}
      /** @return ($ready is not false ? Ready : Other) */ function chooseNotFalse(bool $ready) {}
      /** @template T of Base
       * @param T $value
       * @return (T is Ready ? Ready : Other) */ function chooseByType($value) {}
      class Chooser {
        /** @return ($flag is true ? Ready : Other) */ public static function chooseStatic(bool $flag) {}
        /** @return ($flag is true ? Ready : Other) */ public function chooseMember(bool $flag) {}
      }
      function run(bool $dynamic, Chooser $chooser): void {
        $ready = choose(true); $ready->only;
        $defaultReady = chooseDefault(); $defaultReady->only;
        $other = choose(false); $other->only;
        $notFalse = chooseNotFalse(true); $notFalse->only;
        $typedReady = chooseByType(new Ready()); $typedReady->only;
        $typedOther = chooseByType(new Other()); $typedOther->only;
        $named = choose(ready: false); $named->only;
        $static = Chooser::chooseStatic(true); $static->only;
        $member = $chooser->chooseMember(false); $member->only;
        $unknown = choose($dynamic); $unknown->common; $unknown->only;
      }`);
    const source = workspace.source('file:///ConditionalReturnTypes.php')!;
    const onlyPositions = [...source.matchAll(/->only;/g)].map((item) => item.index + '->only'.length);
    expect(workspace.completeMembers('file:///ConditionalReturnTypes.php', onlyPositions[0]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///ConditionalReturnTypes.php', onlyPositions[1]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///ConditionalReturnTypes.php', onlyPositions[2]!).map((item) => item.name)).toEqual(['onlyOther']);
    expect(workspace.completeMembers('file:///ConditionalReturnTypes.php', onlyPositions[3]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///ConditionalReturnTypes.php', onlyPositions[4]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///ConditionalReturnTypes.php', onlyPositions[5]!).map((item) => item.name)).toEqual(['onlyOther']);
    expect(workspace.completeMembers('file:///ConditionalReturnTypes.php', onlyPositions[6]!).map((item) => item.name)).toEqual(['onlyOther']);
    expect(workspace.completeMembers('file:///ConditionalReturnTypes.php', onlyPositions[7]!).map((item) => item.name)).toEqual(['onlyReady']);
    expect(workspace.completeMembers('file:///ConditionalReturnTypes.php', onlyPositions[8]!).map((item) => item.name)).toEqual(['onlyOther']);
    expect(workspace.completeMembers('file:///ConditionalReturnTypes.php', onlyPositions[9]!)).toEqual([]);
    const common = source.indexOf('$unknown->common') + '$unknown->common'.length;
    expect(workspace.completeMembers('file:///ConditionalReturnTypes.php', common).map((item) => item.name)).toEqual(['common']);
  });
  it('correlates repeated subjects across nested PHPDoc conditional branches', () => {
    workspace.update('file:///NestedConditionalTypes.php', `<?php namespace NestedConditional;
      class InputBase {} class InputA extends InputBase {} class InputB extends InputBase {}
      class ResultA { public function shared(): void {} }
      class ResultB { public function shared(): void {} }
      class Impossible { public function impossible(): void {} }
      /** @return ($flag is true ? ($flag is false ? Impossible : ResultA) : ResultB) */
      function chooseBool(bool $flag) {}
      /** @return ($value is InputA ? ($value is not InputB ? ResultA : Impossible) : ResultB) */
      function chooseObject(InputA|InputB $value) {}
      /** @return ($left is true ? ($right is false ? Impossible : ResultA) : ResultB) */
      function chooseCross(bool $left, bool $right) {}
      function run(bool $flag, bool $other, InputA|InputB $value): void {
        $nestedBool = chooseBool($flag); $nestedBool->sha; $nestedBool->impossible;
        $nestedObject = chooseObject($value); $nestedObject->shared();
        $crossAlias = chooseCross($flag, $flag); $crossAlias->shared();
        $crossNamedAlias = chooseCross(right: $flag, left: $flag); $crossNamedAlias->shared();
        $crossIndependent = chooseCross($flag, $other); $crossIndependent->shared();
      }`);
    const source = workspace.source('file:///NestedConditionalTypes.php')!;
    const shared = source.indexOf('$nestedBool->sha') + '$nestedBool->sha'.length;
    expect(workspace.completeMembers('file:///NestedConditionalTypes.php', shared).map((item) => item.name)).toEqual(['shared']);
    const impossible = source.indexOf('$nestedBool->impossible') + '$nestedBool->impossible'.length;
    expect(workspace.completeMembers('file:///NestedConditionalTypes.php', impossible)).toEqual([]);
    const objectShared = source.indexOf('$nestedObject->shared') + '$nestedObject->shared'.length;
    expect(workspace.definition('file:///NestedConditionalTypes.php', objectShared)).toHaveLength(2);
    const crossAlias = source.indexOf('$crossAlias->shared') + '$crossAlias->shared'.length;
    expect(workspace.definition('file:///NestedConditionalTypes.php', crossAlias)).toHaveLength(2);
    const crossNamedAlias = source.indexOf('$crossNamedAlias->shared') + '$crossNamedAlias->shared'.length;
    expect(workspace.definition('file:///NestedConditionalTypes.php', crossNamedAlias)).toHaveLength(2);
    const crossIndependent = source.indexOf('$crossIndependent->shared') + '$crossIndependent->shared'.length;
    expect(workspace.definition('file:///NestedConditionalTypes.php', crossIndependent)).toEqual([]);
  });
  it('infers call templates through generic inheritance after parameter substitution and reordering', () => {
    workspace.update('file:///InheritedCallTemplateDefinitions.php', `<?php namespace InheritedCallTemplates;
      class ParentType {} class ChildType extends ParentType {} class OtherType {}
      /** @template-covariant A
       * @template-covariant B */ class Pair {}
      /** @template X
       * @template Y
       * @extends Pair<Y, X> */ class Reversed extends Pair {}
      /** @template Z
       * @extends Reversed<Z, ChildType> */ class Recursive extends Reversed {}
      function acceptChild(ChildType $value): void {}
      /** @template T
       * @param Pair<ChildType, T> $pair
       * @return T */ function second(Pair $pair) {}`);
    const source = `<?php namespace InheritedCallTemplates;
      /** @param Reversed<OtherType, ChildType> $reordered
       * @param Recursive<ParentType> $recursive
       * @param Reversed<ChildType, OtherType> $wrongFirst */
      function run(Reversed $reordered, Recursive $recursive, Reversed $wrongFirst): void {
        acceptChild(second($reordered));
        acceptChild(second($recursive));
        acceptChild(second($wrongFirst));
      }`;
    workspace.update('file:///InheritedCallTemplateUse.php', source);
    expect(workspace.incompatibleArguments('file:///InheritedCallTemplateUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['InheritedCallTemplates\\OtherType', 'InheritedCallTemplates\\ChildType'],
      ['InheritedCallTemplates\\ParentType', 'InheritedCallTemplates\\ChildType'],
    ]);
  });
  it('merges structurally consistent union branches during call template inference', () => {
    workspace.update('file:///UnionCallTemplateDefinitions.php', `<?php namespace UnionCallTemplates;
      class ChildType {} class OtherType {}
      /** @template-covariant T */ class Producer {}
      /** @template T */ class InvariantBox {}
      /** @template-covariant T
       * @template-covariant U */ class Pair {}
      /** @template-covariant T */ class Envelope {}
      function acceptChild(ChildType $value): void {}
      /** @param Pair<ChildType, OtherType> $pair */ function acceptExactPair(Pair $pair): void {}
      /** @param Envelope<Pair<ChildType, OtherType>> $value */ function acceptExactEnvelope(Envelope $value): void {}
      /** @template T
       * @param Producer<T> $producer
       * @return T */ function unwrap(Producer $producer) {}
      /** @template T
       * @param InvariantBox<T> $box
       * @return T */ function unwrapInvariant(InvariantBox $box) {}
      /** @template T
       * @template U
       * @param Pair<T, U> $pair
       * @return Pair<T, U> */ function preservePair(Pair $pair) {}
      /** @template T
       * @template U
       * @param Envelope<Pair<T, U>> $value
       * @return Envelope<Pair<T, U>> */ function preserveNested(Envelope $value) {}`);
    const source = `<?php namespace UnionCallTemplates;
      /** @param Producer<ChildType>|Producer<OtherType> $variant
       * @param InvariantBox<ChildType>|InvariantBox<OtherType> $invariantVariant
       * @param Pair<ChildType, OtherType>|Pair<OtherType, ChildType> $correlatedPair
       * @param Envelope<Pair<ChildType, OtherType>|Pair<OtherType, ChildType>> $nestedCorrelated */
      function run($variant, $invariantVariant, $correlatedPair, $nestedCorrelated): void {
        acceptChild(unwrap($variant));
        acceptChild(unwrapInvariant($invariantVariant));
        acceptExactPair(preservePair($correlatedPair));
        acceptExactEnvelope(preserveNested($nestedCorrelated));
      }`;
    workspace.update('file:///UnionCallTemplateUse.php', source);
    expect(workspace.incompatibleArguments('file:///UnionCallTemplateUse.php').map((item) => [item.actualType, item.expectedType])).toEqual([
      ['UnionCallTemplates\\ChildType|UnionCallTemplates\\OtherType', 'UnionCallTemplates\\ChildType'],
      ['UnionCallTemplates\\ChildType|UnionCallTemplates\\OtherType', 'UnionCallTemplates\\ChildType'],
      ['UnionCallTemplates\\Pair<UnionCallTemplates\\ChildType, UnionCallTemplates\\OtherType>|UnionCallTemplates\\Pair<UnionCallTemplates\\OtherType, UnionCallTemplates\\ChildType>', 'UnionCallTemplates\\Pair<UnionCallTemplates\\ChildType, UnionCallTemplates\\OtherType>'],
      ['UnionCallTemplates\\Envelope<UnionCallTemplates\\Pair<UnionCallTemplates\\ChildType, UnionCallTemplates\\OtherType>>|UnionCallTemplates\\Envelope<UnionCallTemplates\\Pair<UnionCallTemplates\\OtherType, UnionCallTemplates\\ChildType>>', 'UnionCallTemplates\\Envelope<UnionCallTemplates\\Pair<UnionCallTemplates\\ChildType, UnionCallTemplates\\OtherType>>'],
    ]);
  });
  it('reports proven scalar literal mismatches only under strict types', () => {
    const strict = `<?php declare(strict_types=1); namespace StrictLiterals;
      function accept(int $count, string $label, bool $enabled, array $items): void {}
      function run(): void { accept('1', 2, 0, 'items'); accept(1, 'ok', true, []); }
      function wrongInt(): int { return '1'; }
      function wrongString(): string { return false; }
      function validFloat(): float { return 1.5e2; }
    `;
    workspace.update('file:///StrictLiterals.php', strict);
    expect(workspace.incompatibleArguments('file:///StrictLiterals.php').map((item) => [item.parameter, item.actualType, item.expectedType])).toEqual([
      ['count', 'string', 'int'], ['label', 'int', 'string'], ['enabled', 'int', 'bool'], ['items', 'string', 'array'],
    ]);
    expect(workspace.incompatibleReturns('file:///StrictLiterals.php').map((item) => [item.callable, item.actualType, item.expectedType])).toEqual([
      ['StrictLiterals\\wrongInt', 'string', 'int'], ['StrictLiterals\\wrongString', 'bool', 'string'],
    ]);
    const weak = `<?php namespace WeakLiterals;
      function accept(int $count, string $label, bool $enabled, array $items): void {}
      function run(): void { accept('1', 2, 0, 'items'); }
      function coerced(): int { return '1'; }
      function wrongArray(): array { return 'items'; }
    `;
    workspace.update('file:///WeakLiterals.php', weak);
    expect(workspace.incompatibleArguments('file:///WeakLiterals.php').map((item) => [item.parameter, item.actualType, item.expectedType])).toEqual([
      ['items', 'string', 'array'],
    ]);
    expect(workspace.incompatibleReturns('file:///WeakLiterals.php').map((item) => [item.callable, item.actualType, item.expectedType])).toEqual([
      ['WeakLiterals\\wrongArray', 'string', 'array'],
    ]);
  });
  it('reports proven native return incompatibilities and skips dynamic or generator results', () => {
    const source = `<?php namespace ReturnTypes;
      class Base {} class Child extends Base {} class Other {}
      function valid(Child $child): Base { return $child; }
      function wrong(Other $other): Base { return $other; }
      function nullable(): ?Base { return null; }
      function nonNull(): Base { return null; }
      function emptyReturn(): Base { return; }
      function badVoid(): void { return new Base(); }
      function badNever(): never { return null; }
      function badEmptyNever(): never { return; }
      function dynamic(mixed $value): Base { return $value; }
      function generator(): iterable { yield new Other(); return new Other(); }
    `;
    workspace.update('file:///ReturnTypes.php', source);
    expect(workspace.incompatibleReturns('file:///ReturnTypes.php').map((item) => [item.callable, item.actualType, item.expectedType])).toEqual([
      ['ReturnTypes\\wrong', 'ReturnTypes\\Other', 'ReturnTypes\\Base'],
      ['ReturnTypes\\nonNull', 'null', 'ReturnTypes\\Base'],
      ['ReturnTypes\\emptyReturn', 'void', 'ReturnTypes\\Base'],
      ['ReturnTypes\\badVoid', 'value', 'void'],
      ['ReturnTypes\\badNever', 'value', 'never'],
      ['ReturnTypes\\badEmptyNever', 'void', 'never'],
    ]);
  });
  it('does not freeze a parameter variable to its entry type after reassignment', () => {
    const source = `<?php namespace AssignmentTypes;
      class Base {} class Child extends Base {} class Other {}
      function run(Base $base, ?Base $optional, Child $child, Other $other, mixed $dynamic): void {
        $base = $child; $optional = null; $base = $other; $base = null; $optional = new Other(); $base = $dynamic; $base = factory();
      }
    `;
    workspace.update('file:///AssignmentTypes.php', source);
    expect(workspace.incompatibleAssignments('file:///AssignmentTypes.php')).toEqual([]);
  });
  it('reports only proven incompatible direct assignments to typed object properties', () => {
    const source = `<?php namespace PropertyAssignments;
      class Base {} class Child extends Base {} class Other {} class State { public Base $value; public ?Base $optional; }
      function update(State $state, Child $child, Other $other, mixed $dynamic): void {
        $state->value = $child; $state->optional = null; $state->value = $other; $state->value = null;
        $state->optional = new Other(); $state->value = $dynamic; $state->unknown = $other;
      }
    `;
    workspace.update('file:///PropertyAssignments.php', source);
    expect(workspace.incompatibleAssignments('file:///PropertyAssignments.php').map((item) => [item.variable, item.actualType, item.expectedType])).toEqual([
      ['state->value', 'PropertyAssignments\\Other', 'PropertyAssignments\\Base'],
      ['state->value', 'null', 'PropertyAssignments\\Base'],
      ['state->optional', 'PropertyAssignments\\Other', 'PropertyAssignments\\Base|null'],
    ]);
  });
  it('checks direct scalar literal property assignments with strict coercion rules', () => {
    const strict = `<?php declare(strict_types=1); namespace StrictProperties;
      class State { public int $count; public string $label; public bool $enabled; public array $items; public float $ratio; }
      function update(State $state): void {
        $state->count = '1'; $state->label = 2; $state->enabled = 0; $state->items = 'items';
        $state->count = 1; $state->label = 'ok'; $state->enabled = true; $state->items = []; $state->ratio = 1.5e2;
      }
    `;
    workspace.update('file:///StrictProperties.php', strict);
    expect(workspace.incompatibleAssignments('file:///StrictProperties.php').map((item) => [item.variable, item.actualType, item.expectedType])).toEqual([
      ['state->count', 'string', 'int'], ['state->label', 'int', 'string'], ['state->enabled', 'int', 'bool'], ['state->items', 'string', 'array'],
    ]);
    const weak = `<?php namespace WeakProperties;
      class State { public int $count; public string $label; public bool $enabled; public array $items; }
      function update(State $state): void { $state->count = '1'; $state->label = 2; $state->enabled = 0; $state->items = 'items'; }
    `;
    workspace.update('file:///WeakProperties.php', weak);
    expect(workspace.incompatibleAssignments('file:///WeakProperties.php').map((item) => [item.variable, item.actualType, item.expectedType])).toEqual([
      ['state->items', 'string', 'array'],
    ]);
  });
  it('reports only definitely external writes to readonly properties', () => {
    const source = `<?php namespace ReadonlyWrites;
      class State { public readonly int $id; public int $count; public function initialize(): void { $this->id = 1; } }
      class Child extends State { public function initializeChild(): void { $this->id = 1; } }
      class Other { public function mutate(State $state): void { $state->id = 2; $state->count = 2; } }
      enum Status: string { case Ready = 'ready'; }
      function mutate(State $state, Status $status): void { $state->id = 3; $status->value = 'other'; $status->name = 'Other'; }
    `;
    workspace.update('file:///ReadonlyWrites.php', source);
    expect(workspace.readonlyPropertyAssignments('file:///ReadonlyWrites.php').map((item) => [item.ownerFqcn, item.name])).toEqual([
      ['ReadonlyWrites\\State', 'id'], ['ReadonlyWrites\\State', 'id'], ['ReadonlyWrites\\Status', 'value'], ['ReadonlyWrites\\Status', 'name'],
    ]);
  });
  it('uses readonly class facts for member metadata and external write diagnostics', () => {
    const source = `<?php namespace ReadonlyClassWrites;
      readonly class State { public int $id; public function initialize(): void { $this->id = 1; } }
      readonly class Child extends State { public string $label; public function initializeChild(): void { $this->label = 'ok'; } }
      function mutate(State $state, Child $child): void { $state->id = 2; $child->label = 'changed'; }
    `;
    workspace.update('file:///ReadonlyClassWrites.php', source);
    const id = source.indexOf('$state->id') + '$state->'.length;
    const label = source.indexOf('$child->label') + '$child->'.length;
    expect(workspace.memberAt('file:///ReadonlyClassWrites.php', id + 1)).toMatchObject({ kind: 'property', name: 'id', readonly: true });
    expect(workspace.memberAt('file:///ReadonlyClassWrites.php', label + 1)).toMatchObject({ kind: 'property', name: 'label', readonly: true });
    expect(workspace.readonlyPropertyAssignments('file:///ReadonlyClassWrites.php').map((item) => [item.ownerFqcn, item.name, item.minimumPhpVersion])).toEqual([
      ['ReadonlyClassWrites\\State', 'id', '8.2'], ['ReadonlyClassWrites\\Child', 'label', '8.2'],
    ]);
  });
  it('reports proven indirect readonly modifications while preserving legal initialization and interior object mutation', () => {
    const builtinUri = 'php-companion-builtin:/reference-functions.php';
    workspace.update(builtinUri, `<?php
      function sort(array &$array, int $flags = 0): true {}
      function array_pop(array &$array): mixed {}
      function array_shift(array &$array): mixed {}
      function array_push(array &$array, mixed ...$values): int {}
      function array_unshift(array &$array, mixed ...$values): int {}
      function array_splice(array &$array, int $offset, ?int $length = null, mixed $replacement = []): array {}
      function shuffle(array &$array): true {}
      function usort(array &$array, callable $callback): true {}
      function preg_match(string $pattern, string $subject, array &$matches = null, int $flags = 0, int $offset = 0): int|false {}
      function preg_match_all(string $pattern, string $subject, array &$matches = null, int $flags = 0, int $offset = 0): int|false {}
      function parse_str(string $string, array &$result): void {}
    `);
    const source = `<?php namespace ReadonlyMutations;
      function takeReference(mixed &$value): void {} function takeValue(mixed $value): void {}
      class State {
        public readonly int $id; public readonly array $items; public readonly object $object;
        public function initialize(): void { $this->id = 1; unset($this->items); $this->object->value = 1; }
        public function mutate(): void {
          $this->id += 1; $this->id++; ++$this->id; $this->id ??= 1;
          $this->items[] = 1; $this->items[0][] = 2;
          $reference =& $this->id; $this->id =& $reference;
          takeReference($this->id); takeReference(value: $this->id); takeValue($this->id);
          sort($this->items); array_pop($this->items); array_shift($this->items); array_push($this->items, 1); array_unshift($this->items, 1);
          array_splice($this->items, 0); shuffle($this->items); usort($this->items, fn ($a, $b) => $a <=> $b);
          preg_match('/x/', 'x', $this->items); preg_match_all('/x/', 'x', $this->items); parse_str('x=1', $this->items); unknown_internal($this->items);
          foreach ($this->items as &$item) {} foreach ($this->items as $item) {}
        }
      }
      function external(State $state): void { unset($state->items); }
    `;
    workspace.update('file:///ReadonlyMutations.php', source);
    const mutations = workspace.readonlyPropertyAssignments('file:///ReadonlyMutations.php');
    const expected = ['id', 'id', 'id', 'id', 'items', 'items', 'id', 'id', 'id', 'id',
      'items', 'items', 'items', 'items', 'items', 'items', 'items', 'items', 'items', 'items', 'items', 'items', 'items'];
    expect(mutations.map((item) => item.name)).toEqual(expected);
    expect(mutations.every((item) => source.slice(item.start, item.end) === item.name && item.minimumPhpVersion === '8.1')).toBe(true);
    workspace.update('file:///ReadonlyMutations.php', source, true);
    expect(workspace.readonlyPropertyAssignments('file:///ReadonlyMutations.php').map((item) => item.name)).toEqual(expected);
    workspace.remove(builtinUri);
  });
  it('reports promoted-constructor reassignment and definitely repeated readonly initialization across control flow', () => {
    const source = `<?php namespace ReadonlyInitialization;
      class State {
        public readonly int $id; public readonly int $choice; public readonly int $partial;
        public readonly int $looped; public readonly int $loopOnly; public readonly int $whileForever; public readonly int $forForever;
        public readonly int $doForever; public readonly int $loopBreak; public readonly int $loopContinue; public readonly int $afterInfinite;
        public readonly int $finiteUp; public readonly int $finiteDown; public readonly int $finiteOnce; public readonly int $finiteCounterUse; public readonly int $finiteBreak;
        public readonly int $whole; public readonly int $wholeBefore; public readonly int $early;
        public readonly int $chain; public readonly int $throwing; public readonly int $exiting; public readonly int $tryAll; public readonly int $tryPartial;
        public readonly int $tryFinally; public readonly int $finallyWrite; public readonly int $finallyRepeat; public readonly int $finallyProvides;
        public readonly int $finallyAbrupt; public readonly int $switchAll; public readonly int $switchPartial;
        public readonly int $switchFallthrough; public readonly int $switchReturn; public readonly int $switchComplex; public readonly int $unreachable; public readonly int $jumped;
        public readonly int $switchNested; public readonly int $switchNestedPartial; public readonly int $switchNestedLevel;
        public function __construct(public readonly int $promoted) { $this->promoted = 2; }
        public function initialize(): void { $this->id = 1; $this->id = 2; }
        public function choose(bool $flag): void { if ($flag) { $this->choice = 1; } else { $this->choice = 2; } $this->choice = 3; }
        public function partial(bool $flag): void { if ($flag) { $this->partial = 1; } $this->partial = 2; }
        public function looped(bool $flag): void { $this->looped = 1; while ($flag) { $this->looped = 2; } }
        public function loopOnly(bool $flag): void { while ($flag) { $this->loopOnly = 1; } $this->loopOnly = 2; }
        public function whileForever(): void { while (true) { $this->whileForever = 1; } }
        public function forForever(): void { for (;;) { $this->forForever = 1; } }
        public function doForever(): void { do { $this->doForever = 1; } while (true); }
        public function loopBreak(): void { while (true) { $this->loopBreak = 1; break; } }
        public function loopContinue(bool $flag): void { while (true) { if ($flag) { continue; } $this->loopContinue = 1; } }
        public function afterInfinite(): void { $this->afterInfinite = 1; while (true) { return; } $this->afterInfinite = 2; }
        public function finiteUp(): void { for ($index = 0; $index < 2; $index++) { $this->finiteUp = 1; } }
        public function finiteDown(): void { for ($index = 2; $index > 0; $index--) { $this->finiteDown = 1; } }
        public function finiteOnce(): void { for ($index = 0; $index < 1; $index++) { $this->finiteOnce = 1; } }
        public function finiteCounterUse(): void { for ($index = 0; $index < 2; $index++) { echo $index; $this->finiteCounterUse = 1; } }
        public function finiteBreak(): void { for ($index = 0; $index < 2; $index++) { $this->finiteBreak = 1; break; } }
        public function iterateWhole(): void { $this->whole = 1; foreach ($this as &$value) {} }
        public function iterateWholeBefore(): void { foreach ($this as &$value) {} $this->wholeBefore = 1; }
        public function early(bool $flag): void { if ($flag) { return; } else { $this->early = 1; } $this->early = 2; }
        public function chain(int $value): void { if ($value === 1) { $this->chain = 1; } elseif ($value === 2) { $this->chain = 2; } else { $this->chain = 3; } $this->chain = 4; }
        public function throwing(bool $flag): void { if ($flag) { throw new \\RuntimeException(); } else { $this->throwing = 1; } $this->throwing = 2; }
        public function exiting(bool $flag): void { if ($flag) { exit(1); } else { $this->exiting = 1; } $this->exiting = 2; }
        public function tryAll(): void { try { $this->tryAll = 1; } catch (\\RuntimeException $error) { $this->tryAll = 2; } $this->tryAll = 3; }
        public function tryPartial(): void { try { $this->tryPartial = 1; } catch (\\RuntimeException $error) {} $this->tryPartial = 2; }
        public function tryFinally(): void { try { $this->tryFinally = 1; } catch (\\RuntimeException $error) { $this->tryFinally = 2; } finally { echo 'done'; } $this->tryFinally = 3; }
        public function finallyWrite(bool $flag): void { try { if ($flag) { $this->finallyWrite = 1; } } finally { $this->finallyWrite = 2; } }
        public function finallyRepeat(): void { try { $this->finallyRepeat = 1; } catch (\\RuntimeException $error) { $this->finallyRepeat = 2; } finally { $this->finallyRepeat = 3; } }
        public function finallyProvides(bool $flag): void { try { if ($flag) { echo 'optional'; } } finally { $this->finallyProvides = 1; } $this->finallyProvides = 2; }
        public function finallyAbrupt(bool $flag): void { try { if ($flag) { return; } $this->finallyAbrupt = 1; } finally { $this->finallyAbrupt = 2; } $this->finallyAbrupt = 3; }
        public function switchAll(int $value): void { switch ($value) { case 1: $this->switchAll = 1; break; case 2: $this->switchAll = 2; break; default: $this->switchAll = 3; } $this->switchAll = 4; }
        public function switchPartial(int $value): void { switch ($value) { case 1: $this->switchPartial = 1; break; } $this->switchPartial = 2; }
        public function switchFallthrough(int $value): void { switch ($value) { case 1: $this->switchFallthrough = 1; case 2: $this->switchFallthrough = 2; break; default: $this->switchFallthrough = 3; } $this->switchFallthrough = 4; }
        public function switchReturn(int $value): void { switch ($value) { case 1: return; default: $this->switchReturn = 1; } $this->switchReturn = 2; }
        public function switchComplex(int $value, bool $flag): void { switch ($value) { case 1: if ($flag) { break; } $this->switchComplex = 1; break; default: $this->switchComplex = 2; } $this->switchComplex = 3; }
        public function switchNested(int $outer, int $inner): void { switch ($outer) { case 1: switch ($inner) { case 1: $this->switchNested = 1; break; default: $this->switchNested = 2; } break; default: $this->switchNested = 3; } $this->switchNested = 4; }
        public function switchNestedPartial(int $outer, int $inner): void { switch ($outer) { case 1: switch ($inner) { case 1: $this->switchNestedPartial = 1; break; } break; default: $this->switchNestedPartial = 2; } $this->switchNestedPartial = 3; }
        public function switchNestedLevel(int $outer, int $inner): void { switch ($outer) { case 1: switch ($inner) { case 1: break 2; default: $this->switchNestedLevel = 1; } break; default: $this->switchNestedLevel = 2; } $this->switchNestedLevel = 3; }
        public function unreachable(): void { $this->unreachable = 1; return; $this->unreachable = 2; }
        public function jump(): void { goto assign; $this->jumped = 1; assign: $this->jumped = 2; }
      }
    `;
    workspace.update('file:///ReadonlyInitialization.php', source);
    expect(workspace.readonlyPropertyAssignments('file:///ReadonlyInitialization.php').map((item) => item.name)).toEqual([
      'promoted', 'id', 'choice', 'looped', 'whileForever', 'forForever', 'doForever', 'finiteUp', 'finiteDown', 'whole', 'early', 'chain', 'throwing', 'exiting', 'tryAll', 'tryFinally',
      'finallyRepeat', 'finallyProvides',
      'switchAll', 'switchFallthrough', 'switchReturn', 'switchNested',
    ]);
    expect(workspace.readonlyPropertyAssignments('file:///ReadonlyInitialization.php').find((item) => item.operation === 'reference-iteration')).toMatchObject({
      name: 'whole', propertyNames: ['whole'], minimumPhpVersion: '8.1',
    });
  });
  it('bounds local syntax and control-flow traversal without weakening supported nesting', () => {
    const nestedBlocks = (count: number): string => `${'{'.repeat(count)} $this->value = 1; ${'}'.repeat(count)}`;
    const supported = `<?php namespace LocalSyntaxBudget;
      class Supported { public readonly int $value; public function initialize(): void { ${nestedBlocks(180)} $this->value = 2; } }
    `;
    workspace.update('file:///LocalSyntaxSupported.php', supported);
    expect(workspace.readonlyPropertyAssignments('file:///LocalSyntaxSupported.php').map((item) => item.name)).toEqual(['value']);

    const excessive = `<?php namespace LocalSyntaxBudget;
      class Excessive { public readonly int $value; public function initialize(): void { ${nestedBlocks(300)} $this->value = 2; } }
    `;
    workspace.update('file:///LocalSyntaxExcessive.php', excessive);
    expect(workspace.readonlyPropertyAssignments('file:///LocalSyntaxExcessive.php')).toEqual([]);
  });
  it('reports by-reference iteration of visible promoted readonly properties on a directly constructed local object', () => {
    const source = `<?php namespace ConstructedIteration;
      class State {
        public readonly int $later;
        public readonly int $body; public readonly int $partial;
        public function __construct(public readonly int $id, private readonly string $secret, bool $flag = false) {
          if ($flag) { $this->body = 1; } else { $this->body = 2; }
          if ($flag) { $this->partial = 1; }
        }
      }
      class ReturningState {
        public readonly int $value;
        public function __construct(bool $leave) { if ($leave) { return; } $this->value = 1; }
      }
      class Consumer {
        public function inspect(State $parameter, bool $flag): void {
          $state = new State(1, 'secret'); foreach ($state as &$value) {}
          if ($flag) { $conditional = new State(2, 'conditional'); } foreach ($conditional as &$value) {}
          $overwritten = new State(3, 'before'); $overwritten = $parameter; foreach ($overwritten as &$value) {}
          $returning = new ReturningState(false); foreach ($returning as &$value) {}
          foreach ($parameter as &$value) {}
        }
      }
    `;
    workspace.update('file:///ConstructedIteration.php', source);
    const assignments = workspace.readonlyPropertyAssignments('file:///ConstructedIteration.php');
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({ operation: 'reference-iteration', ownerFqcn: 'ConstructedIteration\\State',
      name: 'body', propertyNames: ['body', 'id'], minimumPhpVersion: '8.1' });
    expect(source.slice(assignments[0]!.start, assignments[0]!.end)).toBe('$state');
  });
  it('retains unrelated factory summaries and invalidates the changed callable precisely', () => {
    const factoryUri = 'file:///TargetedFactory.php';
    let factoryParses = 0;
    const countingParser = {
      parse: (...arguments_: Parameters<PhpSyntaxParser['parse']>) => {
        if (arguments_[2] === factoryUri) factoryParses += 1;
        return parser.parse(...arguments_);
      },
    } as PhpSyntaxParser;
    const isolated = new SemanticWorkspace(countingParser);
    const factorySource = `<?php namespace TargetedCache;
      class State { public function __construct(public readonly int $id) {} }
      function make(): State { return new State(1); }`;
    isolated.update(factoryUri, factorySource);
    const consumerUri = 'file:///TargetedConsumer.php';
    isolated.update(consumerUri, `<?php namespace TargetedCache;
      class Consumer { public function consume(): void { $state = make(); foreach ($state as &$value) {} } }`);
    factoryParses = 0;
    expect(isolated.readonlyPropertyAssignments(consumerUri).map((item) => item.propertyNames)).toEqual([['id']]);
    expect(factoryParses).toBeGreaterThan(0);

    isolated.update('file:///UnrelatedCache.php', '<?php namespace Other; function unrelated(): void {}');
    factoryParses = 0;
    expect(isolated.readonlyPropertyAssignments(consumerUri).map((item) => item.propertyNames)).toEqual([['id']]);
    expect(factoryParses).toBe(0);

    const triviaOnly = isolated.update(factoryUri, `${factorySource}\n`);
    expect(triviaOnly).toMatchObject({ kind: 'none', changedCallables: [], changedTypes: [] });
    factoryParses = 0;
    expect(isolated.readonlyPropertyAssignments(consumerUri).map((item) => item.propertyNames)).toEqual([['id']]);
    expect(factoryParses).toBe(0);

    const bodyChanged = isolated.update(factoryUri, factorySource.replace('new State(1)', 'new State(2)'));
    expect(bodyChanged).toMatchObject({ kind: 'implementation', changedCallables: ['targetedcache\\make'], changedTypes: [] });
    factoryParses = 0;
    expect(isolated.readonlyPropertyAssignments(consumerUri).map((item) => item.propertyNames)).toEqual([['id']]);
    expect(factoryParses).toBeGreaterThan(0);
    isolated.dispose();
  });
  it('invalidates transitive factory summaries through unique direct-call dependencies', () => {
    const innerUri = 'file:///CallableDependencyInner.php';
    const middleUri = 'file:///CallableDependencyMiddle.php';
    const outerUri = 'file:///CallableDependencyOuter.php';
    let outerParses = 0;
    const countingParser = {
      parse: (...arguments_: Parameters<PhpSyntaxParser['parse']>) => {
        if (arguments_[2] === outerUri) outerParses += 1;
        return parser.parse(...arguments_);
      },
    } as PhpSyntaxParser;
    const isolated = new SemanticWorkspace(countingParser);
    isolated.update(innerUri, `<?php namespace CallableDependency;
      class State { public function __construct(public readonly int $id) {} }
      function inner(): State { return new State(1); }
    `);
    isolated.update(middleUri, `<?php namespace CallableDependency;
      function middle(): State { return inner(); }
    `);
    isolated.update(outerUri, `<?php namespace CallableDependency;
      function outer(): State { return middle(); }
    `);
    const consumerUri = 'file:///CallableDependencyConsumer.php';
    isolated.update(consumerUri, `<?php namespace CallableDependency;
      class Consumer { public function consume(): void { $state = outer(); foreach ($state as &$value) {} } }
    `);

    outerParses = 0;
    expect(isolated.readonlyPropertyAssignments(consumerUri).map((item) => item.propertyNames)).toEqual([['id']]);
    expect(outerParses).toBeGreaterThan(0);

    outerParses = 0;
    isolated.update('file:///CallableDependencyUnrelated.php', '<?php namespace Other; function unrelated(): void {}');
    expect(isolated.readonlyPropertyAssignments(consumerUri).map((item) => item.propertyNames)).toEqual([['id']]);
    expect(outerParses).toBe(0);

    isolated.update(innerUri, `<?php namespace CallableDependency;
      class State { public function __construct(public readonly int $id) {} }
      function inner(): State { return unresolved(new State(2)); }
    `);
    outerParses = 0;
    expect(isolated.readonlyPropertyAssignments(consumerUri)).toEqual([]);
    expect(outerParses).toBeGreaterThan(0);

    isolated.update(outerUri, `<?php namespace CallableDependency;
      function outer(): State { return new State(3); }
    `);
    expect(isolated.readonlyPropertyAssignments(consumerUri).map((item) => item.propertyNames)).toEqual([['id']]);
    outerParses = 0;
    isolated.update(innerUri, `<?php namespace CallableDependency;
      class State { public function __construct(public readonly int $id) {} }
      function inner(): State { return new State(4); }
    `);
    expect(isolated.readonlyPropertyAssignments(consumerUri).map((item) => item.propertyNames)).toEqual([['id']]);
    expect(outerParses).toBe(0);
    isolated.dispose();
  });
  it('restores positive callable factory facts with transitive dependency validation', () => {
    const innerUri = 'file:///PersistentCallableInner.php'; const middleUri = 'file:///PersistentCallableMiddle.php';
    const outerUri = 'file:///PersistentCallableOuter.php'; const unrelatedUri = 'file:///PersistentCallableUnrelated.php';
    const consumerUri = 'file:///PersistentCallableConsumer.php';
    const sources = new Map([
      [innerUri, '<?php namespace PersistentCallable; class State { public function __construct(public readonly int $id) {} } function inner(): State { return new State(1); }'],
      [middleUri, '<?php namespace PersistentCallable; function middle(): State { return inner(); }'],
      [outerUri, '<?php namespace PersistentCallable; function outer(): State { return middle(); } function unknown(): State { return dynamic_factory(); }'],
      [unrelatedUri, '<?php namespace PersistentCallable; class Other {} function unrelated(): Other { return new Other(); }'],
      [consumerUri, '<?php namespace PersistentCallable; class Consumer { public function run(): void { $state = outer(); foreach ($state as &$value) {} $other = unrelated(); foreach ($other as &$value) {} } }'],
    ]);
    const original = new SemanticWorkspace(parser);
    for (const [uri, source] of sources) original.update(uri, source);
    expect(original.readonlyPropertyAssignments(consumerUri).map((item) => item.propertyNames)).toEqual([['id']]);
    const facts = original.callableConstructionFacts();
    expect(facts.flatMap((document) => document.facts.map((fact) => fact.callable))).toEqual([
      'persistentcallable\\inner', 'persistentcallable\\middle', 'persistentcallable\\outer', 'persistentcallable\\unrelated',
    ]);
    const snapshots = [...sources].map(([uri]) => [uri, original.snapshot(uri)] as const); original.dispose();

    let factoryParses = 0;
    const countingParser = { parse: (...arguments_: Parameters<PhpSyntaxParser['parse']>) => {
      if (arguments_[2] === outerUri) factoryParses += 1;
      return parser.parse(...arguments_);
    } } as PhpSyntaxParser;
    const restored = new SemanticWorkspace(countingParser);
    for (const [uri, snapshot] of snapshots) expect(restored.restore(snapshot, uri)).toBe(true);
    expect(restored.restoreCallableConstructionFacts(facts)).toBe(4);
    factoryParses = 0;
    expect(restored.readonlyPropertyAssignments(consumerUri).map((item) => item.propertyNames)).toEqual([['id']]);
    expect(factoryParses).toBe(0);
    restored.update(innerUri, sources.get(innerUri)!.replace('new State(1)', 'dynamic_factory()'));
    factoryParses = 0;
    expect(restored.readonlyPropertyAssignments(consumerUri)).toEqual([]);
    expect(factoryParses).toBeGreaterThan(0);
    restored.dispose();

    const partial = new SemanticWorkspace(parser);
    for (const [uri, snapshot] of snapshots) expect(partial.restore(snapshot, uri)).toBe(true);
    const withoutInner = facts.map((document) => document.uri === innerUri ? { ...document, facts: [] } : document);
    expect(partial.restoreCallableConstructionFacts(withoutInner)).toBe(1);
    expect(partial.callableConstructionFacts().flatMap((document) => document.facts.map((fact) => fact.callable)))
      .toEqual(['persistentcallable\\unrelated']);
    partial.dispose();
  });
  it('loads and invalidates constructor initialization summaries across indexed files', () => {
    const stateUri = 'file:///CrossFileState.php'; const childUri = 'file:///CrossFileChild.php'; const consumerUri = 'file:///CrossFileConsumer.php';
    const state = (initialize: boolean): string => `<?php namespace CrossFileIteration;
      class State { public readonly int $body; public function __construct() { ${initialize ? '$this->body = 1;' : ''} } }
    `;
    const child = (constructor: 'inherited' | 'own' | 'parent' | 'conditional-parent' | 'all-parent'): string => `<?php namespace CrossFileIteration;
      class Child extends State { ${constructor === 'own' ? 'public function __construct() {}' : constructor === 'parent' ? 'public function __construct() { parent::__construct(); }' : constructor === 'conditional-parent' ? 'public function __construct(bool $initialize) { if ($initialize) { parent::__construct(); } }' : constructor === 'all-parent' ? 'public function __construct(bool $initialize) { if ($initialize) { parent::__construct(); } else { parent::__construct(); } }' : ''} }
    `;
    const consumer = `<?php namespace CrossFileIteration;
      class Consumer { public function inspect(): void { $state = new Child(); foreach ($state as &$value) {} } }
    `;
    workspace.update(stateUri, state(true)); workspace.update(childUri, child('inherited')); workspace.update(consumerUri, consumer);
    expect(workspace.readonlyPropertyAssignments(consumerUri)).toMatchObject([{
      operation: 'reference-iteration', ownerFqcn: 'CrossFileIteration\\Child', propertyNames: ['body'],
    }]);
    workspace.update(stateUri, state(false));
    expect(workspace.readonlyPropertyAssignments(consumerUri)).toEqual([]);
    workspace.update(stateUri, state(true));
    expect(workspace.readonlyPropertyAssignments(consumerUri)).toHaveLength(1);
    workspace.update(childUri, child('own'));
    expect(workspace.readonlyPropertyAssignments(consumerUri)).toEqual([]);
    workspace.update(childUri, child('parent'));
    expect(workspace.readonlyPropertyAssignments(consumerUri)).toHaveLength(1);
    workspace.update(childUri, child('conditional-parent'));
    expect(workspace.readonlyPropertyAssignments(consumerUri)).toEqual([]);
    workspace.update(childUri, child('all-parent'));
    expect(workspace.readonlyPropertyAssignments(consumerUri)).toHaveLength(1);
    workspace.update(childUri, child('inherited'));
    expect(workspace.readonlyPropertyAssignments(consumerUri)).toHaveLength(1);
    workspace.remove(stateUri); workspace.remove(childUri); workspace.remove(consumerUri);
  });
  it('restores transitive type dependencies before invalidating derived constructor summaries', () => {
    const stateUri = 'file:///RestoredGraphState.php'; const middleUri = 'file:///RestoredGraphMiddle.php';
    const childUri = 'file:///RestoredGraphChild.php'; const consumerUri = 'file:///RestoredGraphConsumer.php';
    const state = (initialize: boolean): string => `<?php namespace RestoredGraph;
      class State { public readonly int $body; public function __construct() { ${initialize ? '$this->body = 1;' : ''} } }`;
    const middle = '<?php namespace RestoredGraph; class Middle extends State {}';
    const child = '<?php namespace RestoredGraph; class Child extends Middle {}';
    const consumer = '<?php namespace RestoredGraph; class Inspector { public function inspect(): void { $child = new Child(); foreach ($child as &$value) {} } }';
    const original = new SemanticWorkspace(parser);
    original.update(stateUri, state(true)); original.update(middleUri, middle); original.update(childUri, child); original.update(consumerUri, consumer);
    const snapshots = [stateUri, middleUri, childUri, consumerUri].map((uri) => [uri, original.snapshot(uri)] as const);
    original.dispose();

    const restored = new SemanticWorkspace(parser);
    for (const [uri, snapshot] of snapshots) expect(restored.restore(snapshot, uri)).toBe(true);
    expect(restored.readonlyPropertyAssignments(consumerUri)).toMatchObject([{
      operation: 'reference-iteration', ownerFqcn: 'RestoredGraph\\Child', propertyNames: ['body'],
    }]);
    restored.update(stateUri, state(false));
    expect(restored.readonlyPropertyAssignments(consumerUri)).toEqual([]);
    restored.dispose();
  });
  it('propagates construction state only when every factory return path directly constructs one concrete type', () => {
    const declarations = `<?php namespace FactoryConstruction;
      class State { public readonly int $body; public function __construct(public readonly int $id) { $this->body = 1; } }
      class Factory {
        public static function createStatic(): State { return new State(1); }
        public function createMember(): State { return new State(2); }
      }
      function createFunction() { return new State(3); }
      function localConstructed(): State { $state = new State(30); return $state; }
      function existing(State $state): State { return $state; }
      function conditional(bool $flag): State { if ($flag) { return new State(4); } return new State(5); }
      class OtherState { public readonly int $other; public function __construct() { $this->other = 1; } }
      function different(bool $flag): State|OtherState { if ($flag) { return new State(6); } return new OtherState(); }
      function fallthrough(bool $flag): ?State { if ($flag) { return new State(7); } }
      function exceptional(bool $flag): State { try { if ($flag) { throw new \\RuntimeException(); } return new State(8); } catch (\\RuntimeException $error) { return new State(9); } }
      function finalized(): State { try { return new State(10); } finally { echo 'done'; } }
      function emptyFinalized(): State { try { return new State(11); } finally {} }
      function overrideFinalized(): State|OtherState { try { return new State(12); } finally { return new OtherState(); } }
      function yieldedFinalized(): State { try { return new State(13); } finally { yield new State(14); } }
      function looped(array $flags): State { foreach ($flags as $flag) { if ($flag) { return new State(15); } continue; } return new State(16); }
      function loopFallthrough(array $flags): ?State { foreach ($flags as $flag) { if ($flag) { return new State(17); } } }
      function loopDifferent(array $flags): State|OtherState { foreach ($flags as $flag) { if ($flag) { return new OtherState(); } } return new State(18); }
      function switched(int $mode): State { switch ($mode) { case 1: return new State(19); case 2: if ($mode > 1) { break; } return new State(20); default: throw new \\RuntimeException(); } return new State(21); }
      function switchedFallthrough(int $mode): State { switch ($mode) { case 1: echo 'pass'; case 2: return new State(22); default: return new State(23); } }
      function switchMissingDefault(int $mode): ?State { switch ($mode) { case 1: return new State(24); } }
      function switchDifferent(int $mode): State|OtherState { switch ($mode) { case 1: return new OtherState(); default: return new State(25); } }
      function matched(int $mode): State { return match ($mode) { 1, 2 => new State(26), default => new State(27) }; }
      function matchDifferent(int $mode): State|OtherState { return match ($mode) { 1 => new State(28), default => new OtherState() }; }
      function matchExisting(int $mode, State $state): State { return match ($mode) { 1 => new State(29), default => $state }; }
    `;
    const source = `<?php namespace FactoryConstruction;
      class Consumer { public function inspect(Factory $factory, State $parameter, bool $flag): void {
        $function = createFunction(); foreach ($function as &$value) {}
        $localConstructed = localConstructed(); foreach ($localConstructed as &$value) {}
        $static = Factory::createStatic(); foreach ($static as &$value) {}
        $member = $factory->createMember(); foreach ($member as &$value) {}
        $existing = existing($parameter); foreach ($existing as &$value) {}
        $conditional = conditional($flag); foreach ($conditional as &$value) {}
        $different = different($flag); foreach ($different as &$value) {}
        $fallthrough = fallthrough($flag); foreach ($fallthrough as &$value) {}
        $exceptional = exceptional($flag); foreach ($exceptional as &$value) {}
        $finalized = finalized(); foreach ($finalized as &$value) {}
        $emptyFinalized = emptyFinalized(); foreach ($emptyFinalized as &$value) {}
        $overrideFinalized = overrideFinalized(); foreach ($overrideFinalized as &$value) {}
        $yieldedFinalized = yieldedFinalized(); foreach ($yieldedFinalized as &$value) {}
        $looped = looped([$flag]); foreach ($looped as &$value) {}
        $loopFallthrough = loopFallthrough([$flag]); foreach ($loopFallthrough as &$value) {}
        $loopDifferent = loopDifferent([$flag]); foreach ($loopDifferent as &$value) {}
        $switched = switched(1); foreach ($switched as &$value) {}
        $switchedFallthrough = switchedFallthrough(1); foreach ($switchedFallthrough as &$value) {}
        $switchMissingDefault = switchMissingDefault(1); foreach ($switchMissingDefault as &$value) {}
        $switchDifferent = switchDifferent(1); foreach ($switchDifferent as &$value) {}
        $matched = matched(1); foreach ($matched as &$value) {}
        $matchDifferent = matchDifferent(1); foreach ($matchDifferent as &$value) {}
        $matchExisting = matchExisting(1, $parameter); foreach ($matchExisting as &$value) {}
        if ($flag) { $branch = createFunction(); } foreach ($branch as &$value) {}
        $overwritten = createFunction(); $overwritten = $parameter; foreach ($overwritten as &$value) {}
      } }
    `;
    workspace.update('file:///FactoryDeclarations.php', declarations);
    workspace.update('file:///FactoryConsumer.php', source);
    const assignments = workspace.readonlyPropertyAssignments('file:///FactoryConsumer.php');
    expect(assignments).toHaveLength(13);
    expect(assignments.map((item) => source.slice(item.start, item.end))).toEqual([
      '$function', '$localConstructed', '$static', '$member', '$conditional', '$exceptional', '$finalized', '$emptyFinalized', '$overrideFinalized', '$looped', '$switched', '$switchedFallthrough', '$matched',
    ]);
    for (const assignment of assignments.filter((item) => source.slice(item.start, item.end) !== '$overrideFinalized')) expect(assignment).toMatchObject({
      operation: 'reference-iteration', ownerFqcn: 'FactoryConstruction\\State', propertyNames: ['body', 'id'], minimumPhpVersion: '8.1',
    });
    expect(assignments.find((item) => source.slice(item.start, item.end) === '$overrideFinalized')).toMatchObject({
      operation: 'reference-iteration', ownerFqcn: 'FactoryConstruction\\OtherState', propertyNames: ['other'], minimumPhpVersion: '8.1',
    });
    workspace.update('file:///FactoryDeclarations.php', declarations.replace(
      'function createFunction() { return new State(3); }',
      'function createFunction() { $state = new State(3); $state = existing($state); return $state; }',
    ));
    expect(workspace.readonlyPropertyAssignments('file:///FactoryConsumer.php').map((item) => source.slice(item.start, item.end))).toEqual([
      '$localConstructed', '$static', '$member', '$conditional', '$exceptional', '$finalized', '$emptyFinalized', '$overrideFinalized', '$looped', '$switched', '$switchedFallthrough', '$matched',
    ]);
    workspace.update('file:///FactoryDeclarations.php', declarations);
    expect(workspace.readonlyPropertyAssignments('file:///FactoryConsumer.php')).toHaveLength(13);
    workspace.remove('file:///FactoryDeclarations.php'); workspace.remove('file:///FactoryConsumer.php');
  });
  it('reports direct ordinary access on proven nullable objects only when the member exists', () => {
    const source = `<?php namespace NullableMember;
      class Service { public function run(): void {} public string $name; }
      function inspect(?Service $service, mixed $dynamic): void {
        $service->run(); $service->name; $service?->run(); $service->missing(); $dynamic->run();
        if ($service !== null) { $service->run(); }
      }
    `;
    workspace.update('file:///NullableMember.php', source);
    expect(workspace.nullableMemberAccesses('file:///NullableMember.php').map((item) => [item.kind, item.name, source.slice(item.operatorStart, item.operatorEnd)])).toEqual([
      ['method', 'run', '->'], ['property', 'name', '->'],
    ]);
  });
  it('organizes only a contiguous simple import block and removes proven unused entries', () => {
    const source = `<?php namespace ImportsOrganize;
use function Vendor\\zeta;
use Vendor\\Unused;
use Vendor\\Alpha as A;
use const Vendor\\FLAG;
function run(A $value): void { zeta($value, FLAG); }
`;
    workspace.update('file:///OrganizeImports.php', source);
    expect(workspace.unusedImports('file:///OrganizeImports.php').map((item) => item.name)).toEqual(['Unused']);
    expect(workspace.organizeImports('file:///OrganizeImports.php')).toMatchObject({ removed: ['Unused'], newText: `use Vendor\\Alpha as A;
use function Vendor\\zeta;
use const Vendor\\FLAG;
` });
    workspace.update('file:///CommentedImports.php', '<?php namespace ImportsOrganize; use Vendor\\One; // keep boundary\nuse Vendor\\Two; function run(One $one, Two $two): void {}');
    expect(workspace.organizeImports('file:///CommentedImports.php')).toBeUndefined();
    const fqcnSource = `<?php namespace ImportsOrganize;
use Vendor\\Zed;
use Vendor\\Zed;
use function Vendor\\AlphaFn;
use const Vendor\\MIDDLE;
function sorted(Zed $value): void { AlphaFn($value); echo MIDDLE; }
`;
    workspace.update('file:///FqcnImports.php', fqcnSource);
    expect(workspace.organizeImports('file:///FqcnImports.php', 'fqcn')?.newText).toBe(`use function Vendor\\AlphaFn;
use const Vendor\\MIDDLE;
use Vendor\\Zed;
`);
  });
  it('safely expands an uncommented group use while sorting and removing unused members', () => {
    const source = `<?php namespace GroupImports;
use Vendor\\{Unused, Zeta as Z, function beta, function alpha, const ZED, const ACTIVE};
function run(Z $value): void { alpha($value); echo ACTIVE; }
`;
    workspace.update('file:///GroupImports.php', source);
    expect(workspace.organizeImports('file:///GroupImports.php')).toMatchObject({
      removed: ['Unused', 'beta', 'ZED'],
      newText: `use Vendor\\Zeta as Z;
use function Vendor\\alpha;
use const Vendor\\ACTIVE;
`
    });
    const commented = source.replace('Unused,', 'Unused, /* retain rationale */');
    workspace.update('file:///CommentedGroupImports.php', commented);
    expect(workspace.organizeImports('file:///CommentedGroupImports.php')).toBeUndefined();
  });
  it('refuses local rename across closure capture, promoted properties, globals and superglobals', () => {
    const source = `<?php class C { function __construct(private string $name) {} function run($value): void { $fn = function () use ($value) { echo $value; }; global $shared; echo $shared; echo $_GET; } }`;
    workspace.update('file:///UnsafeLocalRename.php', source);
    expect(workspace.localVariableRename('file:///UnsafeLocalRename.php', source.indexOf('$value') + 2, 'input')).toBeUndefined();
    expect(workspace.localVariableRename('file:///UnsafeLocalRename.php', source.indexOf('$name') + 2, 'label')).toBeUndefined();
    expect(workspace.localVariableRename('file:///UnsafeLocalRename.php', source.indexOf('$shared') + 2, 'state')).toBeUndefined();
    expect(workspace.localVariableRename('file:///UnsafeLocalRename.php', source.indexOf('$_GET') + 2, 'query')).toBeUndefined();
  });
  it('substitutes a proven class template argument into a PHPDoc method return chain', () => {
    workspace.update('file:///GenericTypes.php', `<?php namespace Generics;
      class User { public function name(): string {} }
      /** @template T of object */ class Box { /** @return T */ public function get() {} }
    `);
    const source = `<?php namespace Generics;
      /** @param Box<User> $box */ function show($box): void { $box->get()->na; }
    `;
    workspace.update('file:///GenericUse.php', source);
    expect(workspace.signature('file:///GenericUse.php', source.indexOf('$box->get(') + '$box->get('.length)?.returnType)
      .toBe('Generics\\User');
    expect(workspace.completeMembers('file:///GenericUse.php', source.indexOf('na;') + 2).map((item) => item.name)).toEqual(['name']);
  });
  it('infers class templates from a constructor class-string or object witness', () => {
    const source = `<?php namespace ConstructorTemplates;
      class Product { public function productOnly(): void {} }
      class Other { public function otherOnly(): void {} }
      /** @template T of object */
      class Factory {
        /** @param class-string<T>|T $target */ public function __construct(object|string $target) {}
        /** @return T */ public function create(): object {}
      }
      function run(string $dynamic): void {
        $fromClass = new Factory(Product::class); $classProduct = $fromClass->create(); $classProduct->product;
        $fromObject = new Factory(new Other()); $objectProduct = $fromObject->create(); $objectProduct->other;
        $unknownFactory = new Factory($dynamic); $unknown = $unknownFactory->create(); $unknown->product;
      }`;
    workspace.update('file:///ConstructorTemplates.php', source);
    expect(workspace.completeMembers('file:///ConstructorTemplates.php', source.indexOf('$classProduct->product') + '$classProduct->product'.length)
      .map((item) => item.name)).toEqual(['productOnly']);
    expect(workspace.completeMembers('file:///ConstructorTemplates.php', source.indexOf('$objectProduct->other') + '$objectProduct->other'.length)
      .map((item) => item.name)).toEqual(['otherOnly']);
    expect(workspace.completeMembers('file:///ConstructorTemplates.php', source.indexOf('$unknown->product') + '$unknown->product'.length)).toEqual([]);
  });
  it('preserves a generic object used as another class template argument through member return chains', () => {
    workspace.update('file:///NestedGenericTypes.php', `<?php namespace NestedGenerics;
      class Item { public function label(): string {} }
      /** @template TValue of object */ class Inner { /** @return TValue */ public function current() {} }
      /** @template TKey of array-key
       * @template TValue */ class PairBox { /** @return TValue */ public function current() {} }
      /** @template TInner of object */ class Outer {
        /** @return TInner */ public function inner() {}
        /** @return PairBox<int, TInner> */ public function box() {}
      }
    `);
    const source = `<?php namespace NestedGenerics;
      /** @param Outer<Inner<Item>> $outer */ function show($outer): void {
        $inner = $outer->inner(); $item = $inner->current(); $item->lab;
        $box = $outer->box(); $boxedInner = $box->current(); $boxedItem = $boxedInner->current(); $boxedItem->lab;
      }
    `;
    const uri = 'file:///NestedGenericUse.php'; workspace.update(uri, source);
    expect(workspace.signature(uri, source.indexOf('$outer->inner(') + '$outer->inner('.length)?.returnType)
      .toBe('NestedGenerics\\Inner<NestedGenerics\\Item>');
    expect(workspace.signature(uri, source.indexOf('$inner->current(') + '$inner->current('.length)?.returnType)
      .toBe('NestedGenerics\\Item');
    expect(workspace.completeMembers(uri, source.indexOf('$item->lab') + '$item->lab'.length).map((item) => item.name))
      .toEqual(['label']);
    expect(workspace.signature(uri, source.indexOf('$box->current(') + '$box->current('.length)?.returnType)
      .toBe('NestedGenerics\\Inner<NestedGenerics\\Item>');
    expect(workspace.completeMembers(uri, source.indexOf('$boxedItem->lab') + '$boxedItem->lab'.length).map((item) => item.name))
      .toEqual(['label']);
  });
  it('deduplicates union members introduced by template substitution', () => {
    workspace.update('file:///GenericUnionTypes.php', `<?php namespace GenericUnions;
      /** @template TValue */ class Box { /** @return TValue|string */ public function get() {} }
      /** @template TValue
       * @template-extends Box<TValue|string> */ class ChildBox extends Box {}
    `);
    const source = `<?php namespace GenericUnions;
      /** @param Box<string> $direct
       * @param ChildBox<string> $inherited */
      function show($direct, $inherited): void { $direct->get(); $inherited->get(); }
    `;
    const uri = 'file:///GenericUnionUse.php'; workspace.update(uri, source);
    expect(workspace.signature(uri, source.indexOf('$direct->get(') + '$direct->get('.length)?.returnType).toBe('string');
    expect(workspace.signature(uri, source.indexOf('$inherited->get(') + '$inherited->get('.length)?.returnType).toBe('string');
  });
  it('preserves concrete generic arguments on inherited static returns', () => {
    workspace.update('file:///GenericStaticTypes.php', `<?php namespace GenericStatic;
      class Item { public function label(): string {} }
      /** @template TValue of object */ class BaseBox {
        /** @return TValue */ public function get() {}
        /** @return static|null */ public function copy(): ?BaseBox {}
      }
      /** @template TItem of object
       * @template-extends BaseBox<TItem> */ class ChildBox extends BaseBox {}
    `);
    const source = `<?php namespace GenericStatic;
      /** @param ChildBox<Item> $box */ function show($box): void {
        $copy = $box->copy(); if ($copy !== null) { $item = $copy->get(); $item->lab; }
      }
    `;
    const uri = 'file:///GenericStaticUse.php'; workspace.update(uri, source);
    expect(workspace.signature(uri, source.indexOf('$copy->get(') + '$copy->get('.length)?.returnType).toBe('GenericStatic\\Item');
    expect(workspace.completeMembers(uri, source.indexOf('$item->lab') + '$item->lab'.length).map((item) => item.name))
      .toEqual(['label']);
  });
  it('rejects class template substitution when the object argument violates its bound', () => {
    workspace.update('file:///BoundTypes.php', `<?php namespace Bounds;
      interface Contract {} class Valid implements Contract { public function allowed(): void {} } class Invalid { public function forbidden(): void {} }
      /** @template T of Contract */ class Box { /** @return T */ public function get() {} }
    `);
    const valid = '/** @param Box<Valid> $box */ function valid($box): void { $box->get()->all; }';
    const invalid = '/** @param Box<Invalid> $box */ function invalid($box): void { $box->get()->forb; }';
    const source = `<?php namespace Bounds; ${valid} ${invalid}`; workspace.update('file:///BoundUse.php', source);
    expect(workspace.completeMembers('file:///BoundUse.php', source.indexOf('all;') + 3).map((item) => item.name)).toEqual(['allowed']);
    expect(workspace.completeMembers('file:///BoundUse.php', source.indexOf('forb;') + 4)).toEqual([]);
  });
  it('substitutes concrete and transitive PHPDoc generic inheritance arguments', () => {
    const typesUri = 'file:///InheritedGenericTypes.php';
    workspace.update(typesUri, `<?php namespace InheritedGenerics;
      interface Contract {} class User implements Contract { public function name(): string {} } class Invalid { public function wrong(): void {} }
      /** @template TBase of Contract */ class BaseRepository { /** @return TBase */ public function find() {} }
      /**
       * @template TRow of Contract
       * @extends BaseRepository<TRow>
      */ class Repository extends BaseRepository {}
      /** @extends Repository<User> */ class UserRepository extends Repository {}
      /** @extends BaseRepository<Invalid> */ class InvalidRepository extends BaseRepository {}
      /** @template TItem of Contract */ interface Provider { /** @return TItem */ public function provide(); }
      /** @implements Provider<User> */ class UserProvider implements Provider {}
    `);
    const source = `<?php namespace InheritedGenerics;
      function show(UserRepository $users, InvalidRepository $invalid, UserProvider $provider): void { $users->find()->na; $invalid->find()->wr; $provider->provide()->na; }
    `;
    workspace.update('file:///InheritedGenericUse.php', source);
    expect(workspace.completeMembers('file:///InheritedGenericUse.php', source.indexOf('find()') + 4)).toMatchObject([{ name: 'find', returnType: 'InheritedGenerics\\User' }]);
    expect(workspace.completeMembers('file:///InheritedGenericUse.php', source.indexOf('na;') + 2).map((item) => item.name)).toEqual(['name']);
    expect(workspace.completeMembers('file:///InheritedGenericUse.php', source.indexOf('wr;') + 2)).toEqual([]);
    expect(workspace.completeMembers('file:///InheritedGenericUse.php', source.lastIndexOf('na;') + 2).map((item) => item.name)).toEqual(['name']);
    const snapshot = workspace.snapshot(typesUri);
    expect(snapshot).toMatchObject({ schema: 74, declaration: { genericParents: expect.arrayContaining([
      expect.objectContaining({ ownerFqcn: 'InheritedGenerics\\UserRepository', parentName: 'Repository', arguments: ['User'] }),
      expect.objectContaining({ ownerFqcn: 'InheritedGenerics\\UserProvider', kind: 'implements', arguments: ['User'] }),
    ]) } });
    workspace.remove(typesUri);
    expect(workspace.restore(snapshot, typesUri)).toBe(true);
    expect(workspace.completeMembers('file:///InheritedGenericUse.php', source.lastIndexOf('na;') + 2).map((item) => item.name)).toEqual(['name']);
  });
  it('consumes external generic association properties without bypassing visibility', () => {
    const source = `<?php namespace Association;
      class Order { public function number(): string {} }
      /**
       * @template TKey
       * @template TValue
       */ class Collection { /** @return TValue */ public function first() {} }
      class Entity { private Collection $orders; public function inspect(): void { $this->orders->first()->nu; foreach ($this->orders as $order) { $order->nu; } } }
      class PublicEntity { public Collection $orders; }
      function outside(Entity $entity, PublicEntity $public): void { $entity->ord; $public->orders->first()->nu; }
    `;
    workspace.update('file:///Associations.php', source);
    const orderStart = source.indexOf('$orders');
    const publicOrderStart = source.indexOf('$orders', orderStart + 1);
    workspace.replaceExternalProperties('doctrine', [
      { ownerFqcn: 'Association\\Entity', name: 'orders', returnType: 'Association\\Collection<int, Association\\Order>', iterableValueType: 'Association\\Order', visibility: 'private', uri: 'file:///Associations.php', start: orderStart, end: orderStart + 7 },
      { ownerFqcn: 'Association\\PublicEntity', name: 'orders', returnType: 'Association\\Collection<int, Association\\Order>', iterableValueType: 'Association\\Order', visibility: 'public', uri: 'file:///Associations.php', start: publicOrderStart, end: publicOrderStart + 7 },
    ]);
    const positions = [...source.matchAll(/nu;/g)].map((item) => item.index + 2);
    expect(workspace.completeMembers('file:///Associations.php', positions[0]!).map((item) => item.name)).toEqual(['number']);
    expect(workspace.completeMembers('file:///Associations.php', positions[1]!).map((item) => item.name)).toEqual(['number']);
    expect(workspace.completeMembers('file:///Associations.php', source.indexOf('ord;') + 3)).toEqual([]);
    expect(workspace.completeMembers('file:///Associations.php', positions[2]!).map((item) => item.name)).toEqual(['number']);
    workspace.replaceExternalProperties('doctrine', []);
    expect(workspace.completeMembers('file:///Associations.php', positions[2]!)).toEqual([]);
  });
  it('searches bounded workspace symbols with members and deterministic prefix ranking', () => {
    workspace.update('file:///Symbols.php', '<?php namespace Search; class Invoice { public string $number; public function total(): int {} } function invoiceFactory(): Invoice {}');
    expect(workspace.workspaceSymbols('invoiceFactory', 2).map((item) => [item.kind, item.name])).toEqual([['function', 'invoiceFactory']]);
    expect(workspace.workspaceSymbols('total')).toMatchObject([{ kind: 'method', name: 'total', container: 'Search\\Invoice' }]);
  });
  it('offers constructor generation only for safe uninitialized property declarations', () => {
    const source = `<?php namespace Generate;
      class Plain { private string $name; protected ?User $owner; public int $count = 0; public static string $shared; }
      class Child extends Plain { private string $child; }
      class Existing { private string $value; public function __construct() {} }
      class Hooked { public string $value { get => 'x'; } }
    `;
    workspace.update('file:///Constructor.php', source);
    expect(workspace.constructorGeneration('file:///Constructor.php', source.indexOf('Plain') + 2)).toMatchObject({ classFqcn: 'Generate\\Plain', properties: [{ name: 'name', type: 'string' }, { name: 'owner', type: '?User' }] });
    expect(workspace.constructorGeneration('file:///Constructor.php', source.indexOf('Child') + 2)).toBeUndefined();
    expect(workspace.constructorGeneration('file:///Constructor.php', source.indexOf('Existing') + 2)).toBeUndefined();
    expect(workspace.constructorGeneration('file:///Constructor.php', source.indexOf('Hooked') + 2)).toBeUndefined();
  });
  it('plans only missing accessors and omits setters for readonly properties', () => {
    const source = `<?php namespace GenerateAccessors;
      class Entity { private string $name; public readonly int $id; public static string $shared; public string $hooked { get => 'x'; } public function getName(): string { return $this->name; } }
      class Child extends MissingParent { private string $value; }
    `;
    workspace.update('file:///Accessors.php', source);
    expect(workspace.accessorGeneration('file:///Accessors.php', source.indexOf('Entity') + 2)).toMatchObject({ accessors: [
      { property: 'name', type: 'string', getter: undefined, setter: 'setName' },
      { property: 'id', type: 'int', getter: 'getId', setter: undefined },
    ] });
    expect(workspace.accessorGeneration('file:///Accessors.php', source.indexOf('Child') + 2)).toBeUndefined();
  });
  it('offers only concrete overridable parent methods with exact signatures', () => {
    workspace.update('file:///OverrideBase.php', `<?php namespace GenerateOverride;
      class Base { public function label(string $prefix = ''): string { return $prefix; } protected static function reset(): void {} final public function fixed(): void {} private function hidden(): void {} public function __clone() {} }
    `);
    const source = '<?php namespace GenerateOverride; class Child extends Base { protected static function reset(): void {} } class Broken extends Unknown { }';
    workspace.update('file:///OverrideChild.php', source);
    expect(workspace.overrideGeneration('file:///OverrideChild.php', source.indexOf('Child') + 2)).toMatchObject({ methods: [
      { name: 'label', declarationText: "public function label(string $prefix = ''): string" },
    ] });
    expect(workspace.overrideGeneration('file:///OverrideChild.php', source.indexOf('Broken') + 2)).toBeUndefined();
  });
  it('reports only independently removable imports unused by code or PHPDoc', () => {
    const source = `<?php namespace Imports;
      use Vendor\\Used;
      use Vendor\\DocOnly;
      use Vendor\\Unused;
      use function Vendor\\helper;
      use const Vendor\\FLAG;
      use Vendor\\Group\\{One, Two};
      /** @param DocOnly $doc */ function run(Used $used, $doc): void { helper(); echo FLAG; $text = 'Unused'; }
    `;
    workspace.update('file:///UnusedImports.php', source);
    expect(workspace.unusedImports('file:///UnusedImports.php')).toMatchObject([{ name: 'Unused', kind: 'class' }]);
  });
  it('reports only proven inherited method signature incompatibilities', () => {
    workspace.update('file:///SignatureContracts.php', `<?php namespace Signatures;
      class Animal {} class Dog extends Animal {}
      interface Runner { public function run(Animal $animal, string &$label = '', int ...$ids): Animal; }
      class Base { protected function create(Animal $animal): Animal {} public static function reset(): void {} final public function fixed(): void {} }
      final class Closed {}
    `);
    const source = `<?php namespace Signatures;
      class Good extends Base implements Runner {
        public function run(object $animal, string &$label = '', int ...$ids): Dog {}
        public function create(object $animal): Dog {}
        public static function reset(): void {}
      }
      class Bad extends Base implements Runner {
        public function run(Dog $animal, string $label, int $id): string {}
        private function create(Animal $animal): Animal {}
        public function reset(): void {}
        public function fixed(): void {}
      }
      class Unknown extends Base { public function create(External $animal): External {} }
      class Impossible extends Closed {}
    `;
    workspace.update('file:///SignatureChildren.php', source);
    expect(workspace.incompatibleMethodOverrides('file:///SignatureChildren.php')).toMatchObject([
      { method: 'Signatures\\Bad::run', inheritedMethod: 'Signatures\\Runner::run', reason: 'it requires 3 parameter(s), inherited declaration requires 1' },
      { method: 'Signatures\\Bad::create', inheritedMethod: 'Signatures\\Base::create', reason: 'visibility cannot be more restrictive than protected' },
      { method: 'Signatures\\Bad::reset', inheritedMethod: 'Signatures\\Base::reset', reason: 'the overriding method must be static' },
      { method: 'Signatures\\Bad::fixed', inheritedMethod: 'Signatures\\Base::fixed', reason: 'a final method cannot be overridden' },
    ]);
    expect(workspace.invalidInheritances('file:///SignatureChildren.php')).toMatchObject([
      { type: 'Signatures\\Impossible', parent: 'Signatures\\Closed', reason: 'final-class' },
    ]);
  });
  it('reports only uniquely resolved inheritance and trait kind mismatches', () => {
    workspace.update('file:///RelationTargets.php', `<?php namespace Relations;
      class Base {} interface Contract {} trait Shared {}
    `);
    workspace.update('file:///DuplicateClass.php', '<?php namespace Relations; class Duplicate {}');
    workspace.update('file:///DuplicateInterface.php', '<?php namespace Relations; interface Duplicate {}');
    const source = `<?php namespace Relations;
      class Good extends Base implements Contract { use Shared; }
      class WrongExtends extends Contract {}
      class WrongImplements implements Base {}
      interface WrongInterface extends Base {}
      class WrongTrait { use Base; }
      class Unknown extends Missing {}
      class Ambiguous extends Duplicate {}
    `;
    workspace.update('file:///InvalidTypeRelations.php', source);
    expect(workspace.invalidTypeRelations('file:///InvalidTypeRelations.php')).toMatchObject([
      { owner: 'Relations\\WrongExtends', target: 'Relations\\Contract', relation: 'extend', expectedKind: 'class', actualKind: 'interface' },
      { owner: 'Relations\\WrongImplements', target: 'Relations\\Base', relation: 'implement', expectedKind: 'interface', actualKind: 'class' },
      { owner: 'Relations\\WrongInterface', target: 'Relations\\Base', relation: 'extend', expectedKind: 'interface', actualKind: 'class' },
      { owner: 'Relations\\WrongTrait', target: 'Relations\\Base', relation: 'use', expectedKind: 'trait', actualKind: 'class' },
    ]);
  });
  it('reports only complete uniquely resolved class, interface and Trait cycles', () => {
    const first = `<?php namespace Cycles;
      class First extends Second {}
      interface Left extends Right {}
      trait One { use Two; }
      class Acyclic extends Base {}
      class Incomplete extends Missing {}
      class Ambiguous extends Duplicate {}
    `;
    const second = `<?php namespace Cycles;
      class Second extends First {}
      interface Right extends Left {}
      trait Two { use One; }
      class Base {}
    `;
    workspace.update('file:///CycleFirst.php', first);
    workspace.update('file:///CycleSecond.php', second);
    workspace.update('file:///CycleDuplicateA.php', '<?php namespace Cycles; class Duplicate extends Ambiguous {}');
    workspace.update('file:///CycleDuplicateB.php', '<?php namespace Cycles; class Duplicate {}');
    expect(workspace.inheritanceCycles('file:///CycleFirst.php')).toMatchObject([
      { owner: 'Cycles\\First', target: 'Cycles\\Second', relation: 'extend' },
      { owner: 'Cycles\\Left', target: 'Cycles\\Right', relation: 'extend' },
      { owner: 'Cycles\\One', target: 'Cycles\\Two', relation: 'use' },
    ]);
    expect(workspace.inheritanceCycles('file:///CycleSecond.php')).toMatchObject([
      { owner: 'Cycles\\Second', target: 'Cycles\\First', relation: 'extend' },
      { owner: 'Cycles\\Right', target: 'Cycles\\Left', relation: 'extend' },
      { owner: 'Cycles\\Two', target: 'Cycles\\One', relation: 'use' },
    ]);
  });
  it('rejects enum Trait uses only when a unique Trait closure proves a property', () => {
    workspace.update('file:///EnumTraitMembers.php', `<?php namespace EnumTraits;
      trait WithProperty { public string $value; }
      trait Nested { use WithProperty; }
      trait PartialGraph { use Missing, WithProperty; }
      trait EmptyTrait { public function run(): void {} }
      trait Duplicate { public string $ambiguous; }
    `);
    workspace.update('file:///EnumTraitDuplicate.php', '<?php namespace EnumTraits; trait Duplicate {}');
    const source = `<?php namespace EnumTraits;
      enum DirectInvalid { use WithProperty; case Ready; }
      enum NestedInvalid { use Nested; case Ready; }
      enum PartialInvalid { use PartialGraph; case Ready; }
      enum Valid { use EmptyTrait; case Ready; }
      enum Unknown { use Missing; case Ready; }
      enum Ambiguous { use Duplicate; case Ready; }
    `;
    workspace.update('file:///EnumTraitConsumers.php', source);
    const invalid = workspace.invalidEnumTraitProperties('file:///EnumTraitConsumers.php');
    expect(invalid).toMatchObject([
      { enumFqcn: 'EnumTraits\\DirectInvalid', traitFqcn: 'EnumTraits\\WithProperty', propertyOwner: 'EnumTraits\\WithProperty', propertyName: 'value' },
      { enumFqcn: 'EnumTraits\\NestedInvalid', traitFqcn: 'EnumTraits\\Nested', propertyOwner: 'EnumTraits\\WithProperty', propertyName: 'value' },
      { enumFqcn: 'EnumTraits\\PartialInvalid', traitFqcn: 'EnumTraits\\PartialGraph', propertyOwner: 'EnumTraits\\WithProperty', propertyName: 'value' },
    ]);
    expect(invalid.map((item) => source.slice(item.start, item.end))).toEqual(['WithProperty', 'Nested', 'PartialGraph']);
  });
  it('rejects readonly inheritance mismatches and mutable Trait properties only when uniquely proven', () => {
    workspace.update('file:///ReadonlyContracts.php', `<?php namespace ReadonlyContracts;
      class MutableBase {}
      readonly class ReadonlyBase {}
      trait MutableProperty { public int $value; }
      trait NestedMutableProperty { use MutableProperty; }
      trait ReadonlyProperty { public readonly int $id; }
      trait EmptyTrait { public function run(): void {} }
      trait AmbiguousProperty { public int $ambiguous; }
    `);
    workspace.update('file:///ReadonlyContractDuplicate.php', '<?php namespace ReadonlyContracts; trait AmbiguousProperty {}');
    const source = `<?php namespace ReadonlyContracts;
      readonly class InvalidReadonlyChild extends MutableBase {}
      class InvalidMutableChild extends ReadonlyBase {}
      readonly class ValidReadonlyChild extends ReadonlyBase {}
      class ValidMutableChild extends MutableBase {}
      readonly class DirectInvalid { use MutableProperty; }
      readonly class NestedInvalid { use NestedMutableProperty; }
      readonly class ReadonlyValid { use ReadonlyProperty; }
      readonly class EmptyValid { use EmptyTrait; }
      readonly class Unknown { use MissingTrait; }
      readonly class Ambiguous { use AmbiguousProperty; }
    `;
    workspace.update('file:///ReadonlyConsumers.php', source);
    expect(workspace.invalidInheritances('file:///ReadonlyConsumers.php')).toMatchObject([
      { type: 'ReadonlyContracts\\InvalidReadonlyChild', parent: 'ReadonlyContracts\\MutableBase', reason: 'readonly-mismatch', readonly: true, parentReadonly: false },
      { type: 'ReadonlyContracts\\InvalidMutableChild', parent: 'ReadonlyContracts\\ReadonlyBase', reason: 'readonly-mismatch', readonly: false, parentReadonly: true },
    ]);
    const invalidTraits = workspace.invalidReadonlyTraitProperties('file:///ReadonlyConsumers.php');
    expect(invalidTraits).toMatchObject([
      { classFqcn: 'ReadonlyContracts\\DirectInvalid', traitFqcn: 'ReadonlyContracts\\MutableProperty', propertyOwner: 'ReadonlyContracts\\MutableProperty', propertyName: 'value' },
      { classFqcn: 'ReadonlyContracts\\NestedInvalid', traitFqcn: 'ReadonlyContracts\\NestedMutableProperty', propertyOwner: 'ReadonlyContracts\\MutableProperty', propertyName: 'value' },
    ]);
    expect(invalidTraits.map((item) => source.slice(item.start, item.end))).toEqual(['MutableProperty', 'NestedMutableProperty']);
  });
  it('rejects only prohibited enum interface relations through unique interface graphs', () => {
    workspace.update('file:///EnumInterfaces.php', `<?php namespace EnumInterfaces;
      interface SerializableChild extends \\Serializable {}
      interface NestedSerializable extends SerializableChild {}
      interface UnitChild extends \\UnitEnum {}
      interface BackedChild extends \\BackedEnum {}
      interface Plain {}
      interface AmbiguousSerializable extends \\Serializable {}
    `);
    workspace.update('file:///EnumInterfaceDuplicate.php', '<?php namespace EnumInterfaces; interface AmbiguousSerializable {}');
    const source = `<?php namespace EnumInterfaces;
      enum DirectUnit implements \\UnitEnum { case Ready; }
      enum DirectBacked: string implements \\BackedEnum { case Ready = 'ready'; }
      enum DirectSerializable implements \\Serializable { case Ready; }
      enum NestedInvalid implements NestedSerializable { case Ready; }
      enum NonBackedInvalid implements BackedChild { case Ready; }
      enum BackedValid: string implements BackedChild { case Ready = 'ready'; }
      enum UnitValid implements UnitChild { case Ready; }
      enum PlainValid implements Plain { case Ready; }
      enum Unknown implements Missing { case Ready; }
      enum Ambiguous implements AmbiguousSerializable { case Ready; }
    `;
    workspace.update('file:///EnumInterfaceConsumers.php', source);
    const invalid = workspace.invalidEnumInterfaces('file:///EnumInterfaceConsumers.php');
    expect(invalid).toMatchObject([
      { enumFqcn: 'EnumInterfaces\\DirectUnit', interfaceFqcn: 'UnitEnum', prohibitedInterface: 'UnitEnum', reason: 'automatic-interface' },
      { enumFqcn: 'EnumInterfaces\\DirectBacked', interfaceFqcn: 'BackedEnum', prohibitedInterface: 'BackedEnum', reason: 'automatic-interface' },
      { enumFqcn: 'EnumInterfaces\\DirectSerializable', interfaceFqcn: 'Serializable', prohibitedInterface: 'Serializable', reason: 'serializable' },
      { enumFqcn: 'EnumInterfaces\\NestedInvalid', interfaceFqcn: 'EnumInterfaces\\NestedSerializable', prohibitedInterface: 'Serializable', reason: 'serializable' },
      { enumFqcn: 'EnumInterfaces\\NonBackedInvalid', interfaceFqcn: 'EnumInterfaces\\BackedChild', prohibitedInterface: 'BackedEnum', reason: 'non-backed-interface' },
    ]);
    expect(invalid.map((item) => source.slice(item.start, item.end))).toEqual([
      '\\UnitEnum', '\\BackedEnum', '\\Serializable', 'NestedSerializable', 'BackedChild',
    ]);
  });
  it('plans private method rename only from a unique non-magic declaration', () => {
    const source = `<?php namespace Refactor;
      class Service { private function normalize(string $value): string { return $value; } private function occupied(): void {} public function run(): string { return $this->normalize('x'); } }
      class Other { private function normalize(): void { $this->normalize(); } }
    `;
    workspace.update('file:///PrivateRename.php', source);
    const offset = source.indexOf('normalize') + 2;
    expect(workspace.privateMethodRename('file:///PrivateRename.php', offset)).toMatchObject({ name: 'normalize', fqcn: 'Refactor\\Service::normalize', locations: [{ start: source.indexOf('normalize') }, { start: source.indexOf('normalize', offset + 1) }] });
    expect(workspace.privateMethodRename('file:///PrivateRename.php', offset, 'occupied')).toBeUndefined();
    expect(workspace.privateMethodRename('file:///PrivateRename.php', source.indexOf('run') + 1)).toBeUndefined();
  });
  it('renames a public method across its complete hierarchy and resolved direct calls', () => {
    const declarations = `<?php namespace MethodFamily;
      interface Contract { public function run(string $value): string; }
      class First implements Contract { public function run(string $value): string { return $value; } }
      class Second extends First { public function run(string $value): string { return parent::run($value); } }
      class Other { public function run(): void {} }
    `;
    const calls = `<?php namespace MethodFamily; function invoke(Contract $contract, First $first, Second $second, Other $other): void {
      $contract->run('a'); $first->run('b'); $second->run('c'); $other->run();
    }`;
    workspace.update('file:///MethodFamily.php', declarations);
    workspace.update('file:///MethodCalls.php', calls);
    const offset = declarations.indexOf('run') + 1;
    const rename = workspace.methodRename('file:///MethodFamily.php', offset, 'execute');
    expect(rename?.locations.filter((item) => item.uri === 'file:///MethodFamily.php')).toHaveLength(4);
    expect(rename?.locations.filter((item) => item.uri === 'file:///MethodCalls.php')).toHaveLength(3);
    expect(rename?.locations.some((item) => item.uri === 'file:///MethodCalls.php' && calls.slice(item.start, item.end) === 'run')).toBe(true);
    const callStart = calls.indexOf('run');
    expect(workspace.methodRename('file:///MethodCalls.php', callStart + 1, 'execute')).toMatchObject({ uri: 'file:///MethodCalls.php', start: callStart, end: callStart + 3, locations: rename?.locations });
    expect(workspace.methodRename('file:///MethodFamily.php', offset, 'run')).toBeUndefined();
    workspace.update('file:///MethodCollision.php', '<?php namespace MethodFamily; class Collision extends Second { public function execute(): void {} }');
    expect(workspace.methodRename('file:///MethodFamily.php', offset, 'execute')).toBeUndefined();
  });
  it('renames proven array callables and rejects unresolved callable coverage or incomplete hierarchies', () => {
    const source = `<?php namespace UnsafeMethod; interface Contract { public function run(): void; } class Service implements Contract { public function run(): void {} }`;
    workspace.update('file:///UnsafeMethod.php', source);
    const offset = source.indexOf('run') + 1;
    workspace.update('file:///UnresolvedMethod.php', '<?php $unknown->run();');
    expect(workspace.methodRename('file:///UnsafeMethod.php', offset, 'execute')?.locations.some((item) => item.uri === 'file:///UnresolvedMethod.php')).toBe(false);
    workspace.remove('file:///UnresolvedMethod.php');
    const provenCallable = `<?php namespace UnsafeMethod; function callback(Service $service): callable { return [$service, 'run']; }`;
    workspace.update('file:///ProvenCallableMethod.php', provenCallable);
    expect(workspace.methodRename('file:///UnsafeMethod.php', offset, 'execute')?.locations).toContainEqual({
      uri: 'file:///ProvenCallableMethod.php', start: provenCallable.indexOf("'run'") + 1, end: provenCallable.indexOf("'run'") + 4,
    });
    workspace.remove('file:///ProvenCallableMethod.php');
    workspace.update('file:///DynamicMethod.php', '<?php function invoke(object $value, string $method): void { $value->$method(); }');
    expect(workspace.methodRename('file:///UnsafeMethod.php', offset, 'execute')).toBeUndefined();
    workspace.remove('file:///DynamicMethod.php');
    workspace.update('file:///CallableMethod.php', "<?php function invoke(object $value): callable { return [$value, 'run']; }");
    expect(workspace.methodRename('file:///UnsafeMethod.php', offset, 'execute')).toBeUndefined();
    workspace.remove('file:///CallableMethod.php');
    workspace.update('file:///IncompleteMethod.php', '<?php namespace UnsafeMethod; class Incomplete extends MissingBase implements Contract { public function run(): void {} }');
    expect(workspace.methodRename('file:///UnsafeMethod.php', offset, 'execute')).toBeUndefined();
    workspace.remove('file:///IncompleteMethod.php');
    workspace.update('file:///TraitMethod.php', '<?php namespace UnsafeMethod; trait Shared { public function run(): void {} }');
    const traitSource = workspace.source('file:///TraitMethod.php')!;
    expect(workspace.methodRename('file:///TraitMethod.php', traitSource.indexOf('run') + 1, 'execute')).toMatchObject({ name: 'run' });
  });
  it('renames proven dynamic method and property names while preserving unknown coverage gates', () => {
    const declarations = `<?php namespace DynamicRename;
      class Service { public string $label; public function run(): void {} }
      class Other { public string $label; public function run(): void {} }`;
    const uses = `<?php namespace DynamicRename; function useMembers(Service $service, Other $other): void {
      $method = 'run'; $service->{$method}(); $service->{'run'}(); $other->{'run'}();
      $label = 'label'; echo $service->{$label}; echo $service->{'label'}; echo $other->{'label'};
    }`;
    workspace.update('file:///DynamicRenameTypes.php', declarations);
    workspace.update('file:///DynamicRenameUse.php', uses);
    const method = workspace.methodRename('file:///DynamicRenameTypes.php', declarations.indexOf('run') + 1, 'execute');
    expect(method?.locations.map((location) => workspace.source(location.uri)?.slice(location.start, location.end))).toEqual(['run', 'run', 'run']);
    const property = workspace.propertyRename('file:///DynamicRenameTypes.php', declarations.indexOf('$label') + 2, 'title');
    expect(property?.locations.map((location) => workspace.source(location.uri)?.slice(location.start, location.end))).toEqual(['label', 'label', 'label']);
    const dynamicMethodUse = uses.indexOf('$method', uses.indexOf('$method') + 1) + 2;
    expect(workspace.methodRename('file:///DynamicRenameUse.php', dynamicMethodUse, 'execute')?.locations).toEqual(method?.locations);
    const dynamicPropertyUse = uses.indexOf('$label', uses.indexOf('$label') + 1) + 2;
    expect(workspace.propertyRename('file:///DynamicRenameUse.php', dynamicPropertyUse, 'title')?.locations).toEqual(property?.locations);
    workspace.update('file:///DynamicRenameUnknown.php', '<?php function unknown(object $value, string $name): void { $value->{$name}(); echo $value->{$name}; }');
    expect(workspace.methodRename('file:///DynamicRenameTypes.php', declarations.indexOf('run') + 1, 'execute')).toBeUndefined();
    expect(workspace.propertyRename('file:///DynamicRenameTypes.php', declarations.indexOf('$label') + 2, 'title')).toBeUndefined();
    workspace.remove('file:///DynamicRenameUnknown.php'); workspace.remove('file:///DynamicRenameUse.php'); workspace.remove('file:///DynamicRenameTypes.php');
  });
  it('renames a trait method through qualified aliases and proven host accesses while preserving the alias name', () => {
    const trait = `<?php namespace TraitRename; trait Shared {
      public function run(): void { $this->run(); }
    }`;
    const host = `<?php namespace TraitRename; class Host {
      use Shared { Shared::run as protected aliasRun; }
      public function invoke(): void { $this->run(); $this->aliasRun(); }
    }
    class Child extends Host { public function child(): void { $this->run(); } }`;
    workspace.update('file:///TraitShared.php', trait);
    workspace.update('file:///TraitHost.php', host);
    const rename = workspace.methodRename('file:///TraitShared.php', trait.indexOf('run') + 1, 'execute');
    expect(rename?.locations.filter((item) => item.uri === 'file:///TraitShared.php')).toHaveLength(2);
    expect(rename?.locations.filter((item) => item.uri === 'file:///TraitHost.php')).toHaveLength(3);
    expect(rename?.locations.some((item) => host.slice(item.start, item.end) === 'aliasRun')).toBe(false);
    const hostCall = host.indexOf('run', host.indexOf('invoke'));
    expect(workspace.methodRename('file:///TraitHost.php', hostCall + 1, 'execute')).toMatchObject({ uri: 'file:///TraitHost.php', start: hostCall, end: hostCall + 3, locations: rename?.locations });
    const aliasCall = host.indexOf('aliasRun', host.indexOf('invoke'));
    const aliasRename = workspace.methodRename('file:///TraitHost.php', aliasCall + 2, 'executeAlias');
    expect(aliasRename).toMatchObject({ uri: 'file:///TraitHost.php', start: aliasCall, end: aliasCall + 8, name: 'aliasRun', fqcn: 'TraitRename\\Host::aliasRun' });
    expect(aliasRename?.locations).toHaveLength(2);
    expect(aliasRename?.locations.some((item) => item.uri === 'file:///TraitShared.php')).toBe(false);
    const aliasDeclaration = host.indexOf('aliasRun');
    expect(workspace.methodRename('file:///TraitHost.php', aliasDeclaration + 2, 'executeAlias')?.locations).toEqual(aliasRename?.locations);
    expect(workspace.methodRename('file:///TraitHost.php', aliasCall + 2, 'invoke')).toBeUndefined();
    workspace.update('file:///TraitAliasDynamic.php', "<?php function callback(object $host): callable { return [$host, 'aliasRun']; }");
    expect(workspace.methodRename('file:///TraitHost.php', aliasCall + 2, 'executeAlias')).toBeUndefined();
    workspace.remove('file:///TraitAliasDynamic.php');
    expect(workspace.methodRename('file:///TraitShared.php', trait.indexOf('run') + 1, 'aliasRun')).toBeUndefined();
  });
  it('renames selected and excluded trait methods through an exact precedence rule', () => {
    const source = `<?php namespace TraitConflict;
      trait A { public function run(): void { $this->run(); } }
      trait B { public function run(): void { $this->run(); } }
      class Host { use A, B { A::run insteadof B; B::run as otherRun; } public function invoke(): void { $this->run(); $this->otherRun(); } }
    `;
    workspace.update('file:///TraitConflict.php', source);
    const selected = workspace.methodRename('file:///TraitConflict.php', source.indexOf('run') + 1, 'execute');
    expect(selected?.locations.map((item) => source.slice(item.start, item.end))).toEqual(['run', 'run', 'run', 'run']);
    let selectedSource = source;
    for (const location of [...selected!.locations].sort((left, right) => right.start - left.start)) {
      selectedSource = `${selectedSource.slice(0, location.start)}execute${selectedSource.slice(location.end)}`;
    }
    expect(selectedSource).toContain('A::execute insteadof B');
    expect(selectedSource).toContain('trait B { public function run(): void { $this->run(); } }');
    const selectedParsed = parser.parse(selectedSource);
    expect(selectedParsed.errors).toEqual([]);
    selectedParsed.tree.delete();
    const bDeclaration = source.indexOf('run', source.indexOf('trait B'));
    const excluded = workspace.methodRename('file:///TraitConflict.php', bDeclaration + 1, 'fallback');
    expect(excluded?.locations.map((item) => source.slice(item.start, item.end))).toEqual(['run', 'run', 'run']);
    let excludedSource = source;
    for (const location of [...excluded!.locations].sort((left, right) => right.start - left.start)) {
      excludedSource = `${excludedSource.slice(0, location.start)}fallback${excludedSource.slice(location.end)}`;
    }
    expect(excludedSource).toContain('A::run insteadof B; B::fallback as otherRun');
    const precedenceMethod = source.indexOf('run', source.indexOf('A::'));
    expect(excluded?.locations.some((item) => item.start === precedenceMethod)).toBe(false);
    const ambiguous = '<?php namespace TraitConflict; class Ambiguous { use A, B; }';
    workspace.update('file:///TraitAmbiguous.php', ambiguous);
    expect(workspace.methodRename('file:///TraitConflict.php', source.indexOf('run') + 1, 'execute')).toBeUndefined();
    workspace.remove('file:///TraitAmbiguous.php');
    expect(workspace.methodRename('file:///TraitConflict.php', source.indexOf('run') + 1, 'otherRun')).toBeUndefined();
  });
  it('removes an unused private parameter from its declaration, PHPDoc and resolved calls', () => {
    const uri = 'file:///RemoveParameter.php';
    const source = `<?php class Formatter {
      /**
       * @param int $unused obsolete
       */
      private function format(string $prefix, int $unused, string $suffix): string { return $prefix . $suffix; }
      public function run(): void { $this->format('a', 1, 'b'); $this->format(suffix: 'b', unused: 2, prefix: 'a'); }
    }`;
    workspace.update(uri, source, true);
    const offset = source.indexOf('int $unused,') + 'int '.length;
    const removal = workspace.removeUnusedPrivateParameter(uri, offset);
    expect(removal).toMatchObject({ callable: 'Formatter::format', parameter: 'unused' });
    let changed = source;
    for (const edit of [...removal!.edits].sort((left, right) => right.start - left.start)) changed = `${changed.slice(0, edit.start)}${changed.slice(edit.end)}`;
    expect(changed).toContain('format(string $prefix, string $suffix)');
    expect(changed).toContain("format('a', 'b')");
    expect(changed).toContain("format(suffix: 'b', prefix: 'a')");
    expect(changed).not.toContain('@param int $unused');
    const effectful = source.replace("$this->format('a', 1, 'b')", "$this->format('a', sideEffect(), 'b')");
    workspace.update(uri, effectful, true);
    const effectfulOffset = effectful.indexOf('int $unused,') + 'int '.length;
    expect(workspace.removeUnusedPrivateParameter(uri, effectfulOffset)).toBeUndefined();
    workspace.remove(uri);
  });
  it('plans extract-variable only for whole RHS or return expressions in statement blocks', () => {
    const uri = 'file:///ExtractVariable.php';
    const source = `<?php function run(bool $ok): object {
      $extracted = existing();
      $result = buildObject();
      if ($ok) return inlineObject();
      return finalObject();
    }`;
    workspace.update(uri, source, true);
    const rhsStart = source.indexOf('buildObject()');
    expect(workspace.extractVariable(uri, rhsStart, rhsStart + 'buildObject()'.length)).toMatchObject({
      variable: 'extracted2', expression: 'buildObject()', indent: '      ', expressionStart: rhsStart,
    });
    const returned = source.indexOf('finalObject()');
    expect(workspace.extractVariable(uri, returned, returned + 'finalObject()'.length)).toMatchObject({ expression: 'finalObject()' });
    expect(workspace.extractVariable(uri, rhsStart, rhsStart + 'buildObject'.length)).toBeUndefined();
    const inline = source.indexOf('inlineObject()');
    expect(workspace.extractVariable(uri, inline, inline + 'inlineObject()'.length)).toBeUndefined();
    workspace.remove(uri);
  });
  it('plans inline-variable only for a single whole-value use in the immediately following statement', () => {
    const uri = 'file:///InlineVariable.php';
    const source = `<?php function direct(): object {
      $temporary = buildObject();
      return $temporary;
    }
    function intervening(): object {
      $value = buildObject();
      observe();
      return $value;
    }
    function repeated(): object {
      $item = buildObject();
      observe($item);
      return $item;
    }
    function referenced(): object {
      $alias =& buildObject();
      return $alias;
    }
    function nested(): object {
      $nested = ($other = buildObject());
      return $nested;
    }
    function trailingComment(): object {
      $commented = buildObject(); // preserve me
      return $commented;
    }`;
    workspace.update(uri, source, true);
    const declaration = source.indexOf('$temporary');
    expect(workspace.inlineVariable(uri, declaration + 2)).toMatchObject({ variable: 'temporary', expression: 'buildObject()', useStart: source.lastIndexOf('$temporary') });
    expect(workspace.inlineVariable(uri, source.indexOf('$value') + 2)).toBeUndefined();
    expect(workspace.inlineVariable(uri, source.indexOf('$item') + 2)).toBeUndefined();
    expect(workspace.inlineVariable(uri, source.indexOf('$alias') + 2)).toBeUndefined();
    expect(workspace.inlineVariable(uri, source.indexOf('$nested') + 2)).toBeUndefined();
    expect(workspace.inlineVariable(uri, source.indexOf('$commented') + 2)).toBeUndefined();
    expect(workspace.inlineVariable(uri, source.lastIndexOf('$temporary') + 2)).toBeUndefined();
    workspace.remove(uri);
  });
  it('plans extract-method with proven receivers and by-value call inputs while rejecting unsafe data flow', () => {
    const uri = 'file:///ExtractMethod.php';
    const source = `<?php class WorkerService { public function prepare(): void {} }
class Worker {
    public function run(WorkerService $service, string $message): void
    {
        $service->prepare();
        $this->notify($message);
        $this->finish();
    }
    public function unsafe(string $message): void
    {
        $this->touch($message);
    }
    public function local(): void
    {
        $service = new WorkerService();
        $service->prepare();
    }
    public function produce(): WorkerService
    {
        $this->finish();
        $result = new WorkerService();
        return $result;
    }
    public function label(): string
    {
        $label = $this->buildLabel();
        return $label;
    }
    public function count(): int
    {
        $count = 1;
        return $count;
    }
    private function extractedMethod(): void {}
    private function prepare(): void {}
    private function notify(string $message): void {}
    private function touch(string &$message): void {}
    private function buildLabel(): string { return 'ready'; }
    private function finish(): void {}
}`;
    workspace.update(uri, source, true);
    const start = source.indexOf('$service->prepare()'); const end = source.indexOf(';', source.indexOf('$this->finish()')) + 1;
    expect(workspace.extractMethod(uri, start, end)).toMatchObject({
      methodName: 'extractedMethod2', selectionStart: source.lastIndexOf('\n', start) + 1,
      parameters: ['service', 'message'], callText: '        $this->extractedMethod2($service, $message);\n',
      methodText: expect.stringContaining('private function extractedMethod2(WorkerService $service, string $message): void'),
    });
    const unsafeStart = source.indexOf('$this->touch($message)');
    expect(workspace.extractMethod(uri, unsafeStart, unsafeStart + '$this->touch($message);'.length)).toBeUndefined();
    const localReceiver = source.lastIndexOf('$service->prepare()');
    expect(workspace.extractMethod(uri, localReceiver, localReceiver + '$service->prepare();'.length)?.methodText)
      .toContain('private function extractedMethod2(\\WorkerService $service): void');
    const outputStart = source.lastIndexOf('$this->finish()'); const outputEnd = source.indexOf(';', source.indexOf('$result =', outputStart)) + 1;
    expect(workspace.extractMethod(uri, outputStart, outputEnd)).toMatchObject({
      output: 'result', callText: '        $result = $this->extractedMethod2();\n',
      methodText: expect.stringContaining('private function extractedMethod2(): \\WorkerService'),
    });
    const scalarStart = source.indexOf('$label ='); const scalarEnd = source.indexOf(';', scalarStart) + 1;
    expect(workspace.extractMethod(uri, scalarStart, scalarEnd)?.methodText).toContain('private function extractedMethod2(): string');
    const literalStart = source.indexOf('$count ='); const literalEnd = source.indexOf(';', literalStart) + 1;
    expect(workspace.extractMethod(uri, literalStart, literalEnd)?.methodText).toContain('private function extractedMethod2(): int');
    expect(workspace.extractMethod(uri, source.indexOf('$service ='), localReceiver + '$service->prepare();'.length)).toBeUndefined();
    const localSource = source.replace('$service->prepare();', '$value->prepare();');
    workspace.update(uri, localSource, true);
    const localStart = localSource.indexOf('$value->prepare()'); const localEnd = localSource.indexOf(';', localSource.indexOf('$this->finish()')) + 1;
    expect(workspace.extractMethod(uri, localStart, localEnd)).toBeUndefined();
    workspace.remove(uri);
  });
  it('identifies native object constructor parameters and explicit Symfony wiring overrides', () => {
    const uri = 'file:///Autowire.php';
    const source = `<?php namespace App\\Contract { interface MailerInterface {} }
      namespace App { use App\\Contract\\MailerInterface as Mailer; use Symfony\\Contracts\\Service\\Attribute\\Required;
      interface Contract {}
      interface Other {}
      final class Consumer {
        #[Required] public Mailer $requiredProperty;
        #[Required] protected Mailer $hiddenProperty;
        public function __construct(
          private Mailer $mailer,
          #[\\Symfony\\Component\\DependencyInjection\\Attribute\\Target('audit')] private Contract $audit,
          private string $name,
          private Mailer|Contract $union,
          private Contract&Other $intersection,
          private ?Mailer $nullable,
          private Mailer|string $objectOrScalar,
          private (Mailer&Contract)|Other $dnf,
        ) {}
        #[Required] public function setMailer(Mailer $required): void {}
        #[Required] protected function setHidden(Mailer $hidden): void {}
      }
      class RequiredBase { #[Required] public function configure(Mailer $base): void {} }
      final class RequiredChild extends RequiredBase { public function configure(Mailer $override): void {} }
      }`;
    workspace.update(uri, source, true);
    expect(workspace.constructorParameterAt(uri, source.indexOf('Mailer $mailer') + 2)).toMatchObject({
      ownerFqcn: 'App\\Consumer', name: 'mailer', typeFqcn: 'App\\Contract\\MailerInterface', explicitWiring: false,
    });
    expect(workspace.constructorParameterAt(uri, source.indexOf('$mailer') + 3)).toMatchObject({ name: 'mailer' });
    expect(workspace.constructorParameterAt(uri, source.indexOf('Contract $audit') + 2)).toMatchObject({ name: 'audit', explicitWiring: false, targetName: 'audit' });
    expect(workspace.constructorParameterAt(uri, source.indexOf('string $name') + 2)).toBeUndefined();
    expect(workspace.constructorParameterAt(uri, source.indexOf('Mailer|Contract') + 2)).toMatchObject({
      typeFqcn: 'App\\Contract|App\\Contract\\MailerInterface',
      typeFqcns: ['App\\Contract', 'App\\Contract\\MailerInterface'], typeOperator: 'union',
    });
    expect(workspace.constructorParameterAt(uri, source.indexOf('Contract&Other') + 2)).toMatchObject({
      typeFqcn: 'App\\Contract&App\\Other', typeOperator: 'intersection',
    });
    expect(workspace.constructorParameterAt(uri, source.indexOf('?Mailer') + 2)).toMatchObject({ typeFqcn: 'App\\Contract\\MailerInterface', typeOperator: undefined });
    expect(workspace.constructorParameterAt(uri, source.indexOf('Mailer|string') + 2)).toMatchObject({
      typeFqcn: 'App\\Contract\\MailerInterface', typeFqcns: ['App\\Contract\\MailerInterface'], typeOperator: 'union',
    });
    expect(workspace.constructorParameterAt(uri, source.indexOf('(Mailer&Contract)|Other') + 2)).toMatchObject({
      typeFqcn: '(App\\Contract&App\\Contract\\MailerInterface)|App\\Other',
      typeFqcns: ['App\\Contract', 'App\\Contract\\MailerInterface', 'App\\Other'],
      typeGroups: [['App\\Contract', 'App\\Contract\\MailerInterface'], ['App\\Other']],
      typeOperator: 'dnf',
    });
    expect(workspace.requiredMethodParameterAt(uri, source.indexOf('Mailer $required)') + 2)).toMatchObject({
      ownerFqcn: 'App\\Consumer', name: 'required', typeFqcn: 'App\\Contract\\MailerInterface', requiredMethodName: 'setMailer',
    });
    expect(workspace.requiredMethodParameterAt(uri, source.indexOf('Mailer $hidden') + 2)).toBeUndefined();
    expect(workspace.requiredMethodParameterAt(uri, source.indexOf('Mailer $mailer') + 2)).toBeUndefined();
    expect(workspace.requiredMethodParameterAt(uri, source.indexOf('Mailer $override') + 2)).toMatchObject({
      ownerFqcn: 'App\\RequiredChild', name: 'override', requiredMethodName: 'configure',
    });
    expect(workspace.methodParameterAt(uri, source.indexOf('Mailer $override') + 2)).toMatchObject({
      callableFqcn: 'App\\RequiredChild::configure', name: 'override', typeFqcn: 'App\\Contract\\MailerInterface',
    });
    expect(workspace.requiredPropertyAt(uri, source.indexOf('Mailer $requiredProperty') + 2)).toMatchObject({
      ownerFqcn: 'App\\Consumer', name: 'requiredProperty', typeFqcn: 'App\\Contract\\MailerInterface', requiredPropertyName: 'requiredProperty',
    });
    expect(workspace.requiredPropertyAt(uri, source.indexOf('Mailer $hiddenProperty') + 2)).toBeUndefined();
    expect(workspace.isSubtype('App\\Consumer', 'App\\Consumer')).toBe(true);
    workspace.remove(uri);
  });
  it('preserves scalar constant literals when ranking documented overloads', () => {
    const declarationsUri = 'php-companion-builtin:/LiteralOverloads.php';
    workspace.update(declarationsUri, `<?php
      const INT_FILTER = 257;
      final class Filters { public const TEXT = 274; }
      function filtered($value, int $filter): mixed {}
      /** @param 257 $filter */ function filtered($value, $filter): int|false {}
      /** @param 272|273|274 $filter */ function filtered($value, $filter): string|false {}
      function mode(int $mode): mixed {}
      /** @param 0|1|2 $mode */ function mode($mode): array {}
      /** @param 3|4 $mode */ function mode($mode): string {}
    `);
    const uri = 'file:///LiteralOverloadUse.php';
    workspace.update(uri, `<?php declare(strict_types=1);
      function invalidIntFilter(): string { return filtered('42', INT_FILTER); }
      function invalidTextFilter(): int { return filtered('mail@example.com', Filters::TEXT); }
      function invalidArrayMode(): string { return mode(1); }
      function invalidStringMode(): int { return mode(0x3); }
    `);
    const source = workspace.snapshot(uri)!.implementation.source;
    expect(workspace.signature(uri, source.indexOf('mode(1)') + 'mode(1'.length)?.returnType).toBe('array');
    expect(workspace.signature(uri, source.indexOf('mode(0x3)') + 'mode(0x3'.length)?.returnType).toBe('string');
    expect(workspace.incompatibleReturns(uri).map((item) => [item.callable, item.actualType, item.expectedType])).toEqual([
      ['invalidIntFilter', 'false|int', 'string'],
      ['invalidTextFilter', 'false|string', 'int'],
    ]);
    workspace.remove(uri); workspace.remove(declarationsUri);
  });
  it('round-trips versioned semantic snapshots and rejects corrupt cache data', () => {
    const uri = 'file:///Cached.php'; const source = '<?php namespace Cache; class Cached extends Base { public function restored(): void {} } function run(Cached $cached, bool $condition): void { if ($condition) { $maybe = new Cached(); } $maybe->rest; $cached->rest; }';
    workspace.update(uri, source); const snapshot = workspace.snapshot(uri); workspace.remove(uri);
    expect(snapshot).toMatchObject({ schema: 74, declaration: { uri }, implementation: { uri, source,
      callables: expect.arrayContaining([expect.objectContaining({ identity: 'cache\\run', kind: 'callable' })]) }, layers: {
      referenceCandidates: { indexed: true, keys: expect.arrayContaining(['declaration:type:cache\\cached']) },
      typeDependencies: { indexed: true, nodes: [{ key: 'cache\\cached', dependencies: ['cache\\base'] }] },
    } });
    expect(workspace.restore(snapshot, uri)).toBe(true);
    expect(workspace.snapshot(uri)).toEqual(snapshot);
    expect(workspace.workspaceSymbols('restored')).toMatchObject([{ uri, name: 'restored' }]);
    const runRecord = snapshot!.implementation.callables.find((record) => record.identity === 'cache\\run')!;
    expect(runRecord.facts.controlFlowAssignments).toHaveLength(1);
    expect(workspace.completeMembers(uri, source.indexOf('$maybe->rest') + '$maybe->rest'.length)).toEqual([]);
    workspace.remove(uri); expect(workspace.restoreDeclaration(snapshot, uri)).toBe(true);
    expect(workspace.implementationState(uri)).toBe('deferred');
    expect(workspace.callableImplementationStates(uri)).toEqual([
      { identity: 'cache\\cached::restored', kind: 'callable', state: 'deferred' },
      { identity: 'cache\\run', kind: 'callable', state: 'deferred' },
    ]);
    expect(workspace.workspaceSymbols('restored')).toMatchObject([{ uri, name: 'restored' }]);
    expect(workspace.workspaceTypes().some((item) => item.fqcn === 'Cache\\Cached')).toBe(true);
    expect(workspace.implementationState(uri)).toBe('deferred');
    expect(workspace.completeMembers(uri, source.indexOf('$cached->rest') + '$cached->rest'.length).map((item) => item.name)).toEqual(['restored']);
    expect(workspace.callableImplementationStates(uri)).toEqual([
      { identity: 'cache\\cached::restored', kind: 'callable', state: 'deferred' },
      { identity: 'cache\\run', kind: 'callable', state: 'loaded' },
    ]);
    expect(workspace.completeMembers(uri, source.indexOf('$maybe->rest') + '$maybe->rest'.length)).toEqual([]);
    expect(workspace.implementationState(uri)).toBe('deferred');
    expect(workspace.snapshot(uri)).toEqual(snapshot);
    expect(workspace.implementationState(uri)).toBe('loaded');
    expect(workspace.callableImplementationStates(uri).every((record) => record.state === 'loaded')).toBe(true);
    workspace.remove(uri); expect(workspace.implementationState(uri)).toBe('absent');
    expect(workspace.restore({ schema: 73, declaration: snapshot!.declaration, implementation: snapshot!.implementation, layers: snapshot!.layers }, uri)).toBe(false);
    const mismatchedRecords = structuredClone(snapshot!); mismatchedRecords.implementation.uri = 'file:///Other.php';
    expect(workspace.restore(mismatchedRecords, uri)).toBe(false);
    const invalid = structuredClone(snapshot!); invalid.implementation.callables.find((record) => record.identity === 'cache\\run')!.facts.scopes[0]!.captures = undefined as never;
    expect(workspace.restore(invalid, uri)).toBe(false);
    const invalidControlFlow = structuredClone(snapshot!); invalidControlFlow.implementation.callables.find((record) => record.identity === 'cache\\run')!.facts.controlFlowAssignments = [source.length + 1];
    expect(workspace.restore(invalidControlFlow, uri)).toBe(false);
    const relocatedFact = structuredClone(snapshot!); const relocatedRun = relocatedFact.implementation.callables.find((record) => record.identity === 'cache\\run')!;
    relocatedFact.implementation.file.assignments.push(relocatedRun.facts.assignments.shift()!);
    expect(workspace.restore(relocatedFact, uri)).toBe(false);
    const duplicateCallableRecord = structuredClone(snapshot!); duplicateCallableRecord.implementation.callables.push(structuredClone(runRecord));
    expect(workspace.restore(duplicateCallableRecord, uri)).toBe(false);
    const invalidLayers = structuredClone(snapshot!); invalidLayers.layers.typeDependencies.nodes[0]!.dependencies = [42 as never];
    expect(workspace.restore(invalidLayers, uri)).toBe(false);
    const staleReferences = structuredClone(snapshot!); staleReferences.layers.referenceCandidates.keys = ['raw-ci:other'];
    expect(workspace.restore(staleReferences, uri)).toBe(false);
    const staleDependencies = structuredClone(snapshot!); staleDependencies.layers.typeDependencies.nodes[0]!.dependencies = ['cache\\other'];
    expect(workspace.restore(staleDependencies, uri)).toBe(false);
  });
  it('loads only the callable selected by focused semantic queries', () => {
    const uri = 'file:///FocusedCached.php';
    const source = `<?php namespace Cache;
class Service { public function serve(string $value): self { return $this; } }
class Consumer {
  public function run(Service $service): void { $copy = $service; $copy->ser; $copy->serve('x'); }
  public function untouched(Service $service): void { $service->serve('untouched'); }
}`;
    workspace.update(uri, source); const snapshot = workspace.snapshot(uri)!; workspace.remove(uri);
    expect(workspace.restoreDeclaration(snapshot, uri)).toBe(true);
    const run = snapshot.declaration.callables.find((callable) => callable.fqcn === 'Cache\\Consumer::run')!;
    const statesAfterQuery = (): SemanticCallableImplementationState[] => workspace.callableImplementationStates(uri);
    expect(workspace.completeMembers(uri, source.indexOf('$copy->ser') + '$copy->ser'.length).map((member) => member.name)).toContain('serve');
    expect(statesAfterQuery().filter((record) => record.state === 'loaded').map((record) => record.identity)).toEqual(['cache\\consumer::run']);
    expect(workspace.definition(uri, source.indexOf("serve('x')") + 2)).toMatchObject([{ uri }]);
    expect(workspace.typeDefinition(uri, source.indexOf("$copy->serve('x')") + 2)).toMatchObject([{ uri }]);
    expect(workspace.signature(uri, source.indexOf("'x'") + 2)?.fqcn).toBe('Cache\\Service::serve');
    expect(workspace.inlayTypeHints(uri, run.declarationStart, run.declarationEnd).some((hint) => hint.label === ': Service')).toBe(true);
    expect(workspace.inlayParameterHints(uri, run.declarationStart, run.declarationEnd).some((hint) => hint.label === '$value:')).toBe(true);
    expect(statesAfterQuery().filter((record) => record.state === 'loaded').map((record) => record.identity)).toEqual(['cache\\consumer::run']);
    expect(workspace.implementationState(uri)).toBe('deferred');
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
    expect(workspace.implementationState(uri)).toBe('loaded');
  });
  it('reuses an edited syntax tree while keeping semantic results equal to a clean parse', () => {
    const uri = 'file:///Incremental.php';
    workspace.update(uri, '<?php namespace Incremental; class User { public function oldName(): void {} }', true);
    const changed = '<?php namespace Incremental; class User { public function newName(): void {} } function run(User $user): void { $user->new }';
    const result = workspace.update(uri, changed, true);
    expect(result.incremental).toBe(true);
    expect(result.changedRanges).toBeGreaterThan(0);
    expect(result).toMatchObject({ kind: 'declaration', changedCallables: expect.arrayContaining(['incremental\\user::oldname', 'incremental\\user::newname']),
      changedTypes: ['incremental\\user'] });
    expect(workspace.completeMembers(uri, changed.indexOf('new }') + 3).map((item) => item.name)).toEqual(['newName']);
    const topLevelUri = 'file:///TopLevelUpdate.php';
    workspace.update(topLevelUri, '<?php $value = 1;');
    expect(workspace.update(topLevelUri, '<?php $value = 2;')).toMatchObject({ kind: 'implementation', changedCallables: [], changedTypes: [] });
    workspace.remove(topLevelUri);
    workspace.remove(uri);
  });
});
