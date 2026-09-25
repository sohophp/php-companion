# C3 PHPUnit 测试类目标目录与确认信息

日期：2026-09-25。`New PHPUnit Test` 从普通源码目录调用时，若 Composer 有一个 `autoload-dev` PSR-4 目标，仍按该目标生成；现在确认消息同时显示类名和最终文件路径。若有多个测试目标且当前目录不在其中，先让用户选择目标，避免静默取列表第一项。类型生成中无作用的 `effectiveKind` 分支已移除。

补充：项目没有 `autoload-dev` PSR-4 映射时，命令不再沿用当前源码目录创建测试类，而是要求用户明确选择当前 Composer 项目中的现有测试目录。此时生成无命名空间的 PHPUnit 测试类；取消选择不打开预览、不创建文件。实现还检查所选目录位于同一 Composer 项目。独立 C3 宿主以无 `autoload-dev` 的夹具验证取消、选择 `tests/` 后的预览路径与实际文件内容，退出码 0；日志 `/tmp/sophp-c3-unmapped-test-directory-20260925.log`。本轮没有冻结 VSIX，也未解决生成文件的 Redo 门槛。

随后补齐资源管理器的直接操作：若命令目标本身是当前项目中已存在的 `test/` 或 `tests/` 目录及其子目录，就直接使用该目录，不再重复弹出选择器；从普通源码目录发起仍要求选择。对应显式目录的宿主回归见 `/tmp/sophp-c3-explicit-unmapped-test-directory-20260925.log`。

完整 11 项 Open Source Pack 源码宿主在独立 Composer 夹具中验证：从 `src/Service` 调用测试生成，预览 URI 指向 `tests/C3GeneratedTest.php`，内容使用 `App\Tests` 与 PHPUnit `TestCase`；取消后没有创建文件。根扩展和测试 TypeScript、相关 ESLint、差异检查通过；最终宿主退出码 0，日志 `/tmp/sophp-c3-test-preview-path-only-retry-20260925.log`。多目标 QuickPick 分支通过类型检查，尚无真实操作验收；确认消息的实际点击也未由测试钩子覆盖。

首次尝试额外加入“创建测试文件后立即删除”时，完整 Pack 宿主随后在已配置测试文件 Rename 上出现 `recca0120.vscode-phpunit` 3.9.40 的未处理旧路径 ENOENT；日志 `/tmp/sophp-c3-test-generation-path-20260925.log`。撤去这段额外文件事件后，第一次重跑在已有 addImport 暂停钩子上失败，第二次重跑通过。这个样本不足以归因或判定复现频率，提示后续组合门禁须单独覆盖测试文件创建/删除与 Rename 交错。不能用此次通过证明 PHPUnit 扩展在长会话中稳定。

生成文件 Undo 后一次 Redo 仍不能恢复，C3 类型生成的完整撤销链继续开放。本次没有打包 VSIX，也没有修改业务项目。
