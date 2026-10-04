export type LargeLocalRankingKind = 'variable' | 'blank' | 'construction';

export function largeLocalRankingFixture(kind: LargeLocalRankingKind, count: number, locals = false): {
  source: string; offset: number; target: string; unknown: string; prefix: string;
} {
  const prefix = kind === 'construction' ? 'Offer' : '$offer';
  const target = prefix + String(count - 1).padStart(3, '0'), unknown = prefix + '001';
  const declarations = Array.from({ length: count }, (_, index) => {
    const name = prefix + String(index).padStart(3, '0');
    if (kind === 'construction') return `class ${name}${index === count - 1 ? ' implements Contract' : index === 1 ? ' extends MissingBase' : ''} {}`;
    if (locals) return index === 1 ? '' : `${name}=${index === count - 1 ? '1' : "'text'"};`;
    return `${index === count - 1 ? 'int ' : index === 1 ? '' : 'string '}${name}`;
  }).join(kind === 'construction' || locals ? '\n' : ',');
  const source = kind === 'construction'
    ? `<?php interface Contract {} ${declarations} function consume(Contract $value):void{} consume(new Offer);`
    : `<?php $offerOutside=1; function consume(int $value):void{} function run(${locals ? unknown : declarations}) { ${locals ? declarations : ''} consume(${kind === 'blank' ? '' : prefix}); }`;
  const offset = kind === 'blank' ? source.lastIndexOf('consume(') + 'consume('.length : source.lastIndexOf(prefix) + prefix.length;
  return { source, offset, target, unknown, prefix: kind === 'blank' ? '' : prefix };
}
