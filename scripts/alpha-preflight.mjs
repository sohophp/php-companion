import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SHA256 = /^[a-f0-9]{64}$/u;
const PHP_VERSION = /^(?:7\.[234]|8\.[0-5])$/u;
const competingPhpProviders = [
  'bmewburn.vscode-intelephense-client',
  'devsense.phptools-vscode',
  'phpactor.vscode-phpactor',
  'symfony.language-tools',
];

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}

async function digest(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

export function parseExtensionList(source) {
  const extensions = new Map();
  for (const line of source.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean)) {
    const separator = line.lastIndexOf('@');
    if (separator <= 0 || separator === line.length - 1) continue;
    extensions.set(line.slice(0, separator).toLowerCase(), line.slice(separator + 1));
  }
  return extensions;
}

export function extensionAssessment(manifest, installed) {
  const required = manifest.supportedExtensions.map((extension) => ({
    id: extension.id,
    expected: extension.version,
    installed: installed.get(extension.id.toLowerCase()),
  }));
  const products = (manifest.artifacts ?? []).filter((artifact) => ['core', 'open-source-pack', 'recommended-pack'].includes(artifact.role))
    .map((artifact) => ({ role: artifact.role, id: artifact.id, expected: artifact.version,
      installed: installed.get(artifact.id.toLowerCase()) }));
  const core = products.find((product) => product.role === 'core');
  const packs = products.filter((product) => product.role === 'open-source-pack' || product.role === 'recommended-pack');
  const installedPacks = packs.filter((product) => product.installed !== undefined);
  return {
    required,
    missing: required.filter((extension) => extension.installed === undefined).map((extension) => extension.id),
    mismatched: required.filter((extension) => extension.installed !== undefined && extension.installed !== extension.expected),
    productMissing: core?.installed === undefined ? [core?.id].filter(Boolean) : [],
    productMismatched: products.filter((product) => product.installed !== undefined && product.installed !== product.expected),
    installedPacks,
    competingInstalled: competingPhpProviders.filter((id) => installed.has(id)),
  };
}

export function isWslEnvironment(environment, kernelRelease = '') {
  return Boolean(environment.WSL_DISTRO_NAME || environment.WSL_INTEROP || /microsoft|wsl/iu.test(kernelRelease));
}

export async function verifyCandidate(candidateDirectory) {
  const directory = await realpath(resolve(candidateDirectory));
  const manifestPath = resolve(directory, 'candidate.json');
  const manifest = record(JSON.parse(await readFile(manifestPath, 'utf8')));
  const source = record(manifest?.source);
  if (!manifest || manifest.schema !== 1 || manifest.channel !== 'alpha' || source?.clean !== true
    || typeof source.commit !== 'string' || !/^[a-f0-9]{40,64}$/u.test(source.commit)
    || !Array.isArray(manifest.artifacts) || !Array.isArray(manifest.supportedExtensions)
    || !Array.isArray(manifest.rejectedExtensions)) throw new Error('Alpha candidate manifest is invalid.');
  const names = new Set(); const artifacts = [];
  for (const raw of manifest.artifacts) {
    const artifact = record(raw);
    if (!artifact || !['core', 'open-source-pack', 'recommended-pack'].includes(artifact.role)
      || typeof artifact.id !== 'string' || typeof artifact.version !== 'string'
      || typeof artifact.file !== 'string' || basename(artifact.file) !== artifact.file
      || typeof artifact.sha256 !== 'string' || !SHA256.test(artifact.sha256)
      || !Number.isSafeInteger(artifact.bytes) || artifact.bytes < 1 || names.has(artifact.file)) {
      throw new Error('Alpha candidate artifact metadata is invalid.');
    }
    names.add(artifact.file);
    const path = resolve(directory, artifact.file);
    if (relative(directory, path).startsWith(`..${sep}`) || isAbsolute(relative(directory, path))) {
      throw new Error(`Alpha candidate artifact escapes its directory: ${artifact.file}`);
    }
    const metadata = await stat(path); const actualSha256 = await digest(path);
    artifacts.push({ file: artifact.file, bytes: metadata.size, sha256: actualSha256,
      valid: metadata.isFile() && metadata.size === artifact.bytes && actualSha256 === artifact.sha256 });
  }
  const roles = manifest.artifacts.map((artifact) => artifact.role);
  if (artifacts.length !== 3 || new Set(roles).size !== 3
    || !['core', 'open-source-pack', 'recommended-pack'].every((role) => roles.includes(role))
    || artifacts.some((artifact) => !artifact.valid)) {
    throw new Error('Alpha candidate artifact verification failed.');
  }
  const supported = manifest.supportedExtensions;
  if (supported.some((extension) => typeof extension?.id !== 'string' || typeof extension?.version !== 'string')
    || new Set(supported.map((extension) => extension.id.toLowerCase())).size !== supported.length) {
    throw new Error('Alpha candidate supported extension registry is invalid.');
  }
  const rejected = manifest.rejectedExtensions;
  if (rejected.some((extension) => typeof extension?.id !== 'string' || typeof extension?.version !== 'string')
    || new Set(rejected.map((extension) => extension.id.toLowerCase())).size !== rejected.length
    || rejected.some((extension) => supported.some((candidate) => candidate.id.toLowerCase() === extension.id.toLowerCase()))) {
    throw new Error('Alpha candidate rejected extension registry is invalid.');
  }
  return { directory, manifest, artifacts };
}

function argumentValue(arguments_, name) {
  const index = arguments_.indexOf(name); return index >= 0 ? arguments_[index + 1] : undefined;
}

