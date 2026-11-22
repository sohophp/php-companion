import { readFile } from 'node:fs/promises';
import process from 'node:process';
import console from 'node:console';

const expectedCase = 'language server stdio restores proven references across processes and rejects changed query inputs';

try {
  if (process.argv.length !== 3) throw new Error('Usage: verify-reference-cache-test.mjs <Vitest JSON result>');
  const report = JSON.parse(await readFile(process.argv[2], 'utf8'));
  if (report.success !== true || report.numPassedTests !== 1 || report.numFailedTests !== 0) {
    throw new Error('Reference cache regression must execute exactly one passing test with no failures.');
  }
  if (!Array.isArray(report.testResults) || report.testResults.some(file => !Array.isArray(file.assertionResults))) {
    throw new Error('Reference cache regression result is missing test assertions.');
  }
  const assertions = report.testResults.flatMap(file => file.assertionResults);
  const executed = assertions.filter(item => !['pending', 'skipped'].includes(item.status));
  if (executed.length !== 1 || executed[0].status !== 'passed' || executed[0].fullName !== expectedCase) {
    throw new Error(`Reference cache regression must pass the expected case: ${expectedCase}`);
  }
  console.log('Verified the selected cross-process reference cache regression passed.');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
