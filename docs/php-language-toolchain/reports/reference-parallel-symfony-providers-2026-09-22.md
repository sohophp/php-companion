# 首次 References 并发读取 Symfony Provider

基线 `740efe9`，Winstar 仅作只读测量。目标是缩短独立 Symfony 服务容器与路由 Provider 在首次 References 中的串行等待，同时保持完整引用位置。

## 修改

候选文件扫描结束后，同时启动路由快照读取与容器事实刷新。后续服务注册引用仍使用已完成的容器事实，控制器路由引用仍使用已完成的路由快照。路由文件在等待期间改变时重新读取；结果返回前再次核对路由修订号，避免返回旧位置。请求提前取消时处理已经启动的路由任务拒绝。

新增 stdio 回归同时启用两个独立 Provider，以时间线验证执行区间确实重叠；修改路由 YAML 后再查询，验证使用新位置。四项相关 stdio 测试通过，TypeScript、ESLint、`git diff --check` 通过。

## 正式 bundle 对照

使用默认 Symfony Provider 注册，References-first，独立空缓存，查询 `AdminPasswordChangeGuard.php` 最后一个 `get`。旧版为修改前冻结的正式 bundle，新版为修改后的正式 bundle；按旧→新→新→旧交叉运行。各轮扫描 2,289 个文件，均返回 112 处，完整位置 SHA-256 均为 `bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2`，随后 Definition 均返回同一位置。

| 运行顺序 | 旧版首次 | 新版首次 |
| --- | ---: | ---: |
| 旧→新 | 12,809 ms | 11,193 ms |
| 新→旧 | 12,454 ms | 11,784 ms |

新版容器与路由阶段分别记录 790/809 ms、850/864 ms；两个阶段重叠，日志时长不可相加。旧版相应阶段分别是 755+574 ms、788+638 ms 的串行等待。候选、事件与语义阶段仍有独立波动，不能将墙钟差额全部归因于并发。作为类引用准确性补充，新版 `AdminSecuritySubscriber` 冷查询 5,219 ms，返回服务注册与事件订阅两处，完整位置摘要 `c0d5d86b7e083c6f21354d508f2897712e0b7b6a8663efd6cf2066788ff221fd`。

原始记录位于 `/tmp/php-companion-routes-parallel-{1-old,2-new,3-new,4-old}.{jsonl,log}` 与 `/tmp/php-companion-routes-parallel-class.{jsonl,log}`。仅对本次影响范围运行聚焦验证，未重复全仓测试、未冻结或安装新版 VSIX。

首次方法查询仍为约 11–12 秒，未达到满意的交互速度；实际 WSL Profile 持续编辑验收也未完成。下一步应优先针对约 5 秒的候选扫描阶段做可重复的归因实验，并保持完整位置对照。
