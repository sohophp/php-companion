import * as assert from 'node:assert';
import * as vscode from 'vscode';

const cases = [
  { expression: "array_map('intval', ['12']);", name: 'array_map',
    page: 'function.array-map.php', summary: /Applies the callback/, typeTag: /@return array<TKey, TResult>/ },
  { expression: "strlen('abc');", name: 'strlen', page: 'function.strlen.php', summary: /string length/i },
  { expression: "strchr('abc', 'a');", name: 'strchr', page: 'function.strchr.php', summary: /Alias of strstr/ },
  { expression: 'json_encode([1]);', name: 'json_encode', page: 'function.json-encode.php', summary: /JSON representation/ },
  { expression: 'new DateTimeImmutable();', name: 'DateTimeImmutable',
    page: 'class.datetimeimmutable.php', summary: /Representation of date and time/ },
  { expression: "DateTimeImmutable::createFromFormat('Y', '2026');", name: 'createFromFormat',
    page: 'datetimeimmutable.createfromformat.php', summary: /Parses a time string/ },
  { expression: 'echo JSON_ERROR_NONE;', name: 'JSON_ERROR_NONE',
    page: 'json.constants.php#constant.json-error-none', summary: /No error has occurred/ },
  { expression: 'echo ENT_QUOTES;', name: 'ENT_QUOTES', page: 'string.constants.php#constant.ent-quotes' },
  { expression: 'new \\Random\\Randomizer();', name: 'Randomizer', path: '/random-classes.php',
    page: 'class.random-randomizer.php', summary: /high-level API/ },
  { expression: 'new \\Filter\\FilterException();', name: 'FilterException', path: '/filter-classes.php',
    page: 'class.filter-filterexception.php', summary: /base class for Exceptions/ },
  { expression: 'RoundingMode::HalfEven;', name: 'RoundingMode',
    page: 'enum.roundingmode.php', summary: /specify how rounding should be performed/ },
];

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension('sohophp.php-companion');
  assert.ok(extension, 'SoPHP extension was not discovered');
  await extension.activate();
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'Fixture workspace was not opened');

  const uri = vscode.Uri.joinPath(folder.uri, 'SoPhpBuiltinDocumentation.php');
  const program = '<?php\n' + cases.map((item) => item.expression).join('\n');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(program));
  try {
    const source = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(source);
    const linksByUri = new Map<string, vscode.DocumentLink[]>();
    let previousEnd = '<?php\n'.length;
    for (const { expression, name, path = '/common-core.php', page, summary, typeTag } of cases) {
      const position = source.positionAt(previousEnd + expression.indexOf(name) + 2);
      previousEnd += expression.length + 1;
      let definition: vscode.Location | vscode.LocationLink | undefined;
      const deadline = Date.now() + 15_000;
      while (!definition && Date.now() < deadline) {
        const definitions = await vscode.commands.executeCommand<Array<vscode.Location | vscode.LocationLink>>(
          'vscode.executeDefinitionProvider', uri, position,
        );
        definition = definitions?.find((item) => ('targetUri' in item ? item.targetUri : item.uri).scheme === 'php-companion-builtin');
        if (!definition) await new Promise((resume) => setTimeout(resume, 100));
      }
      assert.ok(definition, `${name} did not navigate to a built-in definition`);
      const targetUri = 'targetUri' in definition ? definition.targetUri : definition.uri;
      const targetRange = 'targetUri' in definition ? definition.targetSelectionRange ?? definition.targetRange : definition.range;
      assert.strictEqual(targetUri.path, path, name);

      const builtin = await vscode.workspace.openTextDocument(targetUri);
      assert.strictEqual(builtin.getText(targetRange), name, `${name} navigation range`);
      const targetOffset = builtin.offsetAt(targetRange.start);
      const docStart = builtin.getText().lastIndexOf('/**', targetOffset);
      const url = `https://www.php.net/manual/en/${page}`;
      const documentation = builtin.getText().slice(docStart, targetOffset);
      if (summary) assert.match(documentation, summary, name);
      if (typeTag) assert.match(documentation, typeTag, name);
      assert.ok(documentation.includes(`@see ${url}`), name);
      const key = targetUri.toString();
      if (!linksByUri.has(key)) {
        const links = await vscode.commands.executeCommand<vscode.DocumentLink[]>('vscode.executeLinkProvider', targetUri);
        linksByUri.set(key, links ?? []);
      }
      assert.ok(linksByUri.get(key)?.some((link) => link.target?.toString() === url && builtin.getText(link.range) === url
        && builtin.offsetAt(link.range.start) >= docStart && builtin.offsetAt(link.range.end) <= targetOffset),
      `${name} manual link was missing next to the selected declaration`);
    }
  } finally {
    await vscode.workspace.fs.delete(uri);
  }
}
