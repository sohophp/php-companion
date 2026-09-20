export interface RestartBudget {
  recordClose(): { restart: boolean; recentCloses: number };
}

export interface LanguageServerActivationInput {
  enabled: boolean;
  explicitlyConfigured: boolean;
  competingServerInstalled: boolean;
}

export interface LanguageServerActivationDecision {
  start: boolean;
  blockedByCompetingServer: boolean;
}

/** Keep one general PHP semantic owner unless the user explicitly opts into coexistence. */
export function resolveLanguageServerActivation(input: LanguageServerActivationInput): LanguageServerActivationDecision {
  const blockedByCompetingServer = input.enabled && input.competingServerInstalled && !input.explicitlyConfigured;
  return { start: input.enabled && !blockedByCompetingServer, blockedByCompetingServer };
}

export function composerRequiresSymfony(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const manifest = value as Record<string, unknown>;
  for (const section of ['require', 'require-dev']) {
    const dependencies = manifest[section];
    if (!dependencies || typeof dependencies !== 'object' || Array.isArray(dependencies)) continue;
    const names = Object.keys(dependencies as Record<string, unknown>).map((name) => name.toLowerCase());
    if (names.includes('symfony/framework-bundle') || names.includes('symfony/symfony')) return true;
  }
  return false;
}

export function createRestartBudget(options: { maxRestarts?: number; windowMs?: number; now?: () => number } = {}): RestartBudget {
  const maxRestarts = options.maxRestarts ?? 3;
  const windowMs = options.windowMs ?? 60_000;
  const now = options.now ?? Date.now;
  let closes: number[] = [];
  return {
    recordClose: (): { restart: boolean; recentCloses: number } => {
      const timestamp = now();
      closes = closes.filter((close) => timestamp - close < windowMs);
      const restart = closes.length < maxRestarts;
      closes.push(timestamp);
      return { restart, recentCloses: closes.length };
    },
  };
}
