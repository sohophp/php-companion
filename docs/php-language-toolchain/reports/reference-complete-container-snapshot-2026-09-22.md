# References 复用完整容器快照

产品基线 `2adc995`。Winstar 只读，正式 bundle，默认 Symfony Provider 注册。

## 问题与修复

此前 `ParameterBag::get` 不在服务目录中，故每次 References 都再次启动服务容器 Provider；即使上一次已取得完整权威快照，同一目标仍等待约 0.8 秒。路由 Provider 的缓存实际命中；原日志的 `routes elapsedMs` 包含并行容器阶段，不能把这段时间归因于路由。

成功提交完整容器事实后，记录当前输入修订号。后续目标类未列于服务目录时，若修订号未变则直接使用完整目录的否定结果。PHP 文档编辑、受监视文件变化、框架文档快照、Provider 注册和 Symfony 环境变化都使记录失效；Provider 运行期间若输入变化，则不提交旧版本。失败或不完整 Provider 不产生可复用的否定结果。

定向 stdio 回归连续查询不属于已注册服务的方法，验证服务 Provider 只运行一次；编辑 PHP 后再次查询，验证 Provider 重新运行，并确认相关订阅者仍启动事件 Provider。原有 YAML/XML 容器引用、服务资源 PHP 声明变化测试继续通过。两批共 6 项相关 stdio 测试、TypeScript 构建、正式 bundle、ESLint 与 diff 检查通过。

## 实际查询

基线正式 bundle 在同进程完整查询中的第二、第三次 References 为 867/922 ms，均重新等待容器 Provider 约 0.8 秒。修改后独立冷缓存完整查询为：首次 10,268 ms，第二次 40 ms，Definition 6 ms，第三次 References 36 ms。四次均保持 112 处完整引用位置摘要 `bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2`；两次重复查询的容器阶段为 0 ms、语义结果复用为 0 ms。首次样本的波动不支持宣称首次提速。

原始记录：`/tmp/php-companion-events-gate-repeat.{jsonl,log}`、`/tmp/php-companion-container-complete.{jsonl,log}`。路由缓存命中诊断见 `/tmp/php-companion-route-cache-diagnosis.log`。未冻结或安装新版 VSIX。

首次仍约 9–10 秒，Goal 继续；冷候选扫描与首次语义解析仍是主要耗时。
