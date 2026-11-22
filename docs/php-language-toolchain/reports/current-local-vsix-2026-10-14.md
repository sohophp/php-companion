# 当前候选本地 VSIX 打包核对

2026-10-14。本批针对正常 Core `f60765a4` 核对三份本地安装包，不增加功能。原工作区中的旧包不包含当前 Core，本次实际重新打包，在独立目录保存新包后恢复三份旧包。

**已执行并通过**：原 `pnpm package:all`、`pnpm verify:vsix` 均退出 0，独立终态核对通过。3187 项冻结输入保持；Core 和 Symfony 各 8 份 JavaScript/WASM 包内文件与当前正常构建逐字一致；三份旧包与备份摘要一致。驱动、原阶段命令及所属进程组均已结束，8 份执行记录的原件与归档副本摘要一致。

| 安装包 | 版本 | 字节数 | 新包 SHA-256 |
| --- | --- | --- | --- |
| Core | 0.4.13 | 4171641 | `b6d569edbe10a162428b551249c035f60f25e51866d46d06d3faf6a20a9605fc` |
| Symfony | 0.4.13 | 647404 | `84bae583f1c3bdb67b29df3c17d0f6b3a1a155861dd7b30f2b6d466dc271eaa5` |
| Open Source Pack | 0.4.13 | 69945 | `caea16405ee050d8fb1a9385de267a1e864f08c5307ed248c6026f5fbeb9c1c3` |

新包独立保存在[产物目录](../../../.vscode-test/current-local-vsix-2026-10-14/artifacts/)。Core 包内语言服务器完整摘要为 `f60765a40ed94dbe9a85d9692203af9c986c971ba3c834108b1ef1d8abc93375`。

证据：[真实执行状态](../../../.vscode-test/current-local-vsix-2026-10-14/state.json)、[独立终态核对](../../../.vscode-test/current-local-vsix-2026-10-14/final-audit.json)、[冻结输入](../../../.vscode-test/current-local-vsix-2026-10-14/inputs.json)、[归档摘要](../../../.vscode-test/current-local-vsix-2026-10-14/archive/manifest.json)。

**未执行**：从这些 VSIX 加载的编辑器操作链、真人 WSL 验收、安装和发布。已有源目录编辑器自动化通过记录与本次包内容一致性分别保留；内容一致不自动代表打包后的编辑器流程通过。工作区有未提交修改，本批仅产出本地开发包，没有取得要求干净提交的 Alpha 候选资格。版本号相同不代表与正式发行包相同。

本批打包核对已收口。下一项优先核对冻结包的加载与既有操作链；复杂 Controller 原 500/150 ms 性能缺陷继续开放，新的性能调查需有新成本证据。功能扩展暂缓，完整长期目标未完成。

后续[冻结 VSIX 的完整 Linux 组合](current-packaged-profile-2026-10-14.md)已执行并通过；上述未执行项描述本批打包结束时的状态，完整组合与原独立包测试入口、真人资格分别记录。
