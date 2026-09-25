# C2 嵌套实参的调用反馈

日期：2026-09-25。使用 SoPHP 仓库中的独立 PHP 夹具；未修改业务项目，也未打包 VSIX。

`dispatch(array('x'))` 缺少必需的 `$mode` 时，原先的缺参诊断返回空结果。原因是语义分析在外层调用的末尾查询签名，该位置已越过内层 `array(...)` 的括号，无法可靠识别外层调用。参数重构和 Rename 已改用的调用起始定位也适用于用户输入反馈。

现在缺少必需参数、未知命名参数和位置实参的参数名提示共用 `signatureForParsedCall`：先在外层调用左括号后查询；只有不能唯一确定时，才回退到第一个实参起点。原有参数新增、删除、重排与 Rename 也沿用同一帮助函数。新用例覆盖缺少 `$mode`、未知 `extra:`，以及两个位置实参的 `$payload:` / `$mode:` 提示；默认按需模式使用的 `localOnly` 缺参和未知命名参数路径也返回相同正例。缺参用例修复前先红，修复后语义包 363/363 通过。语义包 typecheck、改动文件 ESLint 和差异检查通过。

随后加入独立的真实 stdio LSP 往返：以 PHP 8.5、默认 `onDemand` 打开同一文件，版本 1 发布 `php.argument.missing-required` 和 `php.argument.unknown-named`，位置分别落在外层 `dispatch` 与 `extra:`；`textDocument/inlayHint` 返回 `$payload:` 和 `$mode:`。将调用修正为版本 2 后，两类诊断消失。`pnpm --dir packages/language-server exec vitest run test/stdio.test.ts -t 'publishes outer-call diagnostics and parameter hints for legacy array arguments'` 为 1/1 通过；语言服务器 typecheck、该测试 ESLint 与差异检查通过。此结果覆盖真实 LSP 消息和编辑版本往返，尚不代表 VS Code 可见浮层或用户安装的 Alpha 候选已经验收。

隔离 VS Code 1.139.0 的 `pnpm test:extension:c2` 也通过新增场景：默认 `onDemand` 的编辑器诊断集合先出现两项外层调用错误，`vscode.executeInlayHintProvider` 返回 `$payload:` / `$mode:`，未保存地修正调用后两项诊断消失。宿主退出码 0，日志 `/tmp/sophp-c2-nested-array-host-20260925.log`；`test/extension/suite/c2.ts` 的 TypeScript、ESLint 与差异检查通过。这是隔离宿主的 VS Code API 证据，仍不等于用户安装候选的屏幕可见绘制、WSL Remote 或长期实际使用。

此阶段仍不能把三种调用反馈的结果推断为其它语义功能均已修复；控制流和重构路径按下文的独立反例继续验证。

随后验证了原生 `never` 控制流：同文件 `stop(array('x'))` 原先没有被识别为必然终止，修复前语义反例返回空结果。`isNativeNeverCall` 现复用外层调用定位，同时继续要求唯一声明、原生 `never`、实参兼容，并在按需模式下限定同文件函数。正例 `stop(array('x'))` 与反例 `ordinary(array('x'))` 通过语义测试；隔离 VS Code 1.139.0 的 `pnpm test:extension:c2` 进一步观察到只有 `stop` 后的语句带 `php.control-flow.unreachable`。语义包 366/366、宿主退出码 0，宿主日志 `/tmp/sophp-c2-nested-never-host-20260925.log`。这证明了隔离编辑器诊断集合，不代表用户安装候选或 Remote 已验收。
