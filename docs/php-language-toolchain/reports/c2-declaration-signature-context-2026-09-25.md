# C2 参数提示：函数声明与实际调用

日期：2026-09-25。只修改 SoPHP 源码和独立测试；未修改 Winstar 代码，未打包 VSIX。

最小重现：在 `function describe(string $name): void {}` 的 `describe(` 后请求 Signature Help，旧实现把函数声明当成调用，返回了 `describe(string $name)` 提示。完整声明和正在输入的 `function describe(` 都会触发；同一函数的真正调用应继续显示提示。

语义层现在对已解析声明使用 `formal_parameters` 语法节点识别参数列表的左括号，对未完成的声明使用紧邻的 `function` 前缀识别。声明参数默认值里的真实嵌套调用仍返回对应函数的提示。

验证：红绿语义回归先复现错误，再通过完整语义包 389 项；真实 stdio LSP 定向测试通过声明、字符串、注释及实际调用的正反例。隔离 VS Code 1.139.0 C2 源码宿主通过 `vscode.executeSignatureHelpProvider`，日志 `/tmp/sophp-c2-declaration-signature-cached-20260925.log`，退出码 0。首次宿主命令自动获取 VS Code 1.139.1 时下载超时，未进入测试；随后通过 `PHP_COMPANION_TEST_VSCODE_EXECUTABLE` 指定本机已有 1.139.0，完成同一宿主套件。改动文件 ESLint、语义 TypeScript、测试宿主 TypeScript 和差异检查通过。

此项修正错误浮层结果，不代表新私有候选已安装；C4 Remote 和人工长会话仍开放。
