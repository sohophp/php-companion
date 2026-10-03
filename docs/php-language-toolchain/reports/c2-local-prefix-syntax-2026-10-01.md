# C2：局部类型证明中的注释与字符串误判

日期：2026-10-01。当前分支源码增量；未打包、提交或更新 Profile。

## 复现与修改

`$value = null ?: new PrefixRepo(); prefixObserve($value); $value->rea` 原本能补全 ready。在赋值之前添加 `/* static global eval &$value */`、`$label = "static";` 或包含这些文字的普通单引号字符串，结果变为空。旧检查直接对函数体前缀做正则匹配，把非代码文字当成共享绑定或动态作用域风险。

现在复用已保留的 CST，以语法节点检查前缀。注释、普通字符串内容和 Nowdoc 不参与风险判断；真正的 static/global 局部声明、引用赋值／捕获、动态变量、include/require、错误语法仍拒绝。可执行字符串插值继续保守拒绝；extract/parse_str/eval/assert 的调用检查与参数／捕获引用检查保持独立。遍历设 4,096 节点预算，超过时撤回证明；结果只在本次局部查询中按位置缓存，不产生跨版本旧结果。

## 验证

| 范围 | 结果 |
| --- | --- |
| 修改前探针 | 注释及两种普通字符串均错误返回空列表；无前缀时 ready；真实 static/global 前缀为空 |
| 全量语义 | 当前源码 18 文件，555/555，50.32 s；新增前缀正反例矩阵、引用签名编辑和恢复 |
| 定向 stdio | 8/8，21.42 s；PHP 7.2／8.5 × 直接／Elvis，原 static-scope 四项及新增 literal-prefix 四项；Completion、Definition、类型诊断随参数按值→引用→按值撤回／恢复 |
| 隔离 Core C2 宿主子集 | 退出码 0；新增 literal-prefix 未保存编辑及 Undo/Redo，原有静态作用域、数组、表达式、引用返回、重载和泛型用例通过 |
| 100 轮十调用 | 按值侧 ready 排首、引用侧完整空列表每轮正确；独立执行总 P50 22.98 ms、P95 74.94 ms，按值侧 P95 83.32 ms，首轮 80.68 ms、最大 104.92 ms |
| 构建与检查 | semantic build、测试 TypeScript 编译、源码 bundle、相关 ESLint 与任务文件 diff check 均退出码 0 |

首次压力测量与 LSP／宿主并行，总 P95 95.66 ms；随后独立测量为上表数值。两次均低于 150 ms 热查询预算，但语法扫描增加成本，本轮不宣称性能提升。两份结果保留：[并行测量](c2-local-prefix-ten-calls-concurrent-2026-10-01.json)、[独立测量](c2-local-prefix-ten-calls-2026-10-01.json)。

日志：`/tmp/sophp-local-prefix-{targeted,full-semantic,lsp,host,build,test-build,bundle,lint}.log`。

## 剩余范围

当前 stdio 文件共 383 项，本轮仅运行上述八项，375 项跳过；前批完整 375 项结果不证明本次源码全量通过。宿主为定向 C2 子集，尚未测真实 WSL 可见列表。普通字符串在其它流分析入口、可执行插值、复杂动态调用及性能优化均不能由本轮证明全部完成。
