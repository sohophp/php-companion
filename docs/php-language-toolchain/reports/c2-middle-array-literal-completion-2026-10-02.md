# R47：文件中间未闭合数组创建的键和值

日期：2026-10-02。接续原补全专项的错误恢复与数组形状范围。

## 原始缺口与修复

R46 固定的实参、返回、赋值、方法四种上下文各有键／值两个状态：EOF 候选正确，但添加已有的 `]` 和后续语句后，八项候选全部为空。基线和修复后的同输入结果保存在同名 JSON。

语义层复用 R42 的私有恢复副本，仅对有语法错误、光标后紧接现有关闭分隔符的未闭合字符串尝试插入缺失引号。完整源码修复后必须无剩余语法错误，且光标在数组创建 CST 内；原消费源码及其快照不被修复副本改写。候选替换范围限制到原光标，保留实际关闭括号与后续语句。未知类型、混合未知数组、注释／HTML 和其它语法错误的负例仍为空；沿用 128 KiB 恢复上限。

## 本轮实际验证

- 新语义 24 项：16 项正例覆盖四种上下文、键／值及单双引号，各运行 mode→other→mode 的未保存契约变化；八项负例分别核对键和值。检查候选、替换范围、接受后的完整语法、源码／revision／快照保持。
- 当前完整语义：39 文件、1051/1051，52.68 秒，退出码 0。
- 真实 stdio：PHP 7.2／8.5 的两个既有测试均通过，每版加入 24 项中间状态，检查精确候选、插入文本及尾部保留。总集合 429，定向过滤跳过 427；不是本次完整 429 项结果。耗时 8.53 秒，退出码 0。
- 完整 Core C2 隔离宿主退出码 0：原 EOF 与新增中间状态共 16 组合，精确候选、未保存契约变化、Undo/Redo 和源码保持均通过；其它 C2 断言保留。
- PHP 8.5 的 C1 可见补全宿主退出码 0：EOF 与中间状态共 32 次实际弹窗测量，精确 Tab 接受全文、真实尾部保留及 Undo/Redo 通过，等待 111–173 ms。
- PHP 7.2 的 C1 可见补全宿主退出码 0：同样 32 次实际弹窗、精确 Tab 全文及 Undo/Redo 通过，等待 111–158 ms；两版合计 64 次。
- 10,000 背景文件，每类八次预热、一百次测量，共 800 查询；八项 P95 为 18.51–45.54 ms，均满足 150 ms。候选和原文快照保持。该时间是语义查询，不是可见弹窗等待。
- 语言服务器构建、语义与宿主类型检查及本轮源码／测试 ESLint 退出码 0；42 项冻结输入终态核对通过。

## 命令与证据

```sh
pnpm --dir packages/semantic exec vitest run
pnpm --fail-if-no-match --filter @php-companion/language-server build
node esbuild.mjs --production
pnpm exec tsc -p test/extension/tsconfig.json
pnpm --dir packages/language-server exec vitest run test/stdio.test.ts -t 'recovers unfinished shape keys and values'
PHP_COMPANION_TEST_C2_ONLY=1 node scripts/run-extension-test.mjs ./dist-test/runTest.js
PHP_COMPANION_TEST_CORE_ONLY=1 PHP_COMPANION_TEST_C1_ONLY=1 PHP_COMPANION_TEST_C1_COMPLETION_ONLY=1 PHP_COMPANION_TEST_C1_UI=1 PHP_COMPANION_TEST_C1_PHP_VERSION=8.5 node scripts/run-extension-test.mjs ./dist-test/runTest.js
```

另一 C1 将末尾 PHP 版本改成 7.2；宿主串行执行。原始日志为 `/tmp/sophp-r47-semantic-full.log`、`/tmp/sophp-r47-stdio.log`、`/tmp/sophp-r47-c2-host.log`、`/tmp/sophp-r47-c1-85-host.log`、`/tmp/sophp-r47-c1-72-host.log`。性能脚本及结果为 `/tmp/sophp-r47-performance.mjs`、`.log`、`.json`；输入校验为 `/tmp/sophp-r47-inputs.sha256` 和 `/tmp/sophp-r47-final-inputs.log`。

完整 stdio 429/429 零跳过是修复前 R44 的历史证据，本批明确只报告当前定向结果。上述隔离 UI 不能替代真实 WSL、其它平台或长会话。没有打包、提交、推送或更新 Profile。
