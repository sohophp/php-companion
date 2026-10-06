import { captureReferenceInputSnapshot } from './referenceInputSnapshot.js';

export interface ReferenceEngineInputs {
  buildId: string | undefined;
  serverPath: string;
  workerPath: string;
  builtinWorkerPath: string;
  coreWasmPath: string;
  phpWasmPath: string;
  runtime: string;
}

/** Undefined means the executing engine has no complete reusable identity. */
export async function captureReferenceEngineIdentity(inputs: ReferenceEngineInputs): Promise<string | undefined> {
  if (!inputs.buildId || !/^[a-f0-9]{64}$/.test(inputs.buildId)) return undefined;
  const paths = [inputs.serverPath, inputs.workerPath, inputs.builtinWorkerPath, inputs.coreWasmPath, inputs.phpWasmPath];
  if (new Set(paths).size !== paths.length) return undefined;
  const snapshot = await captureReferenceInputSnapshot({ sourceRoots: [], additionalFiles: paths,
    context: JSON.stringify({ schema: 2, buildId: inputs.buildId, runtime: inputs.runtime, paths }),
    maxFiles: 5, maxFileBytes: 16 * 1024 * 1024, maxTotalBytes: 32 * 1024 * 1024,
  });
  return snapshot?.files.length === paths.length && snapshot.missingPaths.length === 0 ? snapshot.fingerprint : undefined;
}
