# 声明优先缓存恢复

日期：2026-09-20

## 问题与边界

Winstar 的 2265 文件语义缓存约 123 MiB，其中方法体实现记录约 86.35 MiB，声明记录约 14.07 MiB。缓存热恢复原本调用完整 `restore()`：先合并全部实现事实、重新按方法范围分区、生成规范快照并序列化比较，随后 `restoreDeclaration()` 又立即把这些实现事实卸载为按方法延迟状态。该过程没有增加启动阶段可见能力，却消耗大量 CPU 和临时内存。

本轮为声明优先路径实现独立验证。它仍验证：

- snapshot schema、URI、声明数组、派生层结构和预算；
- 每个 function、method 与 property hook 实现记录必须与声明推导的唯一身份、种类和范围完全一致；
- 每项实现事实必须处于合法源码范围、归属正确的最内层 callable，并保持生成器规定的稳定顺序；
- 控制流赋值位置合法、唯一且归属正确；
- reference candidate 和 type dependency 层必须由声明及延迟实现记录重新推导得到相同结果。

完整 `restore()` 的全实现规范重建保持不变。声明优先恢复只省略随后不会在启动阶段消费的实现事实合并、排序、重建和大对象序列化；聚焦到某个方法时仍按现有按 callable 延迟机制加载其实现事实。

## 验证

- `@php-companion/semantic` 268 项通过。缓存损坏反例同时覆盖完整恢复和声明优先恢复：非法 scope、越界控制流赋值、事实被移到文件错误层、重复 callable 记录、非法依赖、陈旧 reference candidate 均被拒绝。
- Language Server 6 个文件、187 项，testkit 5 项和根扩展 9 个文件、39 项通过；全仓 TypeScript、ESLint 与 `git diff --check` 通过。
- 19 个 monorepo 组件 tarball 全部通过隔离消费者安装与导入验证。
- 打包核心 VSIX 在隔离的 VS Code 1.138.0 Extension Host 完整通过，退出码为 0，覆盖索引、诊断、导航、引用、重命名和 Safe Move。
- 真实 Winstar 使用同一未变缓存连续热恢复两次，项目索引分别为 12.901 秒和 13.331 秒；前一源码基线为 14.535 秒，减少 8.3%–11.2%。两次均返回 9 个 Controller context，标准与模块 route 的类/方法共 4 个 YAML Definition 均唯一命中预期 PHP 文件。

缓存文件本身仍约 123 MiB，Node 读取和 JSON 解析约占 5 秒，逐记录校验与声明恢复仍占其余主要时间。后续若继续拆分声明/实现物理存储，必须保留原子版本、精确失效、损坏拒绝及按需方法体语义，不能以跳过完整性校验换取时间。
