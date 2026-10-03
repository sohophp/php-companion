// Names are checked against pinned JetBrains/phpstorm-stubs. Runtime snapshots
// retain only members exported by the corresponding Imagick/ImageMagick build.
import { IMAGICK_PHP_SNAPSHOT_KEYS, IMAGICK_SNAPSHOTS } from './imagick-catalog.js';
import type { SupportedPhpVersion } from './index.js';

interface Parameter { name: string; type: string | null; byRef: boolean; variadic: boolean; optional: boolean; default: unknown }
interface Method { name: string; parameters: readonly Parameter[]; return: string | null; static: boolean }
interface ClassSnapshot { methods: Record<string, Method>; constants: Record<string, unknown> }
interface Snapshot { imagickVersion: string; imageMagickVersionNumber: number; fingerprint: string; classes: Record<string, ClassSnapshot> }
const SNAPSHOTS = IMAGICK_SNAPSHOTS as unknown as Record<string, Snapshot>;
const PHP_KEYS = IMAGICK_PHP_SNAPSHOT_KEYS as unknown as Record<string, string>;

export interface ImagickRuntimeFacts { version: string; imageMagickVersionNumber: number; fingerprint: string }

export function normalizeImagickRuntimeFacts(value: unknown): ImagickRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).length !== 3 || typeof candidate.version !== 'string'
    || !/^\d{1,3}\.\d{1,3}\.\d{1,3}(?:[.-][A-Za-z0-9]{1,16})?$/.test(candidate.version)
    || !Number.isSafeInteger(candidate.imageMagickVersionNumber)
    || (candidate.imageMagickVersionNumber as number) < 1 || (candidate.imageMagickVersionNumber as number) > 100_000
    || typeof candidate.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(candidate.fingerprint)) return undefined;
  return { version: candidate.version, imageMagickVersionNumber: candidate.imageMagickVersionNumber as number,
    fingerprint: candidate.fingerprint };
}

function snapshotFor(version: SupportedPhpVersion, runtime?: ImagickRuntimeFacts): Snapshot {
  if (!runtime) return SNAPSHOTS[PHP_KEYS['805']!]!;
  const keys = Object.keys(SNAPSHOTS).filter((key) => {
    const candidate = SNAPSHOTS[key]!;
    return candidate.imagickVersion === runtime.version
      && candidate.imageMagickVersionNumber === runtime.imageMagickVersionNumber
      && candidate.fingerprint === runtime.fingerprint;
  });
  if (keys.length) {
    const [major, minor] = version.split('.').map(Number);
    const target = major! * 100 + minor!;
    const exact = PHP_KEYS[String(target)];
    if (exact && keys.includes(exact)) return SNAPSHOTS[exact]!;
    const closest = Object.entries(PHP_KEYS).filter(([, key]) => keys.includes(key))
      .sort(([a], [b]) => Math.abs(Number(a) - target) - Math.abs(Number(b) - target))[0];
    if (closest) return SNAPSHOTS[closest[1]]!;
  }
  const all = Object.values(SNAPSHOTS);
  const base = SNAPSHOTS[PHP_KEYS['805']!]!;
  const classes: Record<string, ClassSnapshot> = {};
  for (const [name, data] of Object.entries(base.classes)) {
    if (all.some((snapshot) => !snapshot.classes[name])) continue;
    classes[name] = {
      methods: Object.fromEntries(Object.entries(data.methods).filter(([method]) =>
        all.every((snapshot) => snapshot.classes[name]?.methods[method]))),
      constants: Object.fromEntries(Object.entries(data.constants).filter(([constant, value]) =>
        all.every((snapshot) => snapshot.classes[name]?.constants[constant] === value))),
    };
  }
  return { imagickVersion: runtime.version, imageMagickVersionNumber: runtime.imageMagickVersionNumber,
    fingerprint: runtime.fingerprint, classes };
}

function valueText(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return '[]';
  return 'null';
}

function methodText(method: Method): string {
  const docs = [
    ...method.parameters.filter((parameter) => parameter.type).map((parameter) => ` * @param ${parameter.type} $${parameter.name}`),
    ...(method.return && method.name.toLowerCase() !== '__construct' ? [` * @return ${method.return}`] : []),
  ];
  const comment = docs.length ? `/**\n${docs.join('\n')}\n */\n` : '';
  const parameters = method.parameters.map((parameter) =>
    `${parameter.byRef ? '&' : ''}${parameter.variadic ? '...' : ''}$${parameter.name}`
    + (parameter.optional && !parameter.variadic ? ` = ${valueText(parameter.default)}` : '')).join(', ');
  return `${comment}public ${method.static ? 'static ' : ''}function ${method.name}(${parameters}) {}`;
}

export function auditedImagickStub(version: SupportedPhpVersion, facts?: ImagickRuntimeFacts): string {
  const snapshot = snapshotFor(version, normalizeImagickRuntimeFacts(facts));
  const classes = [
    'class ImagickException extends Exception {}', 'class ImagickDrawException extends Exception {}',
    'class ImagickPixelIteratorException extends Exception {}', 'class ImagickPixelException extends Exception {}',
    'class ImagickKernelException extends Exception {}',
  ];
  for (const name of ['Imagick', 'ImagickDraw', 'ImagickPixelIterator', 'ImagickPixel', 'ImagickKernel']) {
    const data = snapshot.classes[name];
    if (!data) continue;
    const interfaces = name === 'Imagick' ? ' implements Iterator, Countable'
      : name === 'ImagickPixelIterator' ? ' implements Iterator' : '';
    const constants = Object.entries(data.constants).map(([key, value]) => `public const ${key} = ${valueText(value)};`);
    const methods = Object.values(data.methods).map(methodText);
    classes.push(`class ${name}${interfaces} {\n${[...constants, ...methods].join('\n')}\n}`);
  }
  return `${classes.join('\n')}\n`;
}
