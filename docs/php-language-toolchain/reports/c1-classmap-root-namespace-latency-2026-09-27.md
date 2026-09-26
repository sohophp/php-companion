# C1 Composer classmap 根 namespace 建议等待

日期：2026-09-27。只在 SoPHP 隔离工作树及脚本生成的独立 Composer 项目测试；没有修改业务项目、安装到用户 Profile 或打包 VSIX。

## 复现

`new \Dom` 在约 9,982 个 PHP 文件的纯 PSR-4 项目中，三个冷进程的首次请求中位数为 47 ms，重复请求为 3 ms；刚输入 `new \` 的空前缀为 38/6 ms。相同规模的 Composer classmap 项目中，`new \Dom` 的首次请求中位数为 410 ms，重复请求仍需 247 ms。`use Dom` 在同一类 classmap 夹具中为 136/3 ms，说明重复等待主要来自原生类型候选路径。

复现命令：`SOPHP_BENCH_GROUPS=2,20 node scripts/benchmark-ondemand-type-completion.mjs psr4RootNamespace`、`psr4EmptyRootNamespace`、`classmapRootNamespace` 和 `classmapNamespace`。每档三个独立服务进程，每个进程对同一输入请求两次；数据是该机器的本机 stdio 样本，不能当成编辑器绘制时间或跨平台保证。

## 修复与结果

classmap/PSR-0 非 PSR-4 候选搜索会把命中截断为 64 个文件并正确标记为不完整，但此前只缓存完整搜索。重复的同前缀请求因此每次重扫 classmap，并重新读取已装载的同一批文件。现在复用有界路径集及其完整性标记；已在当前语义工作区装载的文件不再重复读取。缩小前缀仍建立新的搜索；Composer 或 PHP 文件变化时，现有类型搜索失效流程清除缓存。

同一约 9,982 文件夹具，改动后首次请求中位数为 406 ms，重复请求为 4 ms；约 1,000 文件时从 296/142 ms 改为 297/5 ms。首次 classmap 搜索仍是可见等待点，后续须测真实 VS Code 与更大 classmap 项目，再决定是否采用增量预取或更明确的进度反馈。

真实 LSP 定向回归覆盖超过 64 个 classmap 同前缀候选：重复请求保持 `isIncomplete`，随后文件监视通知使新增类可见，缩小前缀仍能找到第 69 个类。完整语言服务器 stdio 回归 200 项通过、1 项跳过；TypeScript 构建、定向 ESLint 与 diff 检查通过。
