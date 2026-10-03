import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { GD_FUNCTIONS, GD_SELECTED_CONSTANTS } from '../packages/language-spec/dist/gd-catalog.js';
import { builtinPhpExtensionStub } from '../packages/language-spec/dist/index.js';

const phpCommands = process.argv.slice(2);
if (!phpCommands.length) throw new Error('Usage: node scripts/audit-phpstorm-gd-runtime.mjs PHP_COMMAND...');
for (const php of phpCommands) {
  const output = execFileSync(php, ['-r', '$functions = get_extension_funcs("gd") ?: []; $signatures = []; foreach ($functions as $name) { $reflection = new ReflectionFunction($name); $params = []; foreach ($reflection->getParameters() as $parameter) $params[] = [$parameter->getName(), $parameter->hasType() ? (string)$parameter->getType() : null]; $signatures[$name] = [$reflection->getNumberOfRequiredParameters(), $params, $reflection->hasReturnType() ? (string)$reflection->getReturnType() : null]; } echo json_encode([PHP_VERSION_ID, $functions, get_defined_constants(true)["gd"] ?? [], $signatures]);'], {
    encoding: 'utf8', timeout: 5_000, maxBuffer: 512 * 1024,
  });
  const [versionId, functions, constants, signatures] = JSON.parse(output);
  const minor = Math.floor(versionId / 100);
  const version = `${Math.floor(versionId / 10_000)}.${Math.floor(versionId / 100) % 100}`;
  const declarations = new Map([...builtinPhpExtensionStub(version, 'gd').matchAll(/\bfunction\s+([a-z_][a-z\d_]*)\s*\(([^)]*)\)(?::\s*([a-z_?|\d]+))?/gi)]
    .map((match) => [match[1], { parameters: match[2] ? match[2].split(',').map((parameter) => parameter.trim()) : [], returnType: match[3] ?? null }]));
  const legacy = new Set(['image2wbmp', 'jpeg2wbmp', 'png2wbmp']);
  const unavailable = GD_FUNCTIONS.filter((name) => {
    if (name === 'imagecreatefromtga' && minor < 704) return false;
    if ((name === 'imageavif' || name === 'imagecreatefromavif') && minor < 801) return false;
    if (name === 'imagegetinterpolation' && minor < 800) return false;
    if (legacy.has(name) && minor >= 800) return false;
    return !functions.includes(name);
  });
  const unmodeled = functions.filter((name) => !GD_FUNCTIONS.includes(name));
  const arityMismatches = functions.filter((name) => {
    const declaration = declarations.get(name);
    if (!declaration) return true;
    const required = declaration.parameters.filter((parameter) => !parameter.includes('=') && !parameter.includes('...')).length;
    const [runtimeRequired, runtimeParameters] = signatures[name];
    return required !== runtimeRequired || declaration.parameters.length !== runtimeParameters.length;
  });
  const normalizedType = (type) => type?.replace(/^\?(.+)$/, '$1|null').split('|').sort().join('|') ?? null;
  const signatureMismatches = minor < 800 ? [] : functions.filter((name) => {
    const declaration = declarations.get(name);
    if (!declaration) return false;
    const [, runtimeParameters, runtimeReturn] = signatures[name];
    return normalizedType(declaration.returnType) !== normalizedType(runtimeReturn)
      || declaration.parameters.some((parameter, index) => {
        const match = /^(.*?)\$([a-z_][a-z\d_]*)/i.exec(parameter);
        if (!match) return true;
        const parameterType = match[1].replace(/\.\.\.|&/g, '').trim() || null;
        return match[2] !== runtimeParameters[index][0]
          || normalizedType(parameterType) !== normalizedType(runtimeParameters[index][1]);
      });
  });
  const mismatches = Object.entries(GD_SELECTED_CONSTANTS).filter(([name, value]) => {
    if ((name === 'IMG_TGA' || name === 'IMG_FILTER_SCATTER') && minor < 704) return false;
    if (name === 'IMG_AVIF' && minor < 801) return false;
    return constants[name] !== value;
  });
  if (unavailable.length || unmodeled.length || arityMismatches.length || signatureMismatches.length || mismatches.length) throw new Error(`${php} (${versionId}): missing GD functions ${unavailable.join(', ') || '-'}; unmodeled ${unmodeled.join(', ') || '-'}; arity mismatches ${arityMismatches.join(', ') || '-'}; signature mismatches ${signatureMismatches.join(', ') || '-'}; constant mismatches ${mismatches.map(([name]) => name).join(', ') || '-'}`);
  process.stdout.write(`${php} ${versionId}: ${functions.length} runtime GD functions covered, signatures and selected constants match\n`);
}
