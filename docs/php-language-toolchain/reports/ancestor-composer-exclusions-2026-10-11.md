# Composer排除规则的祖先包根索引

2026-10-11。正常474b8ff4选区请求CPU观测为1465ms，1230个主线程区间样本与单调时钟对齐；另六个worker profile保留。路径排除判断包含约144ms样本，native文件open/read/stat/fstat/close自身合计约545ms。采样仅用于确定下一项，不作正常性能资格或唯一根因判断。

原排除规则已有按ComposerProject缓存的编译正则，但每个文件仍扫描所有依赖包的排除作用域。本轮按规范化包根建立Map，只检查文件路径的全部祖先包根；同一安装根的多个作用域保留，父项目规则继续生效，仍执行原相对路径、通配符和边界判断。无排除作用域时直接返回false。公开Project声明逐字保持，未减少源候选或文件内容校验。

同一固定Composer元数据下，66079文件的旧/新布尔判定逐个一致，2218个排除位置保持；单次整体判定2502.41→729.57ms。十四项完整Project测试通过，新增共享安装根/父排除/嵌套包及64无关包的正反例；Windows分支本轮未执行。正常Core bundle的PHP7.2/8.5 × onDemand/progressive四项首次References精确保留声明与合法调用者两个位置，排除目录内调用不进入结果。另十四项准备引用新鲜度与读取竞态通过，Project严格构建、下游LS严格typecheck、正常bundle及定向Lint通过。

固定项目正常选区查询单次 **1351ms**，此前未采样正常单次 **1435ms**。完整188引用、Definition1、原完整位置摘要及四个继承/vendor锚点保持，原1000ms门槛仍失败，reload未执行。两项单次计时不是P95或统计资格。原检查器与CPU私有检查器逐字一致；冻结输入、进程与自有缓存终态核对，实际测量时测试源码在后续增加四项排除协议前已保存并按摘要验证。

[机器报告](ancestor-composer-exclusions-2026-10-11.json)；[终态审计](../../../.vscode-test/d1821-ancestor-exclusions-terminal-audit.json)；[证据归档](../../../.vscode-test/d1821-ancestor-exclusions-archive/manifest.json)。正常bundle SHA256为`8a5051de9532b1623898c9058cef486d9c3a607f263b9968ed0aa3488b79ab5a`。新增F04-REF-09，170编号/14家族、路线图未完成大项26。新构建完整LSP/六流程、1秒性能、编辑器/平台/Remote及完整F13/P9/R4继续；日常Profile未更新，未提交或发布。
