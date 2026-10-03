import { existingShapeArrowCases } from './existingShapeArrowFixture.js';
import { unfinishedShapeContexts, unfinishedShapeSource, unfinishedShapeTail } from './unfinishedShapeFixture.js';

export interface WordMiddleShapeCase {
  name: string;
  part: 'key' | 'value';
  marked: string;
  labels: string[];
  insertion?: string;
  end: number;
}

export const wordMiddleShapeCases: WordMiddleShapeCase[] = unfinishedShapeContexts.flatMap(context =>
  (['key', 'value'] as const).flatMap(part => ["'", '"'].flatMap(quote => [true, false].map(closed => {
    const prefix = unfinishedShapeSource('middleChoose', 'mode', 'create', context, part)
      .replace(part === 'key' ? "['mo" : "['mode'=>'cr", part === 'key' ? `[${quote}mo` : `['mode'=>${quote}cr`);
    const remainder = part === 'key' ? 'de' : 'eate';
    const insertion = part === 'key' ? `${quote}mode${quote}` : `${quote}create${quote}`;
    return {
      name: `${context} ${part} ${quote} ${closed ? 'closed' : 'unclosed'} word middle`, part,
      marked: prefix + '§' + remainder + (closed ? quote : '')
        + (part === 'key' ? " => 'create'" : '') + unfinishedShapeTail(context),
      labels: [part === 'key' ? 'mode' : insertion], insertion,
      end: prefix.length + remainder.length + (closed ? 1 : 0),
    };
  }))));

wordMiddleShapeCases.push(...existingShapeArrowCases.filter(item => !item.labels.length).map(item => {
  const marked = item.marked.replace("'mo§", "'mo§de");
  return { name: `word middle ${item.name}`, part: 'key' as const, marked, labels: [], end: marked.indexOf('§') };
}));
