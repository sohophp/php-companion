import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageFiles = [
  'package.json',
  'packages/php-companion-extension-pack/package.json',
  'packages/php-companion-recommended-pack/package.json',
];
const packages = await Promise.all(packageFiles.map(async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'))));
const [corePackage, openSourcePackage, recommendedPackage] = packages;
if (!packages.every((candidate) => candidate.version === corePackage.version)) {
  throw new Error(`Alpha VSIX versions must match: ${packages.map((candidate) => `${candidate.name}@${candidate.version}`).join(', ')}`);
}

const git = (...arguments_) => execFileSync('git', arguments_, { cwd: root, encoding: 'utf8' }).trim();
const commit = git('rev-parse', 'HEAD');
const branch = git('branch', '--show-current');
const dirty = git('status', '--porcelain');
if (dirty) throw new Error(`Refusing to assemble an Alpha candidate from a dirty worktree:\n${dirty}`);

const specifications = JSON.parse(await readFile(resolve(root, 'test/extension/open-source-profile.extensions.json'), 'utf8'));
if (!Array.isArray(specifications) || specifications.some((entry) => typeof entry?.id !== 'string' || typeof entry?.version !== 'string')) {
  throw new Error('Open Source Profile extension registry is invalid.');
}

const sourceArtifacts = [
  { role: 'core', package: corePackage, path: resolve(root, `php-companion-${corePackage.version}.vsix`) },
  { role: 'open-source-pack', package: openSourcePackage, path: resolve(root, `packages/php-companion-extension-pack/php-companion-open-source-pack-${openSourcePackage.version}.vsix`) },
  { role: 'recommended-pack', package: recommendedPackage, path: resolve(root, `packages/php-companion-recommended-pack/php-companion-recommended-pack-${recommendedPackage.version}.vsix`) },
];
const output = resolve(root, process.argv[2] ?? `artifacts/php-companion-alpha-${corePackage.version}-${commit.slice(0, 8)}`);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const digest = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
const artifacts = [];
for (const source of sourceArtifacts) {
  const file = basename(source.path); const target = resolve(output, file);
  await copyFile(source.path, target);
  const metadata = await stat(target);
  artifacts.push({
    role: source.role,
    id: `${source.package.publisher}.${source.package.name}`,
    version: source.package.version,
    file,
    bytes: metadata.size,
    sha256: await digest(target),
  });
}

const supportedExtensions = specifications.filter((entry) => entry.supportedProfile !== false)
  .map(({ id, version }) => ({ id, version }));
const rejectedExtensions = specifications.filter((entry) => entry.supportedProfile === false)
  .map(({ id, version }) => ({ id, version }));
const manifest = {
  schema: 1,
  channel: 'alpha',
  generatedAt: new Date().toISOString(),
  source: { branch, commit, clean: true },
  runtime: { node: process.version, platform: process.platform, architecture: process.arch },
  artifacts,
  supportedExtensions,
  rejectedExtensions,
};
await writeFile(resolve(output, 'candidate.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(resolve(output, 'SHA256SUMS'), `${artifacts.map((artifact) => `${artifact.sha256}  ${artifact.file}`).join('\n')}\n`);

const core = artifacts.find((artifact) => artifact.role === 'core');
const openSource = artifacts.find((artifact) => artifact.role === 'open-source-pack');
await writeFile(resolve(output, 'README.zh-CN.md'), `# PHP Companion Alpha ${corePackage.version}\n\n`
  + `源码：\`${branch}\` 分支提交 \`${commit}\`。候选生成时工作树干净。\n\n`
  + `推荐先安装核心与开源扩展包：\n\n`
  + `\`\`\`bash\ncode --install-extension ${core.file} --force\ncode --install-extension ${openSource.file} --force\n\`\`\`\n\n`
  + `新建干净 VS Code Profile，禁用或卸载其他通用 PHP Language Server。开源扩展包会安装 \`${supportedExtensions.map((entry) => `${entry.id}@${entry.version}`).join('、')}\`。\n\n`
  + `安装前可在候选目录运行 \`sha256sum -c SHA256SUMS\`；\`candidate.json\` 保存提交、平台、文件大小、摘要和冻结插件版本。\n\n`
  + `从对应源码提交根目录运行 \`pnpm alpha:preflight -- --candidate <候选目录> --workspace <Composer项目根目录> --php <项目PHP包装器> --expected-php <次版本> --require-wsl\`。安装完成后，在 VS Code WSL 集成终端追加 \`--check-editor\`；命令要求主扩展、冻结外部扩展及恰好一个 Pack 版本一致。CLI 无法证明竞争 PHP Provider 已禁用，仍须在 Profile 中人工确认。\n\n`
  + `公开 Marketplace/npm 发布不属于此候选操作。\n`);

for (const artifact of artifacts) {
  if (await digest(resolve(output, artifact.file)) !== artifact.sha256) throw new Error(`Copied artifact digest changed: ${artifact.file}`);
}
process.stdout.write(`${JSON.stringify({ output, commit, artifacts, supportedExtensions }, null, 2)}\n`);
