# 正式发布版本 Profile 更新

已将 PHP Companion Alpha（WSL Profile `5db630d7`）的 Core、Symfony、Open Source Pack 重新安装为正式发布的 `0.4.13`，替换同版本旧候选包。安装包取自已公开的 GitHub Release，来源提交为 `6025b1fa671287f9523475330aaf9abb4d74e0f7`。

已执行并通过：三份安装包的 SHA-256 与公开校验清单一致；安装后的 39 份包内文件与正式 VSIX 逐一核对，通过；安装清单中仅忽略 VS Code 自动添加的 `__metadata`。未发现额外包内文件。Profile 保持 15 个扩展，其它扩展的版本、路径和安装元数据均不变。

Core 生产服务器 SHA-256：`5c23154249f54545b4d04356a05eb82f5bea51698fe91a945acc2e4ee1527e60`。

原安装文件和 Profile 清单已备份到 `.vscode-test/profile-release-0413-update-2026-10-12/before/`，安装日志与机器验证记录保存在同级目录。

尚未执行窗口重载和真人 WSL 编辑器验收。需要执行 `Developer: Reload Window`，让运行中的扩展加载正式版本。本次未提交或推送 Git；整个项目目标仍未完成。

[机器验证报告](profile-release-update-2026-10-12.json)。此前同日的候选包更新记录保持为历史证据。
