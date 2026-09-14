# PHP 8.5 NoDiscard 验收

日期：2026-09-14

## 行为契约

PHP Companion 在目标 PHP 8.5+ 时识别按 namespace/import 规则解析为全局 `NoDiscard` 的 Attribute。只有调用目标唯一、实参兼容并且调用构成整条未消费表达式时，才发布 warning 级 `php.return-value.discarded`。

赋值、作为其他表达式的一部分、普通 cast 和 PHP 8.5 `(void)` cast 都视为已消费；`for` 初始化与更新列表中的裸调用仍视为未消费，而 `(void)` 在这两个列表中可显式忽略结果，在 `for` 条件中则保持 PHP 语法错误。first-class callable 获取和构造器不进入该诊断。覆写方法依据实际调用的声明，不继承父方法 Attribute；Trait 方法复制到消费类后保留 Attribute。可静态读取的 `message` 字符串会进入诊断文案。

以下 PHP 8.5 编译期返回值约束使用 `php.attribute.invalid-no-discard`：

- 显式 `void` 或 `never` 返回；
- `__construct`、`__destruct`、`__clone`、`__set`、`__unset`、`__wakeup`、`__unserialize` 等不能返回值的 magic method；
- 显式返回 `void` 或 `never` 的闭包与箭头函数。

原生 Attribute 只允许函数和方法目标，其中包含闭包与箭头函数。类、接口、Trait、Enum、普通属性、参数、类常量、Enum case、全局常量、Property Hook 和匿名类使用 `php.attribute.invalid-no-discard-target` 拒绝。同一目标带 PHP 8.5 `#[DelayedTargetValidation]` 时，编译期目标错误按运行时行为推迟；void/never 等返回值约束不属于目标类型错误，仍然报告。

闭包与箭头函数当前覆盖 Attribute 目标和显式 void/never 返回约束；经变量调用后的丢弃诊断仍属于动态 callable 数据流，保持 unknown，不在本轮宣称完成。

PHP 8.4 及更低允许用户代码携带未知的 `#[NoDiscard]`，但它没有运行时行为，因此 Language Server 不发布丢弃或声明约束诊断。`(void)` 是 PHP 8.5 新语法，旧目标仍发布 `php.version.unsupported`。

规则依据为 [PHP 8.5 发布说明](https://www.php.net/releases/8.5/en.php)、[NoDiscard PHP Manual](https://www.php.net/manual/en/class.nodiscard.php) 和 [Marking return values as important RFC](https://wiki.php.net/rfc/marking_return_value_as_important)。

## 原生目录

PHP 8.5.9 Reflection 显示 `DateTimeImmutable::modify/add/sub/setTimezone/setTime/setDate/setISODate/setTimestamp/setMicrosecond` 均带内建 NoDiscard 及具体原因；版本化 stub 已逐项加入。当前 PHP 8.5.9 的 `flock()` 未带该 Attribute，与 RFC errata 一致，因此未猜测添加。

## 运行时对照

PHP 8.5.9 对未消费的用户函数、闭包、箭头函数和 `DateTimeImmutable::setDate()` 发出 warning；赋值、`(bool)` 和 `(void)` 不发出 warning。显式 void、`__clone` 与非法声明目标上的 Attribute 分别在编译期被拒绝；`#[DelayedTargetValidation]` 可推迟目标错误，但不会隐藏函数的 void 返回约束。PHP 8.4.23 对 NoDiscard 本身保持无行为，但拒绝 `(void)`。

```bash
/opt/remi/php84/root/usr/bin/php /tmp/php-companion-no-discard-runtime.php
/opt/remi/php85/root/usr/bin/php /tmp/php-companion-no-discard-runtime.php
/opt/remi/php85/root/usr/bin/php -l /tmp/php-companion-no-discard-invalid.php
/opt/remi/php85/root/usr/bin/php -l /tmp/php-companion-no-discard-invalid-magic.php
/opt/remi/php85/root/usr/bin/php -l /tmp/php-companion-no-discard-invalid-hook.php
/opt/remi/php85/root/usr/bin/php /tmp/php-companion-nodiscard-valid.php
/opt/remi/php85/root/usr/bin/php -l /tmp/php-companion-nodiscard-targets.php
/opt/remi/php85/root/usr/bin/php -l /tmp/php-companion-delayed-nodiscard-hook.php
```

## 自动验证

parser 测试覆盖函数体、顶层与 `for` 初始化/更新列表中的丢弃，以及赋值、普通 cast 与 `(void)`；语言版本测试覆盖 8.4 拒绝、8.5 接受以及 `for` 条件禁用 `(void)`。semantic 测试覆盖函数、实例/静态方法、Trait、覆写不继承、自定义同名 Attribute、消息、显式 void/never、magic method、闭包、箭头函数、全部非法目标和延迟目标验证。真实 stdio 测试同时覆盖用户声明、内建 DateTimeImmutable 方法、版本开关、稳定诊断代码和 `#[DelayedTargetValidation]` 静默边界。

最终门禁全部通过：

- `pnpm check`：十五个组件共 606 项测试、根扩展 33 项测试通过；三个 VSIX 完成构建和内容校验；
- `pnpm verify:packages`：十五个组件 tarball 在隔离消费者中安装并验证通过；
- `pnpm test:extension:packaged`：主 VSIX 在隔离 VS Code 1.137.0 配置中完成 Extension Host 用例，退出码 0。

候选产物 SHA-256：

- `php-companion-0.4.5.vsix`：`fc843100518c30b215d0a9796f639fa6d2d7cd002d9c347f9fd02fcbdedbb5d9`
- `php-companion-open-source-pack-0.4.5.vsix`：`7ea05452b02fb2acae1527f1586b3f2b6271acfe715d3ceccd0b39eae7ae5910`
- `php-companion-recommended-pack-0.4.5.vsix`：`97715f8f0ff9f926316b970d0aabf195241b7ddfa9997a79e31c9056879cedc9`

基础行为提交 `e4a42a8` 的 [CI 34790640137](https://github.com/sohophp/php-companion/actions/runs/34790640137) 已通过 Linux、Windows、macOS 的质量与打包 Extension Host 门禁，以及 PHP 7.2–8.5 集成矩阵；完整目标验证增量的跨平台候选门禁在提交后单独记录。
