# Open Source Pack 测试提供者候选筛选

日期：2026-09-25。目标是为已复现旧路径读取异常的 `recca0120.vscode-phpunit` 3.9.40 寻找可直接替代的成熟开源提供者。核对上游仓库、Marketplace 扩展和临时目录中的 PhpNexus 1.0.1 安装包；未修改 Pack 清单。PhpNexus 曾被 VS Code CLI 转发到当前 WSL 扩展环境，随后已卸载，并确认扩展列表中不存在该 ID；这一步不作为隔离安装验收。

| 候选 | 当前可核对的版本与能力 | 结论 |
| --- | --- | --- |
| [PHPUnit & Pest Test Explorer](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit) | 当前冻结 3.9.40；同时支持 PHPUnit 与 Pest，已通过常规运行/调试组合门禁，但在完整 C3 文件事件交错中有未处理旧路径 ENOENT。对上游提交 `90814392887e157c9fad92139571aa7fb6e01641` 的[隔离补丁](phpunit-enoent-patch-evaluation-2026-09-25.md)已通过完整 11 项源码宿主一次。 | 功能覆盖最好；原版不能被称为已稳定，补丁尚未交付。 |
| [PHPUnit Runner](https://marketplace.visualstudio.com/items?itemName=AOSSoftware.aos-phpunit) | 上游仓库 `ayanozturk/vscode-phpunit-runner` 的 `f27b1d8d0620323e5521bb84508d33d907cdbd17` 为 2026-08-31 的 0.4.0；隔离 VS Code CLI 在 2026-09-25 实际安装到 Marketplace 0.2.0。提供原生 Testing 视图、PHPUnit 发现与运行；仓库 manifest 未声明 Pest。源码读取失败会被捕获，不直接复用 Recca 的 `parseFile` 路径。 | Marketplace 版本落后源码，且缺 Pest；尚未通过同一组合运行门禁，不能直接替换默认提供者。 |
| [PHPUnit Test Workbench](https://marketplace.visualstudio.com/items?itemName=chiefmyron.phpunit-test-workbench) | 上游仓库 `chiefmyron/phpunit-test-workbench` 最新检出的提交 `02647b3ac8545d197712e2a9f30b5d471f39348b` 为 2025-11-15 的 0.8.4；公开说明要求 PHPUnit 9–11，提供原生 Testing、调试和覆盖率，但未声明 Pest 或 PHPUnit 12。 | 覆盖范围比当前提供者窄，未通过同一组合门禁；不直接替换。 |
| [PhpNexus](https://marketplace.visualstudio.com/items?itemName=forward2k.phpnexus) | 只读检查 1.0.1 安装包：声明 PHPUnit/Pest Testing 实现，但 `phpnexus.phpactor.enabled`、`phpnexus.xdebug.enabled`、`phpnexus.format.enable`、`phpnexus.staticAnalysis.enabled` 默认均为 `true`；还无条件声明 PHP 调试器和 PHP 格式化 Provider。安装包无自动测试脚本。 | 与现有 Core、PHP Debug、PHP CS Fixer 的默认职责重叠，不适合直接进入 Pack；若只取测试视图，须先隔离验证关闭其它功能后的实际注册、文件 Rename、运行/调试及 Remote。当前不投入完整组合门禁。 |

本轮没有发现已经可以直接替换的测试视图提供者，因此保持当前 10 项 Pack 清单不变：项目 PHPUnit/Pest CLI 是默认测试入口，原版 PHPUnit 扩展已移出 Pack。候选补丁或其它测试视图须先通过实际安装、PHPUnit/Pest 运行调试、完整 Pack 文件事件及 Remote 门禁，才能进入默认组合。这个结论是候选筛选，不是对未完成验证的替代扩展作稳定性判断。

2026-09-25 上游复核记录：当时 Marketplace Gallery API 返回 `recca0120.vscode-phpunit` **3.9.40**，GitHub `main` 为 `90814392887e157c9fad92139571aa7fb6e01641`；该提交上，[现有补丁](../patches/vscode-phpunit-3.9.40-enoent.patch) `git apply --check` 通过。已备好[上游修复说明草稿](../patches/vscode-phpunit-enoent-upstream-draft.md)，尚未向上游发送 Issue、PR 或消息。**当前 10 项源码 Pack 已移出原版测试扩展**；项目 PHPUnit/Pest CLI 是默认入口，测试视图候选需通过相同组合门禁后再加入。
