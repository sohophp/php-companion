# C2：闭包与箭头函数返回值补全

日期：2026-10-02。属于补全路线图第三阶段的预期类型排序，不增加设置或协议。

## 修改与复现

显式 `function(): string { return $va; }` 和 `fn(): string => $va` 原来仍按默认变量顺序排列；回调位于调用实参中时还会继承外层实参的类型。首轮 12 项定向回归为 8 项失败、4 项通过。

- 回调内部只使用自身调用的实参合同，不继承创建它的外层调用合同；未声明返回类型时不猜测。
- 显式闭包 return 与箭头函数的值表达式按自身原生返回类型排序；条件、转换、取反等操作数沿用已有边界，内层调用继续使用自身签名。
- 按值捕获变量在创建时取父作用域的已知类型；重新赋值、共享绑定、引用捕获及可能修改变量的调用不恢复旧事实。捕获递归限制为 32 层。
- 返回类型名称使用回调所在命名空间、导入及真实类容器解析，没有构造虚假的类作用域。

## 当前验证

| 检查 | 结果 |
| --- | --- |
| 闭包／箭头／嵌套调用、三元、捕获与命名空间矩阵 | 17/17 |
| 全量语义测试 | 25 文件、624/624，49.34 秒 |
| 当前真实 stdio 定向 LSP | PHP 7.2／8.5 两项通过；string→int→string 未保存修改；当前总数 403，跳过 401 |
| 隔离 Core C2 扩展宿主 | 退出码 0；闭包和箭头值、内层调用、未保存修改及 Undo/Redo 通过 |
| semantic 构建、扩展 bundle、宿主测试编译、定向 ESLint、diff 检查 | 通过 |
| 小样例 100 次未保存修改、进程内语义查询 | P50 2.04 ms，P95 4.28 ms，最大 29.77 ms；首位旧结果 0 |

两项安全测试最初错误要求 unset 后保留变量、未知引用类型保持默认首位；实际行为分别是撤回变量、未知候选保留。修正断言后才取得上述全量终态，未更改为猜测类型的行为。

日志：`/tmp/sophp-callback-return-full-final.log`、`/tmp/sophp-callback-return-lsp.log`、`/tmp/sophp-callback-return-host.log`、`/tmp/sophp-callback-return-build.log`、`/tmp/sophp-callback-return-bundle.log`、`/tmp/sophp-callback-return-host-build.log`、`/tmp/sophp-callback-return-lint.log`、`/tmp/sophp-callback-return-host-lint.log`。原始性能数据见相邻 JSON。

## 范围

PHP 7.2 LSP 只测试闭包，PHP 8.5 同时测试箭头函数。性能是小样例语义查询，未测当前可见弹窗等待或多小时真实项目使用；隔离宿主也不替代真实 WSL Profile 验收。回调的 PHPDoc／高阶泛型预期返回类型与 Generator 契约不由此次修改推断。

当前完整 stdio 403 项未全跑，最新完整 399/399 属于此前 R29 与内联保护批次；不冒用前批结果。保持同一分支，未打包、提交、推送或升级 Profile。
