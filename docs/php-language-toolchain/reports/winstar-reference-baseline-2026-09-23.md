# Winstar References 基线重审

日期：2026-09-23。查询目标是 `src/Security/AdminPasswordChangeGuard.php` 中最后一个 `get`，先执行 References，再执行 Definition。当前 SoPHP 正式 bundle 和默认独立 Symfony Provider 参与查询。

旧基线在 Winstar `99715603` 上重建：174 处 References；将隔离 worktree URI 归一到正式 Winstar 路径后，完整位置 SHA-256 为 `a525dddaa628ccd7ee25dbd5dbfae0ead5e9ebedb434b9176336eb08c1c725e7`，与原门禁一致。之后的 Winstar 提交 `fee022c1` 使三处已有调用下移：

| 文件 | 原始行 | 当前行 | 原因 |
| --- | ---: | ---: | --- |
| `src/Http/Components/MetaInformation.php` | 338 | 359 | 新增描述提取方法 |
| `src/Modules/Company/Controller/CompanyController.php` | 126、127 | 129、130 | 新增描述回退调用 |

集合差异恰好是上述三个旧位置移除、三个新位置加入。现有工作树和 `15fef7b7` 干净隔离 worktree 均得到 174 处、同一归一化 SHA-256 `cdabb48f611946a59a3dc1be56c167caa83f65dafb84b3853c68b5c9c5ba88d4`；未提交的 FileExplorer 改动没有改变本次结果。Definition 仍为 `vendor/symfony/http-foundation/ParameterBag.php` 的唯一声明，原 SHA-256 `62e58df5676259065d46d41bd7c267435d09577f70420fd6f2d94308b16295e1` 未变。`ApplicationContextSubscriber.php` 的两处继承调用及 `Response.php` 的两处 vendor 调用继续由门禁逐项检查。

据此更新 `scripts/check-winstar-reference-baseline.mjs` 的 References 摘要。更新后运行 `pnpm check:references:winstar` 通过：冷查询 174 处、9,909 ms；随后 Definition 1 处、59 ms。阶段日志为候选准备 4,648 ms、容器 1,996 ms、路由 2,012 ms、事件 34 ms、语义 1,931 ms。静态路由 Provider 对此真实项目仍报告不完整快照，未将其当成完整路由图。此项只证明上述查询在当前 Winstar 源码上的位置准确性，不代表整个项目或真实编辑会话验收。
