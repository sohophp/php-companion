export interface QuotedPrefixCase {
  name: string;
  marked: string;
  label: string;
  insertion: string;
  start: number;
  end: number;
}
const definitions: Array<[string, string, string, string, string]> = [
  ['punctuation key', "array{'content-type':string}", "['content-", 'content-type', "'content-type' => "],
  ['unicode key', "array{'标题':string}", "['标", '标题', "'标题' => "],
  ['escaped key', "array{'can\\'t':string}", "['can\\'t", "can't", "'can\\'t' => "],
  ['arrow in key', "array{'a=>b':string}", "['a=>", 'a=>b', "'a=>b' => "],
  ['slash value', "array{format:'application/json'|'text/html'}", "['format'=>'application/", "'application/json'", "'application/json'"],
  ['unicode value', "array{'标题':'已发布'|'草稿'}", "['标题'=>'已", "'已发布'", "'已发布'"],
  ['escaped value', "array{name:'can\\'t'}", "['name'=>'can\\'", "'can\\'t'", "'can\\'t'"],
  ['double quoted dollar', "array{name:'price$usd'}", '["name"=>"price', '"price\\$usd"', '"price\\$usd"'],
];
export const quotedPrefixCases: QuotedPrefixCase[] = definitions.flatMap(([name, type, input, label, insertion]) =>
  [false, true].map(closed => {
    const prefix = `<?php /** @param ${type} $options */ function quotedChoose(array $options):void{} quotedChoose(`;
    const quote = name === 'double quoted dollar' ? '"' : "'";
    const marked = `${prefix}${input}§${closed ? `${quote}]);` : ''}`;
    const value = insertion === label;
    const start = prefix.length + (value ? input.indexOf('=>') + 2 : 1);
    return {name: `${name} ${closed ? 'closed' : 'unclosed'}`, marked, label, insertion, start, end: marked.indexOf('§') + (closed ? 1 : 0)};
  }));
