# 首次引用基准的持久失败证据

2026-10-11。原真实项目基准在188/174不匹配后，只保留数量/摘要，finally清理时丢失全部位置明细；现为[原检查器](../../../scripts/check-winstar-reference-baseline.mjs)增加可选 `PHP_COMPANION_REFERENCE_EVIDENCE_DIR`。每次调用在指定目录下建立独立证据目录，逐阶段在断言前保存stdout JSONL、stderr、原始引用位置及子基准退出码/PID/项目路径/服务器入口；该子基准退出码不代表外层位置断言通过。目录须位于被测项目外，既有文件不覆盖。临时缓存继续由原finally清理。

例如 `PHP_COMPANION_REFERENCE_EVIDENCE_DIR=/var/www/node/php-companion/.vscode-test/reference-evidence pnpm check:references:winstar`。此前cold输出在reload失败前可能仍留在共享临时位置文件中，因此启用证据时每阶段先移除该输出文件；若新阶段未写位置，记录缺失，不把cold位置标成reload结果。默认不启用时保留原行为。移除新增可选分支和导入后，与修改前检查器逐字一致；174及两项完整位置SHA、原首次查询顺序/继承/vendor位置断言保持。

[六项独立子进程控制](../../../scripts/test/reference-baseline-evidence.test.mjs)全部通过：默认成功/清理、重复调用不覆盖、175/174不匹配后保留全部175位置、子基准失败保留部分输出、reload失败不复用cold位置，以及拒绝在业务项目内保存证据。命令 `node --test scripts/test/reference-baseline-evidence.test.mjs`；定向Lint通过。首轮Lint漏导入URL的失败保留，修正后重新验证。测试使用受控子进程输出，不是新的PHP/LSP、真实项目或编辑器资格。

旧业务基线来自提交`15fef7b7d5d00bff8a7cdd2e967638100db68712`；对照当前锁文件观察到9个依赖版本变化，Composer文件及项目提交均已变化。这解释了需要审查基线的数据身份，但不证明188位置正确或已知根因；HTTP Foundation锁版本一致，也不证明旧vendor字节完全一致。原真实项目失败和缺失位置明细继续保留，本轮未重复现场查询、未把174改为188；原失败检查器源码可由本轮before证据恢复。[机器记录](reference-baseline-durable-evidence-2026-10-11.json)及[11文件归档](../../../.vscode-test/d1760-reference-evidence-archive/manifest.json)。

正常八运行时资产、209包JS及正在运行的222输入保持。两小时合成会话已观察真实异常退出恢复：旧LS 1815052结束、新LS 1835782首个查询正确/磁盘不变；长程仍在运行，不判完整多小时通过。三规模worker与后续原同进程矩阵继续。166编号/14家族、未完成大项26保持，日常Profile未更新；原C1–C4/R4、P0–P9/F01–F14与全部历史失败范围继续。

后续[实际路径边界修正](reference-baseline-evidence-path-boundary-2026-10-11.md)补充符号链接和尚未创建子目录保护，当前10项子进程控制通过；本报告六项及原归档保留为初始资格证据。

后续[历史源码对照与当前基准刷新](winstar-reference-baseline-refresh-2026-10-11.md)完成位置审查并更新当前188门禁；本页原174/失败及对应源码归档保留为当时快照证据。
