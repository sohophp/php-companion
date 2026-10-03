# C3：内联赋值前的引用捕获保护

日期：2026-10-02。紧接已收口的 [extract 局部绑定保护](c3-inline-shared-local-bindings-2026-10-02.md)，继续核对同类共享写入；不增加重构种类。

## 复现

在 params.reader 保存 function () use (&$value) 后，$value = 1; return $value 的内联计划仍被旧实现允许。PHP 8.5 实际运行：两种写法均返回 1，但导出的 reader 在原写法读到 1，删除赋值后读到 null。这是闭包可观察状态的差异，不是静态候选猜测。

原动态绑定的 C3 标准组合宿主已经退出码 0，八项冻结输入终态一致；该证据不能算作本次后续修复通过。

## 修复与正反例

复用 parser 已有的 scope.parentId 和 captures.byReference 事实，检查当前作用域在目标赋值之前建立的直接子闭包；捕获目标变量引用时拒绝内联。只针对目标变量，不拒绝捕获其它变量或独立闭包内部的 extract。

新增三项矩阵：导出目标引用的闭包拒绝，捕获无关变量的闭包允许，拥有自身局部 extract 的闭包允许。原八项保留；修复前新增目标引用一项失败，其余十项通过，修复后 11/11 通过。

## 当前验证状态

| 检查 | 状态 |
| --- | --- |
| 当前语义矩阵 | 11/11 通过 |
| 当前全量语义 | 23 文件、598/598，通过；50.60 秒 |
| PHP 7.2／8.5 LSP | 2/2，通过；五版编辑 none→extract→none→capture→none，操作出现／撤回正确 |
| C3 标准组合 | 退出码 0；原 alias 流程保留，捕获引用下的操作撤回及连续 Undo/Redo、既有其它重构流程同批通过 |
| semantic build | 最终构建退出码 0 |
| 静态检查 | 最终四文件 ESLint、diff 检查通过；bundle、宿主测试 TypeScript 成功后才顺序启动 C3 |

初次补丁误落在相邻 Extract Variable 的同文上下文，类型检查检出并修正；该错误版本全量为 597/598，LSP 失败，提前启动的 C3 已按其独立进程组终止（143），没有记为验收通过。最终补丁明确放在 Inline Variable 的 scopeNode 前，重新构建和运行当前检查，旧失败日志保留。

日志 `/tmp/sophp-inline-captured-{red,green,full-semantic-final,lsp-final,build-final,lint-final,bundle-final,test-build-final,c3-host-final}.log`；C3 终态 `/tmp/sophp-inline-captured-c3-exit-final.txt`。本项没有新增 stdio 测试条目，扩充已有两项的编辑序列，完整 stdio 仍为 399 项，尚未再全跑。未打包、提交或更新 Profile。

本批八项输入 `/tmp/sophp-inline-captured-c3-inputs.sha256` 终态后全部一致，日志 `/tmp/sophp-inline-captured-c3-final-inputs.log`。其后启动当前源码的 399 项完整 stdio 集成；启动状态不计为通过。
