import assert from 'node:assert/strict';
import * as vscode from 'vscode';

interface FormatterCliMarkers {
  called?: vscode.Uri;
  pending?: vscode.Uri;
  release?: vscode.Uri;
  completed?: vscode.Uri;
}

export async function installFormatterCliFixture(
  folder: vscode.WorkspaceFolder,
  name: string,
  markers: FormatterCliMarkers = {},
): Promise<void> {
  const php = process.env.PHP_COMPANION_PHP_EXECUTABLE; assert.ok(php);
  const cli = process.env.PHP_COMPANION_TEST_FORMATTER_CLI; assert.ok(cli);
  const quote = (value: string): string => `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
  const lines = ['<?php'];
  if (markers.called) lines.push(`file_put_contents(${quote(markers.called.fsPath)}, "called\\n", FILE_APPEND);`);
  if (markers.pending || markers.release || markers.completed) {
    assert.ok(markers.pending && markers.release && markers.completed, 'Deferred CLI needs all three markers');
    lines.push(`file_put_contents(${quote(markers.pending.fsPath)}, "pending\\n");`,
      `for ($sophpWaitCount = 0; $sophpWaitCount < 1500; ++$sophpWaitCount) {`,
      `    clearstatcache(true, ${quote(markers.release.fsPath)});`,
      `    if (is_file(${quote(markers.release.fsPath)})) { break; }`,
      '    usleep(20000);', ' }',
      `clearstatcache(true, ${quote(markers.release.fsPath)});`,
      `if (!is_file(${quote(markers.release.fsPath)})) { exit(76); }`);
  }
  lines.push('$sophpCommand = [PHP_BINARY];',
    '$sophpIni = php_ini_loaded_file();',
    'if ($sophpIni !== false) { $sophpCommand[] = "-c"; $sophpCommand[] = $sophpIni; }',
    `$sophpCommand[] = ${quote(cli)};`,
    '$sophpCommand = array_merge($sophpCommand, array_slice($argv, 1));',
    '$sophpProcess = proc_open($sophpCommand, [STDIN, STDOUT, STDERR], $sophpPipes, null, null, ["bypass_shell" => true]);',
    'if (!is_resource($sophpProcess)) { exit(77); }',
    '$sophpExit = proc_close($sophpProcess);');
  if (markers.completed) lines.push(`file_put_contents(${quote(markers.completed.fsPath)}, (string) $sophpExit . "\\n");`);
  lines.push('exit($sophpExit);', '');
  // A PHP launcher exercises the formatter's existing .phar runtime-selection branch.
  // It invokes the pinned Composer CLI and is not a packaged PHAR distribution.
  const launcher = vscode.Uri.joinPath(folder.uri, `${name} fixer.phar`);
  await vscode.workspace.fs.writeFile(launcher, Buffer.from(lines.join('\n')));
  await vscode.workspace.getConfiguration('php', folder.uri).update('validate.executablePath', php,
    vscode.ConfigurationTarget.WorkspaceFolder);
  const settings = vscode.workspace.getConfiguration('php-cs-fixer', folder.uri);
  await settings.update('executablePath', launcher.fsPath, vscode.ConfigurationTarget.WorkspaceFolder);
  await settings.update('executablePathWindows', launcher.fsPath, vscode.ConfigurationTarget.WorkspaceFolder);
}
