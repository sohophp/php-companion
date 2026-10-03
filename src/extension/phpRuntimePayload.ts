import type { PhpRuntime } from '@php-companion/runtime-probe';

export type PhpExtensionRuntimePayload = Omit<PhpRuntime, 'command' | 'path' | 'minor'> & { executable: string };

// Keep the client payload in step with facts added to PhpRuntime. The runtime
// command and local path are client details; the server receives the executable.
export function phpRuntimePayload(runtime: PhpRuntime): PhpExtensionRuntimePayload {
  const facts: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(runtime)) {
    if (key === 'command' || key === 'path' || key === 'minor' || value === undefined) continue;
    facts[key] = value;
  }
  return { ...facts, executable: runtime.path } as PhpExtensionRuntimePayload;
}
