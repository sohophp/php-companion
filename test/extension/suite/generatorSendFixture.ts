export type GeneratorSendState = 'command' | 'other' | 'mixed' | 'null' | 'undeclared' | 'bounded';

export function generatorSendType(state: GeneratorSendState): string {
  return state === 'other' ? 'Other' : state === 'mixed' || state === 'undeclared' ? 'mixed'
    : state === 'null' ? 'null' : 'Command';
}

export function generatorSendSource(namespace: string, state: GeneratorSendState): string {
  const send = generatorSendType(state);
  const doc = state === 'undeclared' ? '' : state === 'bounded'
    ? '/** @template T of Command\n * @return \\Generator<int, Item, T, Result> */'
    : `/** @return \\Generator<int, Item, ${send}, Result> */`;
  const value = state === 'other' ? 'new Other()' : state === 'null' ? 'null' : 'new Command()';
  return `<?php namespace ${namespace};
class Item { public function name(): string { return 'item'; } }
class Command { public function execute(): string { return 'command'; } }
class Other { public function wrong(): string { return 'other'; } }
class Result { public function done(): string { return 'result'; } }
function needCommand(Command $value): void {}
function needOther(Other $value): void {}
${doc}
function exchange(): \\Generator {
  $received = (yield /* yielded item */ new Item());
  $received->execute();
  $received->wrong();
  needCommand($received);
  needOther($received);
  return new Result();
}
/** @param \\Generator<int, Item, ${send}, Result> $stream */
function consume(\\Generator $stream): void {
  $stream->send(new Command());
  $stream->send(new Other());
  $sent = $stream->send(${value});
  if ($sent !== null) { $sent->name(); }
}
`;
}

export function generatorSendMismatchMarkers(state: GeneratorSendState): string[] {
  return state === 'command' || state === 'bounded' ? ['needOther($received)', 'send(new Other())']
    : state === 'other' ? ['needCommand($received)', 'send(new Command())']
    : state === 'null' ? ['needCommand($received)', 'needOther($received)', 'send(new Command())', 'send(new Other())'] : [];
}
