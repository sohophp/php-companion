import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  await vscode.extensions.getExtension('sohophp.php-companion')?.activate();
  const traces: Array<Record<string, unknown>> = [];
  const position = (source: string, name: string): vscode.Position => {
    const lines = source.slice(0, source.indexOf(`class ${name}`) + 'class '.length + 3).split('\n');
    return new vscode.Position(lines.length - 1, lines.at(-1)!.length);
  };
  const create = async (name: string): Promise<{ uri: vscode.Uri; source: string }> => {
    const uri = vscode.Uri.joinPath(folder.uri, 'src', `${name}.php`);
    const source = `<?php\nnamespace App;\nfinal class ${name} {}\n`;
    await vscode.workspace.fs.writeFile(uri, Buffer.from(source)); return { uri, source };
  };
  for (const scenario of ['cold', 'afterRejectedRename']) {
    if (scenario === 'afterRejectedRename') {
      const target = await create('DiskGuardTarget');
      const consumer = vscode.Uri.joinPath(folder.uri, 'src', 'DiskGuardConsumer.php');
      const original = '<?php namespace App; class DiskGuardConsumer { public function run(DiskGuardTarget $item): void {} } // before';
      await vscode.workspace.fs.writeFile(consumer, Buffer.from(original));
      const document = await vscode.workspace.openTextDocument(target.uri); await vscode.window.showTextDocument(document);
      const readiness: Array<{ count: number; consumerPresent: boolean }> = [];
      for (let attempt = 0; attempt < 100; attempt++) {
        const references = await vscode.commands.executeCommand<vscode.Location[]>(
          'vscode.executeReferenceProvider', target.uri, position(target.source, 'DiskGuardTarget')) ?? [];
        const consumerPresent = references.some(item => item.uri.toString() === consumer.toString());
        readiness.push({ count: references.length, consumerPresent });
        if (consumerPresent) break;
        await new Promise(done => setTimeout(done, 50));
      }
      console.log(`Grouped references guard readiness: ${JSON.stringify(readiness)}`);
      assert.ok(readiness.at(-1)?.consumerPresent, 'Disk-change consumer must be indexed before the preview race');
      let previewOpened = false;
      const applied = await vscode.commands.executeCommand<boolean>('phpCompanion.safeRename', {
        uri: target.uri, position: position(target.source, 'DiskGuardTarget'), newName: 'DiskGuardRenamed',
        testPreviewAction: async () => {
          previewOpened = true;
          assert.ok(!vscode.workspace.textDocuments.some(item => item.uri.toString() === consumer.toString()));
          await writeFile(consumer.fsPath, original.replace('// before', '// externally changed')); return 'apply';
        },
      });
      assert.ok(previewOpened, 'Disk-change guard must reach the preview');
      assert.equal(applied, false); assert.equal(await readFile(target.uri.fsPath, 'utf8'), target.source);
      assert.equal(await readFile(consumer.fsPath, 'utf8'), original.replace('// before', '// externally changed'));
      await assert.rejects(async () => await vscode.workspace.fs.stat(vscode.Uri.joinPath(folder.uri, 'src', 'DiskGuardRenamed.php')));
    }
    const name = scenario === 'cold' ? 'ColdGroupedTarget' : 'GuardedGroupedTarget';
    const target = await create(name);
    const consumers: vscode.Uri[] = Array.from({ length: 21 }, (_, index): vscode.Uri =>
      vscode.Uri.joinPath(folder.uri, 'src', `${name}Consumer${index}.php`));
    for (const [index, uri] of consumers.entries()) await vscode.workspace.fs.writeFile(uri,
      Buffer.from(`<?php\nnamespace App\\Consumer;\nuse App\\${name};\nclass Consumer${index} { public function run(${name} $item): void {} }\n`));
    const document = await vscode.workspace.openTextDocument(target.uri); await vscode.window.showTextDocument(document);
    const query = async (): Promise<vscode.Location[]> => await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeReferenceProvider', target.uri, position(target.source, name)) ?? [];
    const missing = (references: vscode.Location[]): string[] => consumers.filter(uri =>
      !references.some(item => item.uri.toString() === uri.toString())).map(uri => uri.toString());
    let references: vscode.Location[] = []; const attempts: Array<{ count: number; missing: string[] }> = [];
    for (let attempt = 0; attempt < 100; attempt++) {
      references = await query(); attempts.push({ count: references.length, missing: missing(references) });
      if (!missing(references).length) break;
      await new Promise(done => setTimeout(done, 50));
    }
    const warmQueries: Array<{ count: number; missing: string[] }> = [];
    for (let index = 0; index < 3; index++) {
      references = await query(); warmQueries.push({ count: references.length, missing: missing(references) });
    }
    const trace = { scenario, attempts, warmQueries, actual: references.map(item => ({ uri: item.uri.toString(), range: item.range })) };
    traces.push(trace); console.log(`Grouped references trace: ${JSON.stringify(trace)}`);
    assert.ok(attempts.some(item => !item.missing.length), 'Initial grouped query never included every consumer');
    assert.ok(warmQueries.every(item => !item.missing.length), 'Grouped references regressed after the first complete result');
    for (const uri of consumers) assert.equal(references.filter(item => item.uri.toString() === uri.toString()).length, 2,
      'Each consumer must include its import and parameter references');
  }
  console.log(`Grouped references proof: ${JSON.stringify({ platform: process.platform, node: process.version, traces })}`);
}
