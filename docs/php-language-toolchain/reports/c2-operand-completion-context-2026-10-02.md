# C2：运算操作数的补全合同

日期：2026-10-02。当前分支的 R29 增量在 R26–R28 完整 stdio 395/395 及 17 项冻结输入终态一致之后应用；不借前一批结果声称本项再次全量集成。

## 修复

既有 CST 上溯在一元、转换与非 ?? 二元运算处撤回外层结果的预期类型。takesText(!$value)、比较与算术表达式的操作数不再因外层 string 参数把字符串变量排到首位。保留全部变量候选，未知时使用原默认顺序；不猜测布尔或数字操作数合同。内层调用先停在自身 arguments，?? 继续复用已有取值合同。

临时副本六项红例与修法记录见 [准备记录](c2-operand-completion-preparation-2026-10-02.md)。产品源码只调整有界上下文遍历，不改变诊断、结果类型、缓存格式或能力所有者。

## 当前证据

| 检查 | 结果 |
| --- | --- |
| 当前分支全量语义 | 22 文件、587/587，48.74 秒 |
| PHP 7.2／8.5 标准 LSP | 新增两项及原条件上下文两项，共 4/4；string→int→string 未保存版本分别核对六个位置，所有三种变量仍存在 |
| 隔离 Core C2 | 正确的 C2_ELVIS_ONLY 入口退出码 0；操作数／结果排序、未保存合同修改、Undo/Redo 通过，既有条件与对象列用例同批通过；属于定向宿主而非完整 C2 或可见弹窗 |
| 100 轮实际 stdio 编辑 | 首位与共享候选均正确，0 incomplete；P50 2.51、P95 4.81、最大 26.61 ms |
| 构建与静态检查 | semantic build、生产 bundle、宿主测试 TypeScript、四文件 ESLint、diff 检查通过 |

基准是独立小型 Composer fixture，不代表大型 vendor 或可见弹窗等待；[原始数据](c2-operand-completion-benchmark-2026-10-02.json)。本项沿用前一批冻结语料，保留原 60 项、D01–D30 与 R01–R28，新增 R29。

## 失败记录与边界

首轮 LSP 把多个含未定义部分变量的调用放在同一作用域，前序不确定调用导致后续变量类型证明撤回，两个类型排序正例失败。改成各表达式独立作用域后重跑通过，没有修改产品类型证明规则或降低候选断言；一般跨调用不确定性不在本次修法中解决。

宿主最初两次使用未识别的环境变量简称，实际进入通用测试入口并因不存在的 Broken.php 失败；不作为本项通过或失败证据。随后按 runTest.ts 的 PHP_COMPANION_TEST_CORE_ONLY、PHP_COMPANION_TEST_C2_ONLY、PHP_COMPANION_TEST_C2_ELVIS_ONLY 正式名称执行目标流程。相关旧日志保留。

当前完整 stdio 共 397 项尚未再全跑；真实 WSL、跨平台、renderer 异常仍单列。未打包、提交、推送或更新 Profile。

原始日志 `/tmp/sophp-operand-context-{full-semantic,lsp-final,host-scoped,lint-final}.log`，以及 build、bundle、test-build-final 日志。
