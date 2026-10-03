# C3 Extract Method：连续赋值与局部临时变量

日期：2026-10-02。在 R35／分支输出列表的完整 stdio 415/415、零跳过与十项输入终态一致之后，应用 [隔离准备](c3-extract-method-local-chain-preparation-2026-10-02.md)。

## 产品改动

复用现有直线赋值与数组返回流程，在源码顺序上证明标量依赖，允许临时变量进入后续表达式；仅接回后续需要的输出。覆盖原生标量参数、字面量、括号、数值加减乘及字符串连接；整数运算的 PHPDoc 保留溢出后的 `int|float`。闭包捕获和箭头读取参与输出识别，独立闭包局部与箭头参数遮蔽不混入输出。类型、引用、重复赋值、动态观察和预算边界见准备报告。

本项不支持循环、一般嵌套控制流、未知调用产生的中间值或通用副作用分析，不关闭整个 F08。

## 产品验证

| 检查 | 结果 |
| --- | --- |
| 全量语义 | 31 文件、749/749，50.32 秒 |
| 当前真实 stdio | PHP 7.2／8.5 两项通过、415 跳过，总数 417，6.35 秒；单输出／双输出／捕获／未知类型失效及恢复 |
| 编译、bundle、宿主编译、定向 ESLint | 均退出码 0 |
| 源码及编译产物与隔离副本 | 两者各自 SHA-256 完全一致；隔离实际 CLI 的三版本 48 路径前后一致适用于同一语义实现 |
| 标准组合 C3 | 首次退出码 1；新增单输出／捕获输出预览、取消／应用、完整文本与一次 Undo/Redo 已通过，但后续 Symfony 未保存 dispatch References 漏项，完整组合未通过 |

当前完整 stdio 417 项未再全跑；上一批 415/415 是本增量应用之前的结果，下一批集中集成时再全跑。真实 WSL 与其它平台未验收。

源码 SHA-256 `d4b21d6aa1591ebb7bddeb6e650879907aec1ab5b3accdbb097cfbddb9952521`；semantic dist SHA-256 `9c610705973db2aa4ab070c8289ccf6d658827c9cf07cfb963435921b3a4ce2c`。八项冻结输入 `/tmp/sophp-extract-local-chain-product-inputs.sha256`，首次宿主终态后八项全部匹配；结果 `/tmp/sophp-extract-local-chain-product-first-final-inputs.log`。

日志：`/tmp/sophp-extract-local-chain-product-semantic.log`、`/tmp/sophp-extract-local-chain-product-stdio.log`、`/tmp/sophp-extract-local-chain-product-build.log`、`/tmp/sophp-extract-local-chain-product-bundle.log`、`/tmp/sophp-extract-local-chain-product-host-compile.log`、`/tmp/sophp-extract-local-chain-product-lint.log`、`/tmp/sophp-extract-local-chain-product-host.log`。实际 PHP 数据见相邻 JSON。

未打包、提交、推送或更新 Profile。

## 组合失败的诊断

首次宿主在 Symfony listener References 场景只返回 listener 声明，没有未保存 dispatch 文件。日志 `/tmp/sophp-extract-local-chain-product-host.log`；没有把新增提取场景通过当作完整组合通过。

增加测试运行器的可选 `PHP_COMPANION_TEST_FAILURE_LOG_DIR`：失败时保留隔离夹具和扩展日志，然后仍清理原临时目录。不改变产品设置或放宽断言。使用同一产品构建开展一次诊断运行，日志 `/tmp/sophp-extract-local-chain-product-host-diagnostic.log`；当前运行中，未计通过。不在没有证据时循环重试。

### 已保存的诊断证据与资源清理

诊断运行同样退出码 1，保留 `/tmp/extension-failure-6AiNbl/fixture`。SoPHP 日志反复报告 `php-companion.symfony.services` 的 bounded project snapshot 无法完成，后续事件查询耗时为 0，表明其前置服务事实不可用。保留夹具的 src 共 200 个 PHP 文件、154,687 字节，最大 36,145 字节，不触及单文档或总体字节限额；服务 ProjectTypes 的数量和字符串量也远低于限额。当前快照最多接收 128 份文档，新增测试积累打开缓冲区是待实测确认的数量边界。

修正仅清理已结束的四个新增分支／局部依赖夹具：完整 Undo/Redo 断言后保存、关闭，并检查 document.isClosed。事件查询前记录实际打开的 PHP/YAML/XML 文档数与字符数，保留原引用断言和原容量预算。静态检查、宿主编译通过；新的完整组合运行 `/tmp/sophp-extract-local-chain-product-host-cleanup.log` 正在执行，不能预先计通过。

新十项冻结输入 `/tmp/sophp-extract-local-chain-cleanup-inputs.sha256`，包括资源清理后的 C3 用例和失败日志运行器；产品语义、协议及 bundle 没有改变。不会再对未改变的构建进行盲目重试。

### 第二种资源清理方式

仅关闭活动编辑器的运行在已完成三输出的断言之后失败：document 仍未关闭，日志 `/tmp/sophp-extract-local-chain-product-host-cleanup.log`，保留 `/tmp/extension-failure-pJytkT/fixture`。这次未到达事件引用场景，不能判断数量边界是否恢复。

随后按夹具 URI 枚举所有 TabInputText／TabInputTextDiff，保存并关闭对应标签，再要求 document.isClosed；记录实际标签数。编译、静态检查通过，新运行 `/tmp/sophp-extract-local-chain-product-host-tabs.log` 正在执行，十项基准 `/tmp/sophp-extract-local-chain-tabs-inputs.sha256`。若仍失败，保留证据并停止反复尝试此清理问题。

同时 [末尾 return 的隔离准备](c3-extract-method-local-return-preparation-2026-10-02.md)取得 18 项新测试、767 全量语义及三版本 72 实际路径的通过证据；尚未应用主源码或计入当前组合。

### 清理尝试停止与独立工作继续

按 URI 关闭标签的第二种清理方式同样失败，日志 `/tmp/sophp-extract-local-chain-product-host-tabs.log`，保留 `/tmp/extension-failure-n0Vk2i/fixture`。日志确认该夹具只有一个匹配标签，关闭后文档仍未释放；这次也没有到事件查询，不能将快照数量恢复计为通过。十项冻结输入终态全部匹配，见 `/tmp/sophp-extract-local-chain-tabs-final-inputs.log`。

停止继续尝试此清理方式。移除本轮新增且失败的测试清理要求，保留原有产品预览／应用／Undo/Redo 及 Symfony References 的全部断言；不放宽产品预算。已支持的局部提取检查提为共享函数，独立执行入口 `PHP_COMPANION_TEST_C3_LOCAL_EXTRACTION_ONLY=1` 用于继续验收新的能力，全套也调用相同函数。独立入口不是完整 C3 组合的替代证据，完整组合的 Symfony 快照边界仍开放。

下一项末尾 return 已在产品语义 767/767、四项定向 LSP 与编译／静态检查通过，见 [产品报告](c3-extract-method-local-returns-2026-10-02.md)。
