# D57：属性赋值中的注释与局部语句查询

## 复现及实现

对 cbf8a0bb 构建的独立语义样例，普通 `$this->enabled = pick|` 按已声明 bool 属性把 bool 函数排在 string 函数之前；在接收者或属性名后加入注释，排序丢失。已有 bool 局部变量名称后加入注释也有相同缺口。不改动业务项目。

提取原数组键补全的注释处理为共享函数，仅遮蔽解析器确认的注释，保留换行、源偏移和字符串内容。赋值前缀、成员接收者及成员后续 token 使用这组事实；识别注释后的调用括号或赋值符，保留 private、readonly 和只写 Property Hook 的原访问规则。原赋值前缀 160 字符窗口继续保留，窗口内过长的中间注释不作为已解决范围。

压力检查发现，当文件其它位置有未完成声明时，原成员查询会因根节点有错误而扫描整个前缀。现在只在光标所属语句自身完整解析时使用其源码起点；局部语句有错误时保持原回退。没有截短成员链、改变 PHP 类型规则或提高预算。

## 当前验证

- 新增 30 项语义正反例通过，覆盖保留／临时 CST、实例／静态／局部赋值、receiver／operator／property／value 注释、private／readonly、只写 Hook、同名属性与注释后方法调用、字符串中的注释样式文本，以及前后无关语法错误。对应赋值查询检查 revision／snapshot 不变。
- 注释修复首轮完整语义 93 文件／1854 项通过，59.50 秒；日志 `/tmp/sophp-assignment-comments-full-semantic.log`。局部语句优化后当前完整语义 93 文件／1858 项全通过，65.67 秒，原会话 37553 退出 0；日志 `/tmp/sophp-assignment-comments-full-semantic-final.log`，无构建或宿主并行，原超时门槛不变。
- 构建与定向 ESLint 退出 0；日志 `/tmp/sophp-assignment-comments-local-error-build.log`、`/tmp/sophp-assignment-comments-final-lint.log`。
- PHP 7.2／8.5 真实 stdio 压力测试两项通过，14.14 秒；日志 `/tmp/sophp-assignment-comments-hot-protocol-final.log`。这是语言服务器按配置版本选择补全，不是两种 PHP 编译器执行证据。
- 当前 PHP 7.2／8.5 定向 stdio 两项共 64 次请求通过，516 项未选中不计通过，8.81 秒；日志 `/tmp/sophp-assignment-comments-protocol-final.log`，原会话 8033 退出 0。覆盖已有数组值、实例／静态／局部注释赋值及不确定契约反例。
- [隔离编辑器证明](completion-assignment-comments-visible-2026-10-04.json)：四种赋值场景各 Enter／Tab，共八次真实可见首项、完整插入文本、括号内光标、Undo／Redo 和磁盘不变通过；原会话 33976 退出 0，日志 `/tmp/sophp-assignment-comments-visible-host.log`。八份接受文本均由实际 PHP 8.5 CLI `-l` 通过，不执行代码；显式触发等待 142–253 ms，不当自动弹出或热查询预算。

## 热查询测量

同一 242907 字节、1503 注释的样例包含完整属性赋值和其它位置的未完成声明；SHA-256 `efb0862ac07077d201bd768a7a3d366aa8a9a9398523d6fa3a854addb58a2cbc`。每个版本 25 次真实 stdio 请求，前五次预热，其后二十次计算 P95；每次核对 bool 候选首位且 string 候选保留。采样时不改文档，没有其它构建／语义回归／编辑器宿主并行。

| PHP 配置版本 | 局部语句优化前 P95 | 优化后 P95 | 优化后首次请求 |
| --- | ---: | ---: | ---: |
| 7.2 | 212.61 ms | 123.44 ms | 236.67 ms |
| 8.5 | 240.56 ms | 119.24 ms | 187.67 ms |

每组仅一个串行前后对照，不能当多轮稳定性结论；首次请求单列，不算热查询达标。首轮原测试退出 1，两种配置均超原 150 ms 门槛，记录保留 `/tmp/sophp-assignment-comments-hot-protocol.log`，未提高门槛。局部语句优化后原测试退出 0，原始测量在 `/tmp/sophp-assignment-comment-timing/`，限定输入和测量归档在 [热查询记录](completion-assignment-comments-hot-query-2026-10-04.json)。

这条热查询路径通过不替代 D53 连续编辑 P95 292.56 ms 的未完成预算，也不代表可见弹窗或所有规模／平台通过。当前完整 LSP 资格仍绑定 a3678016；本批只补对应定向协议和隔离编辑器证据。真实 WSL 使用、未闭合 callable、大文档恢复预算与长期使用继续单列。没有打包、推送或更新 Profile，goal active。
