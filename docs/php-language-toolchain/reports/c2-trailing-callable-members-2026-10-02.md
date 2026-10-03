# C2：未完成函数、方法与回调的成员补全

日期：2026-10-02。补全路线图第二／三阶段的连续输入与类型事实，复用 R31/R32 隔离查询。

## 修改

闭包声明头完整但尚未闭合时，`$item->tit` 与空 `$item->` 缺少成员建议，甚至无法识别参数对外层变量的遮蔽；普通函数和方法有相同作用域缺口。最初八项固定回归为七失败、一通过。

- `completeMembers` 在末尾不完整输入中复用统一的 `trailingCallableQuery`；其支持普通函数、方法、闭包和箭头函数，不新增独立类型推断或可见性判断。
- 空成员操作符后追加隔离占位名称，仅用于形成合法语法，不猜测接收者类型；返回既有成员证明和可见性过滤的结果。
- 原恢复在类成员列表中加入非法空分号。至多重试一次，仅移除 EOF 后由恢复新增、且解析器精确标为单字符错误的分号。不修改原代码或修复其它语法错误。
- 普通方法中的变量排序与类型说明也使用这一恢复；预算仍为 131,072 字符与 32 层括号。项目文档、快照、修订和诊断保持原状。

## 当前源码验证

| 检查 | 结果 |
| --- | --- |
| 新矩阵 | 13/13；空／部分前缀、外层调用、参数遮蔽、普通函数／方法、私有成员、静态 this 及方法变量说明 |
| R30–R33 定向语义 | 51/51 |
| 全量语义 | 27 文件、658/658，51.82 秒 |
| 当前真实 stdio 定向 LSP | PHP 7.2／8.5，R30–R33 共八项通过，401 跳过，总数 409 |
| 新 LSP 连续编辑 | 闭包、空前缀、普通函数和方法各 Item→Other→Item，原类型成员撤回、私有成员缺席 |
| 隔离 Core C2 | 退出码 0；类型替换、空前缀、私有成员过滤与一次 Undo/Redo；R30/R31/R32 继续通过 |
| 类型检查、构建、bundle、宿主编译、定向 ESLint、diff 检查 | 通过 |

性能：100 轮小工作区语义查询 P95 6.46 ms／最大 25.29 ms；生成 2,300 文件工作区 P95 62.14 ms／最大 69.52 ms。两组旧成员、私有候选和项目修订变化均为 0。该数据不代表真实 WSL 可见列表或实际 stdio 往返；原始 JSON 见相邻文件。

日志：`/tmp/sophp-trailing-members-red.log`、`/tmp/sophp-trailing-members-expanded.log`、`/tmp/sophp-trailing-members-full.log`、`/tmp/sophp-trailing-members-lsp.log`、`/tmp/sophp-trailing-members-host.log`、`/tmp/sophp-trailing-members-typecheck.log`、`/tmp/sophp-trailing-members-build.log`、`/tmp/sophp-trailing-members-bundle.log`、`/tmp/sophp-trailing-members-host-build.log`、`/tmp/sophp-trailing-members-lint.log`。

## 批次范围

当前完整 stdio 409 项未重新全跑，前批 [405 项集成](c2-callback-batch-integration-2026-10-02.md)仍只对应 R30/R31 与旧源码。R32/R33 可作为下一批合并集成，不按每项重跑约 20 分钟的完整 stdio。

只恢复声明头完整、末尾仅缺结束符的语法；不覆盖任意错误位置、PHP/HTML 混合结尾或 property-hook。返回补全事实不等同于诊断、定义和重构已使用恢复事实。

保持同一分支，未打包、提交、推送或更新 Profile，真实 WSL 使用由用户通知。
