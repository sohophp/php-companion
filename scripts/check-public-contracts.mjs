import { readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import process from 'node:process';
import console from 'node:console';
import ts from 'typescript';

export const PUBLIC_CONTRACT_BASELINE = 'docs/php-language-toolchain/reports/public-contract-baseline-mixed-html-2026-10-10.json';
const sha = text => createHash('sha256').update(text).digest('hex');
function tokens(source) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, source);
  const result = [];
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) result.push([kind, scanner.getTokenText()]);
  return JSON.stringify(result);
}

/** Check reviewed public definitions without rejecting unrelated implementation edits. */
export async function auditPublicContracts(root, baselinePath = PUBLIC_CONTRACT_BASELINE) {
  root = resolve(root);
  const violations = [], inputs = {}, observations = [], sources = new Map(), identities = new Set();
  async function input(file) {
    const target = resolve(root, file), local = relative(root, target);
    if (!local || local === '..' || local.startsWith('..' + sep) || local.startsWith(sep)) {
      violations.push({ rule: 'contract-path-inside-project', file }); return undefined;
    }
    try {
      const text = await readFile(target, 'utf8'); inputs[local.split(sep).join('/')] = sha(text); return text;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      violations.push({ rule: 'contract-input-exists', file }); return undefined;
    }
  }
  const raw = await input(baselinePath);
  let baseline;
  try { baseline = raw === undefined ? undefined : JSON.parse(raw); }
  catch { violations.push({ rule: 'contract-baseline-valid-json', file: baselinePath }); }
  if (!Array.isArray(baseline?.contracts) || !baseline.contracts.length) {
    violations.push({ rule: 'contract-baseline-has-definitions', file: baselinePath });
    return { qualified: false, contractCount: 0, sourceFileCount: 0, violations, inputs, contracts: [] };
  }
  if (baseline.currentContracts !== undefined && baseline.currentContracts !== baseline.contracts.length) {
    violations.push({ rule: 'contract-baseline-count', expected: baseline.currentContracts, actual: baseline.contracts.length });
  }
  for (const expected of baseline.contracts) {
    if (!expected || typeof expected.file !== 'string' || typeof expected.name !== 'string'
      || typeof expected.definition !== 'string' || !['interface', 'type'].includes(expected.kind)) {
      violations.push({ rule: 'contract-baseline-entry-valid' }); continue;
    }
    const identity = expected.file + ':' + expected.name;
    if (identities.has(identity)) { violations.push({ rule: 'unique-contract-identity', file: expected.file, name: expected.name }); continue; }
    identities.add(identity);
    if (sha(expected.definition) !== expected.definitionSha256) violations.push({ rule: 'contract-baseline-definition-checksum', file: expected.file, name: expected.name });
    if (!sources.has(expected.file)) {
      const text = await input(expected.file);
      const ast = text === undefined ? undefined : ts.createSourceFile(expected.file, text, ts.ScriptTarget.Latest, true);
      sources.set(expected.file, ast);
      if (ast?.parseDiagnostics.length) violations.push({ rule: 'contract-source-valid-typescript', file: expected.file });
    }
    const ast = sources.get(expected.file); if (!ast) continue;
    const matches = ast.statements.filter(node => (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name.text === expected.name);
    if (matches.length !== 1) {
      violations.push({ rule: 'contract-declaration-is-unique', file: expected.file, name: expected.name, declarations: matches.length }); continue;
    }
    const node = matches[0], kind = ts.isInterfaceDeclaration(node) ? 'interface' : 'type';
    if (!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export)) violations.push({ rule: 'contract-declaration-is-exported', file: expected.file, name: expected.name });
    if (kind !== expected.kind || tokens(node.getText(ast)) !== tokens(expected.definition)) violations.push({ rule: 'reviewed-contract-definition', file: expected.file, name: expected.name });
    const schema = ts.isInterfaceDeclaration(node) ? node.members.find(member => ts.isPropertySignature(member) && member.name.getText(ast) === 'schema')?.type : undefined;
    const schemaValue = schema && ts.isLiteralTypeNode(schema) && ts.isNumericLiteral(schema.literal) ? Number(schema.literal.text) : undefined;
    observations.push({ file: expected.file, name: expected.name, kind, schema: schemaValue });
  }
  for (const [name, schema] of Object.entries(baseline.currentSchemas ?? {})) {
    const matches = observations.filter(item => item.name === name);
    if (matches.length !== 1 || matches[0].schema !== schema) violations.push({ rule: 'reviewed-contract-schema', name, schema });
  }
  return { qualified: violations.length === 0, contractCount: baseline.contracts.length, sourceFileCount: sources.size, violations, inputs, contracts: observations };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const report = await auditPublicContracts(resolve(import.meta.dirname, '..'));
  if (process.argv[2]) await writeFile(resolve(process.argv[2]), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  for (const violation of report.violations) console.error(JSON.stringify(violation));
  console.log(JSON.stringify({ contracts: report.contractCount, sourceFiles: report.sourceFileCount, violations: report.violations.length }));
  if (!report.qualified) process.exitCode = 1;
}
