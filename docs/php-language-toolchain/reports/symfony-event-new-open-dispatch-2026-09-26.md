# Symfony 新建未保存文件的事件派发

日期：2026-09-26。范围为独立 Symfony Event Provider 和临时 PHP 项目；未修改业务项目，未打包 VSIX。

事件 Provider 原来只从项目类型目录建立待读取文件清单。新建且尚未落盘的 PHP 文档即使已传入完整打开快照，在类型目录更新前仍被忽略，`dispatch(new ReadyEvent())` 不进入事件事实。独立反例先返回空 `sourceUris`，修复后返回新文档 URI 和 `App\ReadyEvent` 派发事实。

现在打开的项目内 PHP 快照也进入来源清单；已有文件解析真实路径，未落盘文件解析最近存在的父目录。扩充项目外符号链接反例，确认带打开快照时仍拒绝越界来源。Provider 4 项测试、TypeScript 构建、相关 ESLint 和差异检查通过。本结果证明 Provider 的输入与事实，真实 Language Server、完整 Pack 安装及 WSL Remote 尚需对应组合验收。

随后以真实 Language Server stdio 补齐结果链：独立 Composer 项目注册 Symfony 监听器，在未落盘的 `NewDispatch.php` 中打开 `dispatch(new ReadyEvent(), 'app.ready')`；从监听器方法查询 References，结果包含新文档内 `app.ready` 的精确位置。测试夹具提供可解析的 Dispatcher 接口，以符合 Language Server 对派发方法归属的校验。新增用例与既有 `experimental`、`onDemand` 两种事件 Provider 回归同跑 3/3 通过；相关 ESLint 和差异检查通过。此证据覆盖真实协议与未保存快照，仍不代表已安装 VSIX、完整 Pack 宿主或 WSL Remote。

同一 stdio 用例再发送 `didClose`，且新文件从未落盘；下一次监听器 References 不再包含该派发 URI。打开→查询→关闭→查询的定向回归通过，证明这一协议时序下旧事件事实会撤回。真实 VS Code 标签页关闭可能延迟 `didClose`，仍须在安装候选中单独核对。

随后补齐完整 10 项 Open Source Pack 源码宿主：启动前在独立 Composer 夹具中准备可注册的事件订阅者及可解析的 Dispatcher 方法；启动后打开不含类型声明的 PHP 派发文件，将磁盘上的 `app.old` 改为未保存的 `app.ready`。监听器 References 返回新事件名的精确位置；编辑器执行一次 Undo 后，同一查询撤回该位置。整轮 C3 源码宿主退出码 0，日志为 `/tmp/sophp-c3-event-editor-host-final-20260926.log`；测试 TypeScript、相关 ESLint 和差异检查也通过。上文所述“完整 Pack 宿主尚需验收”以本段结果更新。标签页关闭、已安装 VSIX、真实 WSL Remote 和持续人工使用仍属 C4 验收。

进一步验证运行中新增订阅者：移除启动前的订阅者夹具后，首次打开磁盘内容相同的新类未使已有服务事实失效；项目类型集合又排除了未列入启动扫描 URI 集合的打开文件，References 因而只有监听器自身。Core 现在对首次发现的声明使服务事实失效，并允许项目内已打开的新类进入 Provider 输入，同时继续排除 Composer 依赖目录。相同完整 10 项 Pack C3 源码宿主通过，日志 `/tmp/sophp-c3-event-live-subscriber-types-20260926.log`、退出码 0；相邻事件 stdio 回归 3/3、构建及相关 ESLint 通过。该场景证明本机隔离宿主中的运行期新类可被发现；安装候选与 Remote 仍待验收。

关闭后的边界也已单独核对：onDemand 的独立 Composer stdio 用例先完成项目扫描，再新增磁盘订阅者并打开；关闭订阅者文档、重新配置 Provider 后，从另一个打开文件的方法调用查询 References，仍能找到事件派发。测试还确认服务 Provider 在重新配置后实际再次运行。定向用例通过；源码复核表明已索引的新文件在关闭时保留项目 URI，因此无需额外放宽关闭文件筛选。VS Code 关闭标签页是否立即发出 `didClose`、安装候选和 Remote 仍需各自验收。
