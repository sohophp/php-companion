// XSL names originate from pinned JetBrains/phpstorm-stubs xsl/xsl.php.
// Signatures and values are checked against six local PHP runtimes.
import { XSL_CONSTANT_NAMES, XSL_SNAPSHOTS } from './xsl-catalog.js';
import type { SupportedPhpVersion } from './index.js';

interface Parameter { name: string; type: string | null; byRef: boolean; variadic: boolean; optional: boolean; default: unknown; defaultConstant: string | null }
interface Signature { parameters: readonly Parameter[]; return: string | null; tentative: string | null }
interface Snapshot { methods: Record<string, Signature>; properties: Record<string, string | null>; constants: Record<string, unknown> }
const SNAPSHOTS = XSL_SNAPSHOTS as unknown as Record<string, Snapshot>;
const KNOWN_CONSTANTS = new Set<string>(XSL_CONSTANT_NAMES);
const LIBRARY_CONSTANTS = new Set(['LIBXSLT_VERSION', 'LIBXSLT_DOTTED_VERSION', 'LIBEXSLT_VERSION', 'LIBEXSLT_DOTTED_VERSION']);

export interface XslRuntimeFacts { constants: Record<string, number | string> }

export function normalizeXslRuntimeFacts(value: unknown): XslRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => key !== 'constants')
    || !candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)) return undefined;
  const entries = Object.entries(candidate.constants);
  if (entries.length > 32 || entries.some(([name, item]) => !/^(?:XSL_[A-Z0-9_]+|LIB(?:EXSLT|XSLT)_[A-Z0-9_]+)$/.test(name)
    || !(typeof item === 'number' && Number.isSafeInteger(item)
      || typeof item === 'string' && item.length <= 128 && /^[\x20-\x7e]*$/.test(item)))) return undefined;
  return { constants: Object.fromEntries(entries.filter(([name]) => KNOWN_CONSTANTS.has(name))
    .sort(([a], [b]) => a.localeCompare(b))) as Record<string, number | string> };
}

function valueText(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
  if (Array.isArray(value)) return '[]';
  return String(value);
}

function parameterText(parameter: Parameter, php80: boolean): string {
  let type = php80 ? parameter.type : null;
  if (type && parameter.optional && parameter.default === null && !parameter.defaultConstant && type !== 'mixed'
    && !type.startsWith('?') && !type.includes('null')) type = type.includes('|') ? `${type}|null` : `?${type}`;
  const fallback = parameter.defaultConstant ?? valueText(parameter.default);
  return `${type ? `${type} ` : ''}${parameter.byRef ? '&' : ''}${parameter.variadic ? '...' : ''}$${parameter.name}`
    + (parameter.optional && !parameter.variadic ? ` = ${fallback}` : '');
}

export function auditedXslStub(version: SupportedPhpVersion, runtime?: XslRuntimeFacts): string {
  const target = Number(version.replace('.', ''));
  const snapshot = SNAPSHOTS[target >= 85 ? '805' : target >= 84 ? '804' : target >= 82 ? '802'
    : target >= 80 ? '801' : target >= 74 ? '704' : '702']!;
  const modern = SNAPSHOTS['804']!;
  const normalized = normalizeXslRuntimeFacts(runtime);
  const constants = Object.entries(normalized?.constants ?? snapshot.constants)
    .filter(([name]) => normalized || !LIBRARY_CONSTANTS.has(name))
    .map(([name, value]) => `const ${name} = ${valueText(value)};`).join('\n');
  const properties = Object.entries(snapshot.properties).map(([name, type]) => `public ${type ? `${type} ` : ''}$${name};`).join('\n');
  const methods = Object.entries(snapshot.methods).map(([name, signature]) => {
    const parameters = signature.parameters.map((parameter) => parameterText(parameter, target >= 80)).join(', ');
    const nativeReturn = signature.return;
    const inferredReturn = nativeReturn ?? signature.tentative ?? modern.methods[name]?.return ?? modern.methods[name]?.tentative;
    return `${!nativeReturn && inferredReturn ? `/** @return ${inferredReturn} */ ` : ''}public function ${name}(${parameters})`
      + `${nativeReturn ? `: ${nativeReturn}` : ''} {}`;
  }).join('\n');
  return `${constants}\nclass XSLTProcessor {\n${properties}\n${methods}\n}\n`;
}
