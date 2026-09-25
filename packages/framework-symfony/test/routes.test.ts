import { describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { analyzeSymfonyKernelRouteImports, analyzeSymfonyRoutePhp, analyzeSymfonyRouteYaml, symfonyRouteCallAt, symfonyRouteNameText, symfonyRouteParameterCallAt, symfonyYamlRouteControllerAt } from '../src/index.js';

describe('static Symfony routes', () => {
  it('preserves literal route names, locations and import prefixes without inventing runtime routes', () => {
    const source = '# 中文 😀\r\n"account.show":\r\n  path: /account/{id}\r\nchild:\r\n  resource: routes/child.yaml\r\n  name_prefix: admin.\r\n  prefix: /admin\r\n';
    const facts = analyzeSymfonyRouteYaml('file:///routes.yaml', source);
    expect(facts.complete).toBe(true);
    expect(facts.routes.map(({ name, path, start, end }) => ({ name, path, text: source.slice(start, end) }))).toEqual([
      { name: 'account.show', path: '/account/{id}', text: '"account.show"' },
    ]);
    expect(facts.imports).toEqual([{ resource: 'routes/child.yaml', namePrefix: 'admin.', pathPrefix: '/admin' }]);
  });
  it('locates exact class and method segments in literal YAML controllers', () => {
    const source = `direct:
  path: /direct
  controller: App\\Controller\\DirectController::run
defaults:
  path: {en: /english, fr: /francais}
  defaults: {_controller: 'App\\Controller\\LocalizedController::show'}
invokable: {path: /invoke, controller: App\\Controller\\InvokableController}
service: {path: /service, controller: app.controller::run}
escaped: {path: /escaped, controller: "App\\\\Controller\\\\EscapedController::run"}
`;
    const facts = analyzeSymfonyRouteYaml('file:///routes.yaml', source);
    const controllers = facts.routes.map(({ name, controller }) => ({ name, controller: controller && {
      className: controller.className, method: controller.method,
      classText: source.slice(controller.classStart, controller.classEnd),
      methodText: controller.methodStart === undefined ? undefined : source.slice(controller.methodStart, controller.methodEnd),
    } }));
    expect(controllers).toEqual([
      { name: 'direct', controller: { className: 'App\\Controller\\DirectController', method: 'run', classText: 'App\\Controller\\DirectController', methodText: 'run' } },
      { name: 'defaults.en', controller: { className: 'App\\Controller\\LocalizedController', method: 'show', classText: 'App\\Controller\\LocalizedController', methodText: 'show' } },
      { name: 'defaults.fr', controller: { className: 'App\\Controller\\LocalizedController', method: 'show', classText: 'App\\Controller\\LocalizedController', methodText: 'show' } },
      { name: 'invokable', controller: { className: 'App\\Controller\\InvokableController', method: undefined, classText: 'App\\Controller\\InvokableController', methodText: undefined } },
      { name: 'service', controller: undefined },
      { name: 'escaped', controller: undefined },
    ]);
  });
  it('selects a literal controller segment at the cursor in standard and module route YAML', () => {
    const source = `standard:
  path: /standard
  controller: App\\Controller\\StandardController::show
module:
  - name: module.route
    path: /module
    defaults: {_controller: 'App\\Controller\\ModuleController::run'}
unrelated:
  defaults: {_controller: 'App\\Controller\\NotARoute::run'}
service: {path: /service, controller: app.controller::run}
`;
    for (const [token, className, method] of [
      ['StandardController', 'App\\Controller\\StandardController', 'show'],
      ['show', 'App\\Controller\\StandardController', 'show'],
      ['ModuleController', 'App\\Controller\\ModuleController', 'run'],
      ['run\'}', 'App\\Controller\\ModuleController', 'run'],
    ] as const) {
      const offset = source.indexOf(token) + (token === "run'}" ? 1 : 2);
      expect(symfonyYamlRouteControllerAt('file:///routes.yaml', source, offset)).toMatchObject({ className, method });
    }
    for (const token of ['standard:', 'NotARoute', 'app.controller']) {
      expect(symfonyYamlRouteControllerAt('file:///routes.yaml', source, source.indexOf(token) + 2)).toBeUndefined();
    }
  });
  it('records explicit attribute directories with bounded glob imports and exclusions', () => {
    expect(analyzeSymfonyRouteYaml('file:///routes.yaml', 'controllers: {resource: ../src/Controller/, type: attribute}').imports)
      .toEqual([{ resource: '../src/Controller/', namePrefix: '', pathPrefix: '', attribute: true }]);
    expect(analyzeSymfonyRouteYaml('file:///routes.yaml', 'controllers: {resource: ../src/Controller/, type: attribute, exclude: [../src/Controller/Private, ../src/Controller/Old.php]}').imports)
      .toEqual([{ resource: '../src/Controller/', namePrefix: '', pathPrefix: '', attribute: true, exclude: ['../src/Controller/Private', '../src/Controller/Old.php'] }]);
    expect(analyzeSymfonyRouteYaml('file:///routes.yaml', 'controllers: {resource: ../src/Controller/, type: attribute, exclude: 42}').imports).toEqual([]);

    for (const source of ['controllers: {resource: ../src/Controller/, type: attribute, exclude: "%secret%/*"}', 'controllers: {resource: "%root%/*", type: attribute}']) {
      const result = analyzeSymfonyRouteYaml('file:///routes.yaml', source);
      expect(result.complete).toBe(false);
      expect(result.imports).toEqual([]);
    }
  });
  it('preserves explicit PSR-4 directory mappings and rejects ambiguous resources', () => {
    expect(analyzeSymfonyRouteYaml('file:///routes.yaml', String.raw`controllers: {resource: {path: ../src/Controller/, namespace: 'App\Controller\'}, type: attribute}`).imports)
      .toEqual([{ resource: '../src/Controller/', namespace: 'App\\Controller', attribute: true, namePrefix: '', pathPrefix: '' }]);
    for (const resource of ["{path: ../src, namespace: 'bad-name'}", "{path: ../src}", "{path: '../src/*', namespace: App}", "{path: ../src, namespace: App, extra: true}"]) {
      expect(analyzeSymfonyRouteYaml('file:///routes.yaml', `controllers: {resource: ${resource}, type: attribute}`).imports).toEqual([]);
    }
  });
  it('retains glob selectors and refuses unbounded brace expansion inputs', () => {
    const result = analyzeSymfonyRouteYaml('file:///routes.yaml', 'controllers: {resource: "../src/{Controller,Admin}/**/*.php", type: attribute, exclude: "../src/**/Internal*"}');
    expect(result.complete).toBe(true);
    expect(result.imports).toEqual([{ resource: '../src/{Controller,Admin}/**/*.php', attribute: true, namePrefix: '', pathPrefix: '', exclude: ['../src/**/Internal*'] }]);
    expect(analyzeSymfonyRouteYaml('file:///routes.yaml', 'routes: {resource: "routes/*.{yaml,yml}"}').imports).toHaveLength(1);
    for (const resource of ['{a,b}{c,d}{e,f}.yaml', '{1..100000000}.yaml', '+(a|b).yaml']) {
      expect(analyzeSymfonyRouteYaml('file:///routes.yaml', `routes: {resource: "${resource}"}`).complete).toBe(false);
    }
  });
  it('expands localized paths and import prefixes while rejecting dynamic values', () => {
    expect(analyzeSymfonyRouteYaml('file:///routes.yaml', 'a: {path: /a}\na: {path: /b}').routes).toEqual([]);
    const source = 'a: {path: "%prefix%/a"}\nb: {path: {en: /english, fr: /francais}}\nwhen@dev: {c: {path: /c}}\nd: {resource: "%routes%/*.yaml"}\nlocalized_import: {resource: child.yaml, name_prefix: site., prefix: {en: /en, fr: /fr}}\ne: {path: /e}\n';
    const facts = analyzeSymfonyRouteYaml('file:///routes.yaml', source);
    expect(facts.complete).toBe(false);
    expect(facts.routes.map(({ name, path, locale, start, end }) => ({ name, path, locale, text: source.slice(start, end) }))).toEqual([
      { name: 'b.en', path: '/english', locale: 'en', text: 'b' },
      { name: 'b.fr', path: '/francais', locale: 'fr', text: 'b' },
      { name: 'e', path: '/e', locale: undefined, text: 'e' },
    ]);
    expect(facts.imports).toEqual([{ resource: 'child.yaml', namePrefix: 'site.', pathPrefix: [
      { locale: 'en', path: '/en' }, { locale: 'fr', path: '/fr' },
    ] }]);
    for (const invalid of ['bad: {path: {en: "%prefix%/bad"}}', 'bad: {path: {en: 42}}', 'bad: {resource: child.yaml, prefix: {en: "%prefix%"}}']) {
      const result = analyzeSymfonyRouteYaml('file:///routes.yaml', invalid);
      expect(result.complete).toBe(false);
      expect(result.routes).toEqual([]);
      expect(result.imports).toEqual([]);
    }
  });
  it('selects an exact YAML environment block and preserves nested source ranges', () => {
    const source = `base: {path: /base}
when@dev:
  base: {path: /dev-base}
  dev.page: {path: /dev}
  dev_import: {resource: dev.yaml, name_prefix: dev., prefix: /prefix}
when@test:
  test.page: {path: /test}
after: {path: /after}
`;
    const unconditional = analyzeSymfonyRouteYaml('file:///routes.yaml', source);
    expect(unconditional.complete).toBe(true);
    expect(unconditional.routes.map(({ name, path }) => [name, path])).toEqual([['base', '/base'], ['after', '/after']]);
    const dev = analyzeSymfonyRouteYaml('file:///routes.yaml', source, 'dev');
    expect(dev.complete).toBe(true);
    expect(dev.routes.map(({ name, path, start, end }) => [name, path, source.slice(start, end)]))
      .toEqual([['base', '/dev-base', 'base'], ['dev.page', '/dev', 'dev.page'], ['after', '/after', 'after']]);
    expect(dev.imports).toEqual([{ resource: 'dev.yaml', namePrefix: 'dev.', pathPrefix: '/prefix' }]);
    expect(analyzeSymfonyRouteYaml('file:///routes.yaml', source, 'prod').routes.map(({ name }) => name)).toEqual(['base', 'after']);
    expect(analyzeSymfonyRouteYaml('file:///routes.yaml', 'when@dev: invalid\nbase: {path: /base}\n', 'dev').complete).toBe(false);
  });
  it('extracts PHP Configurator route declarations and deterministic imports', async () => {
    const parser = await PhpSyntaxParser.createDefault();
    const source = `<?php
      use Symfony\\Component\\Routing\\Loader\\Configurator\\RoutingConfigurator as Routes;
      return static function (Routes $routes): void {
        foreach (debug_backtrace() as $trace) { trigger_deprecation('package', '1.0', 'message'); }
        $routes->add('_home', '/home')->controller('app.controller');
        $routes->import('child.php')->prefix('/api')->namePrefix('api_');
        if (feature()) { $routes->add('_conditional', '/conditional'); }
      };`;
    const facts = analyzeSymfonyRoutePhp(parser, 'file:///vendor/Bundle/Resources/config/routes.php', source);
    expect(facts.complete).toBe(false);
    expect(facts.routes.map(({ name, path, start, end }) => ({ name, path, text: source.slice(start, end) })))
      .toEqual([{ name: '_home', path: '/home', text: '_home' }]);
    expect(facts.imports).toEqual([{ resource: 'child.php', namePrefix: 'api_', pathPrefix: '/api', php: true }]);
    const unsupportedImport = source.replace("$routes->import('child.php')->prefix('/api')->namePrefix('api_');",
      "$routes->import('child.php')->defaults(['enabled' => true]);");
    expect(analyzeSymfonyRoutePhp(parser, 'file:///vendor/Bundle/Resources/config/routes.php', unsupportedImport).complete).toBe(false);
    expect(analyzeSymfonyRoutePhp(parser, 'file:///routes.php', `<?php use Symfony\\Component\\Routing\\Loader\\Configurator\\RoutingConfigurator; return static function (RoutingConfigurator $routes): void { $routes = other(); $routes->add('wrong', '/wrong'); };`).routes).toEqual([]);
    expect(analyzeSymfonyRoutePhp(parser, 'file:///routes.php', `<?php use Symfony\\Component\\Routing\\Loader\\Configurator\\RoutingConfigurator; return static function (RoutingConfigurator $routes): void { $routes->add(path: '/wrong', name: 'swapped'); };`).routes).toEqual([]);
    parser.dispose();
  });
  it('records exact PHP route controller sources while preserving import aliases', async () => {
    const parser = await PhpSyntaxParser.createDefault();
    const source = String.raw`<?php namespace App\Routes;
      use App\Controller\BlogController as Blog;
      use Symfony\Component\Routing\Loader\Configurator\RoutingConfigurator;
      return static function (RoutingConfigurator $routes): void {
        $routes->add('blog', '/blog')->controller([Blog::class, 'list'])->defaults(['page' => 1]);
        $routes->add('direct', '/direct')->controller('\App\Controller\DirectController::show');
        $routes->add('invoke', '/invoke')->controller(Blog::class);
        $routes->add('override', '/override')->controller([Blog::class, 'list'])->defaults(['_controller' => 'other']);
        $routes->add('dynamic', '/dynamic')->controller([$target, 'run']);
      };`;
    const facts = analyzeSymfonyRoutePhp(parser, 'file:///config/routes.php', source);
    expect(facts.complete).toBe(true);
    expect(facts.routes.map(({ name, controller }) => ({ name, controller: controller && {
      className: controller.className, classSourceName: controller.classSourceName, method: controller.method,
      classText: source.slice(controller.classStart, controller.classEnd),
      methodText: controller.methodStart === undefined ? undefined : source.slice(controller.methodStart, controller.methodEnd),
    } }))).toEqual([
      { name: 'blog', controller: { className: 'App\\Controller\\BlogController', classSourceName: 'Blog', method: 'list', classText: 'Blog', methodText: 'list' } },
      { name: 'direct', controller: { className: 'App\\Controller\\DirectController', classSourceName: '\\App\\Controller\\DirectController', method: 'show', classText: '\\App\\Controller\\DirectController', methodText: 'show' } },
      { name: 'invoke', controller: { className: 'App\\Controller\\BlogController', classSourceName: 'Blog', method: undefined, classText: 'Blog', methodText: undefined } },
      { name: 'override', controller: undefined },
      { name: 'dynamic', controller: undefined },
    ]);
    parser.dispose();
  });
  it('extracts unconditional and exact environment-gated Kernel route imports', async () => {
    const parser = await PhpSyntaxParser.createDefault();
    const source = `<?php namespace App;
      use Symfony\\Component\\HttpKernel\\Kernel as BaseKernel;
      use Symfony\\Component\\Routing\\Loader\\Configurator\\RoutingConfigurator;
      final class Kernel extends BaseKernel {
        protected function configureRoutes(RoutingConfigurator $routes): void {
          $routes->import(dirname(__DIR__) . '/config/symfony/routes.yaml');
          if ($this->environment === 'dev') { $routes->import(dirname(__DIR__) . '/config/symfony/routes/dev.yaml'); }
        }
      }`;
    expect(analyzeSymfonyKernelRouteImports(parser, 'file:///project/src/Kernel.php', source).imports)
      .toEqual([
        { resource: './../config/symfony/routes.yaml', namePrefix: '', pathPrefix: '' },
        { resource: './../config/symfony/routes/dev.yaml', namePrefix: '', pathPrefix: '', environments: ['dev'] },
      ]);
    const complex = source.replace("$this->environment === 'dev'", "$this->environment === 'dev' && enabled()");
    const complexFacts = analyzeSymfonyKernelRouteImports(parser, 'file:///project/src/Kernel.php', complex);
    expect(complexFacts.complete).toBe(false);
    expect(complexFacts.imports)
      .toEqual([{ resource: './../config/symfony/routes.yaml', namePrefix: '', pathPrefix: '' }]);
    const attribute = source.replace("$routes->import(dirname(__DIR__) . '/config/symfony/routes.yaml');",
      "$routes->import(dirname(__DIR__) . '/src/Controller/', 'attribute')->prefix('/api')->namePrefix('api_');");
    expect(analyzeSymfonyKernelRouteImports(parser, 'file:///project/src/Kernel.php', attribute)).toMatchObject({
      complete: true,
      imports: [
        { resource: './../src/Controller/', namePrefix: 'api_', pathPrefix: '/api', attribute: true },
        { resource: './../config/symfony/routes/dev.yaml', namePrefix: '', pathPrefix: '', environments: ['dev'] },
      ],
    });
    const reversedEnvironment = source.replace("$this->environment === 'dev'", "'dev' === $this->environment");
    expect(analyzeSymfonyKernelRouteImports(parser, 'file:///project/src/Kernel.php', reversedEnvironment)).toMatchObject({
      complete: true,
      imports: [
        { resource: './../config/symfony/routes.yaml', namePrefix: '', pathPrefix: '' },
        { resource: './../config/symfony/routes/dev.yaml', namePrefix: '', pathPrefix: '', environments: ['dev'] },
      ],
    });
    const unsupported = source.replace("$routes->import(dirname(__DIR__) . '/config/symfony/routes.yaml');",
      "$routes->import(dirname(__DIR__) . '/config/symfony/routes.yaml')->defaults(['enabled' => true]);");
    expect(analyzeSymfonyKernelRouteImports(parser, 'file:///project/src/Kernel.php', unsupported).complete).toBe(false);
    const dynamic = source.replace("$this->environment === 'dev'", "featureEnabled()");
    expect(analyzeSymfonyKernelRouteImports(parser, 'file:///project/src/Kernel.php', dynamic).complete).toBe(false);
    const customParent = source.replace('extends BaseKernel', 'extends ProjectKernel');
    expect(analyzeSymfonyKernelRouteImports(parser, 'file:///project/src/Kernel.php', customParent).complete).toBe(false);
    const unprovedParameter = source.replace('RoutingConfigurator $routes', 'ProjectRoutes $routes');
    expect(analyzeSymfonyKernelRouteImports(parser, 'file:///project/src/Kernel.php', unprovedParameter).complete).toBe(false);
    const extraParameter = source.replace('RoutingConfigurator $routes', 'RoutingConfigurator $routes, bool $enabled');
    expect(analyzeSymfonyKernelRouteImports(parser, 'file:///project/src/Kernel.php', extraParameter).complete).toBe(false);
    parser.dispose();
  });
  it('escapes quotes, backslashes and dollar signs for the original PHP string delimiter', () => {
    const name = String.raw`account.'"$id\end`;
    expect(symfonyRouteNameText(name, "'")).toBe(String.raw`account.\'"$id\\end`);
    expect(symfonyRouteNameText(name, '"')).toBe(String.raw`account.'\"\$id\\end`);
    expect(symfonyRouteNameText('普通路由😀', "'")).toBe('普通路由😀');
  });
  it('locates reordered named arguments while rejecting duplicate or positional collisions', async () => {
    const parser = await PhpSyntaxParser.createDefault();
    const source = "<?php $this->generateUrl(parameters: [], route: 'route_name');";
    expect(symfonyRouteCallAt(parser, 'file:///route.php', source, source.indexOf('route_name') + 6))
      .toMatchObject({ argumentName: 'route', namedArguments: ['parameters', 'route'], prefix: 'route_' });
    for (const call of ["generateUrl(route: 'route_name', route: 'other')", "generateUrl('other', route: 'route_name')", "generateUrl(route: 'route_name', [])", "generateUrl(...$args, route: 'route_name')"]) {
      const text = `<?php $this->${call};`;
      expect(symfonyRouteCallAt(parser, 'file:///route.php', text, text.indexOf('route_name') + 6)).toBeUndefined();
    }
  });
  it('locates only direct first literal route arguments, not comments or concatenations', async () => {
    const parser = await PhpSyntaxParser.createDefault();
    for (const expression of ["$this->GENERATEURL('route_name')", "$this->generateUrl('route_name')", '$router->generate("route_name")', "$this->redirectToRoute('route_name')"]) {
      const source = `<?php /* 😀 */ ${expression};`;
      const result = symfonyRouteCallAt(parser, 'file:///route.php', source, source.indexOf('route_name') + 6);
      expect(result?.prefix).toBe('route_');
      expect(source.slice(result!.start, result!.end)).toBe('route_name');
    }
    for (const expression of ["// $this->generateUrl('route_name')", "$this->generateUrl('route_name' . $suffix)", "$this->generateUrl($name, 'route_name')", "$this->generateUrl(\"route_name{$id}\")"]) {
      const source = `<?php ${expression}`;
      expect(symfonyRouteCallAt(parser, 'file:///route.php', source, source.indexOf('route_name') + 6)).toBeUndefined();
    }
  });
  it('locates direct route parameter string keys and records existing keys', async () => {
    const parser = await PhpSyntaxParser.createDefault();
    const source = "<?php $router->generate('article.show', ['slug' => $slug, 'lo' => 1]);";
    expect(symfonyRouteParameterCallAt(parser, 'file:///route.php', source, source.indexOf("'lo'") + 2)).toMatchObject({
      routeName: 'article.show', routeArgumentPosition: 0, parametersArgumentPosition: 1,
      prefix: 'l', existingKeys: ['slug'], quote: "'",
    });
    const named = "<?php $this->generateUrl(parameters: ['i' => 1], route: 'article.show');";
    expect(symfonyRouteParameterCallAt(parser, 'file:///route.php', named, named.indexOf("'i'") + 2)).toMatchObject({
      routeName: 'article.show', routeArgumentName: 'route', parametersArgumentName: 'parameters', existingKeys: [],
    });
    parser.dispose();
  });
  it('rejects dynamic route names, dynamic parameter keys and non-array parameters', async () => {
    const parser = await PhpSyntaxParser.createDefault();
    for (const expression of [
      "$router->generate($route, ['id' => 1])", "$router->generate('show', [$key => 1, 'id' => 2])",
      "$router->generate('show', $parameters)", "$router->generate('show', [...$parameters, 'id' => 2])",
    ]) {
      const source = `<?php ${expression};`; const offset = source.lastIndexOf("'id'") + 2;
      expect(symfonyRouteParameterCallAt(parser, 'file:///route.php', source, offset)).toBeUndefined();
    }
    parser.dispose();
  });
});
