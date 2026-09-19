#!/usr/bin/env node
import process from 'node:process';
import { isRouteProviderRequest, routeFacts, ROUTE_PROVIDER_PROTOCOL_VERSION, type RouteProviderResponse } from '@php-companion/route-provider';
import { collectWinstarModuleRouteFacts, loadWinstarRuntimeRoutes } from './index.js';

function option(name: string): string | undefined { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
async function main(): Promise<void> {
  let input = ''; for await (const part of process.stdin) input += part;
  let request: unknown;
  try { request = JSON.parse(input); } catch { process.stderr.write('Request is not JSON.\n'); process.exitCode = 2; return; }
  if (!isRouteProviderRequest(request)) { process.stderr.write('Request does not match route-provider protocol 1.\n'); process.exitCode = 2; return; }
  let response: RouteProviderResponse;
  try {
      const runtime = await loadWinstarRuntimeRoutes(request.params.rootPath, request.params.environment, {
        ...(option('--php') ? { php: option('--php') } : {}), ...(option('--console') ? { console: option('--console') } : {}),
        ...(option('--runtime-timeout-ms') ? { timeoutMs: Number(option('--runtime-timeout-ms')) } : {}),
      });
      const routes = await collectWinstarModuleRouteFacts(request.params.rootPath, runtime);
      response = { protocolVersion: ROUTE_PROVIDER_PROTOCOL_VERSION, id: request.id, result: routeFacts(request.id.split(':')[0]!, request.params.generation, routes) };
    } catch (error) {
      response = { protocolVersion: ROUTE_PROVIDER_PROTOCOL_VERSION, id: request.id, error: { code: 'winstar-routes', message: error instanceof Error ? error.message : String(error) } };
    }
    process.stdout.write(`${JSON.stringify(response)}\n`);
  }
void main();
