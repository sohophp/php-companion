# 固定真实项目输入的引用基准差异

2026-10-11。以私有物化副本固定当前Winstar源码、vendor、配置/模板/翻译、Composer锁和实际Provider读取的var/cache/dev。66,079文件在稳定源时间戳/git epoch内复制并逐文件核对，随后独立重验；查询前后66,079项目输入及233工具输入均无变化，实际Composer根、映射和生成classmap路径均在私有副本内。

原检查器、174数量和完整摘要不变，正常bundle、原独立Symfony注册、生产模式、冷References先于Definition保持。检查器退出1：仍得到188引用。将私有URI映射回原项目URI后，完整位置摘要为`150426ceb9eece75caba3d1aee97d62cf354d015f1a0d532836bda444a94773c`，与此前现场188结果完全一致；因此本次可在稳定输入中复现，不再受本次查询前后文件变化的干扰。原基准`174/cdabb48f…`仍未通过，未改成188。

全部188原始位置已在原断言之前保存，分布为src 133、tests 18、vendor 37。独立核对每个URI来自固定输入、文件摘要一致且UTF-16范围覆盖实际get词元；这不独立证明它们全部属于正确的方法身份，也不证明多出的14处都是合法新调用。旧174原始位置集合及原vendor字节身份仍缺少足够对照，后续需要固定历史输入的集合审查。

Definition返回1个声明。其完整原始摘要在该固定vendor源码的get词元候选中唯一匹配；把这个精确位置映射回原URI后，与原Definition完整SHA`62e58df…`一致。此位置是由完整返回摘要和固定源码唯一重建，未声称helper直接保存了原始Definition数组。首次References 16,038ms；性能来自当前固定项目和工具快照，不与不同历史输入作门槛比较。静态路由Provider仍报告不完整快照，其原日志保持。

副本准备的实际失败均保留：误扫其它缓存环境；通用JSON清单误选不属于Composer/Provider输入的运维probe文件且读权限失败；错误地强制要求源项目不存在的symfony.lock。按当前生产路径固定输入根，没有改变业务文件/权限或读取probe内容；已物化的66,079文件稳定副本在纠正不存在文件断言后独立重新验证，未重复复制，也未在准备失败时执行任何业务查询。

当前取得的是固定输入测量/原始位置保留/进程清理资格，原引用门禁仍失败。所有观察到的LS、helper、Provider/驱动均已结束，自有缓存移除；私有固定源码副本保留供差异审查。正常产品资产未重建，未更新Profile或业务基线。166编号/14家族、未完成大项26及原C1–C4/R4、P0–P9/F01–F14继续。

[机器记录](fixed-real-reference-baseline-mismatch-2026-10-11.json)；[位置独立核对](../../../.vscode-test/d1778-fixed-reference-location-terminal-audit.json)；[22文件归档](../../../.vscode-test/d1779-fixed-reference-mismatch-archive/manifest.json)。

后续[历史源码对照与当前基准刷新](winstar-reference-baseline-refresh-2026-10-11.md)完成位置审查并更新当前188门禁；本页原174/失败及对应源码归档保留为当时快照证据。
