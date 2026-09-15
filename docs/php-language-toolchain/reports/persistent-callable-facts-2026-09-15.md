# Callable 工厂事实持久化验收

日期：2026-09-15。范围：P3 的已消费 Callable 构造摘要、直接依赖边和热启动恢复。

## 实现

- `@php-companion/semantic` 可按来源导出已消费且结果为单一具体类型的工厂构造事实，以及每个工厂实际使用的直接 Callable 依赖。`null`/unknown 摘要不导出。
- 恢复先验证调用者只存在一个声明且属于原来源、结果类型身份唯一、每个依赖 Callable 身份唯一。直接构造叶节点先接受，调用者只有在所有依赖均已接受且返回同一类型时才逐层恢复。
- 缺失依赖、重复声明、循环、依赖结果不一致及结构/资源超限的事实保持 unknown。恢复后的反向依赖图继续使用现有有界失效逻辑；被调用方实现变化会清除整条传递调用链。
- Language Server 使用独立 `callable-facts-v1` 缓存，每个来源同时保存原源码 SHA-256 与事实载荷 SHA-256。缓存限制为 64 MiB、10,000 个来源、100,000 条事实、每条 256 个直接依赖及 1,024 字符身份。
- 缓存只记录实际查询产生的正向事实，不在冷启动扫描所有 Callable。写入使用 750 ms 去抖、同目录随机临时文件和原子 rename，并在 LSP shutdown 返回前刷新。
- 所有打开文档都从写入集合排除，避免把未保存源码绑定到磁盘缓存。其调用者事实即使暂时留下，也会因恢复时缺少完整依赖链而被拒绝。

## 精准性证据

Semantic 回归建立 `outer -> middle -> inner -> new State` 及独立 `unrelated -> new Other`：

1. 导出只包含四条已消费正向事实，不包含动态调用产生的 unknown。
2. 新工作区恢复四条事实后，读取 `outer()` 的构造状态不再解析其方法体。
3. 修改 `inner()` 后，既有反向图失效 `inner`、`middle`、`outer`，旧 readonly 结论消失。
4. 移除 `inner` 缓存事实时，依赖它的两层调用者均拒绝恢复，独立 `unrelated` 继续恢复。

Language Server 缓存回归进一步证明：依赖源码 SHA-256 改变、新增同名 `inner()` 造成歧义、篡改载荷但未更新事实摘要，都会只拒绝受影响的三层链并保留独立事实。连续两个真实 stdio 进程中，冷进程消费并在 shutdown 前保存三层链；热进程启动报告恢复 3 条事实，随后继续发布精确 `php.assignment.readonly-property` 诊断。

## 验证

- `pnpm typecheck`：通过。
- `pnpm lint`：通过。
- `pnpm test`：十六个组件 631 项、根扩展 35 项，共 666 项通过；Semantic 255/255，Language Server 168/168。
- `pnpm verify:packages`：十六个组件 tarball 均通过隔离消费者安装、导入与 API smoke 验证。
- `pnpm package:all && pnpm verify:vsix`：三个 VSIX 均重新构建并通过内容验证；`pnpm test:extension:packaged` 在隔离 Profile、VS Code 1.137.0 中退出码为 0。
- 最终 VSIX SHA-256：主扩展 `56c779b122fa75af78ebae2bf29ec589b81d18cc3a7302f53ef6002d78a7d84e`，开源扩展包 `bb0f9fd60b8d3426623653887363704e65915c826dd4bc43eafb3a2383f1d726`，推荐扩展包 `2488771d11eb3d39a2bb9e7229c227ca14db166efd09cd1915587c77105b771b`。
- 提交 `1d4a909` 的 [CI 34911657028](https://github.com/sohophp/php-companion/actions/runs/34911657028)：18/18 通过，覆盖 Linux、Windows、macOS Quality、打包 Extension Host、七扩展 Open Source Profile 与 PHP 7.2–8.5。
- `node scripts/benchmark-persistent-index.mjs 10000`：冷索引 17,538.06 ms，热恢复 4,714.06 ms，热/冷比 0.2688；恢复 PHP 文件 10,000/10,000、重解析 0，并恢复 3 条传递 Callable 事实。类型依赖失效、框架事实恢复和单文件损坏重建仍通过。
- `node scripts/benchmark-editing.mjs 500 50`：500 次更新无陈旧补全；更新到诊断 P50/P95/最大值为 1.80/2.55/5.71 ms，热补全为 0.77/1.09/6.17 ms，取消 1.15 ms；最终 RSS 比基线增加 6.78 MiB，损坏语义缓存与进程重启恢复通过。

## 边界与下一步

本增量持久化的是当前已实现、可证明安全的工厂构造摘要，不把任意返回值推断或负向结果包装成缓存事实。P3 下一项应把大型 PHP 文件的声明记录与方法体记录拆成独立磁盘层：声明未变时直接恢复全局类型/签名表，只为被查询或真正变化的方法体加载控制流事实。该拆分仍须保持开放文档覆盖、文件生命周期、依赖失效和损坏隔离契约。
