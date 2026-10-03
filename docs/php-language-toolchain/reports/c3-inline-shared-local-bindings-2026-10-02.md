# C3：Inline Variable 的动态局部绑定保护

日期：2026-10-02。按已有 C3 重构可靠性范围推进，不增加新的重构种类。未打包、提交或更新 Profile。

## 复现与实际影响

在函数里 extract($params, EXTR_REFS) 后，把 $value = 1; return $value 内联为 return 1，会丢失对调用方数组的写入。当前旧实现仍提供此编辑。PHP 8.5 实际运行：两种写法都返回 1，但原写法把 params.value 从 0 改为 1，内联后保留 0。不能仅比较返回值判断等价。

八项语义矩阵修复前五失败、三通过：普通／全限定 extract、导入别名、eval、include 均错误允许；注释、文字字符串、同命名空间的普通同名函数作为合法反例。

## 实现

在生成内联计划前，有界遍历当前 callable 的赋值之前语法；检测动态变量、include/require、已解析为全局 extract/eval 的调用和错误节点。用既有 resolveFunction 区分函数别名、命名空间与同名项目函数；跳过独立嵌套声明。发现风险或遍历不完整时不给出内联计划，以免移除可能具有共享写入效果的赋值。

该保护不会猜测 EXTR_REFS 标志；即使 extract 的标志可证明不含引用，本项仍保守拒绝内联。动态间接调用的完整影响分析与其它重构的全范围安全性没有在本项关闭。不以本次结果宣称 F08 全部完成。

## 验证

| 检查 | 结果 |
| --- | --- |
| 新增语义矩阵 | 8/8 |
| 全量语义 | 23 文件、595/595，49.42 秒 |
| 标准 LSP PHP 7.2／8.5 | 2/2；无绑定→别名 extract 引用绑定→无绑定的三版未保存文本，内联操作出现→撤回→恢复 |
| 标准组合 C3 宿主 | 退出码 0；新增操作出现、未保存撤回、Undo/Redo 恢复／再次撤回通过，既有导入、Rename、Move、Extract、生成及 Symfony 引用流程同批通过 |
| 静态检查 | semantic build、最终四文件 ESLint、生产 bundle、宿主测试 TypeScript 与 diff 检查通过；后两项命令成功后才顺序启动 C3 |

原始日志 `/tmp/sophp-inline-shared-{red,green,full-semantic,lsp,lint-final,build,bundle,test-build,c3-host}.log`；宿主终态退出码 `/tmp/sophp-inline-shared-c3-exit.txt`。

本批八项源码／构建／测试输入见 `/tmp/sophp-inline-shared-c3-inputs.sha256`，终态后全部一致，记录 `/tmp/sophp-inline-shared-c3-final-inputs.log`。

后续只读边界复核：PHP 7.2 实际动态调用 extract 发出禁止调用警告，PHP 8.5 抛出 Cannot call extract() dynamically；不能把动态名称未触发本保护当作同一种实际共享写入缺陷。因此本轮不新增所有动态调用的通用拒绝规则。

前一批 R26–R28 的 395 项完整 stdio 和本项之前 R29 的 587 项语义记录保留原范围。当前完整 stdio 共 399 项，尚未再全跑；当前 C3 自动宿主不代替真实 WSL 人工验收或完整外部扩展安装验收。
