# Callable 工厂依赖图验收

日期：2026-09-15。范围：P3 的首个 Callable 调用依赖子集，以及工厂构造摘要的传递失效。

## 实现

- `SemanticWorkspace` 为已经实际消费的工厂摘要记录按文件原子维护的反向 Callable 图。节点使用 lowercase 稳定 callable 身份，继续复用 `DocumentDependencyGraph` 的节点数、边数、键长度和遍历深度预算。
- 当一个唯一解析的工厂把另一个唯一解析 callable 的调用直接作为返回表达式时，构造结果可以沿调用链传递。例如 `outer() -> middle() -> inner() -> new State()` 会得到 `State` 的直接构造事实。
- 被调用方实现或声明变化时，失效集合会沿旧反向图传递到所有已缓存调用者。返回类型相关失效也先转换为 Callable 种子，再传播到调用者。
- 工厂体改为直接构造或改调其他目标后，重新计算会原子替换旧边；之后修改旧被调用方不会误清新的调用者摘要。
- 递归、自调用、重复声明、重载歧义、动态 callable、无法唯一选择的实参及语法/图预算耗尽保持 unknown。图不完整时清空全部工厂摘要，不保留可能过期的结果。

## 精准性证据

Semantic 回归建立 `outer -> middle -> inner` 三层跨文件工厂链，先证明 readonly 构造状态能传到消费方，再执行以下检查：

1. 更新无关函数后，`outer` 不重新解析，原结论保持。
2. 把 `inner` 改成无法解析的调用后，`middle` 与 `outer` 的正摘要均失效，消费方不再获得旧结论。
3. 把 `outer` 改为直接 `new State()` 后重新建立空依赖节点；再次修改 `inner` 时，`outer` 不重新解析且自身结论保持。

## 验证

- `pnpm typecheck`：通过。
- `pnpm lint`：通过。
- `pnpm test`：十六个组件 625 项、根扩展 35 项，共 660 项通过；Semantic 254/254，Language Server 163/163。
- `node scripts/benchmark-editing.mjs 500 50`：500 次更新无陈旧补全；更新到诊断 P50/P95/最大值为 1.91/3.77/6.36 ms，热补全为 0.79/1.29/3.16 ms，取消 1.38 ms，最终 RSS 相对基线减少 3.35 MiB，损坏缓存恢复及重启后补全恢复均通过。
- `pnpm verify:packages`：十六个组件 tarball 在仓库外隔离消费者中安装和调用成功。
- `pnpm package:all && pnpm verify:vsix`：三份 VSIX 构建和内容检查通过。
- `pnpm test:extension:packaged`：VS Code 1.137.0 Linux x64 隔离 Profile 的完整 Extension Host 回归退出码为 0。
- 提交 `72afd9a` 的 [CI 34902843097](https://github.com/sohophp/php-companion/actions/runs/34902843097)：18/18 成功；Linux、Windows、macOS 的 Quality、打包 Extension Host、七扩展 Open Source Profile 及 PHP 7.2–8.5 运行时矩阵全部通过。

本地候选 SHA-256：

- `php-companion-0.4.5.vsix`：`3bf01002c678be326204ffbfbcdd6914550cc70d558b81d25ea94599866d2dc6`
- `php-companion-open-source-pack-0.4.5.vsix`：`6d6eb143f43fc6a21c78314e3abcf7dfa198388722d276c12e8c583a3360ecf3`
- `php-companion-recommended-pack-0.4.5.vsix`：`6c5d7e79e139e2f70f59ea98d0caf73d0ff9b851ff150086a269ff6ba5a6db40`

## 边界

本增量只持久维护进程内已消费摘要的依赖。语义快照恢复时本来就会丢弃所有派生摘要，因此没有升级 schema 72 或 Language Server v44 缓存。通用 Callable 事实持久化、把非直接返回的数据流纳入依赖、Symfony YAML/编译容器外部事实持久化及方法体独立磁盘记录仍待完成，P3 总项保持开放。
