# Math 内建目录验收

日期：2026-09-11

## 实现范围

`@php-companion/language-spec` 现在按 PHP 7.2–8.5 生成核心 Math 扩展的四十四项函数，覆盖绝对值、取整、三角/双曲函数、进制转换、指数/对数、整数与 IEEE 浮点运算、有限值判断、`min/max` 和角度转换。

稳定目录包含十七项 `M_*` 数学常量、`INF`、`NAN` 及四项 `PHP_ROUND_HALF_*` 常量。依赖运行平台浮点表示的 `PHP_FLOAT_*` 数值没有伪造为固定值。

## 版本与类型边界

- `abs(int)` 与 `abs(float)` 使用关联重载，调用结果保持输入的数值类别；动态 `int|float` 保留 Union。
- `min()`/`max()` 的数组形式从 `array<array-key,TValue>` 返回 `TValue`；PHP 7 仍保留空数组的 `false` 失败值，PHP 8 的失败路径由 `ValueError` 表达。多值形式要求至少两个实参并传播共同模板类型。
- `fdiv()` 只在 PHP 8.0+ 目录生成，`fpow()` 只在 PHP 8.4+ 目录生成。
- PHP 8.4+ 的 `round()` 接受 `RoundingMode|int`，并生成含八个 case 的内建 `RoundingMode`；旧版本保留整数舍入模式。
- `pow()` 在 PHP 8 保留扩展运算符重载可能产生的 `object|int|float`，PHP 7 保留 `int|float`。

## 补全隔离修复

数学常量让一个既有错误回退变得可见：无法解析接收者的 `$object->member` 曾在成员结果为空时继续请求全局函数和常量补全。Semantic 现在显式报告成员访问上下文，Language Server 在该上下文保持空结果，因此 `M_PI` 等全局符号不会出现在对象成员列表。

## 验证

- PHP 7.2、7.4、8.1、8.2、8.4、8.5 Reflection 对照了函数存在性、参数名、参数/返回类型、默认值、稳定常量和 PHP 8.4 `RoundingMode`。
- PHP 官方 Math 手册、各函数页面、常量页和 `RoundingMode` 页面已记录到 `packages/language-spec/SOURCES.md`。
- 九个目标版本生成 stub 均为 0 个解析错误。
- `pnpm check` 完整通过：十五个组件 506 项、根扩展 33 项，共 539 项测试；TypeScript、ESLint 和三份 VSIX 内容检查同时通过。
- 十五个组件 tarball 已从隔离消费者安装并验证；最终 VSIX 已在 VS Code 1.137.0 的纯净配置和 Open Source Profile 中通过，覆盖四十四项函数导航、Math 常量、`RoundingMode`/case 导航与 `abs(int): int` 唯一签名。Open Source Profile 同时加载 TwigPlus、Symfony Language Tools、YAML、PHP Debug、PHPUnit、PHP CS Fixer 与 EditorConfig；Symfony Language Tools 在宿主关闭阶段输出已知 EPIPE/流已销毁日志，但功能断言与宿主进程均以 0 退出。

## 候选制品

| 制品 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `dbe99f2189bb6d5f7bd506e748eef4ddbce5b0228710e3036222c2a331bccad3` |
| `php-companion-open-source-pack-0.4.5.vsix` | `c9b49bc2ea357f381f8844be3816da7f7de94c9892880ede0debc3be6a85498e` |
| `php-companion-recommended-pack-0.4.5.vsix` | `185e63a074b69c0604e115196d16943a913c51aede963c771d215f73be7fc8cf` |

公开 npm 与 VS Code Marketplace 发布未执行。
