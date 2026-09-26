# C3 类型生成暂存清理与备用移动门禁

日期：2026-09-27。验证位于 SoPHP 隔离源码分支与独立 Composer 夹具；未修改业务项目，也未重新打包 VSIX。

类型生成先尝试系统临时目录的预备文件移动，再尝试工作区同级的预备文件移动。两次移动均失败时，最后使用 `WorkspaceEdit.createFile`。本轮把被拒绝的同文件系统移动纳入默认 C3 断言：测试记录其暂存路径，在命令转入最终创建路径后检查该暂存文件已删除。通过 `PHP_COMPANION_TEST_C3_STAGE_ONLY=1` 可在完成创建路径的应用结果检查后结束宿主；与 `PHP_COMPANION_TEST_C3_FALLBACK_REDO_PROBE=1` 合用时，还验证第二次移动成功后的 Undo 删除和 Redo 恢复。

完整 10 项 Open Source Pack 的 PHP 8.5 源码宿主在上述定向门禁中退出码 0；日志 `/tmp/sophp-c3-type-stage-pack10-20260927.log` 记录 `C3 fallback stage Redo: restored=true`、最终创建结果核对通过和 `C3 type generation stage-only gate passed`。扩展测试 TypeScript、相关 ESLint 与差异检查通过。

同轮的完整 C3 Pack 宿主先有两次在 Symfony 服务 Rename 准备阶段以 VS Code `Canceled` 中断，第三次完整通过，日志 `/tmp/sophp-c3-current-pack10-stage-20260927.log`；加入暂存清理断言后的又一次完整运行已执行并通过类型生成断言，但仍在该 Rename 阶段中断，日志 `/tmp/sophp-c3-stage-cleanup-pack10-20260927.log`。因此本轮只把定向门禁记为稳定通过，不把完整 C3 宿主认作稳定绿灯。

继续在 Symfony 服务 Rename 的预热结果、暂停请求与暂停生效处记录阶段日志后，包含暂存清理断言的**完整** 10 项 Pack C3 源码宿主连续两次退出码 0，日志 `/tmp/sophp-c3-rename-cancel-phase-20260927.log` 和 `/tmp/sophp-c3-rename-cancel-phase-repeat-20260927.log`。阶段日志只帮助定位再次出现的取消，不能证明取消根因已消除；稳定性结论仍需更多会话样本。它们确实补足了新断言加入后的完整套件通过证据。

成功移动后用户执行 Undo，暂存路径可能重新出现，供 Redo 使用；本轮没有清除这种可恢复文件。最终 `createFile` 兜底的一次 Redo 仍是已知缺口。真实 WSL Remote、跨平台和已安装 VSIX 尚未由上述源码宿主验收。
