export type LargeRankingKind = 'function' | 'constant' | 'method';

export function largeRankingFixture(kind: LargeRankingKind, count: number, exact = false): {
  source: string; offset: number; target: string; unknown: string; exactName: string;
} {
  const prefix = kind === 'constant' ? 'OFFER_' : 'offer';
  const target = prefix + String(count - 1).padStart(3, '0');
  const definitions = Array.from({ length: count }, (_, index) => {
    const name = prefix + String(index).padStart(3, '0');
    if (kind === 'constant') return `const ${name} = ${index === count - 1 ? '1' : index === 1 ? 'UNKNOWN_VALUE' : "'text'"};`;
    return `${kind === 'method' ? 'public ' : ''}function ${name}()${index === 1 ? '' : ': ' + (index === count - 1 ? 'int' : 'string')} { return ${index === count - 1 ? '1' : "'text'"}; }`;
  }).join('\n');
  const exactDeclaration = !exact ? '' : kind === 'constant' ? "const OFFER_ = 'text';"
    : `${kind === 'method' ? 'public ' : ''}function offer(): string { return 'text'; }`;
  const source = kind === 'method'
    ? `<?php class Provider { ${definitions} ${exactDeclaration} private function offerPrivate(): int { return 1; } } function consume(int $value):void{} $service=new Provider(); consume($service->offer);`
    : `<?php ${definitions} ${exactDeclaration} function consume(int $value):void{} consume(${prefix});`;
  return { source, offset: source.lastIndexOf(prefix) + prefix.length, target, unknown: prefix + '001', exactName: prefix };
}
