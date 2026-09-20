# Symfony Controller 上下文批量刷新

日期：2026-09-20

功能提交：`783ac2c9c078c07aa144f56a301401e8c620f005`

## 问题

Composer 项目快照复用消除了普通 watcher 事件反复遍历依赖图的问题，但同一个 VS Code watcher 通知包含多个 PHP 文件时，Language Server 仍会逐文件启动独立的 Symfony Controller 上下文 Provider。切换分支、代码生成和批量格式化会因此重复启动进程并重复建立 Controller → Twig 上下文。

## 实现边界

- watcher 仍按文件顺序更新通用 PHP 语义工作区和 Doctrine 增量事实。
- 同一批次中语义发生变化的 PHP 文件按 Composer 根分组，以一个有界文档快照数组调用一次权威 Controller Provider。
- Provider 返回后，每个文件的上下文独立替换；没有 render 上下文的文件写入空集合，避免保留旧结果。
- Provider 缺失、冲突、失败或返回无效位置时，批次内每个文件的旧上下文都会清除。
- `[index:delta] complete` 在批量 Provider 提交以后发布，收到完成日志的客户端不会读到刷新前的 Twig 上下文。
- 打开、编辑和关闭单个文档的实时路径继续发送单文档数组，不改变原来的低延迟行为。

## 验证

- 新增真实 stdio 生命周期回归：同时修改两个 Controller 并发送一个 watcher 通知，Provider 执行计数只增加 1；查询同时得到 `first-edited.html.twig` 和 `second-edited.html.twig`，证明第二个文件没有因合并而丢失。
- Language Server 5 个测试文件共 192 项通过。
- 全仓 TypeScript 和 ESLint 通过。
- 24 个 monorepo 组件从真实 tarball 在仓库外安装运行通过。
- 四份 VSIX 内容门禁通过；VS Code 1.138.0 打包 Extension Host 同时加载核心和独立 Symfony 扩展，退出码为 0。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 确定性预检通过；对应 JSON 报告随本次证据提交保存。

## 候选与安装

候选目录：`artifacts/php-companion-alpha-0.4.5-783ac2c9/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `61a0241824345a8d13d2be6193f0b0279e30f03bee447e3cbb0e8e52f80e2dc3` |
| `php-companion-symfony-0.4.5.vsix` | `ea4c49ab42304ff4373d3825258549f21d6aa178ac97527ef1ce87c64d523e9e` |
| `php-companion-open-source-pack-0.4.5.vsix` | `bb8196c5eb17f69235bf5c316a309ac63a3f06f22526c44e2984666af52dcc2f` |
| `php-companion-recommended-pack-0.4.5.vsix` | `b81736e42ad1179a064fe2696e7bdafe7099779064ae5fa507f2923a896c0271` |

核心和 Symfony 候选已覆盖安装到 WSL RockyLinux8。构建与安装目录中的 `dist/language-server.js` SHA-256 均为 `298743bf165efe957fe41d358863ef6506711d0eea6e3bdbaf2e93c74a803026`；只重启语言服务器后，现有 Extension Host 已自动启动新进程。

本次验证覆盖批量 watcher 的语义完整性与 Provider 执行次数，不替代 Alpha 两小时 Winstar/CoreRepo 连续编辑验收。
