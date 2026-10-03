export type UnfinishedShapeContext = 'argument' | 'return' | 'assignment' | 'method';
export const unfinishedShapeContexts: UnfinishedShapeContext[] = ['argument', 'return', 'assignment', 'method'];

export function unfinishedShapeTail(context: UnfinishedShapeContext): string {
  return context === 'argument' || context === 'method' ? "]); echo 'done';" : "]; echo 'done';}";
}

export function unfinishedShapeSource(name: string, key: string, value: string,
  context: UnfinishedShapeContext, part: 'key' | 'value'): string {
  const contract = `array{${key}:'${value}',id:int}|array{${key}:'update',name:string}`;
  const unfinished = part === 'key' ? `['${key.slice(0, 2)}` : `['${key}'=>'${value.slice(0, 2)}`;
  return context === 'argument' ? `<?php /** @param ${contract} $options */ function ${name}(array $options):void{} ${name}(${unfinished}`
    : context === 'return' ? `<?php /** @return ${contract} */ function ${name}():array{return ${unfinished}`
    : context === 'assignment' ? `<?php /** @param ${contract} $options */ function ${name}(array $options):void{$options=${unfinished}`
    : `<?php class ${name}Builder{/** @param ${contract} $options */ public function send(array $options):void{}} $builder=new ${name}Builder();$builder->send(${unfinished}`;
}
