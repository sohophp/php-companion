import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { PhpSyntaxParser } from '@php-companion/parser';
import { isRouteFactsContribution, routeFacts } from '@php-companion/route-provider';
import { collectSymfonyStaticRouteFacts, collectSymfonyStaticRouteSnapshot } from '../../src/index.js';

describe('Symfony static route provider', () => {
  let parser: PhpSyntaxParser; const roots: string[] = [];
  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
  afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

  it('collects imports, attributes, environments, controller sources and unsaved snapshots', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-symfony-routes-')); roots.push(root);
    await mkdir(join(root, 'config', 'routes'), { recursive: true }); await mkdir(join(root, 'src', 'Controller'), { recursive: true });
    await writeFile(join(root, 'composer.json'), JSON.stringify({ require: { 'symfony/framework-bundle': '^7.4' }, autoload: { 'psr-4': { 'App\\': 'src/' } } }));
    const controller = `<?php namespace App\\Controller; use Symfony\\Component\\Routing\\Attribute\\Route;
      #[Route('/base', name: 'site.')] final class HomeController {
        #[Route('/home/{id}', name: 'home')] public function home(): void {}
        #[Route('/dev', name: 'dev', env: 'dev')] public function dev(): void {}
      }`;
    const controllerPath = join(root, 'src', 'Controller', 'HomeController.php'); await writeFile(controllerPath, controller);
    await writeFile(join(root, 'config', 'routes.yaml'), `controllers:
  resource: ../src/Controller/
  type: attribute
admin:
  resource: routes/admin.yaml
  name_prefix: admin.
`);
    const adminPath = join(root, 'config', 'routes', 'admin.yaml');
    await writeFile(adminPath, 'dashboard: {path: /dashboard, controller: App\\Controller\\HomeController::home}\n');
    const snapshot = await collectSymfonyStaticRouteSnapshot(root, parser, { environment: 'prod', documents: [{
      uri: pathToFileURL(adminPath).toString(), languageId: 'yaml', snapshotVersion: '2',
      source: 'edited: {path: /edited, controller: App\\Controller\\HomeController::home}\n',
    }] });
    expect(snapshot.complete).toBe(true);
    expect(snapshot.inputEvidenceComplete).toBe(true);
    expect(snapshot.inputUris).toContain(pathToFileURL(adminPath).toString());
    expect(snapshot.inputUris).toContain(pathToFileURL(join(root, 'config', 'routes.yml')).toString());
    expect(snapshot.inputDirectoryUris).toContain(pathToFileURL(join(root, 'src', 'Controller')).toString());
    const routes = snapshot.routes;
    expect(routes.map((route) => [route.name, route.path])).toEqual([
      ['admin.edited', '/edited'], ['site.home', '/base/home/{id}'],
    ]);
    expect(routes[0]?.controller).toMatchObject({ className: 'App\\Controller\\HomeController', method: 'home' });
  });

  it('follows deterministic Kernel attribute imports and refuses dynamic route branches', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-kernel-routes-')); roots.push(root);
    await mkdir(join(root, 'src', 'Controller'), { recursive: true });
    await writeFile(join(root, 'composer.json'), JSON.stringify({ require: { 'symfony/framework-bundle': '^7.4' }, autoload: { 'psr-4': { 'App\\': 'src/' } } }));
    await writeFile(join(root, 'src', 'Controller', 'HomeController.php'), String.raw`<?php namespace App\Controller;
      class HomeController { #[\Symfony\Component\Routing\Attribute\Route('/home', name: 'home')] public function index(): void {} }`);
    const kernelPath = join(root, 'src', 'Kernel.php');
    const kernel = `<?php namespace App;
      use Symfony\\Component\\HttpKernel\\Kernel as BaseKernel;
      use Symfony\\Component\\Routing\\Loader\\Configurator\\RoutingConfigurator;
      class Kernel extends BaseKernel {
        protected function configureRoutes(RoutingConfigurator $routes): void {
          $routes->import(__DIR__ . '/Controller/', 'attribute')->prefix('/api')->namePrefix('api_');
        }
      }`;
    await writeFile(kernelPath, kernel);
    const staticRoutes = await collectSymfonyStaticRouteSnapshot(root, parser);
    expect(staticRoutes.complete).toBe(true);
    expect(staticRoutes.routes.map((route) => [route.name, route.path])).toEqual([['api_home', '/api/home']]);
    await writeFile(kernelPath, kernel.replace("$routes->import(__DIR__ . '/Controller/', 'attribute')->prefix('/api')->namePrefix('api_');",
      "if (featureEnabled()) { $routes->import(__DIR__ . '/Controller/', 'attribute'); }"));
    const dynamicRoutes = await collectSymfonyStaticRouteSnapshot(root, parser);
    expect(dynamicRoutes.complete).toBe(false);
    expect(dynamicRoutes.routes).toEqual([]);
    await writeFile(kernelPath, kernel.replace('extends BaseKernel', 'extends ProjectKernel'));
    const unknownKernel = await collectSymfonyStaticRouteSnapshot(root, parser);
    expect(unknownKernel.complete).toBe(false);
    expect(unknownKernel.routes).toEqual([]);
  });

  it('loads the conventional PHP route entrypoint and its unsaved snapshot', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-php-routes-')); roots.push(root);
    await mkdir(join(root, 'config', 'routes'), { recursive: true });
    await writeFile(join(root, 'composer.json'), '{}');
    const phpPath = join(root, 'config', 'routes.php');
    const source = `<?php use Symfony\\Component\\Routing\\Loader\\Configurator\\RoutingConfigurator;
      use App\\Controller\\HomeController as Home;
      return static function (RoutingConfigurator $routes): void {
        $routes->add('home', '/home')->controller([Home::class, 'index']);
        $routes->import('routes/child.yaml')->prefix('/api')->namePrefix('api_');
      };`;
    await writeFile(phpPath, source);
    await writeFile(join(root, 'config', 'routes', 'child.yaml'), 'child: {path: /child}\n');
    const snapshot = await collectSymfonyStaticRouteSnapshot(root, parser);
    expect(snapshot.complete).toBe(true);
    expect(snapshot.inputUris).toContain(pathToFileURL(phpPath).toString());
    expect(snapshot.routes.map((route) => [route.name, route.path])).toEqual([['api_child', '/api/child'], ['home', '/home']]);
    expect(snapshot.routes[1]?.controller).toMatchObject({ className: 'App\\Controller\\HomeController', classSourceName: 'Home', method: 'index' });
    expect(isRouteFactsContribution(routeFacts('symfony-static', '1', snapshot.routes))).toBe(true);
    const edited = await collectSymfonyStaticRouteSnapshot(root, parser, { documents: [{
      uri: pathToFileURL(phpPath).toString(), languageId: 'php', snapshotVersion: '2',
      source: source.replace("$routes->add('home', '/home')", "$routes->add('home', '/edited')"),
    }] });
    expect(edited.complete).toBe(true);
    expect(edited.routes.map((route) => [route.name, route.path])).toEqual([['api_child', '/api/child'], ['home', '/edited']]);
  });

  it('resolves registered bundle route resources without executing project PHP', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-symfony-bundle-routes-')); roots.push(root);
    await mkdir(join(root, 'bundle', 'Resources', 'config'), { recursive: true }); await mkdir(join(root, 'config'), { recursive: true });
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'Vendor\\Demo\\': 'bundle/' } } }));
    await writeFile(join(root, 'bundle', 'DemoBundle.php'), '<?php namespace Symfony\\Component\\HttpKernel\\Bundle { abstract class Bundle {} } namespace Vendor\\Demo { final class DemoBundle extends \\Symfony\\Component\\HttpKernel\\Bundle\\Bundle {} }');
    await writeFile(join(root, 'config', 'bundles.php'), "<?php return [Vendor\\Demo\\DemoBundle::class => ['all' => true]];");
    await writeFile(join(root, 'config', 'routes.yaml'), "demo: {resource: '@DemoBundle/Resources/config/routes.yaml', name_prefix: demo.}\n");
    await writeFile(join(root, 'bundle', 'Resources', 'config', 'routes.yaml'), 'home: {path: /bundle}\n');
    expect((await collectSymfonyStaticRouteFacts(root, parser)).map((route) => [route.name, route.path]))
      .toEqual([['demo.home', '/bundle']]);
  });

  it('skips a repeated attribute directory symlink without losing its unique route', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-symfony-route-symlink-')); roots.push(root);
    const controllers = join(root, 'controllers'); await mkdir(join(controllers, 'nested'), { recursive: true }); await mkdir(join(root, 'config'));
    await writeFile(join(root, 'composer.json'), '{}');
    await writeFile(join(root, 'config', 'routes.yaml'), 'controllers: {resource: ../controllers/, type: attribute}\n');
    await writeFile(join(controllers, 'nested', 'Imported.php'), String.raw`<?php namespace Nested; class Imported { #[\Symfony\Component\Routing\Attribute\Route('/nested', name: 'nested')] public function run() {} }`);
    await symlink(controllers, join(controllers, 'nested', 'loop'), 'dir');
    const snapshot = await collectSymfonyStaticRouteSnapshot(root, parser);
    expect(snapshot.complete).toBe(true);
    expect(snapshot.routes.map((route) => route.name)).toEqual(['nested']);
  });

  it('keeps a normal controller directory complete within the default route budget', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-symfony-route-directory-')); roots.push(root);
    const controllers = join(root, 'src', 'Controller');
    await mkdir(controllers, { recursive: true }); await mkdir(join(root, 'config'));
    await writeFile(join(root, 'composer.json'), JSON.stringify({ require: { 'symfony/framework-bundle': '^7.4' } }));
    await writeFile(join(root, 'config', 'routes.yaml'), 'home: {path: /home}\ncontrollers: {resource: ../src/Controller/**/*.php, type: attribute}\n');
    await Promise.all(Array.from({ length: 40 }, (_, index) => writeFile(join(controllers, `Controller${index}.php`),
      index === 0
        ? String.raw`<?php namespace App\Controller; class Controller0 { #[\Symfony\Component\Routing\Attribute\Route('/first', name: 'first')] public function run() {} }`
        : `<?php namespace App\\Controller; class Controller${index} { public function run(): void {} }`)));
    const snapshot = await collectSymfonyStaticRouteSnapshot(root, parser);
    expect(snapshot.complete).toBe(true);
    expect(snapshot.routes.map((route) => route.name)).toEqual(['first', 'home']);
  });

  it('marks partial static graphs incomplete instead of publishing authoritative omissions', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-symfony-routes-incomplete-')); roots.push(root);
    await mkdir(join(root, 'config', 'routes'), { recursive: true });
    await writeFile(join(root, 'composer.json'), '{}');
    await writeFile(join(root, 'config', 'routes.yaml'), 'one: {resource: routes/one.yaml}\ntwo: {resource: routes/two.yaml}\n');
    await writeFile(join(root, 'config', 'routes', 'one.yaml'), 'one: {path: /one}\n');
    await writeFile(join(root, 'config', 'routes', 'two.yaml'), 'two: {path: /two}\n');
    const bounded = await collectSymfonyStaticRouteSnapshot(root, parser, { maxEntries: 2 });
    expect(bounded.complete).toBe(false);
    expect(bounded.inputEvidenceComplete).toBe(false);
    const malformed = await collectSymfonyStaticRouteSnapshot(root, parser, { documents: [{
      uri: pathToFileURL(join(root, 'config', 'routes', 'one.yaml')).toString(), languageId: 'yaml', snapshotVersion: '3', source: 'broken: [',
    }] });
    expect(malformed.complete).toBe(false);
    expect(malformed.inputEvidenceComplete).toBe(true);
  });

  it('marks duplicate route names incomplete instead of claiming an authoritative graph', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-symfony-route-duplicates-')); roots.push(root);
    await mkdir(join(root, 'config', 'routes'), { recursive: true });
    await writeFile(join(root, 'composer.json'), '{}');
    await writeFile(join(root, 'config', 'routes.yaml'), 'first: {resource: routes/first.yaml}\nsecond: {resource: routes/second.yaml}\n');
    await writeFile(join(root, 'config', 'routes', 'first.yaml'), 'shared: {path: /first}\n');
    await writeFile(join(root, 'config', 'routes', 'second.yaml'), 'shared: {path: /second}\n');
    const snapshot = await collectSymfonyStaticRouteSnapshot(root, parser);
    expect(snapshot.complete).toBe(false);
    expect(snapshot.inputEvidenceComplete).toBe(true);
    expect(snapshot.routes).toEqual([]);
  });

  it('marks circular route imports incomplete', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-symfony-route-cycle-')); roots.push(root);
    await mkdir(join(root, 'config', 'routes'), { recursive: true });
    await writeFile(join(root, 'composer.json'), '{}');
    await writeFile(join(root, 'config', 'routes.yaml'), 'child: {resource: routes/child.yaml}\n');
    await writeFile(join(root, 'config', 'routes', 'child.yaml'), 'parent: {resource: ../routes.yaml}\n');
    const snapshot = await collectSymfonyStaticRouteSnapshot(root, parser);
    expect(snapshot.complete).toBe(false);
    expect(snapshot.inputEvidenceComplete).toBe(true);
  });
});
