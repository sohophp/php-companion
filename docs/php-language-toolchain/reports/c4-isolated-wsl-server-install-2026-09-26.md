# C4：隔离 WSL Server 安装与内容预检

日期：2026-09-26。使用 WSL 中已有的 VS Code Server 1.139.1 CLI，将[私有候选 `15a5254`](alpha-15a5254-packaged-profile-2026-09-26.md)的 Core、Symfony、Open Source Pack 三份现成 VSIX 安装到 `/tmp/sophp-c4-wsl-15a5254/extensions`，用户当前扩展目录未改动。没有重新打包，也没有修改业务项目。

Pack 自动安装了八个外部直接成员及 Apache Conf Snippets 的 Apache 语法依赖。首次安装的 PHP Debug 为 1.40.2，与候选固定的 1.40.1 不同；在隔离目录显式安装 `xdebug.php-debug@1.40.1` 后，三款产品和八个外部直接成员的版本均与 `candidate.json` 一致。没有安装 Recommended Pack 或竞争 PHP Language Server。

首次运行严格内容预检时，三款产品都只报告 `package.json` 不同。逐个 JSON 比较发现唯一语义差异是 VS Code Server 安装器追加 `__metadata`，其余字段与 VSIX 相同。预检现仅接受含 `installedTimestamp`、`targetPlatform`、`size` 三个有效字段的这一层元数据，仍逐项比较原 manifest 内容，并继续对其它产品文件使用 SHA-256。改动隔离安装中 Core 的 `name` 字段后，预检拒绝该产品；恢复原文件后，三款产品的缺失、不同和意外文件均为零，`artifactAssessment.matching=true`。预检单元测试 8/8 和相关 ESLint 通过。

严格预检的总体 `deterministicPassed=false`，唯一错误是 `vscode-remote-terminal-required`：这次命令来自 WSL shell，而非 Windows VS Code 连接的 WSL 集成终端。隔离 Server CLI 安装与文件核对也不能证明扩展实际运行于该窗口的 WSL Extension Host、竞争 Provider 在该 Profile 中已禁用，或两小时真实操作链。以上仍是 C4 待验项。隔离清单和预检 JSON 留在 `/tmp/sophp-c4-wsl-15a5254/`，属于临时本机证据。
