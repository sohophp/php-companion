# VS Code issue draft: Redo does not restore a file created by an extension WorkspaceEdit

Local draft, not submitted. Reproduced in isolated VS Code 1.138.0 and 1.139.0 Linux x64 Extension Hosts using an independent temporary Composer workspace; no user workspace was changed.

## Reproduction

An extension command applies one resource edit:

```ts
const edit = new vscode.WorkspaceEdit();
edit.createFile(uri, { overwrite: false, contents: Buffer.from('<?php\nclass Example {}\n') });
await vscode.workspace.applyEdit(edit);
await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri), { preview: false });
```

Run the standard `undo` command once, then `redo` once. Observe the created file after each command.

## Expected and actual

Expected: Undo removes the newly created file; Redo restores the same file and contents. Actual: Undo removes it, but Redo leaves it missing. In both tested versions, two additional Redo attempts also leave it missing. Invoking Redo with the URI, focusing the Explorer first, and injecting Ctrl+Shift+Z or Ctrl+Y in the isolated Linux host did not restore the file. A single edit that creates an empty file and inserts content produces the same result. The minimal file edit itself reports successful application.

Logs: `/tmp/sophp-c3-resource-probe-20260924.log`, `/tmp/sophp-c3-redo-vscode-1.138.0-20260925.log`, `/tmp/sophp-c3-multi-redo-20260925.log`, `/tmp/sophp-c3-explorer-first-probe.log`, `/tmp/sophp-c3-create-insert-redo-20260925.log`.

## Source route to inspect

In 1.139.0, `ExtHostBulkEdits.applyWorkspaceEdit` passes no group ID, `MainThreadBulkEdits` passes no `undoRedoSource`, and `BulkEditService` forwards that empty source to `BulkFileEdits`. The file undo element implements both `undo()` and `redo()`. The Explorer command implementation only handles its own `UNDO_REDO_SOURCE` while the Explorer has focus. Please clarify which public command route should redo a resource edit created through `vscode.workspace.applyEdit` after Undo deletes and closes the new file's editor, or whether this is an editor issue.

- [ExtHostBulkEdits](https://github.com/microsoft/vscode/blob/1.139.0/src/vs/workbench/api/common/extHostBulkEdits.ts)
- [MainThreadBulkEdits](https://github.com/microsoft/vscode/blob/1.139.0/src/vs/workbench/api/browser/mainThreadBulkEdits.ts)
- [BulkEditService](https://github.com/microsoft/vscode/blob/1.139.0/src/vs/workbench/contrib/bulkEdit/browser/bulkEditService.ts)
- [BulkFileEdits](https://github.com/microsoft/vscode/blob/1.139.0/src/vs/workbench/contrib/bulkEdit/browser/bulkFileEdits.ts)
- [Explorer Undo/Redo commands](https://github.com/microsoft/vscode/blob/1.139.0/src/vs/workbench/contrib/files/browser/files.contribution.ts)

This issue matters for an extension that previews and creates a PHP class file: it can validate preview, creation and Undo, but cannot offer the user a reliable standard Redo for that operation in the tested hosts. The evidence above is isolated automation, so real keyboard interaction and other platforms should be checked independently.
