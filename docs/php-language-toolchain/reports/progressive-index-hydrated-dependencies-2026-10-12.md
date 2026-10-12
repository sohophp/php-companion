# 渐进索引收尾保留查询加载的依赖

2026-10-12。此前完整 LSP 为 1539/1540，PHP 8.5 progressive 的父类未保存返回类型变更后得到 25/26 个引用；原失败结果保留。无时序控制的四种定向模式均通过，不能据此覆盖完整失败。

隔离时序对照明确复现了可导致同样缺失的清理竞争：源索引在 `onProjectComplete` 发布项目集合，查询在源缓存写入期间加载 `Response.php`；最终清理用源文件集合判断 vendor 文件过期并删除它。控制中 PHP 7.2/8.5 progressive 均丢失原 `Response.php` 调用，onDemand 保持全部位置。这个控制证明该竞争，未证明前轮未采样完整失败的唯一根因。第一次隔离运行时缺少 worker 的设置失败另行保留。

现在 source-only 索引继续在项目完成阶段清理项目源，最终发布合并扫描集合与期间加载的依赖；完整依赖扫描的原清理保持。新增仅 testMode 生效的缓存收尾暂停点，两项持久并发回归在修正前均为 25/26 失败，修正后通过；原四种模式的冷 25 / 更新后 26 个精确位置及磁盘保持检查通过。严格 Language Server 构建、正常生产 bundle 和定向 Lint 通过。

正常生产构建 `552febd5536d4e070e1206e07ea0294ff6a3cd0b92bf5f7adca00a288ff21faf` 的六项接收者协议及十项原准备源码新鲜度协议全部通过；包运行时六项另行通过，不能重复累计为不同需求覆盖。原四项身份与十项新鲜度身份保持，17 项源码/实际运行时输入复核，终态未观察到对应运行时进程，81 文件归档全部复核。

[机器报告](progressive-index-hydrated-dependencies-2026-10-12.json)、[终态审计](../../../.vscode-test/d2244-receiver-cleanup-terminal-audit.json)、[证据归档](../../../.vscode-test/d2244-receiver-cleanup-archive/manifest.json)。扩展 F04-REF-08，177 编号 / 14 家族、26 未完成大项保持。新构建完整 LSP、编辑器、完整组合、性能、其它平台 / WSL Remote、真实长期与 F13 / P9 / R4 继续；旧构建结果只证明各自快照，日常 Profile 未更新，未提交或发布。
