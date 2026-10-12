export type GeneratorReturnFlowState = 'partial' | 'total' | 'finally' | 'unknown';

export function generatorReturnFlowSource(namespace: string, state: GeneratorReturnFlowState): string {
  const body = state === 'partial' ? 'if ($flag) { return new Result(); }'
    : state === 'total' ? 'if ($flag) { return new Result(); } return new Result();'
    : state === 'finally' ? 'try { return new Result(); } finally { return new Other(); }'
    : 'return unknown_result();';
  return `<?php namespace ${namespace};
class Item { public function item(): void {} }
class Result { public function done(): void {} }
class Other { public function other(): void {} }
function inner(bool $flag): \\Generator { yield new Item(); ${body} }
function needResult(Result $value): void {}
function needOther(Other $value): void {}
function inspect(bool $flag): \\Generator {
  $plain = yield from inner($flag);
  $plain->done();
  $plain->other();
  needResult($plain);
  needOther($plain);
  if ($plain !== null) {
    $narrowed = $plain;
    $narrowed->done();
    $narrowed->other();
    needResult($narrowed);
    needOther($narrowed);
  }
}
function query(): void { inner(false); }
`;
}

export function generatorReturnFlowContract(namespace: string, state: GeneratorReturnFlowState): string {
  if (state === 'unknown') return '\\Generator';
  const returned = state === 'partial' ? `${namespace}\\Result|null`
    : `${namespace}\\${state === 'finally' ? 'Other' : 'Result'}`;
  return `Generator<int, ${namespace}\\Item, mixed, ${returned}>`;
}

export function generatorReturnFlowMismatchCalls(state: GeneratorReturnFlowState): string[] {
  if (state === 'unknown') return [];
  if (state === 'finally') return ['needResult($plain)', 'needResult($narrowed)'];
  return [...(state === 'partial' ? ['needResult($plain)'] : []), 'needOther($plain)', 'needOther($narrowed)'];
}
