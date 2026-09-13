# PHP 确定未定义变量诊断验收

日期：2026-09-10。范围：命名函数、方法、显式闭包和箭头函数中的确定未定义局部变量。

## 诊断契约

Language Server 使用稳定 Warning `php.variable.undefined`，只在当前位置之前不存在任何可能定义来源时报告。该规则依赖当前文档的局部语法事实，不等待 Composer 项目索引；文档有语法错误时保持静默。

已识别的定义与抑制边界包括：

- 参数、普通及引用赋值、复合赋值和自增减后的定义；
- 分支中的可能赋值、foreach 键/值、catch 变量、`global` 与函数 `static`；
- 唯一签名证明的按引用实参，以及目标未知、仍可能按引用的直接变量实参；
- 显式闭包按值/按引用捕获、箭头函数自动捕获和 PHP 超全局变量；
- `isset`、`empty`、`unset` 与空合并左值的安全读取；
- include/require、动态变量，以及 `extract`、`eval`、`parse_str` 之后可能改变局部符号表的边界。

当前只报告确定未定义，不把“仅在部分控制流路径赋值”升级成可能未定义诊断。这样保留后续控制流增强空间，同时避免在首批规则中制造误报。

## PHP 8.5 对照

使用 Winstar 规定的 `bin/php-runtime` 执行探针：`isset`、`empty`、`??`、按引用参数初始化及引用赋值均无错误；直接读取缺失变量产生 `Undefined variable $missing`。按值捕获缺失变量与调用缺失箭头捕获同样产生 Warning，按引用捕获会创建变量。

## 自动与真实项目验证

- Semantic 正反例覆盖顺序定义、分支、循环、异常、动态边界、已知/未知引用参数、闭包和箭头函数。
- stdio 回归确认本地变量诊断在项目索引完成前即可发布，同时类型、函数和常量缺失仍等待完整索引。
- 全部既有 Extension Host PHP fixture 扫描为 0 个意外变量诊断。
- Winstar `src/` 的 1,558 个 PHP 文件扫描为 0 个新诊断；这证明当前保守规则没有扰动该真实项目，不能单独视为全项目无缺陷证明。

## 封板证据

- `pnpm check` 通过：十五个组件 489/489、根扩展 33/33，合计 522/522；TypeScript、ESLint、三个 VSIX 构建与内容检查同时通过。
- `pnpm verify:packages` 通过：45 个 Changesets 形成十五个组件发布计划，十五个真实 tarball 在仓库外隔离安装运行通过。
- VS Code 1.137.0 纯净打包宿主直接验证 `php.variable.undefined`、限定函数/常量缺失和非限定全局符号抑制，退出码为 0。
- 相同 VSIX 在包含 Symfony Language Tools、TwigPlus、YAML、PHP CS Fixer、PHP Debug、PHPUnit 与 EditorConfig 的 Open Source Profile 中通过。Symfony Language Tools 0.20.0 关闭阶段仍记录既有 EPIPE/stream-destroyed 通知；功能断言与宿主退出码为 0，未将外部问题记为已修复。

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `d452ab3baf4073f4faf8957bcfdb38e3634abcf8446994b92c317bc06ac0d30a` |
| `php-companion-open-source-pack-0.4.5.vsix` | `966d7b8f897f60dfce28d445c71e9ffd5a76f4e4023375dec12652381a68155a` |
| `php-companion-recommended-pack-0.4.5.vsix` | `d9822d11df85cece993455e683f7e886d5b014b41b7fa4ba25e30dd5ad35ef95` |

本轮没有公开发布 npm 包或 Marketplace 扩展。
