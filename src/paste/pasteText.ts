const PHP_TYPE_NAME = /\b[A-Z][A-Za-z0-9_]*\b/;
const ALL_PHP_TYPE_NAMES = /\b[A-Z][A-Za-z0-9_]*\b/g;

export function potentialPhpTypeNames(text: string): Set<string> {
  return new Set(text.match(ALL_PHP_TYPE_NAMES) ?? []);
}

export function mayNeedPhpImportResolution(text: string): boolean {
  return PHP_TYPE_NAME.test(text);
}

export async function resolvePasteAliasConflicts<
  Symbol extends { fqcn: string; alias: string; selectedAlias?: string },
  Plan extends { conflict?: { fqcn: string; sourceAlias: string } },
>(symbols: Symbol[], planFor: (symbols: Symbol[]) => Promise<Plan | null>,
  chooseAlias: (conflict: NonNullable<Plan['conflict']>) => Promise<string | undefined>,
  canPrompt: boolean, sourceUnchanged: () => Promise<boolean>): Promise<Plan | undefined> {
  let current = symbols;
  if (!await sourceUnchanged()) return undefined;
  let plan = await planFor(current);
  // Resolve each symbol once; repeated conflicts cannot create an endless
  // prompt cycle or cause a partial import plan to escape.
  const resolved = new Set<string>();
  while (plan?.conflict) {
    if (!canPrompt || !await sourceUnchanged()) return undefined;
    const conflict = plan.conflict; const key = conflict.fqcn.toLowerCase();
    if (resolved.has(key) || !current.some(symbol => symbol.fqcn.toLowerCase() === key)) return undefined;
    const selectedAlias = await chooseAlias(conflict);
    if (!selectedAlias || !await sourceUnchanged()) return undefined;
    resolved.add(key);
    current = current.map(symbol => symbol.fqcn.toLowerCase() === key ? { ...symbol, selectedAlias } : symbol);
    plan = await planFor(current);
  }
  return plan && await sourceUnchanged() ? plan : undefined;
}
