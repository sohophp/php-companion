# C1 PHPDoc 项目类型补全

日期：2026-09-27。此项属于 SoPHP Core 的项目类型建议；Open Source Pack 中的 PHP DocBlocker 继续负责生成注释块。改动位于隔离源码分支，尚未进入 0.4.7 冻结 VSIX。

原先 Core 将整个注释范围排除在类型补全之外，因此 `@param UserSe`、`@return array<UserSe` 中无法建议项目的 `UserService`。现在仅在 PHPDoc 的 `@param`、`@return`、`@var`、`@throws`、`@property`、`@mixin`、`@extends`、`@implements` 及对应 PHPStan/Psalm 参数、返回、变量标签的类型位置复用 Core 的项目类型候选和按需索引。普通注释、PHPDoc 说明文字、参数变量名、字符串和已结束的类型表达式不进入这条路径。

语义正反例覆盖直接类型、Union、泛型内部、空类型位置、说明文字、变量名和普通注释。完整语义测试结果见 `/tmp/sophp-c1-phpdoc-semantic-final-20260927.log`。隔离 VS Code 1.139.1 Linux x64 的完整 10 项 Open Source Pack 源码 Profile 使用 PHP 8.5、按需索引，在 PHPDoc 所在文件之外创建未打开的 `C1DocTarget.php`；实际补全请求返回项目类，并在说明文字和普通注释位置不返回该类，Extension Host 退出码 0，日志 `/tmp/sophp-c1-phpdoc-crossfile-pack10-20260927.log`。`pnpm build`、扩展测试 TypeScript、改动文件 ESLint 与差异检查通过。

同日继续补齐限定名称与跨行输入：绝对名称 `\Vendor\Widget\Wid`、当前命名空间下的 `Nested\Nes` 和 `use` 别名 `WidgetAlias\Wid` 现在按实际限定目录寻找候选，限定写法不会额外插入 `use`。当上一行以 `|`、`&`、`<`、逗号或其它未完成类型分隔符结束时，下一行仍可继续补全；完整类型后开始的说明文字不会被误认为续行。语义包最终 418/418 通过，TypeScript、相关 ESLint 和差异检查通过。完整 10 项 Open Source Pack 的 PHP 8.5 按需源码宿主对未打开的 PSR-4 类验证相对与绝对限定名称、跨行泛型及无多余导入，退出码 0，日志 `/tmp/sophp-c1-phpdoc-qualified-pack10-20260927.log`。

同日继续接入 `@method` 的显式返回类型和参数类型：支持 `@method static UserSe`，以及已有方法名后的首个和后续参数类型。方法名、参数变量名和签名后的说明文字不触发项目类建议；只在能够明确识别类型位置时提供补全。语义测试 419/419 通过，日志 `/tmp/sophp-c1-phpdoc-method-semantic-20260927.log`。完整 10 项 Open Source Pack 的 PHP 8.5 按需源码宿主验证了未打开的 PSR-4 类及上述正反例，退出码 0，日志 `/tmp/sophp-c1-phpdoc-method-pack10-20260927.log`。相关 TypeScript、ESLint 和差异检查通过。

当前仍未覆盖任意复杂的多行 PHPDoc 类型、数组形状内部键/值语法、`@method` 的复杂嵌套类型或默认值位置，以及注释内跳转。真实 WSL Remote、其它 PHP 版本与现有 0.4.7 安装候选均不由此次源码宿主通过证明。
