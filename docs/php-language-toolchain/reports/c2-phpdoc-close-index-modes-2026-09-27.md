# C2：关闭未保存文件后恢复 PHPDoc 引用

日期：2026-09-27。仅修改 SoPHP 独立工作树；没有修改业务项目，也没有重新打包 VSIX。

## 复现

在独立 Composer PSR-4 项目中，磁盘文件的跨行 `@return list<Widget>` 被编辑器未保存地改成 `Other`。从声明处查询 References 时，打开缓冲区返回 `Other`；随后关闭该文件并立即查询，`experimental` 模式曾短暂把磁盘 `Widget` 引用返回为空。等待关闭事件完全结束后查询正确，说明关闭事件中的异步磁盘恢复与下一个查询发生了交错。

## 源码处理

语言服务器按 Composer 根跟踪正在处理的 PHP 文件关闭事件。同一项目的后续语义查询先等这些事件结束。关闭尚未进入全量索引的文件时，`onDemand`、`experimental` 和 `progressive` 模式都从磁盘恢复文件事实；这种临时保留仍按每个项目 256 个文件和单文件大小上限约束。已有的重开缓冲区优先规则继续适用。

## 验证与边界

- 红灯：原始 `experimental` stdio 用例在关闭后立即查询时返回 `[]`，预期为磁盘引用位置 `42`；`onDemand` 和 `progressive` 通过。
- 绿灯：三种模式的同一操作链均通过，且验证关闭后旧 `Other` 引用撤销；关闭后立即查询不借助测试等待。
- 关闭中重开诊断与按需关闭文件缓存上限的现有用例一并通过。
- 完整 `test/stdio.test.ts` 回归：196 项通过、1 项跳过，运行约 440 秒；语言服务器编译、修改文件的 ESLint 和扩展包 4 项单元检查也通过。Pack manifest 与冻结 Profile 均为 Core、Symfony 加 8 个外部成员。
- 这是源码回归证据；`248ee1f8` 私有安装候选、真实 WSL Remote、长会话和其它平台尚未包含或验证该修复。

Open Source Pack 的 10 项职责和版本仍以[当前执行入口](open-source-pack-current-priority-2026-09-27.md)为准。下一步优先收集普通 PHP 编码中 C1/C2 的可复现错误；若没有新的高影响错误，继续 C3 已知的文件创建 Redo 闭环。冻结下一候选时才重新打包 Core、Symfony 和 Pack。

后续将两个已有生命周期用例扩展到 `onDemand`、`experimental` 和 `progressive`：关闭过程中立即重开后的诊断不被旧关闭事件清空；旧 Completion、Hover、Signature Help、Definition 请求暂停时，以相同版本号重开不同内容，旧结果被丢弃，新结果来自重开的缓冲区。合并定向运行 6/6 通过，修改文件 ESLint 与差异检查通过。这里只增强自动回归范围，没有新增 VSIX 或人工操作证据。
