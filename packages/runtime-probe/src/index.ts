import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { delimiter, isAbsolute, join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const OUTPUT_MARKER = 'PHP_COMPANION_RUNTIME_V1:';

export const DEFAULT_PHP_COMMANDS = [
  'php85', 'php8.5', 'php84', 'php8.4', 'php83', 'php8.3', 'php82', 'php8.2',
  'php81', 'php8.1', 'php80', 'php8.0', 'php74', 'php7.4', 'php73', 'php7.3',
  'php72', 'php7.2', 'php',
] as const;

export interface PhpRuntime {
  command: string;
  path: string;
  version: string;
  versionId: number;
  minor: string;
  sapi: string;
  loadedExtensions: string[];
  loadedConfigurationFile?: string;
  scannedConfigurationFiles: string[];
}

interface PhpRuntimePayload {
  version: string;
  versionId: number;
  sapi: string;
  loadedExtensions: string[];
  loadedConfigurationFile: string | null;
  scannedConfigurationFiles: string[];
}

export type PhpRuntimeRunner = (path: string, env: NodeJS.ProcessEnv) => Promise<string>;
export type ExecutableResolver = (command: string, env: NodeJS.ProcessEnv) => Promise<string | undefined>;

async function exists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

export async function resolveExecutable(command: string, env = process.env): Promise<string | undefined> {
  if (isAbsolute(command) || command.includes('/') || command.includes('\\')) return await exists(command) ? command : undefined;
  const extensions = process.platform === 'win32' ? (env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';') : [''];
  for (const directory of (env.PATH ?? '').split(delimiter).filter(Boolean)) for (const extension of extensions) {
    const candidate = join(directory, `${command}${extension}`);
    if (await exists(candidate)) return candidate;
  }
  return undefined;
}

const probeScript = `
$scanned = php_ini_scanned_files();
$payload = [
  'version' => PHP_VERSION,
  'versionId' => PHP_VERSION_ID,
  'sapi' => PHP_SAPI,
  'loadedExtensions' => get_loaded_extensions(),
  'loadedConfigurationFile' => php_ini_loaded_file() ?: null,
  'scannedConfigurationFiles' => $scanned === false ? [] : preg_split('/,\\s*/', trim($scanned), -1, PREG_SPLIT_NO_EMPTY),
];
echo '${OUTPUT_MARKER}', json_encode($payload, JSON_UNESCAPED_SLASHES);
`.trim();

export const runPhpRuntime: PhpRuntimeRunner = async (path, env) => {
  const { stdout } = await execFileAsync(path, ['-d', 'auto_prepend_file=', '-d', 'auto_append_file=', '-r', probeScript], {
    env,
    windowsHide: true,
    timeout: 3_000,
    maxBuffer: 128 * 1024,
  });
  return stdout;
};

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return undefined;
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}

function parsePayload(output: string): PhpRuntimePayload | undefined {
  const marker = output.lastIndexOf(OUTPUT_MARKER);
  if (marker < 0) return undefined;
  try {
    const value = JSON.parse(output.slice(marker + OUTPUT_MARKER.length).trim()) as Record<string, unknown>;
    const loadedExtensions = stringArray(value.loadedExtensions);
    const scannedConfigurationFiles = stringArray(value.scannedConfigurationFiles);
    const version = typeof value.version === 'string' ? value.version : undefined;
    const versionId = typeof value.versionId === 'number' ? value.versionId : undefined;
    const versionMatch = version ? /^(\d+)\.(\d+)\.(\d+)/.exec(version) : null;
    if (!version || !versionMatch || version.length > 64
      || versionId === undefined || !Number.isSafeInteger(versionId) || versionId < 1
      || Math.floor(versionId / 10_000) !== Number(versionMatch[1])
      || Math.floor(versionId / 100) % 100 !== Number(versionMatch[2])
      || versionId % 100 !== Number(versionMatch[3])
      || typeof value.sapi !== 'string' || value.sapi === '' || value.sapi.length > 128 || !loadedExtensions || loadedExtensions.length > 4_096
      || !loadedExtensions.some((extension) => extension.toLowerCase() === 'core') || loadedExtensions.some((extension) => extension.length > 256)
      || !scannedConfigurationFiles || scannedConfigurationFiles.length > 4_096 || scannedConfigurationFiles.some((file) => file.length > 32_768)
      || !(typeof value.loadedConfigurationFile === 'string' || value.loadedConfigurationFile === null)
      || (typeof value.loadedConfigurationFile === 'string' && value.loadedConfigurationFile.length > 32_768)) return undefined;
    return {
      version,
      versionId,
      sapi: value.sapi,
      loadedExtensions: [...new Set(loadedExtensions.map((extension) => extension.toLowerCase()))].sort(),
      loadedConfigurationFile: value.loadedConfigurationFile,
      scannedConfigurationFiles,
    };
  } catch { return undefined; }
}

export function phpMinor(version: string): string | undefined {
  const match = /^(\d+)\.(\d+)/.exec(version.trim());
  return match ? `${match[1]}.${match[2]}` : undefined;
}

export async function probePhpRuntime(
  command: string,
  env = process.env,
  runner: PhpRuntimeRunner = runPhpRuntime,
  resolver: ExecutableResolver = resolveExecutable,
): Promise<PhpRuntime | undefined> {
  const path = await resolver(command, env);
  if (!path) return undefined;
  try {
    const payload = parsePayload(await runner(path, env));
    const minor = payload ? phpMinor(payload.version) : undefined;
    if (!payload || !minor) return undefined;
    return {
      command, path, minor,
      version: payload.version,
      versionId: payload.versionId,
      sapi: payload.sapi,
      loadedExtensions: payload.loadedExtensions,
      ...(payload.loadedConfigurationFile ? { loadedConfigurationFile: payload.loadedConfigurationFile } : {}),
      scannedConfigurationFiles: payload.scannedConfigurationFiles,
    };
  } catch { return undefined; }
}

export async function discoverPhpRuntimes(
  commands: readonly string[] = DEFAULT_PHP_COMMANDS,
  env = process.env,
  runner: PhpRuntimeRunner = runPhpRuntime,
  resolver: ExecutableResolver = resolveExecutable,
): Promise<PhpRuntime[]> {
  const results = await Promise.all(commands.map((command) => probePhpRuntime(command, env, runner, resolver)));
  const seen = new Set<string>();
  return results.filter((result): result is PhpRuntime => {
    if (!result || seen.has(result.path)) return false;
    seen.add(result.path); return true;
  });
}
