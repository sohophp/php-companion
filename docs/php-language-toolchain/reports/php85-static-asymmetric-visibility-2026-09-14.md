# PHP 8.5 静态属性非对称可见性验收

日期：2026-09-14

## 目标

PHP 8.5 把非对称 set 可见性扩展到静态属性：

```php
class Manager
{
    public private(set) static int $calls = 0;

    public static function record(): void
    {
        self::$calls++;
    }
}
```

`Manager::$calls` 可在任意作用域读取，只能在 `Manager` 内写入。PHP Companion 现在对直接赋值、复合赋值和自增减使用静态属性的真实读写上下文，并把 set 可见性用于访问检查。诊断明确包含操作、可见性、静态属性身份和 `$` 属性名，例如：`Cannot write private static property App\Manager::$calls.`

PHP 官方依据为 [PHP 8.5 发布说明](https://www.php.net/releases/8.5/en.php)、[静态属性非对称可见性 RFC](https://wiki.php.net/rfc/static-aviz) 和 [Visibility 手册](https://www.php.net/manual/en/language.oop5.visibility.php)。

## 精准边界

- PHP 8.4 目标发布 `php.version.unsupported`；PHP 8.5 目标接受声明。
- 声明类内部的 static 写入允许。
- 子类对 `private(set)` static 属性的写入拒绝。
- 全局或普通函数中的写入拒绝。
- 所有可见作用域的读取仍然允许，不因较窄的 set 可见性误报。
- 未解析或层级不完整的静态接收者继续保持静默。

## 验证

PHP 8.4.23 真实 lint 报告 `Static property may not have asymmetric visibility`；PHP 8.5.9 接受同一声明，并在全局写入时报告 `Cannot modify private(set) property Manager::$calls from global scope`。

自动验证覆盖 parser 的 `static`/`writeVisibility` 事实、semantic 的类内/子类/全局读写矩阵、Language Server 的 8.4/8.5 版本边界，以及真实 stdio LSP 的用户可读诊断。

```bash
/usr/bin/php84 -l /tmp/php-companion-static-aviz-valid.php
/usr/bin/php85 -l /tmp/php-companion-static-aviz-valid.php
/usr/bin/php85 /tmp/php-companion-static-aviz-invalid.php
pnpm --filter @php-companion/parser test
pnpm --filter @php-companion/semantic test
pnpm --filter @php-companion/language-server test
pnpm check
```

`pnpm check` 最终通过：十五个组件共 591 项测试、根扩展 33 项测试和三份 VSIX 内容校验成功；`pnpm verify:packages` 从隔离仓库外消费者验证十五个组件 tarball。

本地候选产物 SHA-256：

- `php-companion-0.4.5.vsix`：`a0a3101e8ee45a987d91f68f95c5c1f254571098290b47dee409cff987fb5269`
- `php-companion-open-source-pack-0.4.5.vsix`：`5e3214570fa4b8d116e1490d2d2e851df5073ff544b17f2828b4429c02aac266`
- `php-companion-recommended-pack-0.4.5.vsix`：`5b903b2219b9506bf3aafb3fa34fa1b968179bcc7d2ae0ccf7daf78bf25e7dd2`
