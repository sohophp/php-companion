// YAML names come from pinned JetBrains/phpstorm-stubs; values and signatures
// are checked against local PHP 7.2, 8.1, 8.2, 8.4 and 8.5 runtimes.
import { YAML_CONSTANTS } from './yaml-catalog.js';

export function auditedYamlStub(): string {
  const constants = Object.entries(YAML_CONSTANTS).map(([name, value]) =>
    `const ${name} = ${typeof value === 'string' ? `'${value}'` : value};`).join('\n');
  return `${constants}
/** @return mixed|false */ function yaml_parse($input, $pos = 0, &$ndocs = null, array $callbacks = []) {}
/** @return mixed|false */ function yaml_parse_file($filename, $pos = 0, &$ndocs = null, array $callbacks = []) {}
/** @return mixed|false */ function yaml_parse_url($url, $pos = 0, &$ndocs = null, array $callbacks = []) {}
/** @return string|false */ function yaml_emit($data, $encoding = YAML_ANY_ENCODING, $linebreak = YAML_ANY_BREAK, array $callbacks = []) {}
/** @return bool */ function yaml_emit_file($filename, $data, $encoding = YAML_ANY_ENCODING, $linebreak = YAML_ANY_BREAK, array $callbacks = []) {}
`;
}
