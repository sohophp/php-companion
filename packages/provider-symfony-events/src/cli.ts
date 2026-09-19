#!/usr/bin/env node
import process from 'node:process';
import { PhpSyntaxParser } from '@php-companion/parser';
import { isSemanticProviderRequest, semanticFacts, SEMANTIC_PROVIDER_PROTOCOL_VERSION, type SemanticProviderResponse } from '@php-companion/semantic-provider';
import { collectSymfonyEventFacts } from './index.js';

function option(name: string): string | undefined { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }

async function main(): Promise<void> {
  let input = ''; for await (const part of process.stdin) input += part;
  let request: unknown;
  try { request = JSON.parse(input); } catch { process.stderr.write('Request is not JSON.\n'); process.exitCode = 2; return; }
  if (!isSemanticProviderRequest(request)) { process.stderr.write('Request does not match semantic-provider protocol 1.\n'); process.exitCode = 2; return; }
  let response: SemanticProviderResponse;
  try {
    const coreWasmPath = option('--parser-core-wasm'); const phpWasmPath = option('--php-wasm');
    if (!coreWasmPath || !phpWasmPath) throw new Error('Both --parser-core-wasm and --php-wasm are required.');
    if (!request.params.projectTypes) throw new Error('A complete project type catalog is required.');
    if (!request.params.containerServices) throw new Error('A complete container service catalog is required.');
    const parser = await PhpSyntaxParser.create({ coreWasmPath, phpWasmPath });
    try {
      const facts = await collectSymfonyEventFacts(request.params.rootPath, parser, {
        projectTypes: request.params.projectTypes, containerServices: request.params.containerServices,
        ...(request.params.documents ? { documents: request.params.documents } : {}),
      });
      response = { protocolVersion: SEMANTIC_PROVIDER_PROTOCOL_VERSION, id: request.id,
        result: semanticFacts(request.id.split(':')[0]!, request.params.generation, {
          eventSubscriptions: facts.subscriptions, eventDispatches: facts.dispatches,
        }) };
    } finally { parser.dispose(); }
  } catch (error) {
    response = { protocolVersion: SEMANTIC_PROVIDER_PROTOCOL_VERSION, id: request.id,
      error: { code: 'symfony-events', message: error instanceof Error ? error.message : String(error) } };
  }
  process.stdout.write(`${JSON.stringify(response)}\n`);
}
void main();
