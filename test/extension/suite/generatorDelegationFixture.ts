export type GeneratorDelegationState = 'result' | 'other' | 'array' | 'noReturn' | 'unknown' | 'nested';

export function generatorDelegationSource(namespace: string, state: GeneratorDelegationState): string {
  const innerReturn = state === 'noReturn' ? '' : `return new ${state === 'other' ? 'Other' : 'Result'}();`;
  const operand = state === 'array' ? '[/* delegated array value */ new Item()]'
    : state === 'unknown' ? 'unknown_source()' : 'inner()';
  const delegatedBody = state === 'nested' ? 'yield (yield from inner());' : `return yield from ${operand};`;
  return `<?php namespace ${namespace};
class Item { public function name(): string { return 'item'; } }
class Result { public function done(): string { return 'done'; } }
class Other { public function wrong(): string { return 'other'; } }
function inner(): \\Generator { yield new Item(); ${innerReturn} }
function delegated(): \\Generator { ${delegatedBody} }
function needResult(Result $value): void {}
function needOther(Other $value): void {}
function inspect(): \\Generator {
  $result = yield from ${operand};
  $result->done();
  $result->wrong();
  needResult($result);
  needOther($result);
}
function consume(): void {
  $items = delegated();
  foreach ($items as $item) { $item->name(); }
}
`;
}

export function generatorDelegationContract(namespace: string, state: GeneratorDelegationState): string {
  if (state === 'unknown') return '\\Generator';
  if (state === 'nested') return `Generator<int, ${namespace}\\Item|${namespace}\\Result, mixed, void>`;
  const returned = state === 'array' || state === 'noReturn' ? 'null' : `${namespace}\\${state === 'other' ? 'Other' : 'Result'}`;
  return `Generator<int, ${namespace}\\Item, mixed, ${returned}>`;
}

export function generatorDelegationMismatchCalls(state: GeneratorDelegationState): string[] {
  return state === 'unknown' ? [] : state === 'array' || state === 'noReturn'
    ? ['needResult', 'needOther'] : [state === 'other' ? 'needResult' : 'needOther'];
}
