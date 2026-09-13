import { expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { analyzeSymfonyRouteAttributes } from '../src/index.js';

it('combines class prefixes and named method routes through import aliases', async () => {
  const parser = await PhpSyntaxParser.createDefault();
  const source = String.raw`<?php namespace App;
use Symfony\Component\Routing\Attribute\Route as R;
#[R('/admin', name: 'admin_')] class Controller {
  #[R('/show', name: 'show'), R(path: '/other', name: 'other')]
  public function show() {}
}`;
  const result = analyzeSymfonyRouteAttributes(parser, 'file:///Controller.php', source);
  expect(result.complete).toBe(true);
  expect(result.routes.map((route) => ({ name: route.name, path: route.path, method: route.method, owner: route.ownerFqcn, text: source.slice(route.start, route.end) }))).toEqual([
    { name: 'admin_show', path: '/admin/show', method: 'show', owner: 'App\\Controller', text: "'show'" },
    { name: 'admin_other', path: '/admin/other', method: 'show', owner: 'App\\Controller', text: "'other'" },
  ]);
});

it('keeps custom Route names separate and supports explicitly named invokable class routes', async () => {
  const parser = await PhpSyntaxParser.createDefault();
  const source = String.raw`<?php namespace App;
#[Route('/wrong', name: 'wrong')] class Custom { #[Route('/wrong', name: 'wrong')] public function show() {} }
#[\Symfony\Component\Routing\Attribute\Route('/invoke', name: 'invoke')]
class Invokable { public function __invoke() {} }
`;
  expect(analyzeSymfonyRouteAttributes(parser, 'file:///Controller.php', source).routes.map((route) => [route.name, route.path, route.method])).toEqual([['invoke', '/invoke', '__invoke']]);
});

it('does not invent names for dynamic, environment-specific or malformed route attributes', async () => {
  const parser = await PhpSyntaxParser.createDefault();
  for (const attribute of ["R('/path', name: self::NAME)", "R('/path', name: 'dev', env: 'dev')", "R(['/en'], name: 'localized')", "R('/path')", "R('/path', name: 'a', name: 'b')"]) {
    const source = `<?php use Symfony\\Component\\Routing\\Attribute\\Route as R; class C { #[${attribute}] public function f() {} }`;
    const result = analyzeSymfonyRouteAttributes(parser, 'file:///Controller.php', source);
    expect(result.complete).toBe(false);
    expect(result.routes).toEqual([]);
  }
});

it('generates loader-specific names, counting only unnamed attributes per method', async () => {
  const parser = await PhpSyntaxParser.createDefault();
  const source = String.raw`<?php namespace App\Controller;
use Symfony\Component\Routing\Attribute\Route as R;
#[R('/base', name: 'prefix_')] class DemoController {
  #[R('/one'), R('/named', name: 'fixed'), R('/two')] public function showAction() {}
  #[R('/index')] public function index() {}
}
#[R('/invoke')] class SingleController { public function __invoke() {} }`;
  const framework = analyzeSymfonyRouteAttributes(parser, 'file:///C.php', source, 'framework');
  expect(framework.complete).toBe(true);
  expect(framework.routes.map(({ name }) => name)).toEqual([
    'prefix_app_demo_show', 'prefix_fixed', 'prefix_app_demo_show_1', 'prefix_app_demo_index', 'app_single__invoke',
  ]);
  expect(analyzeSymfonyRouteAttributes(parser, 'file:///C.php', source, 'routing').routes[0]?.name)
    .toBe('prefix_app_controller_democontroller_showaction');
  expect(source.slice(framework.routes[0]!.start, framework.routes[0]!.end)).toBe("R('/one')");
});

it('does not guess an unnamed index after unsupported attributes', async () => {
  const parser = await PhpSyntaxParser.createDefault();
  const source = String.raw`<?php use Symfony\Component\Routing\Attribute\Route as R;
class C { #[R('/a', env: 'dev'), R('/b'), R('/c', name: 'fixed')] public function run() {} }`;
  const result = analyzeSymfonyRouteAttributes(parser, 'file:///C.php', source, 'framework');
  expect(result.complete).toBe(false);
  expect(result.routes.map(({ name }) => name)).toEqual(['fixed']);
});
