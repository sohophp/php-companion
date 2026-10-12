# Winstar 引用基准重审与当前数据刷新

2026-10-11。原174门禁在当前业务源码中返回188；先保留失败，再固定66,079输入复现同一完整摘要，现以历史业务提交15fef7b7做独立控制。历史2,687源码/配置/Composer元数据由Git blob逐字验证；与当前固定副本共用完全相同的63,187个vendor/dev元数据文件和正常工具。历史控制恢复原174及完整归一摘要cdabb48f…，因此历史门禁没有被改成另一份更易通过的数据。该控制采用当前vendor，不声称重建了历史vendor。

| 完整位置对照 | 数量 |
| --- | --- |
| 位置及源码行均保留 | 81 |
| 相同源码行仅行号移动 | 76 |
| 旧集合中未对应的业务位置 | 17 |
| 当前集合中加入的已审查位置 | 31 |
| 净变化 | +14 |

旧src/tests/vendor分布134/3/37，当前133/18/37；业务源码净-1、测试净+15、vendor37不变。31个当前位置均核对为Symfony Request的attributes->get：原生Request参数/局部Request::create、继承的类型化Controller::$request，以及原生RequestEvent/ControllerEvent/ControllerArgumentsEvent通过KernelEvent::getRequest(): Request。Request::$attributes明确为ParameterBag；完整路径/UTF-16范围/文件摘要及来源记录见[逐位置审查](../../../.vscode-test/d1783-reference-source-control-review.json)。这解释集合的变动，不把净增14误称为简单新增14个调用。

[检查器](../../../scripts/check-winstar-reference-baseline.mjs)当前References基准更新为188，完整原项目URI摘要`150426ceb9eece75caba3d1aee97d62cf354d015f1a0d532836bda444a94773c`；Definition原完整摘要保持。reload恢复证明和selection计数统一使用该188基准，原3500ms/1000ms/100ms时限、首次References顺序、两项继承及两项vendor锚点保持。除数量、摘要及其计数依赖字段外，移除本次刷新可逐字还原修改前检查器。历史174、原失败及完整集合均保留。

当前固定副本重新执行严格检查器，引用188及Definition1的完整私有URI摘要、原四锚点和阶段检查全部通过，退出0；同时映射回原URI后符合当前公开摘要。私有副本通过原有fixture参数仅替换路径相关完整SHA，数量及其它断言不减；不声称直接在仍可能变化的现场目录执行了此新门禁。66,079输入和233工具输入终态保持，实际LS/helper/Provider/驱动与自有缓存均已结束/清理。

11项子进程控制及定向Lint通过，新增“数量仍188但完整位置改变”反例仍必须失败；证据保存、符号链接边界、reload失败位置隔离和清理控制保持。正常八资产及209包JS保持，未重建产品、未更新Profile或业务文件。

[机器记录](winstar-reference-baseline-refresh-2026-10-11.json)；[历史控制20文件归档](../../../.vscode-test/d1783-historical-reference-source-control-archive/manifest.json)；[当前严格门禁19文件归档](../../../.vscode-test/d1786-reference-baseline-refresh-archive/manifest.json)。原188失败和旧基线仍是各自快照的证据；当前只取得该固定项目/冷引用与定义门禁资格。reload/selection新基准实测、整个项目、编辑器/Remote及完整F13/P9/R4继续；静态路由Provider不完整日志保持。166编号/14家族、未完成大项26，日常Profile未更新。
