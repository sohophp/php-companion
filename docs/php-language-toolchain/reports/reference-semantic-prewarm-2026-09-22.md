# on-demand 工作区语义预热与首次 References

基线 `9310f36`，Winstar 只读，默认 Symfony Provider 注册，正式 bundle、独立空缓存、References-first。

语言服务器收到 `initialized` 后，在 `onDemand` 模式后台准备至多两个工作区的解析器与内建 PHP 语义事实，不启动项目源文件索引。查询若立即到达，会与预热共用同一个工作区 Promise；其余工作区仍按需创建。此工作会提前消耗启动期 CPU/内存，并没有降低完成一次冷查询所需的总计算量。

基准驱动新增可选 `PHP_COMPANION_BENCHMARK_INITIAL_IDLE_MS`（最多 5 秒），用于模拟编辑器打开后用户稍作停留再查询。设置为 2,000 ms，按旧→新→新→旧交叉运行：

| 顺序 | 原版首次点击 | 预热版首次点击 |
| --- | ---: | ---: |
| 原版→预热版 | 9,132 ms | 8,219 ms |
| 预热版→原版 | 9,170 ms | 8,430 ms |

四轮均返回相同 112 处完整引用位置（SHA-256 `bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2`），Definition 也一致。没有人为等待时，新版单轮为 9,296 ms、同样 112 处，不宣称完全冷启动总时长改善。此前入口诊断测得工作区与内建符号准备约 784 ms，与延后点击时节省的等待相符。

五项首次/重载引用及 Symfony 容器相关 stdio 测试、TypeScript、正式 bundle、ESLint 和 diff 检查通过。原始记录：`/tmp/php-companion-prewarm-{1-old,2-new,3-new,4-old,immediate}.{jsonl,log}`。未冻结或安装新版 VSIX，也未完成实际 WSL Profile 交互验收。

首次立即查询仍约 9 秒；即使预热完成，首次点击仍约 8 秒。Goal 继续，主要结构性成本仍是候选扫描与首次语义解析。
