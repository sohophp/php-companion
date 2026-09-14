# Deprecated 符号与目标诊断验收

日期：2026-09-14

## 行为契约

PHP Companion 对唯一解析的弃用声明发布 warning 级 `php.symbol.deprecated`，并设置标准 LSP `Deprecated` tag。诊断范围只覆盖实际使用的函数、方法、构造器、类常量、Enum case、Trait 名、全局常量或 Property Hook 属性名；声明位置、import 和 first-class callable 获取不报告。

用户声明可通过原生 `#[\\Deprecated]` 或 PHPDoc `@deprecated` 提供元数据。原生 Attribute 的静态字符串 `message` 与 `since` 会进入提示；PHPDoc 说明文本进入同一提示。方法覆写依据实际解析到的声明，不继承父方法的弃用状态；动态、歧义或无法证明的目标保持静默。

版本边界如下：

- PHP 8.4 起启用函数、方法、构造器、类常量、Enum case 和 Property Hook 的原生 Attribute 使用诊断；
- PHP 8.5 起启用 Trait `use` 和全局常量的原生 Attribute 使用诊断；
- PHPDoc 不依赖运行时 Attribute 版本，并使版本化内建 stub 中现有的弃用信息进入相同协议。

原生 Attribute 的声明目标也按实际语法节点验证。函数、方法、闭包、箭头函数、类常量、Enum case 和 Property Hook 在 PHP 8.4 起合法；Trait 和全局常量要求 PHP 8.5；类、接口、Enum、普通属性、参数和匿名类始终拒绝。PHP 8.5 同一目标上的 `#[DelayedTargetValidation]` 会按运行时行为推迟非法目标检查，PHP 8.4 不提前套用该行为。自定义 namespace 中同名 `Deprecated` 不进入这些规则。动态 callable 或动态常量字符串仍保持 unknown。

规则依据为 [Deprecated PHP Manual](https://www.php.net/deprecated)、[PHP 8.4 Deprecated Attribute RFC](https://wiki.php.net/rfc/deprecated_attribute)、[PHP 8.5 Deprecated Traits RFC](https://wiki.php.net/rfc/deprecated_traits) 和 [PHP 8.5 Attributes on Constants RFC](https://wiki.php.net/rfc/attributes-on-constants)。

## 运行时对照

PHP 8.4.23 与 8.5.9 实测确认：调用标记函数、方法、构造器、闭包或箭头函数，以及访问类常量/Enum case 和 Property Hook 会产生 deprecation；获取 first-class callable 不产生；未标记覆写方法不继承父方法状态。PHP 8.5.9 额外确认 Trait use 与全局常量行为。PHP 8.4 拒绝 Trait 目标和带 Attribute 的全局常量语法；PHP 8.5 拒绝类、接口、Enum、普通属性、参数和匿名类目标。

```bash
/opt/remi/php84/root/usr/bin/php /tmp/php-companion-deprecated-runtime.php
/opt/remi/php85/root/usr/bin/php /tmp/php-companion-deprecated-runtime.php
/opt/remi/php85/root/usr/bin/php /tmp/php-companion-deprecated-trait.php
/opt/remi/php85/root/usr/bin/php /tmp/php-companion-deprecated-constant.php
/opt/remi/php85/root/usr/bin/php /tmp/php-companion-deprecated-hook.php
/opt/remi/php84/root/usr/bin/php /tmp/php-companion-deprecated-closure.php
/opt/remi/php85/root/usr/bin/php /tmp/php-companion-deprecated-targets.php
```

## 自动验证

PHPDoc 测试覆盖说明文本保留；language-spec 测试覆盖 PHP 8.3/8.4 内建 Attribute 边界；semantic 测试覆盖 Attribute/PHPDoc、函数、方法、构造器、类常量、Enum case、Trait、全局常量、hook、闭包、箭头函数、first-class callable、自定义同名 Attribute、覆写不继承、延迟目标验证，以及全部合法/非法声明目标。真实 stdio 测试覆盖 PHP 7.4 的通用 Attribute 语法门槛、PHP 8.3/8.4/8.5 使用和目标数量边界、标准诊断 tag、版本化内建 `utf8_encode()` 与 `SplObjectStorage::attach()`，并断言目标验证不制造语法误报。

最终门禁全部通过：`pnpm check` 覆盖十五个组件 606 项测试、根扩展 33 项测试及三份 VSIX 内容验证；`pnpm verify:packages` 验证十五个隔离 consumer tarball；`pnpm test:extension:packaged` 在 VS Code 1.137.0 隔离配置中加载候选 VSIX，Extension Host 退出码为 0。完整门禁首次运行时一个既有多工作区隔离用例因等待响应超时失败；该用例单独复跑通过，随后整套 `pnpm check` 复跑通过。

候选产物 SHA-256：

- `php-companion-0.4.5.vsix`: `fc843100518c30b215d0a9796f639fa6d2d7cd002d9c347f9fd02fcbdedbb5d9`
- `php-companion-open-source-pack-0.4.5.vsix`: `7ea05452b02fb2acae1527f1586b3f2b6271acfe715d3ceccd0b39eae7ae5910`
- `php-companion-recommended-pack-0.4.5.vsix`: `97715f8f0ff9f926316b970d0aabf195241b7ddfa9997a79e31c9056879cedc9`

使用诊断提交 `db52c3e` 的 [CI 34793080024](https://github.com/sohophp/php-companion/actions/runs/34793080024) 已通过 Linux、Windows、macOS 质量与 Extension Host 门禁及 PHP 7.2–8.5 集成矩阵；完整目标验证增量的跨平台候选门禁在提交后单独记录。
