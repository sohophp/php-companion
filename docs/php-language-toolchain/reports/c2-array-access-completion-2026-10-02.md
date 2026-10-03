# R39 已知数组读取键补全

日期：2026-10-02。范围为 `$options['mo|']` 与空下标，已应用当前分支。

## 实现

复用已证明的局部值、参数、属性、函数返回及 foreach 元素类型，在数组读取位置提供真实键名。支持嵌套形状、标点、中文、转义引号、数字键和 optional 标记；联合形状只推荐所有分支共有键。可选父字段需要已有非空保护才能继续提供嵌套键。

读取位置接受建议只插入带正确转义的键字符串，不插入数组构造中的 `=>`。闭合字符串的词中光标替换整个后缀；未闭合输入在独立查询副本补齐结尾，临时括号不进入文件或事实索引。恢复限制为文件 128 KiB、16 层分隔符／接收者路径，联合形状最多 32 分支和 2,048 字段预算。

未知调用、引用参数、重赋值、删除键、动态路径、eval/extract/include 及共享绑定不猜测原有形状。修复中实际发现 extract/include 四个负例仍错误保留键，复用已有动态绑定 CST 检查后通过；字符串里的相同词和未执行闭包内的 extract 不误伤正常候选。原数组创建键补全保留原有插入行为。

## 当前验证

| 检查 | 结果 |
| --- | --- |
| 新语义 | 79/79；接收者来源、作用域、未知调用、共享／动态绑定、未保存撤回、词中光标、空下标及保留／不保留 CST |
| 主产品全量语义 | 989/989，36 文件，49.96 秒 |
| 定向真实 stdio | 4 通过、423 跳过，总 427，14.12 秒；新增 PHP 7.2／8.5 各 28 状态，完整标签、替换范围、文本与无 `=>` 断言 |
| PHP 8.5 隔离可见列表 | 24 次，114–170 ms；精确 Tab 全文与 Undo/Redo，宿主退出码 0 |
| PHP 7.2 隔离可见列表 | 24 次，117–167 ms；精确 Tab 全文与 Undo/Redo，宿主退出码 0 |
| 热语义查询 | 0／2,300 背景文件共 800 次；最差场景 P95 32.61 ms；错误候选 0，revision 改变 0；不是可见弹窗等待 |
| 完整 Core C2 | 原会话 52398 退出码 0；全部既有流程及本批 28 状态的精确候选、未保存撤回／恢复通过 |
| 构建／bundle／宿主编译／定向 ESLint | 均退出码 0 |

日志：`/tmp/sophp-array-access-product-semantic-final.log`、`/tmp/sophp-array-access-product-stdio.log`、`/tmp/sophp-array-access-product-visible-{85,72}.log`、`/tmp/sophp-array-access-product-full-c2.log`、`/tmp/sophp-array-access-performance-final.log`。冻结三十项输入：`/tmp/sophp-array-access-product-inputs.sha256`。

本批没有再次运行全部 427 项 stdio；前批 R38 的 425/425 完整协议是其自身源码结果。PHP 8.5 宿主日志仍有独立复现的 VS Code renderer 异常，本批不声称修复。完整 C3 Symfony 快照组合与真实 WSL 长期使用仍待验证，整条路线图保持进行中。未打包、提交、推送或更新 Profile。

终态三十项冻结输入全部一致：`/tmp/sophp-array-access-product-final-inputs.log`。完整 Core C2 结果对应上述同一产品源码与 bundle。
