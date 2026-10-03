# R49：补全数组键时保留已有箭头

日期：2026-10-02。接续原专项的错误恢复、键建议和接受文本要求；复现与两个隔离方案见[准备记录](c2-existing-array-arrow-preparation-2026-10-02.md)。

## 已应用的修复

键的关闭引号缺失但光标后已有 `=>` 时，恢复副本插入缺失引号并按实际数组 CST 返回候选。替换结束位置限制于原光标，`hasArrow=true`，接受候选只插入键，不重复插入箭头。已尝试的完整源码恢复仍有语法错误时返回明确失败信号，阻止回落到会消费后续箭头／字符串的原错误范围。

保留 PHP 代码位置、数组创建节点、完整恢复源码合法性及 128 KiB 上限；不适用恢复的普通查询仍使用原入口，不新增配置。

## 当前实际结果

| 检查 | 结果 |
| --- | --- |
| 共享正反例 | 24 项：四上下文 × 单双引号 × 完整／缺失关闭引号共 16 项，另八项未知调用、未知／混合形状、注释、HTML、其它语法错误及非数组契约反例 |
| 全量语义 | 40 文件，1075/1075，51.55 秒，退出码 0；新 24 项检查候选、原箭头、接受语法、源码、revision 和消费快照 |
| 真实 stdio | PHP 7.2／8.5 的新两项及既有未闭合形状两项，共 4 项通过、427 项定向过滤跳过、总计 431；14.98 秒，退出码 0。精确检查标签、插入文本、范围及完整尾部 |
| 完整 Core C2 宿主 | 正式重跑退出码 0，全部 24 项、既有未保存编辑／Undo/Redo 及其它 C2 断言通过 |
| PHP 8.5 C1 可见补全 | 退出码 0；16 次目标可见列表、精确 Tab 全文和 Undo/Redo 通过，等待 112–147 ms |
| PHP 7.2 C1 可见补全 | 退出码 0；16 次目标可见列表、精确 Tab 全文和 Undo/Redo 通过，等待 113–160 ms；两版本共 32 次 |
| 性能 | 10,000 背景文件，八次预热／每场景 100 测量，共 800 查询；P95 11.56–23.04 ms，均 ≤ 150 ms，候选／范围／原消费快照保持 |
| 构建和静态检查 | 语义与语言服务器构建、bundle、宿主 TypeScript、本轮源码／测试 ESLint 均退出码 0；45 项冻结输入终态一致 |

首次完整 C2 宿主退出码 1：HTML 区域的 VS Code 聚合文本建议被当作 Core 空列表比较。保留失败日志，并在正式断言中要求 HTML 候选只能是 `Text` 或 `Snippet`，不得含 PHP 语义类别；正式观察到 381 个文本／片段、零 PHP 语义项。Core 的实际 LSP HTML 反例仍严格断言空列表，没有放宽。该修正只调整测试对聚合候选的归属要求，不改产品或编辑器默认设置。

## 复现命令与证据

```sh
pnpm --dir packages/semantic exec vitest run
pnpm --dir packages/language-server exec vitest run test/stdio.test.ts -t 'preserves existing array arrows|recovers unfinished shape keys and values'
PHP_COMPANION_TEST_C2_ONLY=1 node scripts/run-extension-test.mjs ./dist-test/runTest.js
PHP_COMPANION_TEST_CORE_ONLY=1 PHP_COMPANION_TEST_C1_ONLY=1 PHP_COMPANION_TEST_C1_COMPLETION_ONLY=1 PHP_COMPANION_TEST_C1_UI=1 PHP_COMPANION_TEST_C1_PHP_VERSION=8.5 node scripts/run-extension-test.mjs ./dist-test/runTest.js
```

另一 C1 将 PHP 版本改成 7.2，两个宿主串行。日志为 `/tmp/sophp-r49-semantic-full.log`、`/tmp/sophp-r49-stdio.log`、`/tmp/sophp-r49-c2-host.log`（初次失败）、`/tmp/sophp-r49-c2-host-final.log`（正式通过）、`/tmp/sophp-r49-c1-85-host.log`、`/tmp/sophp-r49-c1-72-host.log`。性能脚本／日志／JSON 为 `/tmp/sophp-r49-performance.*`，45 项输入清单 `/tmp/sophp-r49-inputs.sha256`；初始清单保存在 `-initial.sha256`，正式清单只因 C2 的 HTML 类别断言及其编译结果更新。

修复前的 [R48](c2-cached-array-literal-completion-2026-10-02.md)完整 429/429、零跳过已在应用 R49 前终态校验通过；不将其冒充本批当前完整 431 项结果。当前源码这里报告全量语义、定向协议和隔离宿主证据，仍需真实 WSL／其它平台／长会话各自证明。没有打包、提交、推送或更新 Profile。
