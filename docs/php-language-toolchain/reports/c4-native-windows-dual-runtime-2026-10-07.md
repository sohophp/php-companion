# C4：原生 Windows 双 PHP 与格式化失败保护

日期：2026-10-07。批次：D231–D232。源码起点 `9d1a80fd`；Core bundle 保持 `3bc9b366`，隔离格式化候选保持 `e0e5407e`。没有重建产品、打包、更新用户 Profile 或推送。

## 本批变化

原生 Windows 格式化驱动新增可选第二 PHP 参数，仅用于现有完整 `formatterCandidate` 入口。驱动实际探测两个 CLI，要求不同 PHP minor 和不同 ini；双运行时模式清除继承的 `PHPRC`／`PHP_INI_SCAN_DIR`，让每份真实 PHP 加载自己的本地 ini。两个 Composer 根分别使用实际的 `>=8.5` 和 `>=8.4`，最终格式化执行版本必须与探测结果一致。其他既有入口保持原行为，原 120 秒宿主期限未放宽。

第一份 PHP 8.5.11 的二进制、依赖 DLL 和许可证按哈希复制到新的自有临时夹具。第二份 PHP 8.4.23 来自 [PHP 官方 Windows 归档](https://downloads.php.net/~windows/releases/archives/php-8.4.23-nts-Win32-vs17-x64.zip)，安全检查并解压后保留许可证；各自配置匹配的 curl／mbstring／intl。下载字节 SHA-256 记录在机器记录中，不称为另有发布签名校验。自有目录内的原生 junction 只引用已有锁定 Composer 工具，没有重复安装工具或修改原运行时。

## 原进程结果

| 入口 | 实际环境与结果 | 原进程耗时 |
| --- | --- | ---: |
| D231：完整 formatter candidate | 原生 Windows、VS Code 1.140.0、宿主 Node 24.21.0；实际 PHP 8.5.11／8.4.23、同一 CS Fixer 3.95.27，通过 | 29.90 秒 |
| D232：现有 Windows formatting failure | 同一 Core／格式化候选、实际 PHP 8.5.11；非法 PHP 的真实 dry-run 返回 4，Provider 不产生编辑，干净缓冲区和磁盘保持，通过 | 11.56 秒 |

D231 保留全部原套件断言：格式化文档、一次 Undo／Redo、保存、磁盘一致、幂等；两个独立根并发执行，分别获得空格／Tab 配置和真实 PHP 版本。原始 `runtime.txt`、Composer 与项目设置已另行核对。自动修复继续覆盖后台事件、禁用目录，以及真实 CLI 延迟返回时的新版本／切换焦点／当前结果和括号当前结果正例。这不证明所有自动修复场景均在两个版本分别执行。

D232 通过实际编辑器的普通格式化 Provider 验证错误保护；独立 dry-run 的退出码与普通格式化的无编辑结果分别保留。该套件不验证错误通知弹窗的实际可见文本，先前 CLI／VM 分支检查继续作为独立证据。

两轮分别冻结 7／5 个源码输入、29 项 Core／formatter 副本、104 个 PHP 运行时／ini 文件及原生 Node／VS Code。每轮前后核对全部 3071 个 Composer 工具文件；没有输入、产物、运行时、HEAD 或工作树变化。原始进程均已终止，日志、夹具及宿主日志分别归档 64／30 个文件；[机器记录](c4-native-windows-dual-runtime-2026-10-07.json)保存命令、哈希、实际版本和判定范围。

首次 D231 准备因复制脚本时错误替换既有候选目录而失败，发生于宿主启动之前。初版准备脚本与错误记录保留；修正为原 `d229` 候选路径，没有重新生成候选或改动测试期限／断言。

## 继续范围

本批关闭原生 Windows 第二真实 PHP 的格式化隔离缺口。下一项补齐实际延迟括号导航／cursorUndo 的保护场景；已有 20 个 mock 边界与实际当前括号正例不冒充这一项完成。

Core 当前完整 LSP 仍为原 1313 项中 1299 通过、14 等待超时，资格未通过。大 Controller P95 173.01 ms 仍超原 150 ms，规模／缓存内存、macOS／Remote／最低 VS Code、长会话、完整组件组合及真实 WSL 保持开放。原 C1–C4／R4、P0–P9／F01–F14 范围保持；Goal active。
