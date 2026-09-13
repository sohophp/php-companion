# 核心迭代与对象内建符号验收

日期：2026-09-08。范围：高频核心接口、迭代对象、弱引用对象及 PHP 自动接口语义。

## 支持范围

- PHP 7.2–8.5 共同目录加入 `Traversable`、`Iterator`、`IteratorAggregate`、`Countable`、`ArrayAccess`、`JsonSerializable`、`Serializable`、`SeekableIterator`、`RecursiveIterator`、`OuterIterator`、`stdClass`、`Closure`、`Generator`、`ArrayObject` 与 `ArrayIterator`。
- `WeakReference` 从 PHP 7.4 开始，`Stringable` 与 `WeakMap` 从 PHP 8.0 开始，`UnitEnum` 与 `BackedEnum` 从 PHP 8.1 开始；目标版本切换会撤销旧符号并重新计算未解析类型。
- Iterator/ArrayAccess/ArrayObject/ArrayIterator/WeakMap 和 `Generator<TKey, TValue, TSend, TReturn>` 提供模板关系。全限定 `\Generator<...>` 与非限定写法都能精化同名原生参数并把 `TValue` 传播到 foreach 值。
- `Closure`、`Generator` 与 `WeakReference` 的直接构造被拒绝；WeakReference 使用 `create()`，WeakMap 保持可直接构造。

## 精准边界

Iterator、ArrayAccess、Countable 等内部接口在 PHP 8.1 起使用 tentative return type。目录用 PHPDoc 表达其查询返回类型，不把 tentative 类型伪装成用户类的强制原生继承契约，避免把运行时 deprecation 错报成 fatal 兼容错误。具体对象保留 PHP 7.2–8.5 能共同安全表达的原生签名，并用 PHPDoc 补充无法跨版本直接声明的类型。

PHP 8 中，声明公开非静态 `__toString()` 的类自动满足 `Stringable`；所有 Enum 自动满足 `UnitEnum`，backed Enum 同时满足 `BackedEnum`。`stdClass` 保留动态属性能力，不触发 PHP 8.2 的动态属性创建诊断。

当前只从显式 PHPDoc `Generator<TKey, TValue, TSend, TReturn>` 传播泛型。根据函数体中的 `yield`/`yield from` 自动推导键、值、send 和 return 类型仍属于 P5c，不能由本轮结果推断为已完成。

## 验证

- language-spec 8 项、semantic 180 项、Language Server 62 项测试通过；十五个组件共 378 项，加仓库既有 30 项共 408 项。
- 版本正反例覆盖 PHP 7.3、7.4、8.0 和 8.1；泛型 foreach、成员补全、WeakMap Signature、自动接口、不可构造对象与 stdClass 动态属性均有断言。
- 相关 TypeScript、ESLint 和 `git diff --check` 通过。
- PHP 8.5 项目运行时 Reflection 对照接口继承、成员签名、tentative return type、final 状态及构造行为。
- 最终主 VSIX 在 PHP 7.2 目标的隔离 VS Code 1.136.1 Extension Host 中通过完整用例，退出码 0；Generator 类型与成员、Countable 成员均导航到只读内建文档。
- 宿主日志未发现 AssertionError、超时、保存冲突、ENOENT、EPIPE 或 stream-destroyed。
- 主 VSIX 内容校验通过，SHA-256 为 `9b146213320115458b804d09bef741a2ca4c89dc200d53f7c21b98b4f5c021f7`。
- 十五个组件 tarball 均从仓库外隔离 consumer 安装并执行通过。

宿主日志位于 `/tmp/php-core-iterables-final2-vscode-logs-20260908-1642`。本轮没有重建 Open Source Pack 或 Recommended Pack，也没有公开发布。
