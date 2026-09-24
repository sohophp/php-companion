# C3 生成文件 Redo 与 PHPUnit 测试文件 Rename 复核

日期：2026-09-25。环境为隔离 VS Code 1.139.0 Linux Extension Host 和独立 Composer 夹具；未修改业务项目或生成 VSIX。

## 生成文件的 Redo

在已有 `WorkspaceEdit.createFile` 探针外，又分别验证了两条资源管理器优先路径：创建并打开 PHP 文件后，先聚焦文件资源管理器，再用 `executeCommand('undo')`/`executeCommand('redo')`；另用 X11 XTest 在相同焦点下发送 Ctrl+Z/Ctrl+Shift+Z。两条路径都观察到 Undo 删除文件、随后 Redo 未恢复文件。宿主均退出 0，日志为 `/tmp/sophp-c3-explorer-first-probe.log` 和 `/tmp/sophp-c3-keyboard-resource-probe.log`。

这些是隔离 Linux 宿主中的命令与注入键盘事件证据；不能推出其它 VS Code 版本、平台或真人键盘操作也失败。VS Code [WorkspaceEdit API](https://code.visualstudio.com/api/references/vscode-api#WorkspaceEdit)支持资源创建和编辑，[官方文件资源撤销测试计划](https://github.com/microsoft/vscode/issues/111015)指出撤销目标受编辑器/资源管理器焦点影响。本轮焦点对照仍未找到可通过 C3 一次 Redo 门槛的交互。因此类型生成继续保持预览、取消、应用及一次 Undo 已验，Redo 不计完成；不加入无法证明可靠的自定义撤销替代流程。

2026-09-25 再以相同 X11 宿主路径试验 Ctrl+Y：Undo 删除、Redo 仍未恢复；日志 `/tmp/sophp-c3-ctrl-y-resource-probe.log`，宿主退出 0。临时探针已撤回，产品代码未因此更改。

## PHPUnit 测试文件 Rename

在 11 项 Open Source Pack 源码 Profile 中，夹具使用 `phpunit.xml` 限定 `tests/*Test.php`，并在 `autoload-dev` 将 `App\\Tests\\` 映射到 `tests/`。验证了两种操作：普通测试文件的资源重命名、Undo/Redo；从 `C3ConfiguredTest` 类声明发起 SoPHP Rename，同步类名和对应文件名，再 Undo/Redo。文件内容与路径均正确，观察窗口内没有 PHPUnit 扩展针对旧测试文件路径的未处理 `ENOENT`；日志为 `/tmp/sophp-c3-phpunit-sophp-rename-pack.log`，宿主退出 0。

这关闭了**已配置 PHPUnit 测试目录**的测试文件 Rename 组合门槛。没有 `phpunit.xml` 的项目此前会触发外部 PHPUnit 扩展的旧路径读取异常，仍不属于已通过组合；冻结版本为 `recca0120.vscode-phpunit` 3.9.40，后续评估可配置的稳定替代或上游修复。SoPHP Core 的类型生成 Redo 与该外部问题分别跟踪。

该扩展的[Marketplace 入门步骤](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit)要求项目包含 `phpunit.xml` 或 `phpunit.xml.dist`。当前 Pack 保留测试扩展作为已配置项目的默认测试所有者；无测试配置的项目应在当前工作区禁用它，直至有配置或上游修复。这个使用边界不将无配置项目计作已通过测试组合。
