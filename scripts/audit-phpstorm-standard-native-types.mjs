import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { PhpSyntaxParser } from '../packages/parser/dist/index.js';
import { builtinPhpStub } from '../packages/language-spec/dist/index.js';

const names = ['count', 'sizeof', 'array_walk', 'array_walk_recursive', 'array_column'];
const versions = ['8.1', '8.2', '8.4', '8.5'];
const requested = process.argv.slice(2);
if (requested.some((version) => !versions.includes(version)))
  throw new Error(`Usage: node scripts/audit-phpstorm-standard-native-types.mjs [${versions.join('|')} ...]`);
const selected = requested.length ? requested : versions;
const php = `$names = ${JSON.stringify(names)};
$result = [];
foreach ($names as $name) {
  $function = new ReflectionFunction($name);
  $result[$name] = ['return' => $function->hasReturnType() ? (string) $function->getReturnType() : null,
    'parameters' => array_map(function ($parameter) {
      return $parameter->hasType() ? (string) $parameter->getType() : null;
    }, $function->getParameters())];
}
echo json_encode($result);`;
const canonical = (type) => type === null || type === undefined ? null
  : type.replace(/^\?/, 'null|').split('|').map((part) => part.trim()).sort().join('|');
const parser = await PhpSyntaxParser.createDefault();
try {
  for (const version of selected) {
    const actual = JSON.parse(execFileSync(`php${version.replace('.', '')}`, ['-r', php], { encoding: 'utf8' }));
    const declarations = parser.parse(builtinPhpStub(version)).callables.filter((item) => item.kind === 'function');
    for (const name of names) {
      const matching = declarations.filter((item) => item.fqcn.toLowerCase() === name);
      if (matching.length !== 1) throw new Error(`${version} ${name}: expected one declaration`);
      const declaration = matching[0]; const runtime = actual[name];
      const spec = [declaration.nativeReturnType, ...declaration.parameters.map((parameter) => parameter.nativeType)]
        .map(canonical);
      const reflected = [runtime.return, ...runtime.parameters].map(canonical);
      if (JSON.stringify(spec) !== JSON.stringify(reflected))
        throw new Error(`${version} ${name}: stub ${JSON.stringify(spec)} differs from runtime ${JSON.stringify(reflected)}`);
    }
    process.stdout.write(`${version}: ${names.length} standard function native signatures match runtime\n`);
  }
} finally { parser.dispose(); }
