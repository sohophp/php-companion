# Symfony 来源事实持久化验收

日期：2026-09-15。范围：P3 的 Symfony service YAML 与新鲜编译容器来源事实持久化。

## 实现

- Language Server 为每个 Composer 根建立独立 `symfony-facts-v1` 缓存文件，不改变 PHP 语义快照 schema 72 或 v44 每文件缓存。
- `services.yaml` 保存分析后的显式服务和未展开 resource 规则；`var/cache/dev/*DebugContainer.xml` 只在现有新鲜度规则成立时保存编译服务、方法实参和属性实参事实。
- 每个条目绑定绝对来源路径、LSP URI、稳定的大小和 mtime、源内容 SHA-256，以及经过结构校验的事实载荷 SHA-256。热启动会读取来源以验证内容，但不会重新执行 YAML/XML 分析。
- 文件读取前后的大小或 mtime 不一致时仍可为当前会话分析该快照，但不写入持久缓存。文件监控明确报告变化时强制绕过对应条目。
- YAML resource 不保存最终展开服务；每次加载都以当前 PHP 类型目录重新展开，PHP 声明新增、删除或改名后不会恢复旧服务集合。
- 缓存限制为 32 MiB、64 个来源、每组 100,000 项事实和单字符串 1 MiB。缺失、超限、版本不符、根不符、URI 不符、结构异常或摘要不符均保守重建；单条损坏不影响其他来源。
- 写入使用同目录随机临时文件后原子 rename，避免并发提交复用临时文件名。

## 精准性证据

缓存单元回归使用真实 Symfony YAML/XML 分析器，证明：

1. 冷启动两个来源均分析，热启动两个来源均恢复且分析器调用为 0。
2. 保留原大小和 mtime、只改变同长度 YAML 内容时，源摘要不匹配并重建该来源。
3. 明确 bypass 的受监控 YAML 必定重建。
4. 篡改单个 YAML 事实载荷但不更新摘要时，只重建 YAML；XML 继续命中。
5. 同一路径切换到另一个 URI scheme 时拒绝旧事实，并以新 URI 重新生成范围。

真实 stdio 回归连续启动两个 Language Server 进程。冷进程报告 `2 sources (0 cached)`，热进程报告 `2 sources (2 cached)`；随后 `$container->get('app.mailer')->se` 仍精确补全 `send`。

## 验证

- `pnpm typecheck`：通过。
- `pnpm lint`：通过。
- `pnpm test`：十六个组件 628 项、根扩展 35 项，共 663 项通过；Semantic 254/254，Language Server 166/166。
- `node scripts/benchmark-persistent-index.mjs 10000`：冷索引 17,774.57 ms，热恢复 4,867.80 ms，热/冷比 0.2739；恢复 10,000/10,000、重解析 0，传递依赖恢复/失效和单文件损坏重建均通过。
- `node scripts/benchmark-editing.mjs 500 50`：500 次更新无陈旧补全；更新到诊断 P50/P95/最大值为 1.76/2.45/4.70 ms，热补全为 0.72/0.99/2.29 ms，取消 1.04 ms；最终 RSS 比基线增加 9.16 MiB，损坏缓存与重启恢复通过。
- `pnpm verify:packages`：十六个组件 tarball 在仓库外隔离消费者中安装和调用成功。
- `pnpm package:all && pnpm verify:vsix`：三份 VSIX 构建和内容检查通过。
- `pnpm test:extension:packaged`：VS Code 1.137.0 Linux x64 隔离 Profile 的完整 Extension Host 回归退出码为 0。

本地候选 SHA-256：

- `php-companion-0.4.5.vsix`：`358e23d8b22736f14f54586a55924058670a56d25bba9d47d44b8a5dc1f9009a`
- `php-companion-open-source-pack-0.4.5.vsix`：`0b9aac07890f7fbd8860d66a69a1e8af0ad2f8bccb5e019dbdf540dde17f0a57`
- `php-companion-recommended-pack-0.4.5.vsix`：`78c9897e80576e64205f3b5349eeb0df8670d56dbf2d7f1c03c8e0293ad64bc6`

## 边界与下一步

本增量保存 Symfony 外部来源的原始事实，不保存依赖当前 PHP 索引的 resource 展开结果，也不接受陈旧 debug container。P3 下一项应先持久化已经具有明确身份、依赖边和 unknown 边界的通用 Callable 工厂事实；随后再把大型 PHP 文件拆成独立声明记录和方法体记录。这样能继续缩短热启动，同时复用本轮已经验证的条目封装、损坏隔离和传递失效规则。
