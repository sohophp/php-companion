# SPL 高级迭代器内建报告

日期：2026-09-13。范围：PHP 7.2–8.5 的六种 SPL 高级迭代器、泛型键值传播、转换模式、版本化签名，以及真实多扩展环境中的资源管理器 Safe Move。

## 已完成

- 共享规格新增 `RecursiveIteratorIterator<TKey,TValue>`、`CachingIterator<TKey,TValue>`、`RecursiveCachingIterator<TKey,TValue>`、`RegexIterator<TKey,TValue>`、`RecursiveRegexIterator<TKey,TValue>` 与 `RecursiveTreeIterator<TKey,TValue>` 的完整公开成员、常量和泛型父级。
- recursive iterator 与 cache 保留源 iterator 的键值模板；`CachingIterator::getCache()` 为 `array<TKey,TValue>`，`offsetGet()` 保留未命中时的 null。
- Regex 的 MATCH、GET_MATCH、ALL_MATCHES、SPLIT 与 REPLACE 会改变返回形状，因此值类型保持 `TValue|string|array<array-key,mixed>` 的安全 Union。Tree 的 bypass flags 可在运行时改变键值，键和值分别保持 `TKey|string` 与 `TValue|string`。
- `RecursiveRegexIterator::getChildren()` 保留实际子类的 `static`；运行时不会保留子类的 `RecursiveCachingIterator::getChildren()` 使用具体基类返回。模板替换现在递归规范化 PHPDoc Union/Intersection/generic 等结构，并消除替换后产生的重复成员，例如 `TKey|string` 在 `TKey=string` 时稳定显示为 `string`。
- PHP 7.2/7.4 的旧参数名和无原生参数类型、PHP 8 原生参数、PHP 8.1 tentative returns、PHP 8.4 typed constants、PHP 8.5 `RecursiveTreeIterator` 构造联合类型均按目标版本生成；PHP 7.2 `setPostfix()` 缺失参数名的原生 arginfo 也单独保留。
- Open Source Profile 暴露出资源管理器 Safe Move 的真实竞态：其他 will-rename 参与者可在 Companion 完成全量索引前完成文件操作。扩展现在立即读取移动前源文件，服务端在索引前冻结旧源和目标状态，并在规划工作区中移除竞态期间出现的新 URI；移动后仍由既有 reconciliation 基于最终文件状态收敛 namespace、import 与引用。

## 依据

公开类目录依据 PHP 官方六个类的手册页；逐项链接记录在 `packages/language-spec/SOURCES.md`。PHP 8.0、8.1、8.2、8.4 与 8.5 的原生声明核对 php-src 对应分支 `ext/spl/spl_iterators.stub.php`，PHP 7.2、7.3 与 7.4 的边界核对对应分支 C arginfo。

本机 `/usr/bin/php72`、`php74`、`php81`、`php82`、`php84` 与 `php85` 已核对常量、Reflection 参数、tentative returns、Regex 五种输出、Tree flags、cache 形状，以及 recursive child 的实际子类保留行为。本机缺少 PHP 7.3 与 8.0，相关边界由官方源码与相邻运行时交叉确认。

## 验证

- `pnpm check` 通过：language-spec 43 项、semantic 237 项、language-server 139 项；十五个组件共 561 项，根扩展 33 项，合计 594 项。TypeScript、ESLint、组件测试、根测试、三份 VSIX 打包和内容检查全部通过。
- `pnpm verify:packages` 通过：十五个组件 tarball 均从隔离消费者安装并验证。
- PHP 8.5 fixture lint 与 Extension Host TypeScript 编译通过。VS Code 1.137.0 的纯净 packaged Profile 退出码为 0；六个高级迭代器的具体对象传播、版本化 Signature Help、成员补全与 builtin Definition 均经真实 Provider 验证。
- Open Source Profile 退出码为 0；EditorConfig 0.18.2、PHP CS Fixer 0.3.21、PHPUnit 3.9.40、YAML 1.24.0、TwigPlus 1.3.7、Symfony Language Tools 0.20.0 与 PHP Debug 1.40.1 同时启用。资源管理器 Safe Move 未再出现旧源不可用错误；冻结第三方目录的 1,370 个文件在运行前后 SHA-256 清单完全一致。
- 主扩展 VSIX SHA-256：`ecf008dbb72781ec611412429855947165116862196a4d301adab43eb28b2d7e`。
- Open Source Pack VSIX SHA-256：`3067fb157b16641c419a132c967226e416003a6e367d78f381801ca6e13aaa1e`。
- Recommended Pack VSIX SHA-256：`2912926611b93f2473278fff9bdb7a45d80ca6eae08ee6b5b1309101513edf00`。

## 边界

Regex 与 Tree 的模式/flags 可变，静态模型不会根据构造后的动态 `setMode()`、`setFlags()` 调用把整个对象永久收窄；安全 Union 避免把转换后的 string/array 错报为原始对象。cache 内容、iterator 当前状态与递归 child 是否实际存在不由静态类型假定。

Symfony Language Tools 0.20.0 在该合成静态项目中仍记录其上游 event-loop 终止与 EPIPE；这不影响 PHP Companion、其他开源插件或组合宿主以退出码 0 完成，但不构成 Symfony 服务器本身健康的证明。

公开 npm 与 VS Code Marketplace 发布未执行。Windows、macOS 和 R4 的 P0–P9/F01–F14 完整验收仍保持开放。
