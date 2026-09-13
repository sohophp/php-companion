# SPL 迭代器适配器内建报告

日期：2026-09-13。范围：PHP 7.2–8.5 的核心迭代接口与十一种 SPL 迭代器适配器、泛型传播、版本化签名及真实编辑器消费链。

## 已完成

- 共享规格新增 `IteratorIterator<TKey,TValue>`、`FilterIterator`、`CallbackFilterIterator`、`RecursiveFilterIterator`、`ParentIterator`、`RecursiveCallbackFilterIterator`、`LimitIterator`、`NoRewindIterator`、`InfiniteIterator`、`AppendIterator` 与 `EmptyIterator` 的公开成员和泛型父级。
- `Traversable`、`Iterator`、`IteratorAggregate`、`SeekableIterator`、`RecursiveIterator` 与 `OuterIterator` 改为按目标版本生成：PHP 7.2/7.4 的 seek 参数、PHP 8 参数名及 PHP 8.1 tentative returns 分别保留。
- callback 参数保留值、键和内层 iterator 的具体模板；filter、limit、rewind 与 infinite 适配器的 `current()` 和 `foreach` 会传播具体值类型。
- `AppendIterator::getArrayIterator()` 返回 `ArrayIterator<int,Iterator<TKey,TValue>>`，内层 iterator 的值类型可经过两级局部赋值继续进入成员补全。`getIteratorIndex()` 保留空容器时的 null。
- recursive filter 的 child 保留动态调用类。类型核心现在能保存“泛型对象作为另一泛型的实参”，并在继承 `static`/`static|null` 返回、局部赋值及非空收窄后保留实际调用类的模板映射；模板变量改名的父子类同样覆盖。
- `EmptyIterator::current()`/`key()` 为 `never`，`valid()` 为 false；PHP 8.1 的原生 bool tentative return 与 PHP 8.2 起的 literal false 分别生成。PHPDoc late-static 只有在确实精化声明类原生边界时才被接受。

## 依据

公开类目录依据 PHP 官方 `IteratorIterator`、`FilterIterator`、`CallbackFilterIterator`、`RecursiveFilterIterator`、`ParentIterator`、`RecursiveCallbackFilterIterator`、`LimitIterator`、`NoRewindIterator`、`InfiniteIterator`、`AppendIterator` 与 `EmptyIterator` 手册页；逐项链接记录在 `packages/language-spec/SOURCES.md`。

PHP 8.0、8.1、8.2 与 8.4 的原生声明核对 php-src 对应分支的 `ext/spl/spl_iterators.stub.php`。本机 `/usr/bin/php72`、`php74`、`php81`、`php82`、`php84` 与 `php85` 已核对 Reflection 参数、tentative returns，以及 limit seek、append index/容器、callback 实参和 recursive child 的运行行为；本机缺少 PHP 7.3 与 8.0，边界由相邻运行时和官方源码补证。

## 验证

- `pnpm check` 通过：language-spec 42 项、semantic 236 项、language-server 138 项；十五个组件共 558 项，根扩展 33 项，合计 591 项。TypeScript、ESLint、组件测试、根测试、三份 VSIX 打包和内容检查全部通过。
- `pnpm verify:packages` 通过：十五个组件 tarball 均从隔离消费者安装并验证。
- PHP 8.5 fixture lint 与 Extension Host TypeScript 编译通过。VS Code 1.137.0 的纯净 packaged Profile 退出码为 0，新增的七条具体对象传播链、版本化 Signature Help 与 builtin Definition 均通过真实 provider。
- Open Source Profile 退出码为 0；EditorConfig、PHP CS Fixer、PHPUnit、YAML、TwigPlus、Symfony Language Tools 与 PHP Debug 同时启用。冻结第三方目录的 1,370 个文件在运行前后 SHA-256 清单完全一致。
- 主扩展 VSIX SHA-256：`d809ed21c0fbdcd203d9ba1ddd971866bb5607e7df2c9b21bca006ea7f516273`。
- Open Source Pack VSIX SHA-256：`a42ba8e1a81215da3a2f86736710ea90a9d6d9cfd2cea1107b0210e167aaf1d7`。
- Recommended Pack VSIX SHA-256：`fe815d30151ae95b6e74c3fe7f8f1a6581efc92a46e09d8af76b42e399c2d77a`。

## 边界

无初始 iterator 的 `AppendIterator` 不能从零参数构造器推断键值模板；调用方需要已有 PHPDoc 类型或后续可证明的使用上下文。callback 的运行时副作用、迭代器当前位置与递归数据是否实际存在不由静态类型假定。歧义或不完整的泛型继承继续保持 unknown。

公开 npm 与 VS Code Marketplace 发布未执行。Windows、macOS 和 R4 的 P0–P9/F01–F14 完整验收仍保持开放。
