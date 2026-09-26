# C2 按需跨文件未知命名参数与缺参

日期：2026-09-25。独立临时 Composer PSR-4 项目、PHP 8.5、默认 `onDemand` 的真实 stdio 回归；未修改业务项目或打包 VSIX。

此前 SoPHP 只在同文件报告 PHP 8 的未知命名参数。即使 `final class Service::call(int $value)` 在唯一 PSR-4 路径上已打开，另一文件中的 `$service->call(wrong: 1)` 也没有诊断。现将跨文件未知命名参数纳入与跨文件参数类型错误共用的证明门禁：唯一 PSR-4 类声明、非合成方法签名，以及 final 类、final 方法或可证明的精确局部接收者。签名可被覆写且子类可能更改参数名时不发布这个跨文件错误；包含 unpack 或 variadic 的调用仍沿用语义层原有拒绝规则。

扩展现有真实 LSP 编辑链后，修复前 `wrong: 1` 断言失败，收到空诊断；修复后 `wrong: 1` 有 `php.argument.unknown-named`，改为 `value: "bad"` 后诊断消失。随后打开非 final 的 Service 和带 `$wrong` 参数的子类，使用方再次写 `wrong: 1` 时不发布跨文件未知参数诊断。原同文件命名参数测试继续通过。语言服务器 TypeScript 构建及定向 stdio 测试通过；安装候选、Remote 和长期会话仍按 C4 验收。

同一门禁随后用于跨文件缺少必填参数。语义层原本已能识别 `Service::call()` 缺 `$value`，但 `onDemand` 只发布同文件诊断；首次接入共用门禁后仍失败，原因是缺参事实定位在方法名，而签名查询需要进入调用括号。现在仅在方法名后接调用括号时使用括号内的位置补查签名。真实 stdio 回归验证：可覆写的 Service 与子类参数契约可能不同，`call()` 暂不报告；把未保存声明改为 final 类后，同一使用方立即出现 `php.argument.missing-required`；再给 `$value` 增加默认值，诊断撤销。原跨文件类型与命名参数链继续通过。此改动保持对动态派发的保守门禁。

隔离 VS Code 1.139.0 Linux Core 源码宿主随后实际读取 `vscode.languages.getDiagnostics`：未知命名参数在改正后消失；缺参在未保存声明从必填改为可选时撤销，恢复必填后重现。C2 宿主同时继续通过原有 `never`、同文件参数、跨文件类型、精确接收者、PHPDoc 与双路径编辑序列，进程退出码 0。这仍不是 10 项 Pack 的新安装候选或 WSL Remote 验收。
