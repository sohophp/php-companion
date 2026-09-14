# Deprecated 符号使用诊断增量

日期：2026-09-14

## 行为契约

PHP Companion 对唯一解析的弃用声明发布 warning 级 `php.symbol.deprecated`，并设置标准 LSP `Deprecated` tag。诊断范围只覆盖实际使用的函数、方法、构造器、类常量、Enum case、Trait 名、全局常量或 Property Hook 属性名；声明位置、import 和 first-class callable 获取不报告。

用户声明可通过原生 `#[\\Deprecated]` 或 PHPDoc `@deprecated` 提供元数据。原生 Attribute 的静态字符串 `message` 与 `since` 会进入提示；PHPDoc 说明文本进入同一提示。方法覆写依据实际解析到的声明，不继承父方法的弃用状态；动态、歧义或无法证明的目标保持静默。

版本边界如下：

- PHP 8.4 起启用函数、方法、构造器、类常量、Enum case 和 Property Hook 的原生 Attribute 使用诊断；
- PHP 8.5 起启用 Trait `use` 和全局常量的原生 Attribute 使用诊断；
- PHPDoc 不依赖运行时 Attribute 版本，并使版本化内建 stub 中现有的弃用信息进入相同协议。

当前增量不声明完成所有 `#[Deprecated]` 目标合法性检查，也不推断动态 callable 或动态常量字符串。后续目标验证会复用 Attribute 目录统一处理。

规则依据为 [Deprecated PHP Manual](https://www.php.net/deprecated)、[PHP 8.4 Deprecated Attribute RFC](https://wiki.php.net/rfc/deprecated_attribute)、[PHP 8.5 Deprecated Traits RFC](https://wiki.php.net/rfc/deprecated_traits) 和 [PHP 8.5 Attributes on Constants RFC](https://wiki.php.net/rfc/attributes-on-constants)。

## 运行时对照

PHP 8.4.23 与 8.5.9 实测确认：调用标记函数、方法或构造器，以及访问类常量/Enum case 会产生 deprecation；获取 first-class callable 不产生；未标记覆写方法不继承父方法状态。PHP 8.5.9 额外确认 Trait use、全局常量及 Property Hook get/set 的行为。

```bash
/opt/remi/php84/root/usr/bin/php /tmp/php-companion-deprecated-runtime.php
/opt/remi/php85/root/usr/bin/php /tmp/php-companion-deprecated-runtime.php
/opt/remi/php85/root/usr/bin/php /tmp/php-companion-deprecated-trait.php
/opt/remi/php85/root/usr/bin/php /tmp/php-companion-deprecated-constant.php
/opt/remi/php85/root/usr/bin/php /tmp/php-companion-deprecated-hook.php
```

## 自动验证

PHPDoc 测试覆盖说明文本保留；language-spec 测试覆盖 PHP 8.3/8.4 内建 Attribute 边界；semantic 测试覆盖 Attribute/PHPDoc、函数、方法、构造器、类常量、Enum case、Trait、全局常量、hook、first-class callable、自定义同名 Attribute和覆写不继承。真实 stdio 测试覆盖 PHP 8.3/8.4/8.5 数量边界、标准诊断 tag，以及版本化内建 `utf8_encode()` 和 `SplObjectStorage::attach()`。

最终门禁全部通过：`pnpm check` 覆盖十五个组件 604 项测试、根扩展 33 项测试及三份 VSIX 内容验证；`pnpm verify:packages` 验证十五个隔离 consumer tarball；`pnpm test:extension:packaged` 在 VS Code 1.137.0 隔离配置中加载候选 VSIX，Extension Host 退出码为 0。

候选产物 SHA-256：

- `php-companion-0.4.5.vsix`: `e6f400eb7beaca6a1675c085383fb9201f38c6f131a4ace1758378d03b3f8176`
- `php-companion-open-source-pack-0.4.5.vsix`: `fcf27feb3d7d9df10bec2905527f416c2544d914d80bcca91539c791434d6bbf`
- `php-companion-recommended-pack-0.4.5.vsix`: `3d1523bc5aa12598df5c2e200b843fae3c001ee0936ab1343e057081a6ac4edd`
