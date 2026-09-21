import { access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { build } from 'esbuild';

/** Use the extension's actual registration code, rather than copied descriptors. */
export async function symfonyBenchmarkInitialization(directory = resolve('packages/php-companion-symfony/dist')) {
  const names = ['service-provider.js', 'event-provider.js', 'controller-context-provider.js',
    'static-route-provider.js', 'winstar-route-provider.js', 'web-tree-sitter.wasm', 'tree-sitter-php.wasm'];
  const paths = names.map((name) => join(directory, name));
  await Promise.all(paths.map((path) => access(path)));
  const compiled = await build({ entryPoints: [resolve('packages/php-companion-symfony/src/integration.ts')],
    bundle: true, write: false, format: 'esm', platform: 'node', target: 'node20', logLevel: 'silent' });
  const { SymfonyIntegration } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString('base64')}`);
  let contribution;
  const integration = new SymfonyIntegration({ version: 1, registerIntegration(value) {
    contribution = value; return { dispose() {} };
  } }, ...paths);
  const status = integration.status();
  if (!status.serviceProviderRegistered || !status.eventProviderRegistered || !status.controllerContextProviderRegistered
    || !status.staticRouteProviderRegistered || status.winstarRouteProviderRegistered) throw new Error('Incomplete Symfony benchmark registration');
  return { bundledSemanticProviders: contribution.semanticProviders, bundledRouteProviders: contribution.routeProviders };
}
import { Buffer } from 'node:buffer';
