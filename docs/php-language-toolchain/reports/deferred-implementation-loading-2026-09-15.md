# 声明优先与实现按需装载验收

日期：2026-09-15。范围：P3 的声明单独恢复、实现完整性状态和正文按需装载。

## 实现

- `SemanticWorkspace.restoreDeclaration()` 先执行 schema 73 全量结构、URI 和派生层验证，再把声明记录注册到全局表，把实现数组保留为该文件的一个延迟记录。
- `source` 与声明数据保持直接可读；类型使用、赋值、调用、scope、变量引用、return、收窄、控制流赋值位置、错误、注释和字符串范围共享一个装载门。任一正文属性首次读取时，全部实现事实一次性替换到语义文件，查询不会看到部分实现。
- `implementationState(uri)` 返回 `absent`、`deferred` 或 `loaded`，`deferredImplementationCount()` 提供项目级计数。文件更新、删除与工作区销毁都会移除旧延迟记录。
- Language Server 的 v45 缓存命中改用声明优先恢复；索引完成日志报告仍延迟的实现数量。冷索引和打开文档仍使用完整当前源码，未保存覆盖规则不变。

## 精准性证据

- Semantic 回归先恢复声明，确认类型目录与工作区符号仍精确且状态保持 `deferred`；随后成员补全首次读取正文并得到唯一 `restored` 成员，状态原子切换为 `loaded`；条件分支内的局部赋值在恢复前后都保持“可能赋值”，不会产生成员补全；越界控制流位置会被拒绝。删除后回到 `absent`。
- 真实冷热 stdio 进程中，四个 PHP 文件的热启动日志确认 `deferred implementations=4`。打开 consumer 后原有 readonly 诊断仍精确发布，缓存的三层 Callable 链仍恢复 3/3。
- 10,000 文件持久索引热启动恢复 10,000/10,000、重新解析 0，索引完成时 10,000 个实现记录全部延迟。一次 `outer -> middle -> inner` 的 readonly 查询只装载 3 个相关实现，9,997 个无关文件继续延迟；框架事实、传递失效和单条损坏重建保持通过。

## 验证

- 冷索引 17,627.97 ms，热恢复 5,690.38 ms，热/冷比 0.3228，均低于 10,000 文件预算。
- `pnpm typecheck`、`pnpm lint`：通过。
- `pnpm test`：十六个组件 631 项、根扩展 35 项，共 666 项通过；Semantic 255/255、Language Server 168/168。
- `node scripts/benchmark-editing.mjs 500 50`：500 次更新无陈旧补全；诊断 P50/P95/最大值 2.02/3.79/5.92 ms，热补全 0.82/1.35/2.31 ms，取消 1.21 ms；最终 RSS 比基线增加 9.18 MiB，损坏缓存与进程重启恢复通过。
- `pnpm verify:packages`：十六个组件 tarball 均通过隔离消费者安装、导入和 API smoke 验证。
- `pnpm package:all && pnpm verify:vsix && pnpm test:extension:packaged`：三个 VSIX 内容通过，Linux VS Code 1.137.0 隔离 Profile Extension Host 退出码为 0。
- 最终 VSIX SHA-256：主扩展 `dd6e1de5e5645e19e8678d14dd95f08f230dd84ed04cbfb38ec645fa8ad078e7`，开源扩展包 `3fa497c02f8600b09d83cbe647041892e7e4605f8cb47a8f75fbd7d241f3fc20`，推荐扩展包 `03330b35d1d8170120f2c1d3c46a823cb724c66ca2dc9ea312aa7dccf9c5f244`。

## 边界与下一步

当前按需边界以文件为单位：首次正文查询装载目标文件的全部实现数组。下一步应在不产生部分事实的前提下进一步拆到稳定 callable identity，先为单方法实现记录增加独立校验和状态，再让控制流、返回推断和局部引用只装载被查询的方法及其可证明依赖。
