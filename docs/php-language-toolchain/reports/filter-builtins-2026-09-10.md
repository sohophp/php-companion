# Filter 内建目录验收

日期：2026-09-10

## 实现范围

`@php-companion/language-spec` 现在按 PHP 7.2–8.5 生成 `filter_has_var`、`filter_input`、`filter_input_array`、`filter_var`、`filter_var_array`、`filter_list`、`filter_id` 与常用输入、验证、清理和 flag 常量。

单值与外部输入 API 对 `FILTER_VALIDATE_INT`、`FILTER_VALIDATE_FLOAT`、bool 及字符串验证器提供 literal 重载。省略 options 且过滤器可静态证明时，返回分别收窄为 `int|false`、`float|false`、`bool` 或 `string|false`；外部输入额外保留变量不存在时的 `null`。动态过滤器、显式 options 或无法唯一证明的调用保持 `mixed`。

`@php-companion/semantic` 会把唯一解析且值为安全标量的全局/类常量保留为 literal 实参，并在重载排名中让精确 literal 或 literal Union 优先于宽泛 primitive。重复、动态、越界、Enum case 和无法静态求值的常量不参与该推断。

## 版本边界

- `INPUT_SESSION`、`INPUT_REQUEST`、`FILTER_SANITIZE_MAGIC_QUOTES`、`FILTER_FLAG_SCHEME_REQUIRED` 与 `FILTER_FLAG_HOST_REQUIRED` 只在 PHP 7 目录提供；其中未实现的输入源不会被错误保留到 PHP 8。
- `FILTER_SANITIZE_ADD_SLASHES` 从 PHP 7.3 起提供；`FILTER_VALIDATE_BOOL` 规范名称从 PHP 8.0 起提供。
- `FILTER_FLAG_GLOBAL_RANGE` 从 PHP 8.2 起提供，PHP 8.2–8.4 值为 `268435456`；PHP 8.5 因新增 `FILTER_THROW_ON_FAILURE`，值变为 `536870912`。
- `FILTER_THROW_ON_FAILURE` 从 PHP 8.5 起提供，值为 `268435456`。

Filter 扩展必须实际编译或加载后才存在。当前目录跟随既有 JSON/PDO 等基础扩展策略按 PHP 目标版本提供；可选扩展探测与 PHP 8.5 `Filter\\FilterException` 名称空间类仍属于后续扩展能力目录工作，本文不把它们误报为完成。

## 验证

- PHP 7.2、7.4、8.1、8.2、8.4、8.5 Reflection 对照了函数参数、返回类型和完整 Filter 常量集合。
- language-spec 17 项与 Language Server 113 项通过；Semantic 新增安全标量常量和 literal-Union 重载排名用例。
- 九个目标版本生成 stub 均为 0 个解析错误。
- `pnpm check` 通过：十五个组件 502 项、根扩展 33 项，共 535 项测试；TypeScript、ESLint、三份 VSIX 打包和内容校验同时通过。
- `pnpm verify:packages` 从仓库外隔离消费者安装并执行十五个真实组件 tarball，全部通过。
- Extension Host fixture 覆盖整数、邮件、外部输入、数组过滤及 PHP 8.2/8.5 flags。同一最终主 VSIX 在 VS Code 1.137.0 的纯净 Profile 与 Open Source Profile 依次通过，两个宿主退出码均为 0。

## 当前候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `2b0f6915b3e15bacfec03ccfa6c59291a4b9bc8807fb629bb033f85a8948d46f` |
| `php-companion-open-source-pack-0.4.5.vsix` | `141b5f31a05fc2aa2bfaa30e79ebbf1bdf5b22f1602d7b5921d2e28d92349461` |
| `php-companion-recommended-pack-0.4.5.vsix` | `299ba5b75ae38e8ec2429147b96222bc40966653f12c3bf16704bd0f047075ee` |

Open Source Profile 使用 TwigPlus 1.3.7、Symfony Language Tools 0.20.0、Red Hat YAML 1.24.0、PHP Debug 1.40.1、PHPUnit & Pest Test Explorer 3.9.40、PHP CS Fixer 0.3.21 和 EditorConfig 0.18.2。Symfony Language Tools 在关闭阶段记录其已知的间歇性 `ERR_STREAM_DESTROYED`；断言与宿主仍以退出码 0 完成，PHP Companion 自身未记录该错误。

官方依据记录于 `packages/language-spec/SOURCES.md`。公开 npm 与 VS Code Marketplace 发布未执行。
