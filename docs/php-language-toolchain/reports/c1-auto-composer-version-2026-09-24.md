# C1 auto 版本进入多根语言服务器

日期：2026-09-24。此前扩展把 `phpCompanion.phpVersion=auto` 固定传为 PHP 8.5；VersionManager 虽能从 Composer 和 PHP 运行时解析目标版本，语言服务器启动时并未使用结果。

扩展现在先刷新各工作区根的版本状态，再把 VersionManager 的解析结果传给语言服务器。显式设置仍直接生效；auto 解析失败时使用保守的 PHP 7.2 回退。设置或工作区根变化后，在版本状态刷新完成时重启服务器；Composer 文件变化使 VersionManager 更新目标版本时，也会重启服务器并重新处理打开的文档。

隔离 VS Code Core 宿主使用两个临时 Composer 项目：首根 `require.php >=7.2` 解析为 PHP 7.2，第二根 `config.platform.php=8.5.0` 解析为 PHP 8.5，两根均未设置显式版本。相同版本语法文件在首根得到 `match`、`enum`、`(void)` 三项不支持诊断，在第二根无此诊断；`str_contains` 只在第二根的内建补全中出现。运行中把第二根平台版本改为 8.1.0 后，诊断变为仅有 `(void)`；随后显式改为 7.2，诊断与补全再次更新。宿主退出码 0。显式 7.2、8.1、8.5 的既有宿主流程也各以退出码 0 复测。TypeScript 和相关 ESLint 检查通过。本轮未改语言服务器代码，上一轮语言服务器全套为 305 项通过、1 项跳过。

运行时可执行文件探测、嵌套 Composer 项目和虚拟内建声明文档的跨根版本显示尚未完成对应宿主验收。实际建议弹窗显示时间、完整 Open Source Pack、Remote 与持续使用仍按 C1 和后续门槛处理。未修改业务项目，未打包 VSIX。
