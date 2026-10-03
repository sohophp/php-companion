import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { PhpSyntaxParser } from '../packages/parser/dist/index.js';
import {
  SUPPORTED_PHP_VERSIONS, builtinPhpStub, randomClassesPhpStub, bcmathNumberPhpStub,
  filterClassesPhpStub, pdoDriverPhpStub, CONFIGURABLE_PHP_EXTENSIONS,
} from '../packages/language-spec/dist/index.js';
import { probePhpRuntime } from '../packages/runtime-probe/dist/index.js';

const args = process.argv.slice(2);
const effective = args.includes('--effective');
const [version = '8.5', phpCommand = `php${version.replace('.', '')}`] = args.filter(arg => arg !== '--effective');
if (!SUPPORTED_PHP_VERSIONS.includes(version)) throw new Error(`Unsupported PHP version: ${version}`);
const probed = effective ? await probePhpRuntime(phpCommand) : undefined;
if (effective && (!probed || probed.minor !== version)) throw new Error(`Unable to probe PHP ${version}: ${phpCommand}`);
const options = probed ? {
  disabledExtensions: CONFIGURABLE_PHP_EXTENSIONS.filter(name => !probed.loadedExtensions.some(loaded => loaded.toLowerCase() === name)),
  readlineLib: probed.readlineLib,
  intlCharConstants: probed.intlCharConstants,
  intlCalendarFieldCount: probed.intlCalendarFieldCount,
  intlCurrencyAccountingAvailable: probed.intlCurrencyAccountingAvailable,
  zipRuntime: probed.zipRuntime,
  zlibRuntime: probed.zlibRuntime,
  socketsRuntime: probed.socketsRuntime,
  pcntlRuntime: probed.pcntlRuntime,
  pgsqlRuntime: probed.pgsqlRuntime,
  xslRuntime: probed.xslRuntime,
  redisRuntime: probed.redisRuntime,
  imagickRuntime: probed.imagickRuntime,
  curlRuntime: probed.curlRuntime,
  gdRuntime: probed.gdRuntime,
  tokenizerRuntime: probed.tokenizerRuntime,
  apcuRuntime: probed.apcuRuntime,
  openSslRuntime: probed.openSslRuntime,
  mysqliRuntime: probed.mysqliRuntime,
  pdoRuntime: probed.pdoRuntime,
  sodiumRuntime: probed.sodiumRuntime,
  pcreRuntime: probed.pcreRuntime,
  mbOnigurumaVersion: probed.mbOnigurumaVersion,
} : {};
const modules = [
  'Core', 'Reflection', 'SPL', 'standard', 'date', 'json', 'session', 'hash', 'random', 'fileinfo',
  'Phar', 'PDO', 'sqlite3', 'curl', 'gd', 'openssl', 'sodium', 'zip', 'mysqli', 'dom', 'SimpleXML',
  'xmlreader', 'xmlwriter', 'intl', 'sockets', 'zlib', 'mbstring', 'bcmath', 'iconv', 'ctype', 'filter',
];
const php = `
$modules = json_decode($argv[1], true); $out = [];
foreach ($modules as $module) {
  if (!extension_loaded($module)) continue;
  foreach ((new ReflectionExtension($module))->getClasses() as $class) {
    $members = ['methods' => [], 'properties' => [], 'constants' => []];
    foreach ($class->getMethods(ReflectionMethod::IS_PUBLIC) as $member) $members['methods'][] = $member->getName();
    foreach ($class->getProperties(ReflectionProperty::IS_PUBLIC) as $member) $members['properties'][] = $member->getName();
    foreach ($class->getReflectionConstants() as $member) if ($member->isPublic()) $members['constants'][] = $member->getName();
    $out[$module][$class->getName()] = $members;
  }
}
echo json_encode(['version' => PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION, 'modules' => $out]);`;
const runtime = JSON.parse(execFileSync(phpCommand, ['-r', php, JSON.stringify(modules)], { encoding: 'utf8' }));
if (runtime.version !== version) throw new Error(`Expected PHP ${version}, got ${runtime.version}`);

const parser = await PhpSyntaxParser.createDefault();
try {
  const documents = [builtinPhpStub(version, options), randomClassesPhpStub(version), bcmathNumberPhpStub(version),
    filterClassesPhpStub(version), pdoDriverPhpStub(version, probed?.pdoRuntime)].filter(Boolean).map(source => parser.parse(source));
  const normalize = name => name.replace(/^\\/, '').toLowerCase();
  const declarations = new Map(documents.flatMap(file => file.declarations).map(item => [normalize(item.fqcn), item]));
  const direct = new Map();
  for (const file of documents) {
    for (const [kind, members] of [['methods', file.callables.filter(item => item.kind === 'method')],
      ['properties', file.properties], ['constants', file.constants]]) {
      for (const item of members) {
        if (!item.containerFqcn || item.visibility !== 'public') continue;
        const key = normalize(item.containerFqcn);
        const entry = direct.get(key) ?? { methods: new Set(), properties: new Set(), constants: new Set() };
        entry[kind].add(item.name.toLowerCase());
        direct.set(key, entry);
      }
    }
  }
  const empty = () => ({ methods: new Set(), properties: new Set(), constants: new Set() });
  const cache = new Map();
  const effective = (key, visiting = new Set()) => {
    if (cache.has(key)) return cache.get(key);
    if (visiting.has(key)) return empty();
    const declaration = declarations.get(key);
    if (!declaration) return direct.get(key) ?? empty();
    visiting.add(key);
    const result = empty();
    for (const parentName of [...declaration.extendsNames, ...declaration.implementsNames, ...declaration.traitNames]) {
      const absolute = normalize(parentName);
      const namespace = key.includes('\\') ? key.slice(0, key.lastIndexOf('\\') + 1) : '';
      const parent = declarations.has(absolute) ? absolute : `${namespace}${absolute}`;
      const inherited = effective(parent, visiting);
      for (const kind of Object.keys(result)) for (const name of inherited[kind]) result[kind].add(name);
    }
    const own = direct.get(key) ?? empty();
    for (const kind of Object.keys(result)) for (const name of own[kind]) result[kind].add(name);
    if (declaration.kind === 'enum') {
      result.methods.add('cases'); result.properties.add('name');
      if (declaration.enumBackingType) {
        result.methods.add('from'); result.methods.add('tryfrom'); result.properties.add('value');
      }
    }
    visiting.delete(key); cache.set(key, result); return result;
  };
  const missing = [];
  const missingTypes = [];
  let checked = 0;
  for (const [module, classes] of Object.entries(runtime.modules)) for (const [name, members] of Object.entries(classes)) {
    const key = normalize(name);
    if (!declarations.has(key)) missingTypes.push({ module, name });
    const present = effective(key);
    const absent = Object.fromEntries(Object.entries(members).map(([kind, names]) => {
      checked += names.length;
      return [kind, names.filter(item => !present[kind].has(item.toLowerCase()))];
    }).filter(([, names]) => names.length));
    if (Object.keys(absent).length) missing.push({ module, name, missing: absent });
  }
  const total = missing.reduce((count, item) => count + Object.values(item.missing).flat().length, 0);
  process.stdout.write(`${JSON.stringify({ version, mode: effective ? 'effective' : 'static', checked, missingTypes, missingMembers: total, missing }, null, 2)}\n`);
} finally { parser.dispose(); }
