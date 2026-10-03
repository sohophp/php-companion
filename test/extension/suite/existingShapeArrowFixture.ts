import { unfinishedShapeContexts, unfinishedShapeSource, unfinishedShapeTail } from './unfinishedShapeFixture.js';

export interface ExistingShapeArrowCase {
  name: string;
  marked: string;
  labels: string[];
  insertion?: string;
  end: number;
}

export const existingShapeArrowCases: ExistingShapeArrowCase[] = unfinishedShapeContexts.flatMap(context =>
  ["'", '"'].flatMap(quote => [true, false].map(closed => {
    const prefix = unfinishedShapeSource('choose', 'mode', 'create', context, 'key').replace("['mo", `[${quote}mo`);
    return {
      name: `${context} ${quote} ${closed ? 'closed' : 'unclosed'} existing arrow`,
      marked: prefix + '§' + (closed ? quote : '') + " => 'create'" + unfinishedShapeTail(context),
      labels: ['mode'], insertion: `${quote}mode${quote}`, end: prefix.length + (closed ? 1 : 0),
    };
  })));

const declaration = "<?php /** @param array{mode:'create'} $options */ function choose(array $options):void{} ";
const negatives = [
  ['unknown call', declaration + "unknown(['mo§ => 'create']); echo 'done';"],
  ['unknown nested call', declaration + "choose(unknown(['mo§ => 'create'])); echo 'done';"],
  ['unknown shape', declaration.replace("array{mode:'create'}", 'array') + "choose(['mo§ => 'create']); echo 'done';"],
  ['mixed shape', declaration.replace("array{mode:'create'}", "array{mode:'create'}|array") + "choose(['mo§ => 'create']); echo 'done';"],
  ['comment', declaration + "// choose(['mo§ => 'create']); echo 'done';"],
  ['HTML', declaration + "?>choose(['mo§ => 'create']); echo 'done';"],
  ['remaining syntax error', declaration + "choose(['mo§ => 'create']); echo 'done'; class {"],
  ['nonarray contract', declaration.replace("array{mode:'create'}", 'string') + "choose(['mo§ => 'create']); echo 'done';"],
] as const;
existingShapeArrowCases.push(...negatives.map(([name, marked]) => ({ name, marked, labels: [], end: marked.indexOf('§') })));
