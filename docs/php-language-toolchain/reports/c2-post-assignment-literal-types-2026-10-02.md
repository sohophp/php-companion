# C2：赋值后普通字符串不撤回局部成员

日期：2026-10-02。源码增量已应用；未打包、提交、推送或更新 Profile。

## 修复

`$value = null ?: new PrefixRepo(); $label = 'literal $value'; prefixObserve($value); $value->rea` 曾返回空列表。独立赋值的 harmless 检查对 RHS 原文做 includes(variable)，把单引号字符串里的字面文字误当成对局部变量的读取。

现在先验证标量字面量；双引号字符串还要求语法子节点只有 string_content 或 escape_sequence。经证明不含插值的字面量可跳过原文包含判断，真实插值与其它表达式仍遵循原边界。没有把变量同名的字符串当成实际变量或取消引用调用检查。

修复先在[临时源码](c2-post-assignment-literal-snapshot-2026-10-02.md)完成红绿和全量语义验证。R21–R22 [完整 stdio 383/383](c2-local-syntax-integration-gate-2026-10-02.md)终态、13 项冻结输入及临时两个源文件哈希复核后才应用。应用后逐文件核对当前语义 src/test，与已通过全量的临时目录字节全部相同。

## 验证

| 范围 | 证据 |
| --- | --- |
| 相同源码的临时全量语义 | 18 文件，555/555，48.89 s；含普通单引号、转义双引号正例及真实插值反例；类型检查与相关 ESLint 通过 |
| 当前分支语义矩阵 | 1/1，2.32 s；该 it 包含 R22 全部前缀正反例和追加赋值后字面文字矩阵，不声称当前分支又执行了完整 555 项 |
| 定向 stdio | 8/8，21.43 s；PHP 7.2／8.5 × 直接／Elvis，新增 post-assignment-literal 四项及原 literal-prefix 四项；补全、定义、类型诊断按值→引用→按值同步撤回／恢复 |
| 隔离 Core C2 宿主子集 | 退出码 0；赋值后的单引号字面文字不阻断 ready，未保存参数引用编辑及 Undo/Redo 正确；原静态作用域、数组／表达式、引用返回、重载和泛型用例通过 |
| 十调用 100 轮 | 每轮按值侧 ready 首位、引用侧完整空列表；总 P50 22.28 ms、P95 79.67 ms，按值侧 P95 91.91 ms，首轮 82.09 ms、最大 99.06 ms；低于 150 ms 热预算，不宣称性能改善 |
| 构建与检查 | semantic build、宿主测试编译、源码 bundle、相关 ESLint、任务文件 diff check 均退出码 0 |

[压力结果](c2-post-assignment-literal-ten-calls-2026-10-02.json)。当前日志 `/tmp/sophp-post-assignment-literal-{current-semantic,lsp,host,build,test-build,bundle,current-lint}.log`。

## 剩余范围

当前 stdio 文件增加为 387 项，本轮只执行上述八项，379 项跳过。前批完整 383 项冻结输入已成为历史清单，不能再用它声称当前新源码全量通过。宿主为定向 C2 子集，真实 WSL 可见列表、其它插值和动态作用域表达式仍按各自范围判断。继续按阶段汇总回归，不为这一增量再做一次完整 20 分钟套件或发布候选。
