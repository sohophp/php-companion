export interface DocumentSnapshot {
  uri: string;
  version: number | null;
  length: number;
  textHash?: string;
}

export interface PlannedTextEdit {
  uri: string;
  start: number;
  end: number;
  newText: string;
  expectedVersion: number | null;
  expectedLength: number;
  expectedTextHash?: string;
}

export type PlannedFileOperation =
  | { kind: 'create'; uri: string; overwrite?: boolean }
  | { kind: 'rename'; oldUri: string; newUri: string; overwrite?: boolean }
  | { kind: 'delete'; uri: string; recursive?: boolean };

export interface EditPlan {
  schema: 1;
  label: string;
  textEdits: PlannedTextEdit[];
  fileOperations: PlannedFileOperation[];
}

export interface EditPlanIssue { code: 'missing-snapshot' | 'invalid-range' | 'overlapping-edits' | 'file-operation-conflict' | 'stale-version' | 'stale-content'; uri: string; message: string; }
export class EditPlanError extends Error { constructor(readonly issues: EditPlanIssue[]) { super(issues.map((item) => item.message).join('\n')); this.name = 'EditPlanError'; } }

const PHP_RESERVED_NAMES = new Set([
  'abstract', 'and', 'array', 'as', 'break', 'callable', 'case', 'catch', 'class', 'clone', 'const', 'continue',
  'declare', 'default', 'die', 'do', 'echo', 'else', 'elseif', 'empty', 'enddeclare', 'endfor', 'endforeach',
  'endif', 'endswitch', 'endwhile', 'enum', 'eval', 'exit', 'extends', 'final', 'finally', 'fn', 'for', 'foreach',
  'function', 'global', 'goto', 'if', 'implements', 'include', 'include_once', 'instanceof', 'insteadof', 'interface',
  'isset', 'list', 'match', 'namespace', 'new', 'or', 'print', 'private', 'protected', 'public', 'readonly', 'require',
  'require_once', 'return', 'static', 'switch', 'throw', 'trait', 'try', 'unset', 'use', 'var', 'while', 'xor', 'yield',
  'bool', 'false', 'float', 'int', 'iterable', 'mixed', 'never', 'null', 'object', 'parent', 'resource', 'self', 'string', 'true', 'void',
]);

export function isValidPhpIdentifier(name: string): boolean {
  return /^[A-Za-z_\u0080-\u{10ffff}][A-Za-z0-9_\u0080-\u{10ffff}]*$/u.test(name) && !PHP_RESERVED_NAMES.has(name.toLowerCase());
}

export function createEditPlan(label: string, snapshots: readonly DocumentSnapshot[], edits: readonly Omit<PlannedTextEdit, 'expectedVersion' | 'expectedLength' | 'expectedTextHash'>[], fileOperations: readonly PlannedFileOperation[] = []): EditPlan {
  const byUri = new Map(snapshots.map((snapshot) => [snapshot.uri, snapshot])); const issues: EditPlanIssue[] = [];
  const textEdits = edits.map((edit): PlannedTextEdit => {
    const snapshot = byUri.get(edit.uri);
    if (!snapshot) issues.push({ code: 'missing-snapshot', uri: edit.uri, message: `No snapshot was supplied for ${edit.uri}.` });
    else if (!Number.isInteger(edit.start) || !Number.isInteger(edit.end) || edit.start < 0 || edit.end < edit.start || edit.end > snapshot.length) {
      issues.push({ code: 'invalid-range', uri: edit.uri, message: `Edit range ${edit.start}:${edit.end} is outside ${edit.uri}.` });
    }
    return { ...edit, expectedVersion: snapshot?.version ?? null, expectedLength: snapshot?.length ?? 0, expectedTextHash: snapshot?.textHash };
  });
  for (const uri of new Set(textEdits.map((edit) => edit.uri))) {
    const ordered = textEdits.filter((edit) => edit.uri === uri).sort((left, right) => left.start - right.start || left.end - right.end);
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1]!; const current = ordered[index]!;
      if (current.start < previous.end || (current.start === previous.start && current.end === previous.end)) {
        issues.push({ code: 'overlapping-edits', uri, message: `Text edits overlap in ${uri}.` }); break;
      }
    }
  }
  const touched = new Set<string>();
  for (const operation of fileOperations) {
    const uris = operation.kind === 'rename' ? [operation.oldUri, operation.newUri] : [operation.uri];
    for (const uri of uris) {
      if (touched.has(uri)) issues.push({ code: 'file-operation-conflict', uri, message: `Multiple file operations target ${uri}.` });
      touched.add(uri);
    }
    if (operation.kind === 'rename' && operation.oldUri === operation.newUri) issues.push({ code: 'file-operation-conflict', uri: operation.oldUri, message: 'A rename must change the URI.' });
  }
  if (issues.length) throw new EditPlanError(issues);
  return { schema: 1, label, textEdits: textEdits.sort((left, right) => left.uri.localeCompare(right.uri) || right.start - left.start), fileOperations: [...fileOperations] };
}

export function validateEditPlan(plan: EditPlan, currentSnapshots: readonly DocumentSnapshot[]): EditPlanIssue[] {
  const current = new Map(currentSnapshots.map((snapshot) => [snapshot.uri, snapshot])); const issues: EditPlanIssue[] = [];
  for (const edit of plan.textEdits) {
    const snapshot = current.get(edit.uri);
    if (!snapshot) { issues.push({ code: 'missing-snapshot', uri: edit.uri, message: `Current snapshot is missing for ${edit.uri}.` }); continue; }
    if (edit.expectedVersion !== null && snapshot.version !== edit.expectedVersion) issues.push({ code: 'stale-version', uri: edit.uri, message: `${edit.uri} changed from version ${edit.expectedVersion} to ${snapshot.version}.` });
    else if (snapshot.length !== edit.expectedLength || (edit.expectedTextHash !== undefined && snapshot.textHash !== edit.expectedTextHash)) issues.push({ code: 'stale-content', uri: edit.uri, message: `${edit.uri} content changed after the edit plan was created.` });
  }
  return [...new Map(issues.map((issue) => [`${issue.code}:${issue.uri}`, issue])).values()];
}
