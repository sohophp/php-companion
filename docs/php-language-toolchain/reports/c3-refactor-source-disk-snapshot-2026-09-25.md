# C3 重构动作的源文件磁盘快照

日期：2026-09-25。SoPHP 的 Extract、Inline 和部分 Rewrite Code Action 在 Language Client 中改为预览命令。此前命令只在执行时读取源文件磁盘摘要；动作生成后若外部程序改写源文件，而编辑器版本仍未变化，这个新摘要会被误当成旧编辑计划的基线。

现在预览命令在转换 Code Action 时记录源文件 SHA-256。执行时先复核这个摘要，再展示差异；不一致时拒绝旧动作，保留外部写入。目标文件的原有摘要和预览后复核继续生效。读取源文件只发生在存在需转换的预览重构动作时，不增加普通补全或无重构 Code Action 的文件读取。

隔离 VS Code 1.139.0 Linux x64 C3 源码宿主检查了 Inline Variable 动作携带的摘要，以及旧摘要执行后的结果：没有打开预览、没有写入编辑器，外部磁盘内容保留。独立 Core/Symfony 宿主与完整 11 项 Open Source Pack 源码宿主均退出码 0；根扩展与测试 TypeScript 检查、相关 ESLint 和差异检查通过。日志：`/tmp/sophp-c3-source-disk-snapshot-final-20260925.log`、`/tmp/sophp-c3-source-disk-pack-20260925.log`。这不是 WSL Remote、真实键盘操作或已安装 0.4.5 VSIX 的验收。

同日继续把源文件磁盘快照提前到 Add、Remove、Reorder Method Parameter 命令发请求之前。完整 Pack 源码宿主在 Add Parameter 服务端计划返回后，由测试钩子改写源文件磁盘内容：旧计划未打开预览，未修改编辑器，也未覆盖外部写入；随后恢复源文件，正常 Add/Remove/Reorder 仍通过。TypeScript、ESLint 和差异检查通过，宿主退出码 0；日志：`/tmp/sophp-c3-parameter-disk-after-plan-20260925.log`。这项可控负例直接覆盖 Add Parameter；Remove/Reorder 此次只有正常路径组合回归。

类型生成文件的 Undo 后一次 Redo 仍未恢复，继续按独立 C3 缺口处理。
