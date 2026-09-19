import { execFile } from 'node:child_process';
import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { isMap, isScalar, isSeq, parseDocument, type Node, type Pair, type Scalar, type YAMLMap } from 'yaml';
import type { RouteFact } from '@php-companion/route-provider';

const execute = promisify(execFile);
export interface RuntimeRoute { path: string; }
export interface WinstarProviderOptions { php?: string; console?: string; timeoutMs?: number; }
interface LocatedName { value: string; uri: string; start: number; end: number; generated: boolean; }

function scalarTextRange(source: string, scalar: Scalar): { start: number; end: number } | undefined {
  const range = scalar.range; if (!range) return undefined;
  let start = range[0]; let end = range[1]; const raw = source.slice(start, end);
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) { start += 1; end -= 1; }
  return start <= end ? { start, end } : undefined;
}
function mapName(source: string, uri: string, map: YAMLMap, generated: boolean): LocatedName | undefined {
  const pair = map.items.find((item: Pair) => isScalar(item.key) && item.key.value === 'name');
  if (!pair || !isScalar(pair.value) || typeof pair.value.value !== 'string') return undefined;
  const range = scalarTextRange(source, pair.value); return range ? { value: pair.value.value, uri, ...range, generated } : undefined;
}
function namesFromDocument(source: string, uri: string): LocatedName[] {
  const document = parseDocument(source, { uniqueKeys: true });
  if (document.errors.length || !document.contents) return [];
  if (isSeq(document.contents)) return document.contents.items.flatMap((item: Node | null) => isMap(item) ? mapName(source, uri, item, false) ?? [] : []);
  if (!isMap(document.contents)) return [];
  const defaults = document.contents.items.find((item: Pair) => isScalar(item.key) && item.key.value === 'admin_defaults');
  return defaults && isSeq(defaults.value)
    ? defaults.value.items.flatMap((item: Node | null) => isMap(item) ? mapName(source, uri, item, true) ?? [] : []) : [];
}

export async function collectWinstarModuleRouteFacts(root: string, runtimeRoutes: Readonly<Record<string, RuntimeRoute>>): Promise<RouteFact[]> {
  const moduleRoot = resolve(root, 'src', 'Modules'); let actualRoot: string;
  try { actualRoot = await realpath(moduleRoot); } catch { return []; }
  const located: LocatedName[] = []; let files = 0;
  const modules = (await readdir(moduleRoot, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name));
  for (const module of modules) {
    if (files >= 4096 || (!module.isDirectory() && !module.isSymbolicLink())) break;
    const routeDirectory = resolve(moduleRoot, module.name, 'Routes');
    try {
      const actualDirectory = await realpath(routeDirectory); const local = relative(actualRoot, actualDirectory);
      if (isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`)) continue;
      const entries = (await readdir(routeDirectory, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name));
      for (const entry of entries) {
        if (files++ >= 4096) break;
        if (!entry.isFile() || !entry.name.endsWith('.yaml')) continue;
        const path = resolve(routeDirectory, entry.name); const info = await stat(path); if (info.size > 2_000_000) continue;
        const source = await readFile(path, 'utf8'); located.push(...namesFromDocument(source, pathToFileURL(path).toString()));
      }
    } catch { /* Missing or unreadable module route directories contribute nothing. */ }
  }
  const result: RouteFact[] = [];
  for (const [name, route] of Object.entries(runtimeRoutes).sort(([left], [right]) => left.localeCompare(right))) {
    if (!route || typeof route.path !== 'string') continue;
    const declarations = located.filter((item) => item.generated ? name.startsWith(`admin.${item.value}.`) : item.value === name);
    if (declarations.length === 1) {
      const declaration = declarations[0]!;
      result.push({ name, path: route.path, uri: declaration.uri, start: declaration.start, end: declaration.end });
    }
  }
  return result;
}

export async function loadWinstarRuntimeRoutes(root: string, environment: string | undefined, options: WinstarProviderOptions = {}): Promise<Record<string, RuntimeRoute>> {
  const php = resolveCommand(root, options.php ?? 'bin/php-runtime'); const console = resolve(root, options.console ?? 'bin/console');
  const args = [console, 'debug:router', '--format=json', '--no-interaction', ...(environment ? [`--env=${environment}`] : [])];
  const { stdout } = await execute(php, args, { cwd: root, timeout: options.timeoutMs ?? 20_000, maxBuffer: 16 * 1024 * 1024, encoding: 'utf8' });
  const parsed: unknown = JSON.parse(stdout); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('debug:router returned a non-object JSON value.');
  return parsed as Record<string, RuntimeRoute>;
}

function resolveCommand(root: string, command: string): string {
  return command.includes('/') || command.includes('\\') ? resolve(root, command) : command;
}
