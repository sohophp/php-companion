import { readFile, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, parse, resolve } from 'node:path';

export interface Psr4Mapping {
  prefix: string;
  directories: string[];
  development: boolean;
}

export interface ComposerProject {
  root: string;
  composerPath: string;
  lockPath?: string;
  platformPhp?: string;
  lockPlatformPhp?: string;
  requiredPhp?: string;
  psr4: Psr4Mapping[];
  warnings: string[];
}

async function readJson(path: string): Promise<Record<string, any> | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as Record<string, any>;
  } catch {
    return undefined;
  }
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

export async function findComposerRoot(startPath: string, boundary?: string): Promise<string | undefined> {
  let current = resolve(startPath);
  try {
    if ((await stat(current)).isFile()) current = dirname(current);
  } catch {
    current = dirname(current);
  }
  const stop = boundary ? resolve(boundary) : parse(current).root;
  while (true) {
    if (await isFile(join(current, 'composer.json'))) return current;
    if (current === stop || current === parse(current).root) return undefined;
    current = dirname(current);
  }
}

function collectPsr4(root: string, section: unknown, development: boolean): Psr4Mapping[] {
  if (!section || typeof section !== 'object') return [];
  const psr4 = (section as Record<string, unknown>)['psr-4'];
  if (!psr4 || typeof psr4 !== 'object') return [];
  return Object.entries(psr4 as Record<string, unknown>).flatMap(([prefix, value]) => {
    const values = Array.isArray(value) ? value : [value];
    const directories = values
      .filter((item): item is string => typeof item === 'string')
      .map((item) => isAbsolute(item) ? item : resolve(root, item));
    return directories.length ? [{ prefix, directories, development }] : [];
  });
}

export async function loadComposerProject(root: string, includeDev = true): Promise<ComposerProject | undefined> {
  const composerPath = join(root, 'composer.json');
  const composer = await readJson(composerPath);
  if (!composer) return undefined;
  const lockPathCandidate = join(root, 'composer.lock');
  const lock = await readJson(lockPathCandidate);
  const warnings: string[] = [];
  const psr4 = [
    ...collectPsr4(root, composer.autoload, false),
    ...(includeDev ? collectPsr4(root, composer['autoload-dev'], true) : []),
  ];
  if (psr4.length === 0) warnings.push('No PSR-4 autoload mappings found.');

  return {
    root,
    composerPath,
    lockPath: lock ? lockPathCandidate : undefined,
    platformPhp: typeof composer.config?.platform?.php === 'string' ? composer.config.platform.php : undefined,
    lockPlatformPhp: typeof lock?.['platform-overrides']?.php === 'string' ? lock['platform-overrides'].php : undefined,
    requiredPhp: typeof composer.require?.php === 'string' ? composer.require.php : undefined,
    psr4,
    warnings,
  };
}
