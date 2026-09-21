import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { resolve, join } from 'node:path';
import { loadComposerProject, projectAutoloadPaths, allAutoloadPaths } from '../packages/project/dist/index.js';
import { captureReferenceInputSnapshot } from '../packages/language-server/dist/referenceInputSnapshot.js';

const [directory, scope = 'project', ...dependencies] = process.argv.slice(2);
if (!directory || !['project', 'all'].includes(scope)) throw new Error('Usage: node scripts/benchmark-reference-inputs.mjs <root> [project|all] [dependency files...]');
const root = resolve(directory); const project = await loadComposerProject(root);
if (!project) throw new Error('Composer project is unavailable.');
const started = performance.now();
const snapshot = await captureReferenceInputSnapshot({
  sourceRoots: scope === 'all' ? allAutoloadPaths(project) : projectAutoloadPaths(project),
  additionalFiles: [join(root, 'composer.json'), join(root, 'composer.lock'), join(root, 'vendor/composer/installed.json'), ...dependencies.map((path) => resolve(path))],
  context: 'reference-input-benchmark-v1',
});
process.stdout.write(`${JSON.stringify({ scope, capturedInputsComplete: Boolean(snapshot), semanticCoverageVerified: false, files: snapshot?.files.length,
  elapsedMs: Math.round(performance.now() - started), fingerprint: snapshot?.fingerprint })}\n`);
// Project-only evidence does not prove that all semantic/provider dependencies
// were supplied. This benchmark never reads or returns a cached query result.
if (!snapshot) process.exitCode = 1;
