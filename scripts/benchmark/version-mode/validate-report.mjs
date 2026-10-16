import assert from 'node:assert/strict';

export const versions = ['7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5'];
export const modes = ['progressive', 'onDemand', 'experimental'];

// Preserve each mode's existing workload; this validates a report's scope,
// not the identity of the server that produced it. The runner must bind that
// identity independently before and after execution.
export function validateReport(report, expected) {
  assert(versions.includes(expected.phpVersion));
  assert(modes.includes(expected.mode));
  const experimental = expected.mode === 'experimental';
  assert.equal(report.schema, 2);
  assert.equal(report.phpVersion, expected.phpVersion);
  assert.equal(report.indexingMode, expected.mode);
  assert.equal(report.platform, expected.platform);
  assert.equal(report.runtime, expected.runtime);
  assert.equal(report.iterations, 500);
  assert.equal(report.warmupIterations, 50);
  assert.equal(report.fixtureLayout, experimental ? 'legacy' : 'psr4');
  assert.equal(report.completionNoiseFunctions, experimental ? 0 : 500);
  assert.equal(report.diagnosticsVersionMatched, true);
  assert.deepEqual(report.budgets, {
    hotCompletionP95Ms: 150, hotHoverP95Ms: 150, hotDefinitionP95Ms: 150,
    updateToDiagnosticsP95Ms: 500, cancellationMs: 100, rssEndMinusBaselineMb: 128,
  });
  for (const key of ['updateToDiagnosticsMs', 'hotCompletionMs', 'hotTypedArgumentCompletionMs',
    'hotBareArgumentCompletionMs', 'hotTypedMemberCompletionMs', 'hotHoverMs', 'hotDefinitionMs']) {
    const series = report[key];
    assert.equal(series.samples, 500, key);
    assert([series.p50, series.p95, series.maximum].every(Number.isFinite), key);
    assert(0 <= series.p50 && series.p50 <= series.p95 && series.p95 <= series.maximum, key);
    assert(series.p95 <= (key === 'updateToDiagnosticsMs' ? 500 : 150), key);
  }
  assert.equal(report.cancellationOutcome, 'cancelled');
  assert(Number.isFinite(report.cancellationMs) && report.cancellationMs >= 0 && report.cancellationMs <= 100);
  assert.equal(report.cancellationProbes.length, 2);
  assert.deepEqual(report.cancellationProbes.map(x => x.query), ['', 'Alpha']);
  for (const row of report.cancellationProbes) {
    assert(Number.isInteger(row.controlSymbols) && row.controlSymbols > 0);
    assert.equal(row.outcome, 'cancelled');
    assert(Number.isFinite(row.durationMs) && row.durationMs >= 0 && row.durationMs <= 100);
  }
  assert.equal(report.cancellationMs, Math.max(...report.cancellationProbes.map(x => x.durationMs)));
  assert.equal(report.cancellationControlSymbols, report.cancellationProbes.reduce((n, x) => n + x.controlSymbols, 0));
  assert(Number.isFinite(report.languageServerRssMb.endMinusBaseline));
  assert(report.languageServerRssMb.endMinusBaseline <= 128);
  for (const key of ['corruptCacheRecovered', 'rebuiltCacheValidated',
    'completionRecoveredAfterRestart', 'hoverRecoveredAfterRestart', 'definitionRecoveredAfterRestart',
    'unsavedReplayDiffersFromDisk']) assert.equal(report.persistentCache[key], true, key);
  assert.equal(typeof report.persistentCache.corruptionWarningObserved, 'boolean');
  if (experimental) assert.equal(report.persistentCache.corruptionWarningObserved, true);
  assert.equal(report.persistentCache.rebuiltSchema, 2);
  assert(Number.isInteger(report.persistentCache.verifiedRebuiltPayloads)
    && report.persistentCache.verifiedRebuiltPayloads > 0);
  assert.equal(report.persistentCache.referencesRecoveredAfterRestart, experimental ? null : true);
  for (const key of ['staleCompletionFailures', 'staleHoverFailures', 'staleDefinitionFailures']) {
    assert.equal(report[key], 0, key);
  }
  return {
    phpVersion: expected.phpVersion, mode: expected.mode, platform: expected.platform,
    diagnosticP95Ms: report.updateToDiagnosticsMs.p95,
    maxHotQueryP95Ms: Math.max(...['hotCompletionMs', 'hotTypedArgumentCompletionMs',
      'hotBareArgumentCompletionMs', 'hotTypedMemberCompletionMs', 'hotHoverMs',
      'hotDefinitionMs'].map(key => report[key].p95)),
    cancellationMs: report.cancellationMs,
  };
}
