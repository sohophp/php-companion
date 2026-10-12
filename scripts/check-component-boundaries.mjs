import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative, dirname, sep } from 'node:path';
import { builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import process from 'node:process';
import console from 'node:console';
import ts from 'typescript';

/** Audit component manifests and source imports without building or packaging. */
export async function auditComponentBoundaries(root) {
  root = resolve(root);
  const components = new Map(), inputs = {}, violations = [], imports = [];
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  const sourcePath = path => relative(root, path).split(sep).join('/');
  async function input(path) {
    const bytes = await readFile(path); inputs[sourcePath(path)] = sha(bytes); return bytes.toString();
  }
  for (const entry of await readdir(resolve(root, 'packages'), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = resolve(root, 'packages', entry.name, 'package.json');
    let raw;
    try { raw = await input(path); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    const manifest = JSON.parse(raw);
    if (!manifest.name?.startsWith('@php-companion/')) continue;
    if (components.has(manifest.name)) { violations.push({ rule: 'unique-component-name', name: manifest.name, file: sourcePath(path) }); continue; }
    components.set(manifest.name, { path: dirname(path), manifest });
  }
  const graph = new Map([...components].map(([name, { manifest }]) => [name, Object.keys(manifest.dependencies ?? {}).filter(dep => components.has(dep))]));
  const visiting = new Set(), visited = new Set();
  function visit(name, chain = []) {
    if (visiting.has(name)) { violations.push({ rule: 'acyclic-component-dependencies', chain: [...chain, name] }); return; }
    if (visited.has(name)) return;
    visiting.add(name); for (const dep of graph.get(name)) visit(dep, [...chain, name]); visiting.delete(name); visited.add(name);
  }
  for (const name of graph.keys()) visit(name);
  function boundaryRules(name, dependency) {
    const rules = [];
    if (name === '@php-companion/semantic' && /^(?:@php-companion\/(?:framework-|provider-|language-server(?:\/|$)|refactor(?:\/|$))|vscode)/.test(dependency)) rules.push('semantic-does-not-depend-on-framework-or-adapter');
    if (name === '@php-companion/index' && /^(?:@php-companion\/(?:semantic(?:\/|$)|framework-|provider-|language-server(?:\/|$)|refactor(?:\/|$))|vscode)/.test(dependency)) rules.push('index-does-not-depend-on-semantic-or-adapter');
    if (name !== '@php-companion/language-server' && /^vscode(?:-|$)/.test(dependency)) rules.push('components-do-not-import-vscode-adapter');
    return rules;
  }
  for (const [name, { path, manifest }] of components) for (const [dep, range] of Object.entries(manifest.dependencies ?? {})) {
    if (dep.startsWith('@php-companion/') && (!components.has(dep) || range !== 'workspace:^')) violations.push({ rule: 'declared-component-dependency', name, dep, range });
    if (dep === '@php-companion/testkit') violations.push({ rule: 'testkit-is-not-product-runtime', name, dep });
    for (const rule of boundaryRules(name, dep)) violations.push({ rule, component: name, file: sourcePath(resolve(path, 'package.json')), kind: 'dependency', module: dep });
  }
  async function* files(dir) {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) yield* files(path);
      else if (/\.(?:[cm]?[jt]s|[jt]sx)$/.test(entry.name)) yield path;
    }
  }
  const nodeBuiltins = new Set(builtinModules.flatMap(name => [name, 'node:' + name]));
  const ioModules = new Set(['fs', 'fs/promises', 'child_process', 'net', 'tls', 'http', 'http2', 'https', 'dgram', 'dns', 'dns/promises']);
  function publicExport(manifest, key) {
    return Object.keys(manifest.exports ?? {}).some(pattern => {
      if (pattern === key) return true;
      const parts = pattern.split('*');
      return parts.length === 2 && key.startsWith(parts[0]) && key.endsWith(parts[1]);
    });
  }
  for (const [name, component] of components) for await (const file of files(resolve(component.path, 'src'))) {
    const source = await input(file), ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    function record(node, literal, kind) {
      const line = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
      if (!literal || !ts.isStringLiteralLike(literal)) {
        violations.push({ rule: 'module-specifier-must-be-static', component: name, file: sourcePath(file), line, kind }); return;
      }
      const module = literal.text;
      const observation = { component: name, file: sourcePath(file), line, kind, module }; imports.push(observation);
      if (nodeBuiltins.has(module)) {
        if (name === '@php-companion/type-system' && ioModules.has(module.replace(/^node:/, ''))) violations.push({ ...observation, rule: 'type-system-has-no-direct-io' });
        return;
      }
      if (module.startsWith('.')) {
        const target = resolve(dirname(file), module);
        if (!(target === component.path || target.startsWith(component.path + sep))) violations.push({ ...observation, rule: 'no-cross-package-relative-imports' });
        return;
      }
      const dependency = module.startsWith('@') ? module.split('/').slice(0, 2).join('/') : module.split('/')[0];
      if (!Object.hasOwn(component.manifest.dependencies ?? {}, dependency)) violations.push({ ...observation, rule: 'source-dependency-must-be-declared' });
      if (components.has(dependency) && !publicExport(components.get(dependency).manifest, module === dependency ? '.' : './' + module.slice(dependency.length + 1))) violations.push({ ...observation, rule: 'use-public-component-exports' });
      for (const rule of boundaryRules(name, dependency)) violations.push({ ...observation, rule });
    }
    function walk(node) {
      if (ts.isImportDeclaration(node)) record(node, node.moduleSpecifier, 'import');
      else if (ts.isExportDeclaration(node) && node.moduleSpecifier) record(node, node.moduleSpecifier, 'export');
      else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) record(node, node.argument.literal, 'import-type');
      else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === 'require')) record(node, node.arguments[0], 'dynamic-import-or-require');
      ts.forEachChild(node, walk);
    }
    walk(ast);
  }
  return { componentCount: components.size, sourceFileCount: Object.keys(inputs).filter(path => /\/src\//.test(path)).length,
    importCount: imports.length, graph: Object.fromEntries(graph), violations, inputs, imports };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const report = await auditComponentBoundaries(resolve(import.meta.dirname, '..'));
  if (process.argv[2]) await writeFile(resolve(process.argv[2]), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  for (const violation of report.violations) console.error(JSON.stringify(violation));
  console.log(JSON.stringify({ components: report.componentCount, sourceFiles: report.sourceFileCount, imports: report.importCount, violations: report.violations.length }));
  if (report.violations.length) process.exitCode = 1;
}
