/** Match only spellings that can be explained to the user in a completion list. */
export function completionMatchRank(name: string, prefix: string): number | undefined {
  if (!prefix) return 0;
  if (name.startsWith(prefix)) return name === prefix ? 0 : 1;
  const lowerName = name.toLowerCase();
  const lowerPrefix = prefix.toLowerCase();
  if (lowerName.startsWith(lowerPrefix)) return 2;
  if (prefix.length < 2) return undefined;
  const initials = name.split(/_+|(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/u)
    .filter(Boolean).map((part) => part[0]!.toLowerCase()).join('');
  if (initials.length > 1 && initials.startsWith(lowerPrefix)) return 3;
  if (prefix.length >= 3 && lowerName.includes(lowerPrefix)) return 4;
  return undefined;
}
