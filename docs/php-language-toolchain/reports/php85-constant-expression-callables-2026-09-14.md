# PHP 8.5 常量表达式 callable 验收

日期：2026-09-14

## 支持范围

PHP 8.5 允许以下值出现在 Attribute 参数、属性默认值、参数默认值、全局常量和类常量的常量表达式中：

- `static function (...) { ... }`，且不能使用 `use` 捕获外部变量；
- 直接命名函数的 first-class callable，例如 `strtolower(...)`；
- 直接静态方法的 first-class callable，例如 `self::normalize(...)`。

PHP Companion 对 PHP 8.4 及更低目标发布 `php.version.unsupported`；PHP 8.5 目标接受合法形式，并用 `php.constant-expression.invalid-callable` 精确拒绝 arrow function、非 static Closure、捕获变量的 Closure 和动态 first-class callable。依据为 [PHP 8.5 发布说明](https://www.php.net/releases/8.5/en.php)、[Closures in constant expressions RFC](https://wiki.php.net/rfc/closures_in_const_expr) 和 [First Class Callables in constant expressions RFC](https://wiki.php.net/rfc/fcc_in_const_expr)。

## callable 类型语义

parser 现在明确区分 `transform(...)` 的 Closure 获取与 `transform($value)` 的函数调用。first-class callable 仍保留目标名称，Definition 和未解析目标检查可以继续工作；它不会触发缺少必填参数诊断，也不会采用目标函数的返回类型。

semantic 把合法获取表达式的结果建模为 `Closure`。因此直接或局部传给 `Closure` 参数时兼容，传给 `int` 等不兼容参数时会报告实际类型 `Closure`。这项行为同时适用于常量表达式之外自 PHP 8.1 已支持的 first-class callable。

## 运行时对照

PHP 8.4.23 拒绝包含 static Closure、函数 callable、静态方法 callable 的常量表达式；PHP 8.5.9 接受同一组声明。PHP 8.5.9 对四类非法输入分别拒绝：

- arrow function：常量表达式包含非法操作；
- 非 static Closure：Closure 必须为 static；
- `use` 捕获：常量表达式不能捕获变量；
- 动态函数名：常量表达式不能使用动态函数名。

## 验证

自动测试覆盖 PHP 8.1 普通 first-class callable 边界、PHP 8.5 常量表达式边界、全部四种合法上下文、四种非法约束、parser 调用身份、Closure 类型传播、Definition、参数类型诊断、缺少参数误报抑制和真实 stdio LSP。

```bash
/usr/bin/php84 -l /tmp/php-companion-const-callable-valid.php
/usr/bin/php85 -l /tmp/php-companion-const-callable-valid.php
/usr/bin/php85 -l /tmp/php-companion-const-arrow.php
/usr/bin/php85 -l /tmp/php-companion-const-nonstatic.php
/usr/bin/php85 -l /tmp/php-companion-const-capture.php
/usr/bin/php85 -l /tmp/php-companion-const-dynamic.php
pnpm check
pnpm verify:packages
```

`pnpm check` 最终通过：十五个组件共 594 项测试、根扩展 33 项测试和三份 VSIX 内容校验成功。十五个组件 tarball 从隔离仓库外消费者安装验证通过，打包主扩展也在隔离 VS Code 1.137.0 配置中完成 Extension Host 全套用例并以退出码 0 结束。

本地候选产物 SHA-256：

- `php-companion-0.4.5.vsix`：`2088375d6da793c55911382bcc7980563f52bcffad3395ab33ea0f30be864edf`
- `php-companion-open-source-pack-0.4.5.vsix`：`a827854ad0ef0b3bcf5595833f50edcae4908b34a49b70389db943c6ca626242`
- `php-companion-recommended-pack-0.4.5.vsix`：`e2345ddd6580327bc3270c4ecf365ab03a5be56d8c96caf1321eb0349a6d4227`

动态方法名、对象方法 callable 和表达式函数名在普通运行时代码仍遵循 PHP 8.1 first-class callable 规则；只有常量表达式上下文按 PHP 8.5 的较窄集合拒绝。
