import { access } from 'node:fs/promises';
import { delimiter, isAbsolute, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { DEFAULT_PHP_COMMANDS } from '@php-companion/runtime-probe';
import { toSupportedMinor, type PhpExecutable } from './types.js';

const execFileAsync = promisify(execFile);
export type PhpVersionRunner = (path: string, env: NodeJS.ProcessEnv) => Promise<string>;
export type ExecutableResolver = (command: string, env: NodeJS.ProcessEnv) => Promise<string | undefined>;
export { DEFAULT_PHP_COMMANDS };

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function resolveExecutable(command: string, env = process.env): Promise<string | undefined> {
  if (isAbsolute(command) || command.includes('/') || command.includes('\\')) {
    return (await exists(command)) ? command : undefined;
  }

  const extensions = process.platform === 'win32'
    ? (env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';')
    : [''];
  for (const directory of (env.PATH ?? '').split(delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const candidate = join(directory, `${command}${extension}`);
      if (await exists(candidate)) return candidate;
    }
  }
  return undefined;
}

export const runPhpVersion: PhpVersionRunner = async (path, env) => {
  const { stdout } = await execFileAsync(path, ['-r', 'echo PHP_VERSION;'], {
    timeout: 3000,
    windowsHide: true,
    env,
  });
  return stdout.trim();
};

export async function probePhp(
  command: string,
  env = process.env,
  runner: PhpVersionRunner = runPhpVersion,
  resolver: ExecutableResolver = resolveExecutable,
): Promise<PhpExecutable | undefined> {
  const path = await resolver(command, env);
  if (!path) return undefined;
  try {
    const version = (await runner(path, env)).trim();
    if (!/^\d+\.\d+\.\d+/.test(version)) return undefined;
    return { command, path, version, minor: toSupportedMinor(version) };
  } catch {
    return undefined;
  }
}

export async function discoverPhpExecutables(
  configuredPath?: string,
  env = process.env,
  runner: PhpVersionRunner = runPhpVersion,
  resolver: ExecutableResolver = resolveExecutable,
): Promise<PhpExecutable[]> {
  const commands = configuredPath
    ? [configuredPath, ...DEFAULT_PHP_COMMANDS]
    : [...DEFAULT_PHP_COMMANDS];
  const results = await Promise.all(commands.map((command) => probePhp(command, env, runner, resolver)));
  const seen = new Set<string>();
  return results.filter((result): result is PhpExecutable => {
    if (!result || seen.has(result.path)) return false;
    seen.add(result.path);
    return true;
  });
}
