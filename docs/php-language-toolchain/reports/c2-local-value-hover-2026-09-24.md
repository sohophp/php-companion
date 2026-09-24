# C2 局部值 Hover 与跨文件返回反馈

日期：2026-09-24。独立 Composer 夹具在默认 `onDemand` 模式下，把另一个文件中的 `Service::text(): string` 赋给局部 `$value`，再将 `$value` 传给 `accept(int $value)`。原先参数诊断能报告类型冲突，悬停在调用处的 `$value` 却没有类型信息。

Core 现在用已有的局部表达式类型事实生成变量 Hover，显示 `$value: string`。未保存地把源方法改成 `text(): int` 后，真实 stdio 用例同时核对 Hover 切为 `int`、源方法签名切为 `text(): int`、Definition 仍指向正确源文件、目标参数签名仍为 `int`，并且类型冲突诊断撤销。恢复源声明后，诊断重新出现。悬停只在解析器识别的变量引用处提供；注释中的同名文本不产生结果，经过可能改写变量的调用后不猜测类型。

同轮发现，赋值与使用之间的纯注释会让局部值回溯及按需跨文件参数来源证明停止。现跳过语法树中的注释节点；稳定局部字面量、原生返回值和直接构造接收者都有正例，可能改写变量的语句及引用别名仍由既有反例约束。真实 LSP 用例还在赋值与调用之间加入注释，验证 Hover、签名、Definition 与诊断的编辑往返。

验证：Semantic 全套 325/325、相关真实 stdio 用例、TypeScript 构建、相关 ESLint 与 `git diff --check` 通过。VS Code 1.139.0 隔离 C2 Extension Host 对未保存的源返回类型完成 `string → int → string` 的 Hover 与诊断往返，退出码 0，日志 `/tmp/sophp-c2-variable-hover-20260924.log`。没有打包 VSIX，也没有修改业务项目。此证据不等于完整 Pack、WSL Remote、其它平台或长会话验收；下一步在当前 11 项 Pack 源码组合中核对连续编辑与等待，再检查更复杂的类型来源。
