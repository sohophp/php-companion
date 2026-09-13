# 标准异常内建符号验收

日期：2026-09-08。范围：`@php-companion/language-spec` 的首批版本化标准异常目录，以及 Language Server 对这些符号的消费。

## 支持范围

- PHP 7.2–8.5 共同提供 `Throwable`、`Exception`、`Error`、`ErrorException`、SPL 的 Logic/Runtime 两棵完整异常树，以及 PHP 7 系列基础 Error 子类。
- `CompileError` 与继承它的 `ParseError`、`JsonException` 从 PHP 7.3 开始；PHP 7.2 中 `ParseError` 直接继承 `Error`。
- `ValueError`、`UnhandledMatchError` 从 PHP 8.0 开始，`FiberError` 从 PHP 8.1 开始，`RequestParseBodyException` 从 PHP 8.4 开始。
- `Exception` 与 `Error` 的构造参数、公开方法、protected 状态、final getter 和私有 clone 契约进入语义目录；`ErrorException` 另外提供版本化构造签名和 final `getSeverity()`。

该目录明确仍是经过审计的小型集合。Random、PDO、DOM 等扩展异常及完整 PHP 内建 API 不在本轮支持范围，不据此宣称内建符号已经完整。

## 精准行为

- 全限定与 namespace 内非限定标准异常不再产生 `php.type.unresolved`。
- SPL 子类继承 `Throwable` 成员；成员补全与 Definition 可沿继承链到只读 `php-companion-builtin:` 文档。
- `new InvalidArgumentException(message: ..., code: ...)` 使用继承的 `Exception::__construct` 签名。
- 外部读取 `$exception->message` 被识别为 protected 访问，而不是不存在的属性。
- 覆盖 `Exception::getMessage()` 被识别为覆盖 final 方法。
- PHP 7.2 目标不会提前暴露 Compile/JSON/Value/Match/Fiber/Request Body 异常；同一工作区改为 PHP 8.5 后相应未解析事实会失效并重新解析。

## 验证

- language-spec：7 项测试通过。
- Language Server：60 项测试通过；版本、解析、继承成员、构造签名、protected 访问与 final 覆盖均有正反例。
- 相关 TypeScript、ESLint 和 `git diff --check` 通过。
- PHP 8.5 项目运行时 Reflection 对照了所有收录类的直接父类、final 状态和构造函数声明来源。
- 重新打包的主 VSIX 在禁用其他扩展的隔离 VS Code 1.136.1 Extension Host 中通过完整用例，退出码 0；日志未发现 AssertionError、超时、保存冲突、ENOENT、EPIPE 或 stream-destroyed。
- 主 VSIX 内容校验通过，SHA-256 为 `60073cbe8ded2232aaca9b0f4bc69c725c038effeda0f1c57d392abbec436987`。
- 十五个组件 tarball 均从仓库外隔离 consumer 安装并执行通过。

宿主日志位于 `/tmp/php-standard-exceptions-final-vscode-logs-20260908-1613`。本轮没有重建 Open Source Pack 或 Recommended Pack，也没有公开发布。
