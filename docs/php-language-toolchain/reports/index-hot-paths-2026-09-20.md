# 索引热路径微优化验收

日期：2026-09-20。范围：真实 Winstar project-only 冷索引剖析中 `DocumentKeyIndex.replace()` 与 Composer `exclude-from-classmap` 路径判定的无语义变化优化。

## 变更

- `DocumentKeyIndex` 和 `DocumentDependencyGraph` 只在首次出现 posting 容器时写入 `Map`；已有容器直接追加，不再执行冗余 `Map.set()`。更新、删除、预算拒绝和保守回退契约不变。
- Composer 排除规则先按规范化包根执行严格目录边界判断。候选不在该包内时跳过 `path.relative()` 和正则；命中作用域后仍执行原有相对路径与绝对路径检查。Windows 比较保持大小写不敏感，POSIX 保持大小写敏感；相邻前缀目录不会误判为包内文件。
- 两项分别由提交 `7932ee1` 和 `c91880f` 实现，均以 patch Changeset 记录，可随 monorepo 组件独立发布。

## 剖析与基准

V8 CPU profile 来自真实 Winstar 2,275 个项目 PHP 文件的冷索引。原始 profile 中 `DocumentKeyIndex.replace()` 自耗时 452.6 ms，`node:path.relative()` 自耗时 283.1 ms；这两个热点均位于解析、语义和持久缓存之外。

posting 微基准使用真实 Winstar 文件产生的引用候选键，共 16,954 个键、195,846 个 postings。旧/新算法各执行两组 30 轮并反向排列：旧实现为 4,568.08/3,619.59 ms，新实现为 4,302.86/3,545.67 ms，平均下降 4.14%。统计完全相同，并抽样核对 11 个文档候选集合；完整增量正确性由 index 与 semantic 既有测试覆盖。该结果只证明 posting 构造热路径，不代表冷索引整体下降 4.14%。

Composer 排除微基准使用相同 2,275 个真实项目 PHP 文件和 61 个带规则的项目/依赖作用域。旧实现两组 30 轮为 12,008.91/11,303.41 ms，新实现为 1,172.03/1,206.68 ms；平均每轮从 388.54 ms 降至 39.65 ms，下降 89.80%，全部 2,275 个布尔结果一致。该收益来自跳过与候选文件无关的依赖包作用域，不改变实际排除匹配。

完整 Winstar 冷/热可靠性基准为 47.172/6.025 秒，冷索引 2,275 个文件、9,528,897 bytes，热启动恢复 2,275/2,275，项目索引完整且无警告。上一候选同脚本冷索引为 47.171 秒，因此本轮不宣称可测量的整体冷索引提升；解析、语义、校验和及系统噪声远大于本次约 350 ms 的单次路径筛选差异。

## 自动验证

- `@php-companion/project`：类型检查和 8 项测试通过；新增相邻根前缀及依赖包自身排除的正反例。
- `@php-companion/index`：27 项测试通过。
- `@php-companion/language-server`：196 项测试通过。
- 相关 ESLint 与 `git diff --check` 通过。
- 24 个组件 tarball 在仓库外消费者完成安装和导入验证。
- 四份 VSIX 内容验证通过；VS Code 1.138.0 隔离 Profile 同时加载核心与独立 Symfony VSIX，打包 Extension Host 退出码为 0。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 确定性预检通过，见 [Winstar JSON](alpha-preflight-winstar-exclusion-scope.json) 和 [CoreRepo JSON](alpha-preflight-corerepo-exclusion-scope.json)。

## 候选与安装

候选目录为 `artifacts/php-companion-alpha-0.4.5-c91880f2/`，绑定提交 `c91880f2806550c5c42b194e3ec96392b05eaed7`：

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `10220f3e468fca047cde3573fe5b842aec847bd39a0e7b10850dba499facfb42` |
| `php-companion-symfony-0.4.5.vsix` | `51f7c30d93f9b8a9a8cfd429850e9996bb97473e2f6022dffff68ecefee10014` |
| `php-companion-open-source-pack-0.4.5.vsix` | `cc0b10ec63c5075aaea24674c86c7e5bd17b86cffa62bf4d12e7eb6925526b1f` |
| `php-companion-recommended-pack-0.4.5.vsix` | `8b2b69a3ecab608da5634560aa9ba03f4b04d953e6ed9aefde913a0c4e2cd2ca` |

核心和 Symfony VSIX 已覆盖安装到 WSL。已安装核心 Language Server 与构建输出 SHA-256 均为 `abe150d56fa9e1173b74cb99eaf199845a48a90f2a68a4bf1222b023daf7b899`，Symfony extension bundle 均为 `1bb5d069e0214174d04c3555647676653956b2a290a8ac8dd8b4cf4c628b751a`。旧 Language Server 被精确终止后，新进程自动启动。

公开 npm/Marketplace 发布、Windows 客户端连接 WSL Remote 的人工归属检查，以及 Winstar/CoreRepo 各两小时真实编辑会话仍未执行；本报告不把这些门槛标记为完成。
