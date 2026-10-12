import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, copyFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import process from 'node:process';
import { auditPublicContracts, PUBLIC_CONTRACT_BASELINE } from '../check-public-contracts.mjs';

const directories = [];
after(async () => { for (const dir of directories) await rm(dir, { recursive: true, force: true }); });
const definitions = [
  ['Snapshot', 'interface', "export interface Snapshot { schema: 3; value?: string; status: 'ready' | 'paused'; generation: number; }"],
  ['Result', 'type', 'export type Result = Snapshot | undefined;'],
];
async function fixture(change = {}) {
  const root = await mkdtemp(join(tmpdir(), 'sophp-public-contract-gate-')); directories.push(root);
  const baselinePath = PUBLIC_CONTRACT_BASELINE;
  await mkdir(join(root, 'packages/model/src'), { recursive: true });
  await mkdir(join(root, 'docs/php-language-toolchain/reports'), { recursive: true });
  const baseline = { currentContracts: 2, currentSchemas: { Snapshot: 3 }, contracts: definitions.map(([name, kind, definition]) => ({
    name, kind, definition, file: 'packages/model/src/index.ts', definitionSha256: createHash('sha256').update(definition).digest('hex'),
  })) };
  change.baseline?.(baseline);
  await writeFile(join(root, baselinePath), change.rawBaseline ?? JSON.stringify(baseline));
  if (!change.missingFile) await writeFile(join(root, 'packages/model/src/index.ts'), change.source ?? definitions.map(item => item[2]).join('\n'));
  return { root, baselinePath };
}

describe('reviewed public contracts', () => {
  it('accepts the reviewed public interfaces, aliases and exact schema', async () => {
    const f = await fixture(), report = await auditPublicContracts(f.root, f.baselinePath);
    assert.equal(report.qualified, true); assert.equal(report.contractCount, 2); assert.equal(report.sourceFileCount, 1);
    assert.equal(report.contracts[0].schema, 3); assert.equal(Object.keys(report.inputs).length, 2);
  });
  it('allows formatting, comments and unrelated implementation edits', async () => {
    const source = definitions.map(item => item[2]).join('\n').replace('value?: string', '/* retained field */ value? :\n string')
      + '\nexport function unrelated() { return 42; }';
    const f = await fixture({ source }); assert.equal((await auditPublicContracts(f.root, f.baselinePath)).qualified, true);
  });
  const sourceCases = [
    ['removed declaration', definitions[1][2], 'contract-declaration-is-unique'],
    ['merged duplicate declaration', definitions.map(item => item[2]).join('\n') + '\nexport interface Snapshot { extra: boolean; }', 'contract-declaration-is-unique'],
    ['private declaration', definitions.map(item => item[2]).join('\n').replace('export interface', 'interface'), 'contract-declaration-is-exported'],
    ['changed kind', definitions.map(item => item[2]).join('\n').replace('interface Snapshot', 'type Snapshot ='), 'reviewed-contract-definition'],
    ['changed field type', definitions.map(item => item[2]).join('\n').replace('value?: string', 'value?: number'), 'reviewed-contract-definition'],
    ['removed field', definitions.map(item => item[2]).join('\n').replace(' generation: number;', ''), 'reviewed-contract-definition'],
    ['added optional field', definitions.map(item => item[2]).join('\n').replace('generation: number;', 'generation: number; extra?: boolean;'), 'reviewed-contract-definition'],
    ['optional becoming required', definitions.map(item => item[2]).join('\n').replace('value?:', 'value:'), 'reviewed-contract-definition'],
    ['changed alias', definitions.map(item => item[2]).join('\n').replace('Snapshot | undefined', 'Snapshot | null'), 'reviewed-contract-definition'],
    ['changed string literal', definitions.map(item => item[2]).join('\n').replace("'ready'", "'READY'"), 'reviewed-contract-definition'],
    ['changed schema', definitions.map(item => item[2]).join('\n').replace('schema: 3', 'schema: 4'), 'reviewed-contract-schema'],
    ['invalid TypeScript', definitions.map(item => item[2]).join('\n').replace('value?: string', 'value?: @'), 'contract-source-valid-typescript'],
  ];
  for (const [name, source, rule] of sourceCases) it(`rejects ${name}`, async () => {
    const f = await fixture({ source }), report = await auditPublicContracts(f.root, f.baselinePath);
    assert.equal(report.qualified, false); assert.ok(report.violations.some(item => item.rule === rule));
  });
  const baselineCases = [
    ['incorrect checksum', value => { value.contracts[0].definitionSha256 = '0'.repeat(64); }, 'contract-baseline-definition-checksum'],
    ['dropped entry', value => { value.contracts.pop(); }, 'contract-baseline-count'],
    ['duplicate identity', value => { value.contracts.push(value.contracts[0]); value.currentContracts = 3; }, 'unique-contract-identity'],
    ['invalid entry', value => { value.contracts[0].name = 42; }, 'contract-baseline-entry-valid'],
    ['schema metadata drift', value => { value.currentSchemas.Snapshot = 4; }, 'reviewed-contract-schema'],
    ['source outside project', value => { value.contracts[0].file = '../outside.ts'; }, 'contract-path-inside-project'],
    ['empty baseline', value => { value.contracts = []; }, 'contract-baseline-has-definitions'],
  ];
  for (const [name, baseline, rule] of baselineCases) it(`rejects ${name}`, async () => {
    const f = await fixture({ baseline }), report = await auditPublicContracts(f.root, f.baselinePath);
    assert.equal(report.qualified, false); assert.ok(report.violations.some(item => item.rule === rule));
  });
  it('rejects a missing source file', async () => {
    const f = await fixture({ missingFile: true }), report = await auditPublicContracts(f.root, f.baselinePath);
    assert.equal(report.qualified, false); assert.ok(report.violations.some(item => item.rule === 'contract-input-exists'));
  });
  it('rejects malformed baseline JSON', async () => {
    const f = await fixture({ rawBaseline: '{' }), report = await auditPublicContracts(f.root, f.baselinePath);
    assert.equal(report.qualified, false); assert.ok(report.violations.some(item => item.rule === 'contract-baseline-valid-json'));
  });
  for (const broken of [false, true]) it(`returns the correct CLI exit code, broken=${broken}`, async () => {
    const f = await fixture(broken ? { source: definitions[1][2] } : {});
    await mkdir(join(f.root, 'scripts'));
    await copyFile(resolve(import.meta.dirname, '../check-public-contracts.mjs'), join(f.root, 'scripts/check-public-contracts.mjs'));
    await symlink(resolve(import.meta.dirname, '../../node_modules'), join(f.root, 'node_modules'), 'dir');
    const result = spawnSync(process.execPath, [join(f.root, 'scripts/check-public-contracts.mjs'), join(f.root, 'report.json')], { encoding: 'utf8' });
    assert.equal(result.status, broken ? 1 : 0, result.stderr);
    assert.match(result.stdout, /"contracts":2/);
    if (broken) assert.match(result.stderr, /contract-declaration-is-unique/);
  });
});
