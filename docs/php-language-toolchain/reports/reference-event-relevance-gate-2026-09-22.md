# 首次 References 仅在可能命中时运行 Symfony 事件 Provider

产品基线 `bfee9ab`（代码与 `0e127a8` 相同）。默认 Symfony Provider 注册，正式 bundle，Winstar 只读、独立空缓存、References-first。

## 精确性边界

事件 Provider 只会把已注册服务的订阅关系返回给语言服务器；现有 References 结果也仅接受目标类型相同，或已注册服务的有效方法精确解析到目标方法的事实。因此查询先用同一服务目录与 `publicInstanceMethod` 判定是否有可能的事件引用。没有可能性时，不启动项目范围事件 Provider，也不使用可能残留的事件快照；有可能时维持原有完整 Provider、事件订阅、标签监听及 dispatch 验证流程。

新增 stdio 用例先查询不属于已注册服务的 `Other::get`，核对精确 PHP 调用引用及事件 Provider 未启动；随后查询已注册的 `Subscriber::onReady`，核对事件 Provider 确实运行。原有监听、dispatch、文件变化回归以及并发服务/路由回归继续通过。三项相关 stdio 测试 7.28 秒，构建、ESLint 与 diff 检查通过。

## 正式 bundle 交叉对照

查询 `AdminPasswordChangeGuard.php` 最后一个 `get`，每轮扫描 2,289 个项目文件。旧版为同一产品代码基线冻结的 bundle。四轮均返回相同的 112 处完整位置（SHA-256 `bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2`），随后 Definition 均相同。

| 顺序 | 旧版首次 | 新版首次 |
| --- | ---: | ---: |
| 旧→新 | 11,570 ms | 9,330 ms |
| 新→旧 | 11,604 ms | 9,362 ms |

单独新版冷查询为 9,553 ms，事件阶段 34 ms；原版事件 Provider 约 1.7–2.5 秒。另一轮完整查询中首次 9,740 ms，随后两次 References 为 867/922 ms，四次均保持相同位置。`AdminSecuritySubscriber` 新版冷查询 4,951 ms，仍提交事件 Provider，返回服务注册与事件订阅两处，完整位置摘要 `c0d5d86b7e083c6f21354d508f2897712e0b7b6a8663efd6cf2066788ff221fd`。

原始记录：`/tmp/php-companion-events-gate-{1-old,2-new,3-new,4-old,class,repeat}.{jsonl,log}`；单独新版首轮为 `/tmp/php-companion-events-gate-1.{jsonl,log}`。未冻结或安装新版 VSIX，也未完成实际 WSL Profile 持续编辑验收。

首次查询仍约 9–10 秒，Goal 继续。候选阶段约 5.2 秒是下一个主要目标；阶段诊断显示目录枚举约 0.27 秒，按文件顺序扫描约 4.65 秒，其中等待预读/worker 约 1.72 秒、缓存写盘约 0.25 秒，详见 [候选阶段归因](reference-candidate-stage-profile-2026-09-22.md)。
