# C2：直接类赋值后的引用调用

日期：2026-10-01。源码增量；未打包、提交、推送或更新 Profile。

## 问题与修复

复现 `$value = new Repo(); change($value); $value->ready()`，其中 change 的参数为引用且把变量改为 Other。修复前，严格语句证明会停止，但类名回退仍按旧 new 赋值返回 Repo，导致旧成员、跳转与错误类型诊断保留。未知或动态调用接收该变量时也有同一回退风险。

现在，赋值结果回退之前检查当前作用域内接收该变量的调用。唯一具名函数的全部非引用参数复用已有声明缓存；可能引用、未知或动态调用需要通过严格语句证明，不能直接使用先前类赋值。覆盖位置、具名参数和引用 variadic。

一次明确的后续赋值可以证明该时刻的新值；若变量先交给引用调用，又经过其它调用，则继续保留逃逸限制，不把重新赋值误认为已经解除共享绑定。既有参数类型合同、已验证断言和控制流缩窄继续使用各自证明；isset/empty 不作为引用函数调用处理。

## 验证

| 项目 | 当前结果 |
| --- | --- |
| 全量语义 | 16 文件，546/546，47.54 s；新增直接 new 赋值、位置/具名引用参数、引用 variadic、未知/动态调用、普通按值调用及后续赋值场景 |
| 标准 stdio LSP | PHP 7.2／8.5，直接 new 与 Elvis 各两项引用参数编辑，引用返回和 Elvis 原回归共 8 项通过，20.98 s；成员、Definition 与参数诊断随未保存 A→引用→A 修改同步撤回/恢复 |
| 隔离源码宿主 | 退出码 0；直接 new 赋值的引用参数未保存编辑与一次 Undo/Redo；原 Elvis 和引用返回场景也通过 |
| 连续编辑 | 独立 Composer 只读内存副本 100 轮，每轮正确首位/空列表；P50 2.94 ms，P95 5.05 ms，首轮/最大 32.42 ms |
| 静态检查 | semantic build、源码 bundle、LSP typecheck、扩展测试 TypeScript、相关 ESLint 与 diff check 通过 |

性能数据：[JSON](c2-direct-reference-benchmark-2026-10-01.json)。日志位于 `/tmp/sophp-direct-reference-{full-semantic,stdio-final,host,build,bundle,lsp-tsc,host-tsc,eslint}.log`。

本轮没有重新运行全量 355 项 stdio；8 项定向结果不替代全量。此修复不实现一般引用别名/副作用分析，也不证明所有方法或复杂实参的类型保留。隔离宿主结果不等于真实 WSL Profile 人工验收。
