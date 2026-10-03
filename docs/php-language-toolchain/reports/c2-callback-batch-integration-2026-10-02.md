# R30/R31 回调补全集成门禁

日期：2026-10-02。源码范围为 R30 显式回调返回排序、R31 连续输入恢复及先前 Extract Variable 共享绑定增量。

## 已完成

- 当前全量语义 **633/633**，定向 stdio 四项（PHP 7.2／8.5）通过。
- 完整 Core C2 隔离宿主退出码 0：现有补全／Hover／诊断回归、R30/R31 未保存修改与 Undo/Redo 均通过。日志 `/tmp/sophp-callback-batch-full-c2.log`。
- 全仓 `pnpm lint` 退出码 0，日志 `/tmp/sophp-callback-batch-lint.log`。
- PHP 7.2／8.1／8.5 可见列表与接受文本测试均退出码 0；原有 Enter／Tab、模板和光标范围回归继续通过。样本为 7.2：230/226/226/227/230/242 ms（中位 229，最大 242）；8.1：238/232/223/230/250/227 ms（中位 231，最大 250）；8.5：247/251/230/225/249/230 ms（中位 239，最大 251）。日志 `/tmp/sophp-callback-batch-c1-ui-72.log`、`-81.log`、`-85.log`。

PHP 8.5 日志有一次已记录的 renderer `getItemsByProvider` 异常；7.2／8.1 未见该项。该异常不因测试通过而记作修复，亦不是当前回调场景的可见列表实测。

- 标准组合 C3 退出码 0：重构预览／应用／Undo/Redo、生成类型与 Symfony 操作链通过，未跳过组合步骤。日志 `/tmp/sophp-callback-batch-full-c3.log`。八项输入在 C3 终态后全部一致，记录 `/tmp/sophp-callback-batch-c3-inputs.log`。

## 完整 stdio 终态

完整 stdio 命令退出码 0：**404 通过、1 跳过，共 405，1189.25 秒**。未设置 `PHP_COMPANION_TEST_REFERENCE_BUNDLE`，唯一跳过项是跨进程引用缓存。随后指定同一冻结的 `dist/language-server.js` 补跑此项：**1 通过、404 跳过，77.05 秒**，退出码 0。两次合计覆盖 405 个独立用例，不改写成一次命令零跳过。

日志 `/tmp/sophp-callback-batch-full-stdio.log`、`/tmp/sophp-callback-batch-cache-gate.log`。原八项输入在两次终态后全部一致：`/tmp/sophp-callback-batch-final-inputs.log`。完整 Core C2、组合 C3、Lint 和三版本可见列表也已通过。

本批完成后才应用下一项候选说明修复；其新源码不借本批结果宣称再次全量集成通过。临时准备另见 [说明准备记录](c2-callback-details-preparation-2026-10-02.md)。

保持同一开发分支，未打包、提交、推送或更新 Profile；真实 WSL 与多小时实际项目使用继续单列。
