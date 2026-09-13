# MultipleIterator 内建报告

日期：2026-09-13。范围：PHP 7.2–8.5 的 `MultipleIterator` 公开成员、版本化签名、泛型键值与真实编辑器消费链。

## 已完成

- `MultipleIterator<TInnerKey,TValue>` 实现 `Iterator<array<array-key,TInnerKey|null>,array<array-key,TValue|null>>`，覆盖构造、flags、iterator 管理、迭代方法与 PHP 7.4 起的 `__debugInfo()`。
- `attachIterator()` 将被附加 iterator 的键值泛型绑定到容器；info 保留 `int|string|null`。flags 可以在运行时切换 numeric/associative key，因此结果使用安全的 `array-key`；`MIT_NEED_ANY` 下已经结束的子 iterator 槽位保留 null。
- PHP 7.2/7.4 的参数名、PHP 8 原生参数类型、PHP 7/8.0 的 `current()`/`key()` false 失败返回、PHP 8.1 tentative 返回和 PHP 8.4 typed constants 分别生成。
- 通用语义层只在完整继承关系得到唯一 iterable 键值投影时传播 `foreach` 变量。嵌套数组字面量键和非空守卫继续保留对象类型；冲突的泛型父级投影保持 unknown。
- 直接 `current()` 与 `foreach` 两条链均已进入补全、Signature Help、Definition 和最终 Extension Host fixture。

## 依据

公开接口依据 PHP 官方 [`MultipleIterator`](https://www.php.net/manual/en/class.multipleiterator.php)、[`attachIterator`](https://www.php.net/manual/en/multipleiterator.attachiterator.php) 与 [`setFlags`](https://www.php.net/manual/en/multipleiterator.setflags.php)。PHP 8.0/8.1 返回边界另核对 php-src 的 [`PHP-8.0`](https://github.com/php/php-src/blob/PHP-8.0/ext/spl/spl_observer.stub.php) 与 [`PHP-8.1`](https://github.com/php/php-src/blob/PHP-8.1/ext/spl/spl_observer.stub.php) SPL observer stub。

`/usr/bin/php72`、`php74`、`php81`、`php82`、`php84`、`php85` 已逐版本核对 Reflection、常量、默认值、返回值和失败行为。本机缺少 PHP 8.0，该边界使用官方 PHP 8.0 源码补证。

## 验证

- language-spec 41/41、semantic 234/234、language-server 137/137；仓库总门禁中十五个组件共 554 项、根扩展 33 项，共 587 项测试通过。TypeScript、ESLint、PHP fixture lint 与 Extension Host TypeScript 编译通过。
- 十五个真实组件 tarball 均从隔离消费者安装并验证；主扩展、Open Source Pack 与 Recommended Pack 三份 VSIX 的内容检查通过。
- VS Code 1.137.0 纯净宿主通过；含 EditorConfig、PHP CS Fixer、PHPUnit、YAML、TwigPlus、Symfony Language Tools 0.20.0 与 PHP Debug 的 Open Source Profile 通过。第三方目录运行前后 1,370 个文件的 SHA-256 清单完全一致。
- 主扩展 VSIX SHA-256：`1e6fd0f50cdd049fd1856c46364326f273c7cbfcc5c65ec2b6c7e7e86a677d0a`。
- Open Source Pack VSIX SHA-256：`395f0e0bef8abb378a2a6a6a89ace4f546247855bba06c2e29597e7298d7a8c1`。
- Recommended Pack VSIX SHA-256：`1a181e63912c6d3afbeff016762b13bbaf5aed5868180aed18cc9baca541d19e`。

## 边界

运行时 flags 可在任意位置改变，静态模型不把固定字符串 info 键误认为永久 array shape。`current()`/`key()` 在无效位置的具体异常或 false 行为按版本保留在返回边界，但静态分析不证明迭代器当前位置。动态 info、冲突/不完整泛型父级和无法证明的 iterable 保持宽类型或 unknown。

公开 npm 与 VS Code Marketplace 发布未执行。Windows、macOS 和 R4 的 P0–P9/F01–F14 完整验收仍保持开放。
