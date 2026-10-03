export interface ArrayAccessCase {
  name: string; marked: string; labels: string[]; insertion?: string; start: number; end: number;
}
const definitions: Array<[string,string,string[],string | undefined]> = [
  ['parameter',"<?php /** @param array{mode:string,id:int} $options */ function read(array $options):void{$options['mo§",['mode'],"'mode'"],
  ['local',"<?php function read():void{$options=['mode'=>'create','id'=>1];$options['mo§",['mode'],"'mode'"],
  ['union',"<?php /** @param array{mode:string,id:int}|array{mode:string,name:string} $options */ function read(array $options):void{$options['mo§",['mode'],"'mode'"],
  ['nested',"<?php /** @param array{'outer-key':array{'inner-key':string}} $options */ function read(array $options):void{$options['outer-key']['inner-§",['inner-key'],"'inner-key'"],
  ['unicode',"<?php /** @param array{'标题':string} $options */ function read(array $options):void{$options['标§",['标题'],"'标题'"],
  ['escaped',"<?php /** @param array{'can\\'t':string} $options */ function read(array $options):void{$options['can\\'§",["can't"],"'can\\'t'"],
  ['optional',"<?php /** @param array{mode?:string} $options */ function read(array $options):void{$options['mo§",['mode'],"'mode'"],
  ['function return',"<?php /** @return array{mode:string} */ function options():array{return ['mode'=>'create'];} function read():void{options()['mo§",['mode'],"'mode'"],
  ['guarded nested',"<?php /** @param array{payload?:array{mode:string}} $options */ function read(array $options):void{if(!isset($options['payload']))return;$options['payload']['mo§",['mode'],"'mode'"],
  ['double quoted', '<?php /** @param array{mode:string} $options */ function read(array $options):void{$options["mo§',['mode'],'"mode"'],
  ['empty',"<?php /** @param array{mode:string,id:int} $options */ function read(array $options):void{$options[§",['id','mode'],"'id'"],
  ['unknown mutation',"<?php /** @param array{mode:string} $options */ function read(array $options):void{unknown($options);$options['mo§",[],undefined],
  ['changed',"<?php /** @param array{other:string} $options */ function read(array $options):void{$options['mo§",[],undefined],
  ['restored',"<?php /** @param array{mode:string} $options */ function read(array $options):void{$options['mo§",['mode'],"'mode'"],
];
export const arrayAccessCases: ArrayAccessCase[] = definitions.flatMap(([name,input,labels,insertion]) => [false,true].map(closed => {
  const quote = name === 'double quoted' ? '"' : "'";
  const marked = input + (closed ? `${name === 'empty' ? '' : quote}];}` : '');
  const offset = marked.indexOf('§');
  return {name: `${name} ${closed ? 'closed' : 'unclosed'}`, marked, labels, insertion,
    start: name === 'empty' ? offset : input.lastIndexOf('[') + 1,
    end: offset + (closed && name !== 'empty' ? 1 : 0)};
}));

const middleHeader = '<?php /** @param array{mode:string,payload:array{mode:string}} $options */ function read(array $options){';
const middleTails = [
  ['bracket', "$options[QUOTE mo§]; echo 'done';}"],
  ['statement', "$options[QUOTE mo§\necho 'done';}"],
  ['block', 'return $options[QUOTE mo§\n}'],
  ['argument', "strlen($options[QUOTE mo§); echo 'done';}"],
  ['comma', "combine($options[QUOTE mo§, 'next');}"],
  ['nested', "$options['payload'][QUOTE mo§]; echo 'done';}"],
  ['later call', '$options[QUOTE mo§]; unknown($options);}'],
] as const;
for (const [name, tail] of middleTails) for (const quote of ["'", '"']) {
  const marked = middleHeader + tail.replace('QUOTE ', quote), offset = marked.indexOf('§');
  arrayAccessCases.push({ name: `middle ${name} ${quote === "'" ? 'single' : 'double'}`, marked,
    labels: ['mode'], insertion: `${quote}mode${quote}`, start: marked.slice(0, offset).lastIndexOf('[') + 1, end: offset });
}
