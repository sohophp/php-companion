# ArrayObject / ArrayIterator 内建报告

日期：2026-09-13。范围：PHP 7.2–8.5 的 SPL 数组容器公开成员、版本化签名和泛型传播。本报告关闭这一精准子集，不代表 R4 最终验收完成。

## 实现

- `ArrayObject<TKey,TValue>` 与 `ArrayIterator<TKey,TValue>` 现在声明完整公开方法、`STD_PROP_LIST` / `ARRAY_AS_PROPS` 常量、`ArrayAccess`、`Countable`、iterator 和 serialization 关系。
- `getArrayCopy()` 保留 `array<TKey,TValue>`，`getIterator()` 保留 `Iterator<TKey,TValue>`，`offsetGet()` 与 `current()` 保留 `TValue`，`key()` 保留 `TKey|null`；append、offset 和排序 callback 同样消费容器模板。
- PHP 7.2 保留历史参数名；PHP 7.4 加入 `__debugInfo()`、`__serialize()` 与 `__unserialize()`；PHP 8.0 使用原生参数名和类型；PHP 8.2 起排序方法返回 `true`；PHP 8.4 起两个类常量为 typed class constants。
- 成员 Signature Help 原先只取接收者 FQCN，丢弃已经证明的类模板映射。语义核心现在把 receiver template arguments 传入成员选择，使调用点显示具体返回和参数，并让结果继续流入赋值、foreach、成员补全与 Definition。

## 来源与对照

- PHP 官方 [`ArrayObject`](https://www.php.net/manual/en/class.arrayobject.php) 与 [`ArrayIterator`](https://www.php.net/manual/en/class.arrayiterator.php) class synopsis 用于核对当前公开表面、接口和 typed constants。
- [`ArrayObject::__construct`](https://www.php.net/manual/en/arrayobject.construct.php)、[`ArrayIterator::__construct`](https://www.php.net/manual/en/arrayiterator.construct.php)、[`exchangeArray`](https://www.php.net/manual/en/arrayobject.exchangearray.php) 与 [`uasort`](https://www.php.net/manual/en/arrayobject.uasort.php) 用于核对参数、输入和返回变化。
- PHP 7.2、7.4、8.1、8.2、8.4 和 Winstar PHP 8.5 的 Reflection 输出用于交叉检查运行时参数名与可用方法；PHP 官方 changelog 用于确定 PHP 8.2 的 `true` 返回边界，因为本机 PHP 8.2 构建的 Reflection 元数据仍显示旧 tentative `bool`。

## 验证

- language-spec：36/36，通过完整成员、模板及 PHP 7.2/7.4/8.0/8.1/8.2/8.4 对照。
- semantic：232/232；新增核心回归证明泛型接收者的 Signature Help 返回具体对象类型。
- language-server：132/132；新增端到端语义查询证明数组、iterator、offset 和 current 返回均传播到 `ArrayBuiltinItem::arrayLabel()`。
- `pnpm check` 通过：十五个组件 542 项、根扩展 33 项，共 575 项；TypeScript、ESLint、三份 VSIX 打包与内容检查全部通过。
- 十五个组件的真实 npm tarball 已在仓库外隔离消费者中全部安装和运行通过。
- 最终主 VSIX 在 VS Code 1.137.0 纯净 profile 与 Open Source Profile 中均以退出码 0 通过完整 Extension Host 测试；真实 Definition、Signature Help 与泛型返回链断言均包含在本次运行中。
- Open Source Profile 的 1,371 个第三方文件在测试前后全文件 SHA-256 清单一致。Symfony Language Tools 0.20.1 在合成无 `vendor/` fixture 关闭时仍打印已记录的 destroyed-stream 上游日志，但宿主、Companion 断言和退出码均通过；真实 Winstar source index ready 证据由独立报告覆盖。
- Winstar PHP 8.5 fixture lint 与 Extension Host TypeScript 编译已通过。

最终产物：

- `php-companion-0.4.5.vsix`: `9dd8e04bad3dbf51621e9034298d2e13d01f68d5883ea617f05cda5adab6ae36`
- `php-companion-open-source-pack-0.4.5.vsix`: `3a3d983e08e00a1cd0e4f0874c5904e7de681a30ccc164880bfdac9e62e5719f`
- `php-companion-recommended-pack-0.4.5.vsix`: `cf6172f04a257d01f6112f4fd4c879b18999c14d5dda57bb48be55401aeacb02`

## 精度边界

PHP 8.5 对构造或替换存储时传入 object 的弃用只影响特定实参形状。当前弃用协议以符号为单位，因此没有把整个构造器、`exchangeArray()` 或类型错误标记为 deprecated。构造器从数组字面量自动推断类模板实参仍未作为本子集的完成条件；显式 PHPDoc 泛型参数和已证明泛型返回链已经精准工作。
