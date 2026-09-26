# SoPHP Alpha 65f683c8：当前 WSL Remote 扩展清单

日期：2026-09-25。只读执行 WSL Remote CLI `code --list-extensions --show-versions`，再将本机 `/home/jason/.vscode-server/extensions` 中三款 SoPHP 产品的文件与私有 Alpha VSIX 逐文件计算 SHA-256。没有安装、卸载、更新扩展，也没有修改 Winstar 代码。

| 项目 | 当前 WSL Remote | 私有候选 | 结果 |
| --- | --- | --- | --- |
| SoPHP Core | 0.4.5 | 0.4.5 | 内容不同；候选的 `dist/sourceStatWorker.js` 未安装，另有 `package.json`、`readme.md`、`dist/language-server.js` 不同 |
| SoPHP Symfony | 0.4.5 | 0.4.5 | `package.json` 不同 |
| SoPHP Open Source Pack | 0.4.5 | 0.4.5 | `package.json`、`readme.md` 不同 |
| PHP Debug | 1.40.2 | 1.40.1 | 外部成员版本不同 |
| 其余七个直接外部成员 | 均已安装 | 候选冻结版本 | 扩展清单中的版本一致 |
| Apache Conf Snippets 依赖 | `mrmlnc.vscode-apache` 1.2.0 | 由上游依赖引入 | 已安装 |
| 原版 PHPUnit 测试视图 | 3.9.40 | 不在 Pack 中 | 当前 WSL 环境仍装有它；只读清单无法判断当前 Profile 是否禁用 |

单看三个产品的 `0.4.5` 版本会误判为安装了候选。`scripts/alpha-preflight.mjs` 现提供 `--check-editor --extensions-dir <实际扩展目录>`，在版本预检之外核对候选 VSIX 的全部 `extension/` 文件。对当前 WSL 目录运行只读内容比较：Core 15 个候选文件中 1 个缺失、3 个不同；Symfony 15 个中 1 个不同；Pack 6 个中 2 个不同，`matching: false`。这解释了为何现有已安装 0.4.5 不能用于验收此次私有候选。该参数须指向**正在核对的扩展宿主实际目录**；扩展清单与文件核对仍不能证明 Profile 的启用/禁用状态或人工编辑体验。

脚本内容核对的正向对照也通过：将三份候选 VSIX 解到临时扩展目录后，分别核对 15、15、6 个文件，`matching: true`。当前终端并非 VS Code 集成终端；从 Node 子进程调用 Remote CLI 的完整 `--check-editor` 在 60 秒内仍超时，报告 `/tmp/sophp-alpha-65f683c8-current-wsl-preflight-20260925.json` 包含 `vscode-remote-terminal-required`、`vscode-cli-failed` 和已独立证实的 `product-content-mismatch`。因此上表版本来自单独成功的只读 `code --list-extensions --show-versions`，不宣称本次完整预检通过。脚本已避免 CLI 失败时误报 Pack 缺失。

为合并这两类证据，预检新增 `--extensions-list-file <清单文件>`：先在目标 Remote shell 中执行 `code --list-extensions --show-versions > <清单文件>`，再配合 `--check-editor --extensions-dir` 读取清单快照并比对产品内容。报告保存清单路径与修改时间，不会把快照当成实时扩展状态。当前快照的机器结果 `/tmp/sophp-alpha-65f683c8-snapshot-preflight-20260925.json` 准确报告 PHP Debug 1.40.2 对候选 1.40.1 的版本差异、三款 SoPHP 的内容差异，以及本终端并非 VS Code 集成终端；`deterministicPassed: false`，符合当前尚未安装候选的状态。

逐文件预检是生成候选后对当前工作区脚本做的修正；候选 VSIX 和 `candidate.json` 均未重打包或更改源码提交记录。使用此新参数时应运行当前工作区脚本。

下一次真实 WSL Remote 安装验收，应在专用 Alpha Profile 安装候选三份 VSIX，将 PHP Debug 版本固定到候选清单，并从对应的集成终端运行带 `--check-editor --extensions-dir` 的预检。当前没有改动用户正在使用的 Remote 环境。独立 Linux 打包宿主的通过记录仍见 [Alpha 候选报告](alpha-65f683c8-packaged-profile-2026-09-25.md)。
