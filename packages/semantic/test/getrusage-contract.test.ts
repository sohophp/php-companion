import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { auditedGetrusageStub, normalizeGetrusageRuntimeFacts } from '../../language-spec/src/getrusage.js';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const timingKeys = ['ru_stime.tv_sec', 'ru_stime.tv_usec', 'ru_utime.tv_sec', 'ru_utime.tv_usec'];
const linuxKeys = ['ru_oublock', 'ru_inblock', 'ru_msgsnd', 'ru_msgrcv', 'ru_maxrss', 'ru_ixrss',
  'ru_idrss', 'ru_minflt', 'ru_majflt', 'ru_nsignals', 'ru_nvcsw', 'ru_nivcsw', 'ru_nswap', ...timingKeys];
const windowsKeys = [...timingKeys, 'ru_majflt', 'ru_maxrss'];

it.each(['7.2', '8.5'] as const)('uses measured getrusage fields and withdraws old platform keys at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///RusageConsumer.php';
  try {
    for (const keys of [linuxKeys, windowsKeys, undefined]) {
      workspace.update('file:///RuntimeBuiltins.php', `<?php ${auditedGetrusageStub(version,
        keys ? { selfKeys: keys, childrenKeys: keys } : undefined)}`);
      for (const mode of ['', '1', '$mode']) {
        const expression = `getrusage(${mode})`;
        const source = `<?php function read(int $mode): void { $usage = ${expression}; }`;
        workspace.update(uri, source, true); const start = source.indexOf(expression);
        expect(workspace.provenExpressionType(uri, start, start + expression.length)).toContain('false');
        for (const guard of ['', 'if ($usage === false) return;']) {
          const marked = `<?php function read(int $mode): void { $usage = ${expression}; ${guard} $usage['ru_§']; }`;
          workspace.update(uri, marked.replace('§', ''), true);
          expect((workspace.completeArrayAccessKeys(uri, marked.indexOf('§'))?.keys.map(item => item.name) ?? []).sort())
            .toEqual(guard && keys ? [...keys].sort() : []);
        }
      }
    }
  } finally { workspace.dispose(); }
}, 15_000);

it.each(['7.2', '8.5'] as const)('distinguishes measured children fields and unknown mode at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///RusageChildren.php';
  try {
    workspace.update('file:///RuntimeBuiltins.php', `<?php ${auditedGetrusageStub(version,
      { selfKeys: windowsKeys, childrenKeys: timingKeys })}`);
    for (const [mode, expected] of [['', windowsKeys], ['1', timingKeys], ['$mode', timingKeys]] as const) {
      const marked = `<?php function read(int $mode): void { $usage = getrusage(${mode}); if ($usage === false) return; $usage['ru_§']; }`;
      workspace.update(uri, marked.replace('§', ''), true);
      expect((workspace.completeArrayAccessKeys(uri, marked.indexOf('§'))?.keys.map(item => item.name) ?? []).sort())
        .toEqual([...expected].sort());
    }
  } finally { workspace.dispose(); }
}, 15_000);

it('rejects unsafe or incomplete field facts and canonicalizes measured fields', () => {
  expect(normalizeGetrusageRuntimeFacts({ selfKeys: windowsKeys, childrenKeys: timingKeys }))
    .toEqual({ selfKeys: [...windowsKeys].sort(), childrenKeys: [...timingKeys].sort() });
  for (const bad of [undefined, [], {}, { selfKeys: ['ru_maxrss'], childrenKeys: timingKeys },
    { selfKeys: [...timingKeys, timingKeys[0]], childrenKeys: timingKeys },
    { selfKeys: [...timingKeys, "bad':mixed} */"], childrenKeys: timingKeys }]) {
    expect(normalizeGetrusageRuntimeFacts(bad)).toBeUndefined();
  }
});
