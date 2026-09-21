# References：复用签名位置与函数声明索引

日期：2026-09-21。源码基线：`bb0fb45`。

## 选择依据

缓存压缩任务的 JSON 传输实验没有收益：同文件数冷查询从基线 8.032 秒变为 8.483 秒，峰值 RSS 从 752,488 KiB 变为 796,268 KiB，因此不保留。缓存预恢复回复的 JSON 实验没有足够同输入证据证明收益，也未纳入本轮。

继续审查语义阶段发现，`callableDeclarationsForSignature` 已持有签名的 URI、声明位置、种类和全限定名，却仍先构造整个工作区所有 callable 的中间数组。本轮先在该 URI 中找精确匹配；唯一匹配时直接返回，找不到或有歧义时继续原有全工作区回退，选择规则不变。

另外，变量的函数调用返回类型推断有两处同样先展开所有文件的全部 callable。它们改为使用已有 `declaration:function:<fqcn>` 倒排索引，只展开候选文件；未索引文件仍进入保守候选，并保留工作区插入顺序，避免改变原有首个匹配的行为。没有缩小 References 的文件扫描范围，没有增加跨版本结果缓存。

新增回归覆盖函数声明加入、缓存恢复、移除、namespace 改动以及不同 namespace 下同名函数的隔离。

## 同机串行结果

Winstar `AdminPasswordChangeGuard.php` 最后一个 `get`，每次独立 LSP 进程，先 Definition 后首次 References。冷查询使用空持久缓存，OS 文件缓存未清空。单次观测如下，不代表 P95。

| 版本 | 候选阶段 | 语义阶段 | References 响应 | 峰值 RSS（KiB） |
| --- | ---: | ---: | ---: | ---: |
| 新版冷查询 | 5.021 秒 | 2.643 秒 | 7.709 秒 | 775,528 |
| 基线冷查询 | 5.234 秒 | 2.855 秒 | 8.132 秒 | 763,252 |

两轮都扫描 2,285 个文件、解析 1,653 个候选，含 1,200 个仅声明候选。仅加入签名位置查找的先行 Reload 实验，语义阶段观测为基线 3.065 秒、新版 2.571 秒；由于外部源码编辑导致恢复数量不同，该结果只作热点判断参考。

每次均返回相同的 112 处 References，完整位置 SHA-256 `bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2`；Definition 的 1 处位置 SHA-256 为 `62e58df5676259065d46d41bd7c267435d09577f70420fd6f2d94308b16295e1`。

## 验证范围

语义包 288 项通过。此次采用语义包全量与 LSP 定向验证，完整发布门禁在阶段候选冻结时执行；没有将定向结果写成 LSP 全量通过。LSP 定向命令：

```bash
pnpm --filter @php-companion/language-server exec vitest run \
  -t 'references|rename|callable|Callable|signature|overload|return'
```

LSP 定向 48 项通过、156 项跳过，用时 43.94 秒；相关 TypeScript/ESLint 和正式 esbuild 构建通过。正式 bundle 冷查询 7.942 秒（候选 5.222 秒、语义 2.671 秒），峰值 RSS 752,404 KiB；Reload 首次 6.166 秒（候选 3.530 秒、语义 2.581 秒），峰值 RSS 520,760 KiB。两次均为相同 112 处完整位置，Reload 命中 2,284 个缓存条目、恢复 1,652 个候选。默认 `pnpm check:references:winstar` 通过，冷查询 7.548 秒，Definition/References 的完整位置摘要匹配。未冻结新 VSIX 或安装用户 WSL Profile。首次查询仍约 8 秒，优化目标未完成。
