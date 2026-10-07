# D228–D230 原生 Windows 与 Linux 格式化

## 修复与范围

沿用 `junstyle.php-cs-fixer` 0.3.21／ISC。原始 bundle SHA-256 为 `0d94dba0ab92cfcee26a4fdbc49ef9da81289ee4124395940b1a3c76deeaa243`，新隔离候选为 `e0e5407e2307cac7589160065ba1d92e9d516259ffbbfdf02671365fc7582577`。Core 仍为 `3bc9b366`，本批未重新构建产品。

原生 Windows 首轮暴露真实路径缺陷：候选通过 shell 调用 PHP 时，未引用 `.phar` 参数，带空格的路径被截断，实际 PHP 报 `Could not open input file`。补丁按已有 Windows 参数约定引用解析后的 PHAR 路径，保持原版本、许可证、所有者及其它修复。

现有验收夹具改用 PHP 启动器，转发实际 PHP／ini、参数数组、标准流及退出码；同时配置 `executablePath` 和 `executablePathWindows`。这解除原来 Windows 的直接跳过。它们是加载锁定 Composer CLI 的测试启动器，不是新 PHAR 发行包。

## 实际结果

| 项目 | 结果 | 绑定范围 |
| --- | --- | --- |
| 原 Windows 完整夹具 | 退出 1，19.90 秒 | 原候选 `aa440f0e`；带空格 PHAR 路径失败，原日志及源输入保留 |
| 修正后 Windows 完整夹具 | 退出 0，28.17 秒 | VS Code 1.140.0／Extension Host Node 24.21.0；实际 PHP 8.5.11／CS Fixer 3.95.27；29 项副本与 7 项源码输入保持 |
| Linux 原 source-Profile 完整夹具 | 退出 0，48.46 秒 | VS Code 包 1.140.0／Extension Host Node 24.21.0；实际 PHP 8.5.9、8.4.23／CS Fixer 3.95.27；2473 输入、HEAD 和工作树保持 |
| 原生 Windows 错误输出保护 | 退出 0，4.04 秒 | 原 Windows 专用检查器、实际 CLI 输出及精确候选分支；不扩大为完整 UI 错误通知验收 |
| TypeScript／ESLint／候选语法 | 通过 | 仅涉及源码与测试构建，未重建 Core |
| 既有模拟边界 | 并发资源设置与 20 项自动修复边界通过 | 模拟边界与真实编辑器结果分别保留 |

Windows 保持原 120 秒宿主期限；两平台保留原完整格式化套件、断言及各夹具等待期限。Linux 使用原 source-Profile／formatter-only 入口，没有调用打包命令。Linux 包装进程的实际 Node 路径和哈希在原进程存活时观测并于终态复核；初始文件清单另包含 Python 准备进程，相关记录均保留。

两平台实际检查：Format Document、单次 Undo／Redo、保存格式化与磁盘一致、幂等；两个独立 Composer 项目的不同配置、并发请求和带空格可执行路径；后台修改及禁用目录不触发；分号修复期间的后续输入／焦点变化丢弃旧结果，当前结果正常应用；当前括号修复正常。三个延迟 CLI 场景均实际退出 0，磁盘及光标保护由原断言验证。

Windows 只验证一份实际 PHP；Linux 分别记录两份实际运行时，不能将 Linux 双版本结果转移给 Windows。真实延迟括号的 jump／cursorUndo 错误场景仍只有模拟边界，尚未取得实际 CLI／UI 资格。

错误保护保留：成功且无变动时接受信息性 stderr，语法错误输出仍拒绝并保留错误通知，dry-run 原退出码 4 和无效 JSON 拒绝保持。首次误用 Linux Node 调用 Windows 专用检查器时被原平台断言拒绝；该驱动错误单独保留，随后使用实际 Windows Node／PHP 执行，未修改平台保护。

## 证据与后续

[机器记录](c4-portable-formatter-windows-linux-2026-10-07.json)保存源版本、候选哈希、平台／运行时、退出码、实际接受结果、失败与成功归档的清单哈希。本地 `.vscode-test/d228-*`、`d229-*`、`d230-*` 保留原输入、协议外 CLI／编辑器输出、宿主日志和夹具副本。

下一项补齐第二份实际原生 Windows PHP，执行已有双运行时矩阵。macOS、Remote、最低支持 VS Code、长会话、完整 Pack／Twig／调试／测试组合及真实 WSL 仍开放。

Core 的完整 LSP 仍是 D225 原 1313 项中 1299 通过、14 等待超时，资格未通过；本批格式化通过不证明它已修复。大 Controller 的原 150 ms 预算、规模／缓存内存及全部原 C1–C4／R4、P0–P9／F01–F14 范围保持。Goal active；未打包、更新用户 Profile 或推送。
