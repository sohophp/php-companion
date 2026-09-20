#!/usr/bin/env node
import process from 'node:process';
import { PhpSyntaxParser } from '@php-companion/parser';
import { isRouteProviderRequest, routeFacts, ROUTE_PROVIDER_PROTOCOL_VERSION, type RouteProviderResponse } from '@php-companion/route-provider';
import { collectSymfonyStaticRouteSnapshot } from './index.js';

function option(name: string): string | undefined { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }

async function main(): Promise<void> {
  let input = ''; for await (const part of process.stdin) input += part;
  let request: unknown;
  try { request = JSON.parse(input); } catch { process.stderr.write('Request is not JSON.\n'); process.exitCode = 2; return; }
  if (!isRouteProviderRequest(request)) { process.stderr.write('Request does not match route-provider protocol 1.\n'); process.exitCode = 2; return; }
  let response: RouteProviderResponse;
  try {
    const coreWasmPath = option('--parser-core-wasm'); const phpWasmPath = option('--php-wasm');
    if (!coreWasmPath || !phpWasmPath) throw new Error('Both --parser-core-wasm and --php-wasm are required.');
    const parser = await PhpSyntaxParser.create({ coreWasmPath, phpWasmPath });
    const snapshot = await collectSymfonyStaticRouteSnapshot(request.params.rootPath, parser, {
      ...(request.params.environment ? { environment: request.params.environment } : {}),
      ...(request.params.documents ? { documents: request.params.documents } : {}),
    });
    response = { protocolVersion: ROUTE_PROVIDER_PROTOCOL_VERSION, id: request.id,
      result: routeFacts(request.id.split(':')[0]!, request.params.generation, snapshot.routes, snapshot.complete) };
  } catch (error) {
    response = { protocolVersion: ROUTE_PROVIDER_PROTOCOL_VERSION, id: request.id,
      error: { code: 'symfony-static-routes', message: error instanceof Error ? error.message : String(error) } };
  }
  process.stdout.write(`${JSON.stringify(response)}\n`);
}
void main();
