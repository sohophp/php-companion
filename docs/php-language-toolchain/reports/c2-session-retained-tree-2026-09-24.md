# C2 按需长序列中的语法树释放

日期：2026-09-24。使用仓库新建的独立两文件 Composer PHP 8.5 夹具、真实 Language Server stdio 和默认 `onDemand`。每轮打开声明文件、未保存地把 `@return list<Alpha>` 改成 `list<Beta>`、核对使用方的补全/Hover/Definition，关闭声明文件后再核对磁盘 Alpha 的补全和旧 Beta Definition 撤销。基准命令：`node scripts/benchmark-c2-session.mjs 5000`；`pnpm benchmark:c2-session -- 5000` 可从源码重新构建后运行。未修改业务项目，也未打包 VSIX。

## 发现与修复

修复前 5,000 轮均无旧结果，查询 P95 基本平稳，但 Language Server RSS 从 **143.3 MiB 升到 186.6 MiB**。按每 1,000 轮分组的 RSS 均值依次为 **159.2、165.1、171.0、177.0、182.7 MiB**。显式 GC 的 3,000 轮对照中，`external` 约 34 MiB、JS heap 只小幅变化，RSS 仍增加；去掉补全和导航查询后，编辑与关闭循环也出现相近增长。

进一步的 SemanticWorkspace 隔离循环发现：打开文件时调用 `update(uri, source, true)` 保留语法树；关闭时调用 `update(uri, diskSource, false)` 虽从 `trees` 映射移除了旧树，却没有对旧树调用 `delete()`。20,000 轮相同文件的开改关中，修复前 `external` 从约 **33.7 MiB** 增至 **116.7 MiB**，RSS 末值约 **241.9 MiB**，文档数量始终为 1。现在更新时总会释放先前保留的树；定向语义测试同时检查打开后的增量更新和关闭为磁盘快照时各释放一次。修复后同一隔离循环的 `external` 保持约 **33.7 MiB**，RSS 在后半段约 **133–135 MiB**。

真实 stdio 的修复后 5,000 轮仍无旧结果，RSS 从 **144.1 MiB 到 149.3 MiB**；五段均值为 **147.0、146.9、146.4、146.9、147.8 MiB**。修复前后变更诊断 P95 为 **29.20/29.06 ms**，Beta 补全 **1.78/1.78 ms**，Hover **1.58/1.60 ms**，Beta Definition **2.38/2.41 ms**，关闭 **3.63/3.61 ms**，Alpha 补全 **1.65/1.68 ms**，旧 Definition 撤销 **6.48/6.48 ms**。这些是本机单进程样本，不是物理输入到屏幕显示的时间。

语义包完整测试 4 个文件、319 项通过；Language Server 全套 18 个文件、335 项通过、1 项按原设置跳过，相关真实 stdio 5 项也单独通过。两包类型检查、相关 ESLint 与差异检查通过。单次 5,000 轮约 219 秒，证明这条小项目操作序列没有观察到持续 RSS 增长；数小时真实编辑、更多文件与依赖、其它 PHP 版本、完整 Open Source Pack、WSL Remote 和跨平台仍待后续验收。
