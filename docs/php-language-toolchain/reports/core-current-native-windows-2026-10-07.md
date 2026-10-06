# D167：当前 Core 的 Windows 原生协议与缓存恢复

## 输入与环境

固定源码提交 `f14472c291b7361ef226ef8ba07bff965f23ea46`，生产 bundle `7159d89fbacac6b48fe10884b8815a5bb6684b95a9701932a0b26b379687357d`。临时独立目录复制七项 Core bundle／worker／WASM，运行前后均逐项与仓库匹配；测试入口由现有 `check-native-platform-lsp.mjs` 打成独立脚本，不改产品或用户 Profile。源码、复制资产、运行时二进制、HEAD 及工作树保持。

实际平台 Windows x64；原生 Node **v24.16.0**。复用原 SoPHP portable fixture，只读执行 PHP `-n` 并经 stdin 传递源码，确认实际 PHP **8.5.11 / cli / Windows**、未加载 ini，`str_contains` 存在。这个观察不是九个实际 CLI 的全功能验收。

## 当前协议矩阵

原进程退出 0，101.979 秒。PHP 7.2、7.3、7.4、8.0、8.1、8.2、8.3、8.4、8.5 九个目标，各运行 onDemand／experimental／progressive：**27/27 组合**，**486 次核心方法查询**。

每个组合核对成员补全、Hover、参数、Definition、Implementation、References 的精确结果，Alpha／Beta 未保存切换与撤回；暂停和取消旧 Hover 后返回 null，同版本关闭／重新打开及 `str_contains` 目标版本过滤均通过。原脚本实际运行，未改断言或筛选为一个更小的矩阵。

## 当前 Windows 持久缓存

独立原进程退出 0，17.021 秒；PHP 8.5／onDemand 的五次新服务器 PID 全部不同。依次为冷启动、热重载、磁盘源码变更、真实缓存 hash 损坏、恢复后再次热重载。缓存命中为 **0 / 3 / 2 / 0 / 3**，引用数为 **1 / 1 / 0 / 0 / 0**；补全、Hover、Definition 与最新源码一致，旧结果未从损坏或过期缓存恢复。空间包含空格的缓存路径保留。

四文件扫描的单次日志耗时不是热查询 P95。此处不声明 Windows 的 1k／10k／50k、长会话或冻结性能预算完成。

## 原始失败及范围

首次准备误引用不存在的 helper 文件，未执行原生测试，独立副本核对身份后清理。首次 PowerShell PHP 信息采集退出 1，未运行 LSP；原输出和退出记录保留，未独立捕获其精确原因。后续原生 Node 的 PHP stdin 采集成功，再独立执行完整矩阵及缓存链，没有替换原失败记录。入口及 bootstrap 已归档，当前自建临时目录在终态核对后清理；既有 PHP fixture 与 ini 保留。

机器结果、完整 27 元组、五个 PID／缓存扫描以及原始 artifact 摘要见[记录](core-current-native-windows-2026-10-07.json)。结果属于原生 Windows stdio；当前 Windows 编辑器宿主、macOS、WSL Remote、完整外部工具组合、其它实际 PHP CLI、真实项目／长期使用及真人 WSL 仍需独立证据。此前完整 1270 LSP 只绑定旧源码，当前完整 Linux 组合下一轮冻结。原 C1-C4/R4 与所有未通过预算保持，Goal active；没有 VSIX、Profile 更新、推送或发布。
