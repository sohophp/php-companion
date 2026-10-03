import { spawn } from 'node:child_process';
import {
  SEMANTIC_PROVIDER_PROTOCOL_VERSION,
  isSemanticProviderRequest,
  isSemanticProviderResponse,
  type SemanticFactsContribution,
  type ExternalContainerServiceFact,
  type SemanticProviderDocument,
  type SemanticProviderDescriptor,
  type SemanticProviderProjectType,
  type SemanticProviderRequest,
} from '@php-companion/semantic-provider';

export interface SemanticProviderContext { rootUri: string; rootPath: string; generation: string; phpVersion: string; environment?: string;
  documents?: readonly SemanticProviderDocument[]; projectTypes?: readonly SemanticProviderProjectType[];
  containerServices?: readonly ExternalContainerServiceFact[]; }
export type SemanticProviderFailureCode = 'spawn' | 'timeout' | 'output-limit' | 'exit' | 'protocol' | 'provider';
export interface SemanticProviderContainerInputEvidence {
  uris: readonly string[];
  configurationUris: readonly string[];
  complete: boolean;
}
export type SemanticProviderRunResult = { ok: true; contribution: SemanticFactsContribution }
  | { ok: false; code: SemanticProviderFailureCode; message: string;
    containerInputEvidence?: SemanticProviderContainerInputEvidence };

export async function runSemanticProvider(descriptor: SemanticProviderDescriptor, context: SemanticProviderContext): Promise<SemanticProviderRunResult> {
  const request: SemanticProviderRequest = {
    protocolVersion: SEMANTIC_PROVIDER_PROTOCOL_VERSION,
    id: `${descriptor.providerId}:${context.generation}`,
    method: 'facts', params: context,
  };
  if (!isSemanticProviderRequest(request as unknown)) {
    const validWith = (part: Partial<SemanticProviderContext>): boolean => isSemanticProviderRequest({
      ...request, params: { ...context, documents: undefined, projectTypes: undefined, containerServices: undefined, ...part },
    });
    const invalidPart = !validWith({}) ? 'base fields'
      : !validWith({ documents: context.documents }) ? 'document snapshots'
        : !validWith({ projectTypes: context.projectTypes }) ? 'project types'
          : !validWith({ containerServices: context.containerServices }) ? 'container services' : 'combined input';
    return { ok: false, code: 'protocol', message: `Invalid semantic-provider request: ${invalidPart}.` };
  }
  const timeoutMs = descriptor.timeoutMs ?? 5_000;
  const outputLimit = descriptor.maxOutputBytes ?? 4 * 1024 * 1024;
  return new Promise((resolveRun) => {
    let settled = false; let stdoutBytes = 0; let stderrBytes = 0;
    const stdout: Buffer[] = []; const stderr: Buffer[] = [];
    const finish = (result: SemanticProviderRunResult): void => { if (settled) return; settled = true; clearTimeout(timer); resolveRun(result); };
    const child = spawn(descriptor.command, [...(descriptor.args ?? [])], { cwd: context.rootPath, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    const timer = setTimeout(() => { child.kill(); finish({ ok: false, code: 'timeout', message: `Provider exceeded ${timeoutMs} ms.` }); }, timeoutMs);
    child.on('error', (error) => finish({ ok: false, code: 'spawn', message: error.message }));
    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > outputLimit) { child.kill(); finish({ ok: false, code: 'output-limit', message: `Provider stdout exceeded ${outputLimit} bytes.` }); }
      else stdout.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => { if (stderrBytes < 8192) { const kept = chunk.subarray(0, 8192 - stderrBytes); stderr.push(kept); stderrBytes += kept.length; } });
    child.on('close', (code, signal) => {
      if (settled) return;
      const detail = Buffer.concat(stderr).toString('utf8').trim();
      if (code !== 0) return finish({ ok: false, code: 'exit', message: `Provider exited with ${code ?? signal ?? 'unknown'}.${detail ? ` ${detail}` : ''}` });
      let response: unknown;
      try { response = JSON.parse(Buffer.concat(stdout).toString('utf8').trim()); }
      catch { return finish({ ok: false, code: 'protocol', message: 'Provider stdout is not one JSON response.' }); }
      if (!isSemanticProviderResponse(response) || response.id !== request.id) return finish({ ok: false, code: 'protocol', message: 'Provider returned an invalid or mismatched response.' });
      if (response.error) return finish({ ok: false, code: 'provider', message: `${response.error.code}: ${response.error.message}` });
      const contribution = response.result!;
      if (contribution.providerId !== descriptor.providerId || contribution.generation !== context.generation) {
        return finish({ ok: false, code: 'protocol', message: 'Provider contribution identity, generation, or completeness did not match the request.' });
      }
      if (!contribution.complete) {
        // A failed semantic snapshot can still identify all files it read,
        // including negative lookups. Preserve only this validated evidence;
        // never expose its incomplete methods, services, or other facts.
        const containerInputEvidence = contribution.containerInputUris ? {
          uris: [...contribution.containerInputUris],
          configurationUris: [...(contribution.containerConfigurationUris ?? [])],
          complete: contribution.containerInputEvidenceComplete === true,
        } : undefined;
        return finish({ ok: false, code: 'protocol',
          message: 'Provider contribution identity, generation, or completeness did not match the request.',
          ...(containerInputEvidence ? { containerInputEvidence } : {}) });
      }
      finish({ ok: true, contribution });
    });
    child.stdin.end(`${JSON.stringify(request)}\n`);
  });
}
