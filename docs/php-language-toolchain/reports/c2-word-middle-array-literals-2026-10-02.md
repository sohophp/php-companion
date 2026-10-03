# R50：数组键／值的词中补全

日期：2026-10-02。对应原补全专项的词中光标、未闭合输入与接受文本要求。

## 缺口与应用

原始 32 对照中，关闭引号完整的 16 项正确；关闭引号缺失的 16 项出现值候选缺席或键范围侵入箭头。四种上下文为函数实参、返回、赋值和方法实参，每种含键／值及单双引号。原始日志 `/tmp/sophp-word-middle-shape-probe.log` 保留 16/32 摘要和全部 16 项失败；基线 JSON 从该原始日志提取，修复探测 JSON 单独保存。

恢复副本现在识别光标右侧同一段字面量的有界后缀，在后缀末尾插入缺失引号，并仍以原光标查询。候选范围映回原源码的后缀末尾，因而接受时只保留一次完整词；箭头、关闭括号和后续语句不变。空后缀沿用 R47／R49 行为；已有实际关闭引号的普通词中查询保留原路径。

保持 128 KiB 源码、4096 后缀扫描、完整修复 CST、PHP 区域和数组创建节点条件；其它语法错误使已尝试恢复失败，不回退到错误范围。没有全局放宽 `quotedCompletion`，不新增用户设置。

## 当前验证

- 修复探测：原始同输入 32/32 正确。
- 新共享 fixture 40 项：32 项完整／缺失引号的键／值正例，八项未知调用／形状、混合形状、注释、HTML、其它语法错误和非数组契约反例。
- 定向语义三文件 88/88，2.29 秒；新 40 项核对完整词替换、接受后语法、原箭头／尾部和源码／revision／快照保持。
- 本轮完整语义 41 文件、1115/1115，52.92 秒，退出码 0。其后仅按 ESLint 去掉正则中的冗余 `\[` 转义；等价字符类别的最终源码继续由下列协议及宿主验证，没有为了该样式清理再跑完整语义。
- 最终源码真实 stdio：PHP 7.2／8.5，每版共同核对 R49 的 24 项和新增 40 项；另保留既有未闭合形状测试。四项通过、427 定向过滤跳过、总计 431，17.71 秒，退出码 0。严格检查候选、插入文本、替换范围及原箭头／完整尾部。
- 完整 Core C2 宿主退出码 0，64 项目标正反例及其它 C2 断言通过；两项 HTML 反例的聚合候选仅允许普通 Text／Snippet，Core 实际 LSP 仍严格为空。
- PHP 8.5／7.2 C1 可见宿主均退出码 0：每版 48 次目标检查（R49 箭头 16 项＋新词中 32 项），合计 96 次，实际可见列表、精确 Tab 全文和 Undo/Redo 通过；目标等待分别 113–173 ms 和 113–164 ms。
- 性能：10,000 背景文件，每场景八次预热、一百次测量，16 个未闭合词中状态共 1600 查询；P95 11.14–44.44 ms，均满足 150 ms，候选、范围和消费快照保持。这是语义查询时间，不是弹窗等待。
- 语义／语言服务器构建、bundle、宿主 TypeScript 及最终 ESLint 退出码 0；48 项冻结输入终态一致（`/tmp/sophp-r50-final-inputs.log`）。

## 复现入口

```sh
pnpm --dir packages/semantic exec vitest run
pnpm --dir packages/language-server exec vitest run test/stdio.test.ts -t 'preserves existing array arrows|recovers unfinished shape keys and values'
PHP_COMPANION_TEST_C2_ONLY=1 node scripts/run-extension-test.mjs ./dist-test/runTest.js
```

C1 使用前轮相同 Core-only、Completion-only、UI 环境，分别指定 PHP 8.5／7.2 并串行运行。日志为 `/tmp/sophp-r50-semantic-target.log`、`/tmp/sophp-r50-semantic-full.log`、`/tmp/sophp-r50-stdio.log`、`/tmp/sophp-r50-c2-host.log`、`/tmp/sophp-r50-c1-85-host.log`、`/tmp/sophp-r50-c1-72-host.log`。性能脚本／日志／JSON 为 `/tmp/sophp-r50-performance.*`；输入清单 `/tmp/sophp-r50-inputs.sha256`。

修复前 R48 完整 429/429 是其自身冻结状态的证据，本批未重跑完整 431 项协议。隔离 Linux UI 不替代真实 WSL、其它平台或长会话。未打包、提交、推送或更新 Profile。
