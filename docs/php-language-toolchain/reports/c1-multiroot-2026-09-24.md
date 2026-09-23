# C1 多根 Composer 工作区隔离

日期：2026-09-24。两个独立 Composer 根目录定义相同的 `App\Contract`、`App\Printer` 与 Consumer，但 `render()` 分别使用 `int → string` 和 `string → void` 签名。真实 stdio 的 F04-NAV-14 在同一服务器会话中验证两根的 Completion、Hover、Signature Help、Definition、Implementation、References 均归属各自项目；首根 Consumer 未保存地切换接收者后，Definition 指向新类型，第二根六项查询仍不变。定向测试 1/1 通过，TypeScript 和 ESLint 通过。

隔离 VS Code Core 宿主使用两个临时 Composer 根目录和一个临时 `.code-workspace`，复测两根中相同全限定类名的查询归属。References 的 VS Code 命令返回第二根调用与接口声明，均在第二根内。auto、PHP 7.2、8.1、8.5 四次串行运行退出码均为 0。

测试还发现扩展在多根工作区启动时用无目录作用域的 `phpCompanion.phpVersion` 初始化语言服务器，忽略了根目录的显式版本设置，导致 PHP 7.2 的版本诊断缺失。扩展现在按首根目录的配置初始化服务器；三个版本锚点的诊断和多根查询链均通过。当前语言服务器仍共享一个 PHP 目标版本，两个根分别配置不同 PHP 版本的场景尚未完成。真实建议列表显示时间、Remote 与完整 Open Source Pack 组合也仍待验。未修改业务项目，未打包 VSIX。
