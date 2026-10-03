# Symfony Controller 重复 Finding：候选兼容性修正

2026-10-03，按真人测试反馈排查。路线图 goal 保持 paused，只处理安装候选反馈。

## 原因及边界

WSL 当前窗口 SoPHP 日志反复出现 `Request does not match semantic-provider protocol 1`。Core 源码提交 910d35e 将共享 Controller 文档快照上限从 128 调整为 512；上次只更新 Core 安装，遗漏了静态打包旧校验器的 Symfony Provider。实际项目候选扫描命中 197 份源码，超过旧校验器上限。

安装中的旧 Provider 用真实 CLI 探针接受 128 份文档、拒绝 129 份文档，复现同一协议错误。失败时不会记下成功扫描 epoch，下次 interop 请求再次执行 Finding。因此不能把反复出现的进度当作正常一次冷启动，也不是 PHP 版本设置问题。

## 修正交付

按当前已提交源码重建 Symfony dist，先通过边界验证，再备份并直接更新 WSL Symfony 0.4.13 的 8 项 runtime 文件，逐字核对。Core 和 Pack 安装没有更改；未打包、推送或发布。

备份与安装哈希：`/home/jason/.local/share/sophp-checkpoints/20261003-233716-symfony-snapshot-compatibility/delivery.json`。备份中的 dist 保存原 8 项文件。

## 证据

- 可复用命令 `node scripts/check-symfony-provider-snapshots.mjs [Symfony dist 目录]`：当前构建和实际安装均接受 128／129／512，拒绝 513；拒绝保持原协议错误及退出码 2，未关闭保护。
- 两项定向 LSP 测试通过：bundled authoritative Controller interop；watched-file batch 一次刷新。此次仅选择这两项，其余测试跳过，不称完整协议回归。
- 以独立 LSP 进程、临时缓存、实际安装的 Symfony Provider，对 Winstar 项目只读请求 3 次：24 个上下文保持一致；2536 文件、197 候选仅扫描 1 次；Finding begin／end 各 1 次；协议错误 0。首次约 13.71 秒，重复请求约 2.39／2.05 ms。独立临时缓存和进程已清理。
- 运行中的真实窗口日志最后一次旧协议拒绝为 23:37:13；随后已成功提交 Controller 上下文。该日志证据不等于人工确认进度 UI 已不重复。

源码编辑／配置变化仍可触发必要刷新。上述实项目探针仅证明没有变更的连续查询能复用结果，不是持续真实 WSL 操作或全部 watcher 行为的验收。请重载窗口后观察；空闲时若仍反复 Finding，应记录时间与是否发生项目文件变化，再定位对应触发源。

## 后续候选规则

Core 的共享 Provider 输入、校验规则或 Parser 发生改变时，必须核对静态打包这些依赖的 Symfony Provider。仅看扩展版本号同为 0.4.13 不能证明兼容。交付前运行上述命令检查当前构建及实际安装，按必要依赖更新，仍不例行重打三份 VSIX。
