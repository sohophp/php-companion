# Symfony Language Tools 0.20.1 复核（Linux / WSL）

日期：2026-09-12。环境：Linux x64 / WSL，VS Code 1.137.0；真实项目为 Winstar，Symfony 7.4、PHP 8.5.9，项目 PHP 命令为 `bin/php-runtime`。

## 结论

Symfony Language Tools 可以作为 PHP Companion 之外的 Symfony 专用组件直接复用。扩展包只声明 Marketplace ID `symfony.language-tools`，不复制它的源码或功能；通用 PHP 语义仍由 PHP Companion 提供，Twig 仍由 TwigPlus 提供。

0.20.1 的独立服务器在 Composer 依赖完整的 Winstar 工作区完成初始化，并在约 24 秒内把 `/var/www/php/8.5/winstar2024` 的 source index 推进到 `ready`。验证使用静态模式，`runtimeEnabled=false`、runtime 状态为 `not-indexed`、环境为 `dev`；没有执行项目内核。该结果证明 Linux/WSL 下的真实项目发现与静态源码索引，不外推到 Windows、macOS、运行时容器索引或每项 Symfony 功能。

## 组合门禁修正

Open Source Profile 门禁此前直接把冻结的扩展目录传给 VS Code。2026-09-12 的复测触发 Marketplace 自动更新并在该目录新增 0.20.1。测试运行器现在在临时 user-data 中固定：

```json
{
  "extensions.autoCheckUpdates": false,
  "extensions.autoUpdate": false,
  "update.mode": "none"
}
```

后续 0.20.0 和独立 0.20.1 Profile 运行前后对全部普通文件生成 SHA-256 清单，清单完全一致；冻结组合不再被宿主改写。两次完整 Open Source Profile 测试均验证同一主 VSIX并以退出码 0 完成。

## 第三方边界

合成组合 fixture 只声明 `symfony/framework-bundle`，没有安装 `vendor/`。0.20.0 与 0.20.1 都会在该工作区初始化后报告 Revolt `DriverSuspension` / Amp `LocalSemaphore` 事件循环退出，0.20.1 随后产生 `EPIPE`。官方文档要求应用 Composer 依赖已经安装，因此该 fixture 不满足 Symfony Language Tools 的项目要求；组合宿主退出码 0只能证明 PHP Companion 与其余工具没有被拖垮，不能证明 Symfony 服务器在该无依赖 fixture 中正常工作。

真实 Winstar 的 source index 到达 `ready` 后，手工 stdio 验证器发送标准 `shutdown` 与 `exit` 未观察到服务器自行退出，最终由验证器终止进程。本轮不把服务器生命周期或合成工作区崩溃标为已修复，也没有代用户向上游提交 issue。

官方依据：

- [Symfony Language Tools README](https://github.com/symfony/language-tools)：定位为通用 PHP LS 的补充，并要求运行时索引所需 Composer 依赖已安装。
- [VS Code 使用指南](https://github.com/symfony/language-tools/blob/main/docs/editors/vscode.rst)：说明平台包、项目 PHP 命令、静态/运行时配置与故障日志。
- [功能矩阵](https://github.com/symfony/language-tools/blob/main/docs/features/index.rst)：静态索引与运行时元数据的能力边界。

公开 Marketplace 发布未执行。
