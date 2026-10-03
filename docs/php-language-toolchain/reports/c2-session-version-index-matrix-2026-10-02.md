# C2 持续编辑的版本与索引模式矩阵

日期：2026-10-02。复用既有独立两文件 Composer 夹具，通过实际语言服务器 stdio 检查跨文件 PHPDoc 类型的未保存切换与关闭后的磁盘恢复。扩充现有 `scripts/benchmark-c2-session.mjs`，新增 `SOPHP_C2_PHP_VERSION` 和 `SOPHP_C2_INDEXING_MODE`，校验输入并把实际选择写入结果；默认行为仍为 PHP 8.5、onDemand。

## 本轮结果

PHP 7.2／8.5 各覆盖 onDemand、experimental、progressive。六组各 100 轮，全部退出码 0，共 600 轮和 3,000 次结果断言，无旧结果。每轮检查 Beta 补全、Hover、Definition，再关闭声明文件检查 Alpha 补全及旧 Beta Definition 撤回。诊断通知用来确认文档版本已处理，没有将它算成诊断内容验收。

逐组原始结果和等待、RSS 采样保存在 [JSON](c2-session-version-index-matrix-2026-10-02.json)。语言服务器构建与脚本 ESLint 通过；执行前后基准脚本、服务器、语义和语言规格入口四项 SHA-256 一致，记录在 `/tmp/sophp-session-matrix-inputs.sha256`。

复现单组：

```sh
SOPHP_C2_PHP_VERSION=7.2 SOPHP_C2_INDEXING_MODE=progressive node scripts/benchmark-c2-session.mjs 100
```

## 验收边界与后续

这是短时重复编辑的版本与模式检查。小项目的 RSS 前后差值包含初始化和缓存增长，不能据此判断长期泄漏，也不能证明数小时会话、真实 vendor、可见 UI 或 WSL 使用通过。后续复用较大 Composer 项目和宿主入口检查持续编辑，不继续扩展数组输入排列。本轮仅修改基准能力和记录，未打包、提交、推送或更新 Profile。
