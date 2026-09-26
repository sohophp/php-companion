# C1 PHPDoc 项目类型补全

日期：2026-09-27。此项属于 SoPHP Core 的项目类型建议；Open Source Pack 中的 PHP DocBlocker 继续负责生成注释块。改动位于隔离源码分支，尚未进入 0.4.7 冻结 VSIX。

原先 Core 将整个注释范围排除在类型补全之外，因此 `@param UserSe`、`@return array<UserSe` 中无法建议项目的 `UserService`。现在仅在 PHPDoc 的 `@param`、`@return`、`@var`、`@throws`、`@property`、`@mixin`、`@extends`、`@implements` 及对应 PHPStan/Psalm 参数、返回、变量标签的类型位置复用 Core 的项目类型候选和按需索引。普通注释、PHPDoc 说明文字、参数变量名、字符串和已结束的类型表达式不进入这条路径。

语义正反例覆盖直接类型、Union、泛型内部、空类型位置、说明文字、变量名和普通注释。完整语义测试结果见 `/tmp/sophp-c1-phpdoc-semantic-final-20260927.log`。隔离 VS Code 1.139.1 Linux x64 的完整 10 项 Open Source Pack 源码 Profile 使用 PHP 8.5、按需索引，在 PHPDoc 所在文件之外创建未打开的 `C1DocTarget.php`；实际补全请求返回项目类，并在说明文字和普通注释位置不返回该类，Extension Host 退出码 0，日志 `/tmp/sophp-c1-phpdoc-crossfile-pack10-20260927.log`。`pnpm build`、扩展测试 TypeScript、改动文件 ESLint 与差异检查通过。

当前范围只处理单行标签中的未限定项目类型名及其 Union、Intersection、泛型片段；多行复杂 PHPDoc 类型、显式限定名称、`@method` 签名和注释内跳转尚未验收或实现。真实 WSL Remote、其它 PHP 版本与现有 0.4.7 安装候选均不由此次源码宿主通过证明。
