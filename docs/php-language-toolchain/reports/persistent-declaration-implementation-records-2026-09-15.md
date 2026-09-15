# 声明与实现磁盘记录验收

日期：2026-09-15。范围：P3 的语义快照声明/方法体边界与 Language Server 持久缓存封装。

## 实现

- `@php-companion/semantic` 的快照升级为 schema 73。`declaration` 保存 URI、namespace、类型、函数/方法签名、属性、常量、import、模板、泛型父级和 PHPDoc 魔术成员；`implementation` 保存同一 URI 的源码、类型使用、赋值、调用、作用域、变量引用、返回、控制流收窄、语法错误、注释与字符串范围；引用候选和类型依赖继续位于 `layers`。
- 恢复要求声明与实现 URI 完全一致，并分别验证必需结构。两块记录重组后，引用候选和类型依赖必须能从实际内容重新推出；随后才把完整文件和两个索引原子放入工作区。
- Language Server Composer 缓存升级为 v45、每文件封装升级为 schema 2。声明、实现、派生层和 Symfony/Doctrine 文件事实各自保存 SHA-256，外层仍校验完整语义与框架载荷；任意记录或摘要被修改都会拒绝该文件。
- 打开的未保存文档仍通过当前源码匹配门禁，旧 v44/schema 72 缓存因版本与 schema 不匹配整体重建，不会被当作新格式恢复。

## 精准性证据

- Semantic 往返覆盖 PHPDoc magic members、泛型模板、泛型父级、声明符号、方法体作用域和派生层；旧 schema、声明/实现 URI 不一致、无效 scope 与伪造引用/依赖层均拒绝。
- Language Server 文件缓存回归分别篡改声明 namespace、实现源码、派生引用键和框架事实，四种情况全部拒绝；正常恢复继续重定位 Twig interop generation，并保留 Doctrine 事实。
- 10,000 文件真实持久索引中，磁盘条目确认包含四个独立的 64 位十六进制 SHA-256。冷索引 17,194.06 ms，热恢复 5,249.23 ms，热/冷比 0.3053；热启动恢复 10,000/10,000、重新解析 0，Symfony/Doctrine 与 3 条 Callable 事实继续恢复。篡改单个派生层后仅该 1 个文件重建。

## 验证

- `pnpm typecheck`、`pnpm lint`：通过。
- `pnpm test`：十六个组件 631 项、根扩展 35 项，共 666 项通过；Semantic 255/255、Language Server 168/168。
- `node scripts/benchmark-editing.mjs 500 50`：500 次更新无陈旧补全；诊断 P50/P95/最大值 1.85/2.75/4.76 ms，热补全 0.79/1.24/2.61 ms，取消 1.26 ms；最终 RSS 比基线增加 3.93 MiB，损坏缓存与进程重启恢复通过。
- `pnpm verify:packages`：十六个组件 tarball 均通过隔离消费者验证。
- `pnpm package:all && pnpm verify:vsix && pnpm test:extension:packaged`：三个 VSIX 内容通过，Linux VS Code 1.137.0 隔离 Profile Extension Host 退出码为 0。
- 最终 VSIX SHA-256：主扩展 `0358003771d581a8cea3b8d4bb922f610d2750297dbfbfb2ca147e9892aea724`，开源扩展包 `42220a2d044f76c7c62b1b5aa4eb6c0403e4fc2e2ca0b54eb05ee2212373a8ec`，推荐扩展包 `1065ec83e9c5f8e348932462efd0ca96edf7557762057eb46c4b65674ae83174`。

## 边界与下一步

本增量建立可独立验证、可独立演进的磁盘记录边界，并未宣称方法体已经延迟加载。当前语义查询仍要求完整实现记录；缓存实现变化时也仍会重建该文件。下一增量应让声明记录拥有独立恢复 API 和完整性状态，再把需要方法体的查询集中经过实现加载门；只有在声明身份、源码版本和所有依赖均核对成功时才按需装载实现记录。
