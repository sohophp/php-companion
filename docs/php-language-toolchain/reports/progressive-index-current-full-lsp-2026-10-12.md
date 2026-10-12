# 渐进索引修正后的完整 LSP 回归

2026-10-12。正常构建 `552febd5536d4e070e1206e07ea0294ff6a3cd0b92bf5f7adca00a288ff21faf` 完整 LSP **127 文件 / 1542 项全部通过**，无失败、跳过或 todo。原 1540 项身份及数量保留，新增两个 PHP 7.2/8.5 渐进索引收尾并发反例；原 1530 基线及不完整路由快照的五种证据变体保持，原命令、时限和末阶段补全性能门禁保持。

此前 PHP 7.2 controllers 取消与 PHP 8.5 progressive 返回类型刷新两个完整失败用例本轮均通过。原 1533/1534 与 1539/1540 失败、无控制对照及受控反例继续保留；受控时序证明缓存收尾删除刚加载 vendor 的竞争，完整通过不能倒推前轮未采样失败的唯一根因。

30158 输入、184 链接、两仓状态、实际正常资产与自有进程组终态独立核对。303 文件归档包括原始 JSON、时序输出、构造查询 trace、源码、测试、包运行时和生产 bundle，全部再次校验。定向六接收者 / 十新鲜度协议与严格构建、Lint 另见[修正报告](progressive-index-hydrated-dependencies-2026-10-12.md)。

[机器报告](progressive-index-current-full-lsp-2026-10-12.json)、[完整回归终态审计](../../../.vscode-test/d2246-current-full-lsp-terminal-audit.json)、[原始证据归档](../../../.vscode-test/d2246-current-full-lsp-archive/manifest.json)。本报告只证明当前完整 LSP；新构建编辑器、完整扩展组合、真实项目全部性能、其它平台 / WSL Remote、真实长期及其余 P0–P9 / R4 范围继续。177 编号 / 14 家族、26 未完成大项保持，日常 Profile 未更新，未提交或发布。
