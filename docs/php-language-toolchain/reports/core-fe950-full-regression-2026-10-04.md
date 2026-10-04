# fe950b54 组合源码完整 LSP 回归

## 当前状态：通过，输入已核对

干净工作区与提交 fe950b5408bbbf7f67c1eeaed634520594474f0d 启动默认 `pnpm --filter @php-companion/language-server exec vitest run`。原会话 82886，日志 `/tmp/sophp-core-fe950-full-lsp.log`；运行期间核对 pnpm PID 1428859、Vitest PID 1428998 和持续更换的 stdio 服务器进程。

最终原会话退出码 0：58 个测试文件通过，857 项通过／1 项跳过（858 总计），用时 1644.40 秒。跳过项为未设置 PHP_COMPANION_TEST_REFERENCE_BUNDLE 的跨进程引用恢复用例。PHP_COMPANION_TEST_PHP_BINARIES 未配置，真实 PHP 语法版本矩阵没有实例化用例，不能记入本轮通过证据。终态 `/tmp/sophp-core-fe950-full-verification.json` 再次核对完整输入集合与哈希：2960 项，新增／删除／内容变化均为 0。固定输入已释放。

`/tmp/sophp-core-fe950-full-inputs.json` 固定 2960 项 src／test／scripts／dist／packages 源码、配置和产物；`/tmp/sophp-core-fe950-full-meta.json` 记录提交及启动时间。已确认包内 parser 有 cloneDocumentFacts，semantic 和服务器入口有 completionIdentifierPrefix，避免只核对根 bundle。默认并发、150 ms 热断言和条件跳过未改。

运行期间不修改这些输入，也不启动并行测试、构建或性能测量。终态需读取原会话的真实摘要和退出码，重新核对所有哈希及输入集合。报告文档不在固定的产品／测试输入中。此前 `4d52f320` 的 845 通过／1 条件跳过保持其旧输入范围，不用于证明本轮通过。

## 等待期间的只读审计

数组形状值位置是原补全计划范围内的候选相关性问题。当前 completeExpectedValues 调用 expectedArrayShapeValueType，以字段契约替代整个数组契约；completeFunctions／completeConstants／变量排序仍调用 expectedArgumentCompletionType 或 expectedVariableCompletionType，源码中未找到相同的字段类型入口。

这只是代码审计，尚未运行反例，不记为已复现或已修复。终态释放固定输入后，先验证 `array{enabled: bool}` 实参值内同前缀 bool／string 函数、常量和局部变量的排序；同时保护未知键、内层调用、运算、嵌套 shape 和普通参数。若已有其它路径正确处理，就保留证据而不重复改造。

进一步只读核对确认 expectedArrayLiteralRootType 反向调用原 expectedArgumentCompletionType／expectedVariableCompletionType 来取得整个数组契约，因此不能直接把字段分派塞进这些基础方法，否则可能递归或丢失根 shape。候选入口可另取字段契约，基础根契约保留。quotedArrayKey 的 onlyArrow 模式还要求键到当前值起点之间只有 `=>` 和空白；分组／运算／内层调用须区分，不能把任何数组祖先都当作直接字段值。后续应以实际查询证明当前行为，再决定代码位置，不在冻结期间实施。

goal active；不打包、提交、推送或更新 Profile。普通编辑 P95、真人 WSL、完整版本／平台及剩余 C1–C4 仍开放。

### 下一项验证边界（未执行）

已只读核对 `union-shape-completion.test.ts`、`branch-shape-completion.test.ts` 和 `named-value-completion.test.ts`。前两者覆盖共享 shape 键、字面量值、分支与嵌套根契约；后者覆盖普通／Attribute 命名实参的值契约。不能据此证明 shape 字段内所有符号候选的兼容排序。

释放冻结输入后，先对以下矩阵查询当前接口并记录实际 ranks 和顺序；尚不决定最终代码实现：

| 位置 | 验证内容 |
| --- | --- |
| 直接字段值 | 同前缀 bool／string 函数、常量、局部变量；保留不兼容和未知候选，兼容项优先 |
| 根契约来源 | 普通／命名实参、构造函数、返回值、已有变量赋值 |
| 嵌套与分支 | 嵌套 shape、共享字段的 union shape、括号、三元／coalescing／match 值分支 |
| 内层表达式 | 已知内层调用优先使用自己的实参类型；未知调用、闭包、运算不得继承外层字段类型 |
| 缺少证据 | 未知键、宽泛 array／mixed 的 union、无文档契约不猜测字段类型 |
| 文档与编辑 | retained／临时 CST、未保存更新、词中光标；查询不改变 revision 或文档事实 |

函数和常量入口当前仅对匹配数量 ≤ 64 计算类型排序；此预算也属于现有行为边界，不能在本项中悄悄取消。后续真实 LSP 还须核对最终 CompletionItem 顺序，语义 ranks 正确本身不能证明编辑器可见首项。

成员入口 `completeMembersWithImplementation` 使用 receiver 起点取得预期类型；`completeTypes` 的 `new` 候选使用 constructContext.start；变量入口还区分字符串插值。字段契约的验证应覆盖这些表达式起点，不能统一使用最后一个标识符的起点就认为所有入口已完成。成员／类型入口也保留 ≤ 64 的已有预算，成员只在内部排序，并不暴露与函数完全相同的 compatibilityRank 输出。

## 释放固定输入后的初始复现

`/tmp/sophp-shape-candidate-before.json` 保存当前 fe950b54 包产物的 12 次查询（6 种位置 × retained／临时 CST），未改源码或构建。直接 bool 字段内 bool／string 函数和常量都被标成 rank 2，未使用字段 bool 契约；局部变量按名称排序，string 变量在 bool 变量前。已知内层 string 调用的函数／常量排序正确，但内层 bool 调用里的 `tr` 无 true 候选，直接字段的括号分组 `tr` 也无 true 候选。证明存在不同入口不一致的问题，尚未修复；后续必须保护已正确的内层 string 调用排序。
