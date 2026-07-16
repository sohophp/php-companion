import { lowestSupportedVersion } from './constraints.js';
import {
  discoverPhpExecutables,
  type ExecutableResolver,
  type PhpVersionRunner,
} from './executables.js';
import { toSupportedMinor, type PhpVersionResolution, type PhpVersionSetting } from './types.js';
import type { ComposerProject } from '../composer/project.js';

export interface ResolvePhpVersionOptions {
  setting: PhpVersionSetting;
  configuredExecutable?: string;
  composer?: ComposerProject;
  env?: NodeJS.ProcessEnv;
  processRunner?: PhpVersionRunner;
  executableResolver?: ExecutableResolver;
}

export async function resolvePhpVersion(options: ResolvePhpVersionOptions): Promise<PhpVersionResolution> {
  const discovered = await discoverPhpExecutables(
    options.configuredExecutable,
    options.env,
    options.processRunner,
    options.executableResolver,
  );
  const warnings = [...(options.composer?.warnings ?? [])];
  const base = { discovered, warnings };

  if (options.setting !== 'auto') {
    return { ...base, target: options.setting, source: 'setting', sourceDetail: 'phpCompanion.phpVersion' };
  }

  const platform = options.composer?.platformPhp;
  const platformMinor = platform ? toSupportedMinor(platform) : undefined;
  if (platformMinor) {
    return { ...base, target: platformMinor, detectedVersion: platform, source: 'composer-platform', sourceDetail: 'composer.json config.platform.php' };
  }
  if (platform) warnings.push(`composer.json config.platform.php is outside PHP 7.2–8.5 or invalid: ${platform}`);

  const lockPlatform = options.composer?.lockPlatformPhp;
  const lockMinor = lockPlatform ? toSupportedMinor(lockPlatform) : undefined;
  if (lockMinor) {
    return { ...base, target: lockMinor, detectedVersion: lockPlatform, source: 'composer-lock-platform', sourceDetail: 'composer.lock platform-overrides.php' };
  }
  if (lockPlatform) warnings.push(`composer.lock platform-overrides.php is outside PHP 7.2–8.5 or invalid: ${lockPlatform}`);

  const requirement = options.composer?.requiredPhp;
  const requiredMinor = requirement ? lowestSupportedVersion(requirement) : undefined;
  if (requiredMinor) {
    return { ...base, target: requiredMinor, source: 'composer-require', sourceDetail: `composer.json require.php (${requirement})` };
  }

  if (options.configuredExecutable) {
    const configured = discovered.find((item) => item.command === options.configuredExecutable);
    if (configured?.minor) {
      return { ...base, target: configured.minor, detectedVersion: configured.version, executable: configured, source: 'configured-executable', sourceDetail: configured.path };
    }
    warnings.push(`Configured PHP executable could not be used: ${options.configuredExecutable}`);
  }

  const executable = discovered.find((item) => item.minor !== undefined);
  if (executable?.minor) {
    return { ...base, target: executable.minor, detectedVersion: executable.version, executable, source: 'discovered-executable', sourceDetail: executable.path };
  }

  warnings.push('No supported PHP executable or Composer version constraint was detected.');
  return { ...base, target: '7.2', source: 'fallback', sourceDetail: 'Conservative fallback' };
}
