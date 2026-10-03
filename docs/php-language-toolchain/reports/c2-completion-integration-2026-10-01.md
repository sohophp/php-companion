# 补全集成回归与内置声明扫描修复

日期：2026-10-01。沿现有补全专项推进，未打包、提交、推送或更新 Profile。

## 实际发现与修复

1. 隔离 C1 可见弹窗中 `func` 等待约 17–19 秒。CPU 采样显示普通声明的弃用查询进入 `namespaceAt → importScope → parseTree`，反复解析未保留语法树的大型内置文档。`declarationDeprecation` 先检查声明范围有无 Attribute；没有时直接读取相邻 PHPDoc。保留现有 Attribute 身份及版本测试，并加入零重复解析回归。
2. `dra` 列表虽包含 `'draft'`，Enter 却接受 `BUS_ADRALN`。字面量候选现在按无引号内容提供 `filterText`，插入仍保留引号。定向 LSP 覆盖普通、命名参数、空前缀、单双引号及未闭合引号；C1 核验实际 Enter 文本。
3. 全量 stdio 的四个 Safe Move 用例超时，定向复跑均可重现。移动规划与协调把内置文档的全部 rawNames 当作可写引用文件检查。两个消费者扫描现在跳过 `php-companion-builtin:`；目的类型冲突检查仍包含内置类型。新增回归验证项目引用被更新、内置文档不被重新解析或编辑、内置类型冲突仍拒绝移动。

## 编辑器验证改进

- 单字符输入通过 CDP 键盘事件发送；保留多字符文本输入路径。
- 声明关键字与名称列表按预期状态等待，避免读到上一词的列表。
- `enum e` 先核对当前文档版本的语义候选，再检查实际可见列表为空。VS Code API 聚合的静态 Snippet 不作为语义候选；实际可见列表仍完整检查，PHP 的现有 `snippetSuggestions=none` 设置保持原样。
- API 诊断限制为五秒，避免失败报告本身无限等待。

## 验证记录

| 验证 | 结果与范围 |
| --- | --- |
| 语义最终全量 | 16 文件、534/534 通过，59.34 秒 |
| 全量 stdio，最后两项修复前 | 339 通过、4 失败、1 跳过，共 344 项；1068.51 秒；不记为全量通过 |
| 修复后完整 stdio | 343 通过、1 跳过，共 344 项；992.40 秒，退出码 0；日志 `/tmp/sophp-completion-integration-stdio-final.log`；这轮启动早于新增条件 PostgreSQL 用例，后者另有标准入口定向证据 |
| 最终定向 stdio | 四项原失败 Safe Move 与两项字面量用例，6/6 通过，16.54 秒 |
| C1 真实可见弹窗与接受文本 | 最终源码隔离宿主退出码 0；连续 func/function、类/枚举名称、public、魔术方法、return、新实例、实参/字面量、Tab 模板与 Undo 通过 |
| C1 可见等待 | func 最后字符到正确列表 15 ms；另外六次弹窗样本 259/221/229/230/223/230 ms，median 230 ms、max 259 ms；这些可见值不等同于热语义查询 P95 |
| C2 全量源码宿主 | 本轮较早修订退出码 0；最后扫描修复后的结果不以此替代 |
| 最终 C3 全量源码宿主 | 退出码 0；移动预览、外部修改保护、清理异常、重命名/生成/提取及 Undo/Redo 通过；日志 `/tmp/sophp-completion-move-final-c3.log` |
| 静态检查 | language-server typecheck、相关 ESLint、git diff --check 通过 |

可见宿主为隔离 VS Code 1.140.0，不能替代用户实际 WSL 窗口验收。宿主日志仍有 VS Code 自身 `getItemsByProvider` 异常，当前最终用例退出码 0；不声称消除了编辑器的所有异常。临时使用 bundle 执行两项 stdio 用例时，由于未传扩展宿主的启动资源参数超时；该试验不记为产品通过，临时测试文件已清理，最终协议验证使用标准 package server 入口。

冻结语料新增 R01–R06，映射 URL 合同、字符串列表、preg_split flags、候选说明生命周期、安全变量类型与 PHPDoc 条件类型，见 [冻结语料](../completion-acceptance-corpus.md)。完整 stdio 的修复后回归已通过；后续新增声明仍分别验证，整体候选门禁和真实 WSL 验收要求保持不变。
