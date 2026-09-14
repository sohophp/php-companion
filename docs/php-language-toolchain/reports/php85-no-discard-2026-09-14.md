# PHP 8.5 NoDiscard 验收

日期：2026-09-14

## 行为契约

PHP Companion 在目标 PHP 8.5+ 时识别按 namespace/import 规则解析为全局 `NoDiscard` 的 Attribute。只有调用目标唯一、实参兼容并且调用构成整条未消费表达式时，才发布 warning 级 `php.return-value.discarded`。

赋值、作为其他表达式的一部分、普通 cast 和 PHP 8.5 `(void)` cast 都视为已消费；`for` 初始化与更新列表中的裸调用仍视为未消费，而 `(void)` 在这两个列表中可显式忽略结果，在 `for` 条件中则保持 PHP 语法错误。first-class callable 获取和构造器不进入该诊断。覆写方法依据实际调用的声明，不继承父方法 Attribute；Trait 方法复制到消费类后保留 Attribute。可静态读取的 `message` 字符串会进入诊断文案。

以下 PHP 8.5 编译期约束使用 `php.attribute.invalid-no-discard`：

- 显式 `void` 或 `never` 返回；
- `__construct`、`__destruct`、`__clone`、`__set`、`__unset`、`__wakeup`、`__unserialize` 等不能返回值的 magic method；
- property hook。

PHP 8.4 及更低允许用户代码携带未知的 `#[NoDiscard]`，但它没有运行时行为，因此 Language Server 不发布丢弃或声明约束诊断。`(void)` 是 PHP 8.5 新语法，旧目标仍发布 `php.version.unsupported`。

规则依据为 [PHP 8.5 发布说明](https://www.php.net/releases/8.5/en.php)、[NoDiscard PHP Manual](https://www.php.net/manual/en/class.nodiscard.php) 和 [Marking return values as important RFC](https://wiki.php.net/rfc/marking_return_value_as_important)。

## 原生目录

PHP 8.5.9 Reflection 显示 `DateTimeImmutable::modify/add/sub/setTimezone/setTime/setDate/setISODate/setTimestamp/setMicrosecond` 均带内建 NoDiscard 及具体原因；版本化 stub 已逐项加入。当前 PHP 8.5.9 的 `flock()` 未带该 Attribute，与 RFC errata 一致，因此未猜测添加。

## 运行时对照

PHP 8.5.9 对未消费的用户函数和 `DateTimeImmutable::setDate()` 发出 warning；赋值、`(bool)` 和 `(void)` 不发出 warning。显式 void、`__clone` 与 property hook 上的 Attribute 分别在编译期被拒绝。PHP 8.4.23 对 Attribute 本身保持无行为，但拒绝 `(void)`。

```bash
/opt/remi/php84/root/usr/bin/php /tmp/php-companion-no-discard-runtime.php
/opt/remi/php85/root/usr/bin/php /tmp/php-companion-no-discard-runtime.php
/opt/remi/php85/root/usr/bin/php -l /tmp/php-companion-no-discard-invalid.php
/opt/remi/php85/root/usr/bin/php -l /tmp/php-companion-no-discard-invalid-magic.php
/opt/remi/php85/root/usr/bin/php -l /tmp/php-companion-no-discard-invalid-hook.php
```

## 自动验证

parser 测试覆盖函数体、顶层与 `for` 初始化/更新列表中的丢弃，以及赋值、普通 cast 与 `(void)`；语言版本测试覆盖 8.4 拒绝、8.5 接受以及 `for` 条件禁用 `(void)`。semantic 测试覆盖函数、实例/静态方法、Trait、覆写不继承、自定义同名 Attribute、消息、显式 void/never、magic method 和 property hook。真实 stdio 测试同时覆盖用户声明、内建 DateTimeImmutable 方法、版本开关及稳定诊断代码。

最终门禁全部通过：

- `pnpm check`：十五个组件共 601 项测试、根扩展 33 项测试通过；三个 VSIX 完成构建和内容校验；
- `pnpm verify:packages`：十五个组件 tarball 在隔离消费者中安装并验证通过；
- `pnpm test:extension:packaged`：主 VSIX 在隔离 VS Code 1.137.0 配置中完成 Extension Host 用例，退出码 0。

候选产物 SHA-256：

- `php-companion-0.4.5.vsix`：`d6eac73053beeda2e468c8f7bcc828a86a3532997fd90ac9a0fe29bd053add53`
- `php-companion-open-source-pack-0.4.5.vsix`：`4ea08603c5973cb7a593c48bbcb08fcd9258c1857f9392a0b4d5ce8789ce7c1f`
- `php-companion-recommended-pack-0.4.5.vsix`：`c57eed3ad9e61168ecb6641e7501cbde14476063fd4148f07bf98d3e243d7e56`

提交 `e4a42a8` 的 [CI 34790640137](https://github.com/sohophp/php-companion/actions/runs/34790640137) 已通过 Linux、Windows、macOS 的质量与打包 Extension Host 门禁，以及 PHP 7.2–8.5 集成矩阵。
