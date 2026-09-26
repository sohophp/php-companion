# C1 Composer classmap 根 namespace 建议等待

日期：2026-09-27。只在 SoPHP 隔离工作树及脚本生成的独立 Composer 项目测试；没有修改业务项目、安装到用户 Profile 或打包 VSIX。

## 复现

`new \Dom` 在约 9,982 个 PHP 文件的纯 PSR-4 项目中，三个冷进程的首次请求中位数为 47 ms，重复请求为 3 ms；刚输入 `new \` 的空前缀为 38/6 ms。相同规模的 Composer classmap 项目中，`new \Dom` 的首次请求中位数为 410 ms，重复请求仍需 247 ms。`use Dom` 在同一类 classmap 夹具中为 136/3 ms，说明重复等待主要来自原生类型候选路径。

复现命令：`SOPHP_BENCH_GROUPS=2,20 node scripts/benchmark-ondemand-type-completion.mjs psr4RootNamespace`、`psr4EmptyRootNamespace`、`classmapRootNamespace` 和 `classmapNamespace`。每档三个独立服务进程，每个进程对同一输入请求两次；数据是该机器的本机 stdio 样本，不能当成编辑器绘制时间或跨平台保证。

## 修复与结果

classmap/PSR-0 非 PSR-4 候选搜索会把命中截断为 64 个文件并正确标记为不完整，但此前只缓存完整搜索。重复的同前缀请求因此每次重扫 classmap，并重新读取已装载的同一批文件。现在复用有界路径集及其完整性标记；已在当前语义工作区装载的文件不再重复读取。缩小前缀仍建立新的搜索；Composer 或 PHP 文件变化时，现有类型搜索失效流程清除缓存。

同一约 9,982 文件夹具，改动后首次请求中位数为 406 ms，重复请求为 4 ms；约 1,000 文件时从 296/142 ms 改为 297/5 ms。首次 classmap 搜索仍是可见等待点，后续须测真实 VS Code 与更大 classmap 项目，再决定是否采用增量预取或更明确的进度反馈。

真实 LSP 定向回归覆盖超过 64 个 classmap 同前缀候选：重复请求保持 `isIncomplete`，随后文件监视通知使新增类可见，缩小前缀仍能找到第 69 个类。完整语言服务器 stdio 回归 200 项通过、1 项跳过；TypeScript 构建、定向 ESLint 与 diff 检查通过。

## 首次请求的并行查询

下一步剖析发现，同一 Completion 同时需要 namespace 目录与类型候选，原流程串行等待两次独立查询。现在在同一个取消令牌和索引 epoch 下同时启动查询，等两者结束后再组装结果并复核文档版本；两条路径仍按原规则验证陈旧结果。

约 9,982 文件的 classmap 根 namespace 夹具，三个冷进程的首次请求中位数从 406 ms 降到 239 ms，重复请求仍为 4 ms。约 1,000 文件时首次从 297 ms 降到 190 ms；同规模 PSR-4 首次约 52 ms。此改动改变两个查询的交错时序；定向 PSR-4/classmap 测试、完整语言服务器 stdio 回归（200 项通过、1 项跳过）和 VS Code 1.139.1 隔离 C1 源码宿主均已通过。宿主中根 namespace、下一段 namespace 的接受操作及别名类补全仍正确。日志：`/tmp/sophp-c1-parallel-type-completion-stdio-20260927.log`、`/tmp/sophp-c1-parallel-type-completion-host-20260927.log`。数值仍是本机自动化样本，已安装 VSIX 和真实 WSL Remote 留待 C4。
