// Redis names are checked against pinned JetBrains/phpstorm-stubs. Runtime
// snapshots retain only members exported by the corresponding phpredis build.
import { REDIS_SNAPSHOTS, REDIS_UPSTREAM } from './redis-catalog.js';
import type { SupportedPhpVersion } from './index.js';

interface Parameter { name: string; type: string | null; byRef: boolean; variadic: boolean; optional: boolean; default: unknown }
interface Method { name: string; parameters: readonly Parameter[]; return: string | null; static: boolean }
interface RedisClassSnapshot { methods: Record<string, Method>; constants: Record<string, unknown> }
interface RedisSnapshot { redisVersion: string; classes: Record<string, RedisClassSnapshot>; exceptions: Record<string, string> }
const SNAPSHOTS = REDIS_SNAPSHOTS as unknown as Record<string, RedisSnapshot>;

export interface RedisRuntimeFacts { version: string }

export function normalizeRedisRuntimeFacts(value: unknown): RedisRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).length !== 1 || typeof candidate.version !== 'string'
    || candidate.version.length > 32 || !/^\d{1,3}\.\d{1,3}\.\d{1,3}(?:[.-][A-Za-z0-9]{1,16})?$/.test(candidate.version)) return undefined;
  return { version: candidate.version };
}

function snapshotFor(version: SupportedPhpVersion, runtime?: RedisRuntimeFacts): RedisSnapshot {
  if (!runtime) return SNAPSHOTS['805']!;
  const matching = Object.entries(SNAPSHOTS).filter(([, snapshot]) => snapshot.redisVersion === runtime.version);
  if (matching.length) {
    const target = Number(version.replace('.', ''));
    const targetMajor = Number(version.split('.')[0]);
    return (matching.find(([php]) => Number(php) === target)
      ?? matching.find(([php]) => Math.floor(Number(php) / 100) === targetMajor)
      ?? matching.at(-1))![1];
  }
  // An unobserved phpredis build receives only members shared by all audited
  // builds. This avoids offering methods introduced by another extension version.
  const base = SNAPSHOTS['805']!;
  const all = Object.values(SNAPSHOTS);
  const classes: Record<string, RedisClassSnapshot> = {};
  for (const [name, classSnapshot] of Object.entries(base.classes)) {
    if (all.some((snapshot) => !snapshot.classes[name])) continue;
    classes[name] = {
      methods: Object.fromEntries(Object.entries(classSnapshot.methods).filter(([method]) =>
        all.every((snapshot) => snapshot.classes[name]?.methods[method]))),
      constants: Object.fromEntries(Object.entries(classSnapshot.constants).filter(([constant, value]) =>
        all.every((snapshot) => snapshot.classes[name]?.constants[constant] === value))),
    };
  }
  const exceptions = Object.fromEntries(Object.entries(base.exceptions).map(([name, parent]) =>
    [name, all.every((snapshot) => snapshot.exceptions[name] === parent) ? parent : 'Exception']));
  return { redisVersion: runtime.version, classes, exceptions };
}

function valueText(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return '[]';
  return 'null';
}

function methodText(method: Method, proxy = false): string {
  const docs = [
    ...method.parameters.filter((parameter) => parameter.type).map((parameter) =>
      ` * @param ${parameter.type} $${parameter.name}`),
    ...(method.return && method.name.toLowerCase() !== '__construct' && !proxy ? [` * @return ${method.return}`] : []),
  ];
  const comment = docs.length ? `/**\n${docs.join('\n')}\n */\n` : '';
  const parameters = method.parameters.map((parameter) =>
    `${parameter.byRef ? '&' : ''}${parameter.variadic ? '...' : ''}$${parameter.name}`
    + (parameter.optional && !parameter.variadic ? ` = ${valueText(parameter.default)}` : '')).join(', ');
  return `${comment}public ${method.static && !proxy ? 'static ' : ''}function ${method.name}(${parameters}) {}`;
}

export function auditedRedisStub(version: SupportedPhpVersion, facts?: RedisRuntimeFacts): string {
  const snapshot = snapshotFor(version, normalizeRedisRuntimeFacts(facts));
  const classes: string[] = [];
  for (const name of ['Redis', 'RedisArray', 'RedisCluster', 'RedisSentinel']) {
    const data = snapshot.classes[name];
    if (!data) continue;
    const constants = Object.entries(data.constants).map(([key, value]) => `public const ${key} = ${valueText(value)};`);
    const methods = Object.values(data.methods).map((method) => methodText(method));
    if (name === 'RedisArray' && data.methods.__call && snapshot.classes.Redis) {
      const proxyNames = new Set<string>(REDIS_UPSTREAM.RedisArray.methods);
      for (const [key, method] of Object.entries(snapshot.classes.Redis.methods)) {
        if (proxyNames.has(key) && !data.methods[key]) methods.push(methodText(method, true));
      }
    }
    classes.push(`class ${name} {\n${[...constants, ...methods].join('\n')}\n}`);
  }
  for (const [name, parent] of Object.entries(snapshot.exceptions)) classes.push(`class ${name} extends ${parent} {}`);
  return `${classes.join('\n')}\n`;
}
