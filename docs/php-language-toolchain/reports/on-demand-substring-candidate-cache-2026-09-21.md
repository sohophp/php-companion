# 按需 References 候选缓存与冷/热一致性

日期：2026-09-21

## 问题与修复

Language Server 的冷启动按需候选扫描在 `symbol` 模式下读取所有源码中包含目标名称子串的文件；持久缓存恢复却仅接受完整标识符命中。对 `get()` 这类常见方法，类名或其他较长标识符中的 `get` 也可能使冷查询读取该文件，Reload 后却被缓存跳过。两条路径选择的语义输入不一致，不能把热查询的少量结果当作可靠性能优化。

`@php-companion/index` 现在提供单独的 `substring-symbol` 候选判断，只供这一条原本就采用子串匹配的按需查询缓存使用；其他需要完整标识符的扫描继续使用 `symbol`。超过 128 字符的标识符现在使摘要不完整，恢复时必须保守读取源码。共享摘要缓存版本升至 `source-candidates-v2`，避免复用旧版本漏记超长标识符的记录。冷启动扫描及最终语义引用判定均未改变。

## 验证

- 索引包 28 项、Language Server 199 项、全仓 TypeScript 与 ESLint、24 个隔离 tarball 消费验证通过。
- VS Code 1.138.0 隔离 Profile 的打包核心与独立 Symfony VSIX 宿主测试以退出码 0 完成。
- stdio 回归用 `Target::get()`、实际调用、只含 `Getter` 子串的文件和无关文件证明：冷进程和 Reload 后都解析同一批 3 个候选，返回同一个调用位置；无关文件由缓存排除。
- 曾试验把冷查询也缩到完整标识符，真实 Winstar 的 `get()` References 从 112 处降至 66 处，虽然首次耗时约 94→61 秒，但结果不能维持既有覆盖，因此该试验已撤回且未进入交付代码。
- 当前代码以共享临时缓存先后运行两个独立 LSP 进程，查询 `src/Security/AdminPasswordChangeGuard.php` 的 `$request->attributes->get('_route', '')`：

| 请求 | 冷进程 | Reload 后进程 | 一致性 |
| --- | ---: | ---: | --- |
| Definition | 1 处，2.674 秒 | 1 处，2.840 秒 | 文件 URI 相同 |
| References | 112 处，95.431 秒 | 112 处，99.241 秒 | 涉及的 43 个文件 URI 集合相同 |

`scripts/benchmark-language-queries.mjs` 现可在原参数后传入共享缓存目录及 `once`，复现一次 Definition 和一次 References。该脚本只输出结果数量与文件 URI，**没有比较全部引用的行列坐标**；上表只证明数量和文件集合一致。真实 WSL VS Code Profile 的交互行为仍需单独验收。约 95–99 秒的高频方法 References 不符合日常编码预期，下一轮优化必须在同一真实项目上保持完整引用身份和位置集合，再评估耗时与内存，不能以减少候选换取速度。

## Alpha 候选

功能提交 `8922119`，候选目录 `artifacts/php-companion-alpha-0.4.5-89221196/`。核心、独立 Symfony、Open Source Pack 和 Recommended Pack 四份 VSIX 的 `SHA256SUMS` 全部通过；Winstar PHP 8.5 的确定性 WSL preflight 通过。手工 Alpha Profile 的 Extension Host 所有权、其他 PHP Provider 状态和持续编辑仍待实际检查。该候选未发布到 Marketplace。
