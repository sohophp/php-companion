# phpstorm-stubs 方法签名形状复查（2026-10-01）

用 `scripts/audit-phpstorm-runtime-method-signatures.mjs` 对本机 PHP 8.5 的 Reflection、SPL、Intl、MySQLi、Zip、cURL 和 GD 扩展复查公开自有方法，共 1,085 个运行时方法；缺失名称、必需参数数、参数名及可变参数标记的差异均为 0。GD 在此范围内没有类方法。

PHP 7.2 对 Phar、SQLite3、OpenSSL、DOM、MySQLi、Zip、cURL、XMLReader、XMLWriter、Session、Fileinfo、Sockets、Zlib、Mbstring、Filter 和 Core 的相同审计没有签名差异。其它模块报告的几类差异已核对：

- `MultipleIterator()` 无参实际可构造，尽管反射把 `flags` 标成必填；SoPHP 的可选参数声明正确。
- `ReflectionMethod::getClosure($object)`、`invoke($object)`、`ReflectionClass::newInstance()` 和 `IntlDateFormatter::format($date)` 按 SoPHP 声明实际调用成功；PHP 7.2 反射的必需参数数或参数形状不适合作为这些调用的唯一依据。
- `SimpleXMLElement::addAttribute('a')` 在 PHP 7.2 警告至少需要两个参数，在 PHP 8.5 抛 `ArgumentCountError`；SoPHP 保留两个必填参数。
- PHP 7.2 的 SPL 部分“缺失”是子类继承的成员。方法签名审计现沿继承、接口和 Trait 查找声明；重跑 PHP 7.2／7.4 的 374／390 个公有自有方法，两版缺失数均为 0，只剩实际可无参构造的 `MultipleIterator` 反射差异。PHP 8.5 SPL 的 369 个方法重跑无差异。PDO 的两个反射口径差异已有独立实测记录。PHP 7.2 本机未加载 Sodium、Random 扩展，本轮不宣称这些模块的签名通过。

这次没有发现应改动的声明。方法审计不比较参数／返回类型，也不代表其它平台扩展构建或真实编辑器可见结果。未打包、提交或更新 Profile。
