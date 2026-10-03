import { execFileSync } from 'node:child_process';

export const PHPSTORM_STUBS_REVISION = 'e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681';

export function requirePinnedPhpstormStubs(source) {
  const revision = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (revision !== PHPSTORM_STUBS_REVISION) {
    throw new Error(`Expected phpstorm-stubs ${PHPSTORM_STUBS_REVISION}, got ${revision}; audit and update the pin before syncing`);
  }
  const changes = execFileSync('git', ['-C', source, 'status', '--porcelain=v1', '--untracked-files=all'], {
    encoding: 'utf8',
  });
  if (changes.trim()) {
    throw new Error(`phpstorm-stubs ${revision} has local changes; use a clean pinned source checkout before syncing`);
  }
  return revision;
}