async function kernelRelease() {
  try { return (await readFile('/proc/sys/kernel/osrelease', 'utf8')).trim(); } catch { return ''; }
}

function probe(command, arguments_) {
  const result = spawnSync(command, arguments_, { encoding: 'utf8', timeout: 15_000, windowsHide: true });
  return { status: result.status, stdout: result.stdout?.trim() ?? '', stderr: result.stderr?.trim() ?? '', error: result.error?.message };
}

export async function runPreflight(options) {
  const candidate = await verifyCandidate(options.candidate);
  const workspace = await realpath(resolve(options.workspace));
  const composer = record(JSON.parse(await readFile(resolve(workspace, 'composer.json'), 'utf8')));
  if (!composer) throw new Error('Workspace composer.json must contain a JSON object.');
  const phpCommand = isAbsolute(options.php) ? options.php : resolve(workspace, options.php);
  const php = probe(phpCommand, ['-r', 'echo PHP_MAJOR_VERSION, ".", PHP_MINOR_VERSION;']);
  const kernel = await kernelRelease(); const wsl = isWslEnvironment(process.env, kernel);
  const vscodeTerminal = process.env.TERM_PROGRAM === 'vscode' && Boolean(process.env.VSCODE_IPC_HOOK_CLI);
  let editor;
  if (options.checkEditor) {
    const extensionsProbe = probe(options.code ?? 'code', ['--list-extensions', '--show-versions']);
    editor = { command: options.code ?? 'code', probe: extensionsProbe,
      assessment: extensionsProbe.status === 0 ? extensionAssessment(candidate.manifest, parseExtensionList(extensionsProbe.stdout)) : undefined };
  }
  const errors = [];
  if (php.status !== 0) errors.push({ code: 'php-probe-failed', message: php.error ?? php.stderr ?? 'PHP wrapper failed.' });
  else if (php.stdout !== options.expectedPhp) errors.push({ code: 'php-version-mismatch', message: `Expected PHP ${options.expectedPhp}, received ${php.stdout}.` });
  if (options.requireWsl && !wsl) errors.push({ code: 'wsl-required', message: 'This preflight was required to run inside WSL.' });
  if (options.checkEditor && !vscodeTerminal) errors.push({ code: 'vscode-remote-terminal-required', message: 'Run strict editor preflight from the VS Code WSL integrated terminal.' });
  if (editor && editor.probe.status !== 0) errors.push({ code: 'vscode-cli-failed', message: editor.probe.error ?? editor.probe.stderr ?? 'VS Code CLI failed.' });
  if (editor?.assessment?.missing.length) errors.push({ code: 'extensions-missing', message: `Missing extensions: ${editor.assessment.missing.join(', ')}` });
  if (editor?.assessment?.mismatched.length) errors.push({ code: 'extension-version-mismatch', message: `Extension version mismatch: ${editor.assessment.mismatched.map((item) => `${item.id} expected ${item.expected}, received ${item.installed}`).join(', ')}` });
  if (editor?.assessment?.productMissing.length) errors.push({ code: 'product-extension-missing', message: `Missing product extension: ${editor.assessment.productMissing.join(', ')}` });
  if (editor?.assessment?.productMismatched.length) errors.push({ code: 'product-version-mismatch', message: `Product version mismatch: ${editor.assessment.productMismatched.map((item) => `${item.id} expected ${item.expected}, received ${item.installed}`).join(', ')}` });
  if (editor && editor.assessment?.installedPacks.length !== 1) errors.push({ code: 'profile-pack-count', message: 'Install exactly one of the Open Source Pack or Recommended Pack in the Alpha Profile.' });
  const report = {
    schema: 1, generatedAt: new Date().toISOString(), candidate: { directory: candidate.directory,
      commit: candidate.manifest.source.commit, artifacts: candidate.artifacts },
    workspace: { root: workspace, composer: resolve(workspace, 'composer.json') },
    php: { command: phpCommand, expected: options.expectedPhp, ...php },
    environment: { wsl, kernelRelease: kernel, vscodeTerminal },
    editor,
    gates: { deterministicPassed: errors.length === 0, errors, manualPending: [
      'Confirm PHP Companion and workspace extensions run in the WSL Extension Host.',
      'Confirm every installed competing PHP provider is disabled for this Profile.',
      'Complete and record the two-hour Winstar and CoreRepo editing sessions.',
    ] },
  };
  if (options.output) {
    const output = resolve(options.output);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  }
  return report;
}

async function main() {
  const arguments_ = process.argv.slice(2).filter((argument) => argument !== '--');
  const candidate = argumentValue(arguments_, '--candidate'); const workspace = argumentValue(arguments_, '--workspace');
  const php = argumentValue(arguments_, '--php'); const expectedPhp = argumentValue(arguments_, '--expected-php');
  if (!candidate || !workspace || !php || !expectedPhp || !PHP_VERSION.test(expectedPhp)) {
    throw new Error('Usage: alpha-preflight.mjs --candidate <directory> --workspace <Composer root> --php <wrapper> --expected-php <7.2-8.5> [--require-wsl] [--check-editor] [--code <command>] [--output <JSON>]');
  }
  const report = await runPreflight({ candidate, workspace, php, expectedPhp,
    requireWsl: arguments_.includes('--require-wsl'), checkEditor: arguments_.includes('--check-editor'),
    code: argumentValue(arguments_, '--code'), output: argumentValue(arguments_, '--output') });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.gates.deterministicPassed) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
