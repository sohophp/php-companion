# 高频成员 References 的语法树复用

日期：2026-09-21

功能提交：`e3875c60ba77c4ad5cb03c0b7b6bd723ff93d3d3`

## 问题与实现

真实 Winstar 的 `src/Security/AdminPasswordChangeGuard.php` 中，从 `$request->attributes->get('_route', '')` 发起 References，上一 Alpha 候选需要约 94 秒。`get` 是高频方法名，按需候选扫描会读取 2,278 个项目文件并解析约 1,647 个候选。分段计时显示扫描约 30 秒，之后 `SemanticWorkspace.references()` 仍约 67 秒。

CPU 采样定位到两个重复工作：成员和继承关系查询线性遍历已加载文件查声明；同一候选文件的多个成员调用反复解析整个 PHP 语法树。现在成员与继承查询复用已有声明倒排索引；References 对每个候选文件只临时保留一棵语法树，并在该文件处理结束后释放。最终身份判定、候选规则和返回位置均未放宽或减少。Language Server 增加语义段耗时日志，基准脚本支持独立 LSP 路径、CPU 采样、失败原因输出及完整位置摘要。

## 真实项目对照

从冻结旧候选 `artifacts/php-companion-alpha-0.4.5-89221196/` 的打包语言服务器，与当前源码构建的语言服务器，分别在独立 LSP 进程中查询同一 Winstar 文件、符号和位置。旧版/新版输出按 URI 与行列排序后计算 SHA-256；此次对照分别使用新临时缓存，不复用另一个版本的索引事实。

| 查询 | 旧候选 | 当前代码 | 精确位置对照 |
| --- | ---: | ---: | --- |
| Definition | 1 处，2.546 秒 | 1 处，2.727 秒 | SHA-256 一致 |
| References | 112 处，93.555 秒 | 112 处，41.804 秒 | SHA-256 一致：`bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2` |

当前代码再次以全新共享缓存运行冷、热两个独立 LSP 进程，References 为 112/112 处、41.804/40.822 秒，URI 与全部位置摘要一致。当前查询日志显示 2,278 个项目文件、631 个摘要缓存排除、1,647 个语义候选；候选扫描约 29.1 秒，语义 References 约 11.2 秒，总请求约 40.3 秒。上述数字为单次真实项目观测，不是性能分位数或跨机器承诺。

## 验证与限制

- 语义包 279 项、Language Server 199 项、全仓 TypeScript 与 ESLint、24 个独立 tarball 消费验证通过。
- 专项回归对同一文件的三个成员使用只解析至多两次，并与长期保留语法树的工作区比较**完整引用位置集合**。
- 候选目录 `artifacts/php-companion-alpha-0.4.5-e3875c60/` 的四份 VSIX 通过内容校验和 `SHA256SUMS`，Winstar PHP 8.5 的确定性 WSL preflight 通过。
- VS Code 1.138.0 隔离 Profile 的打包 Extension Host 同时加载核心与独立 Symfony VSIX，测试进程和 Extension Host 均以状态码 0 退出。
- 高频方法 References 仍需约 40 秒，主要剩余成本是候选扫描；不能把这次优化视为交互性能问题已结束。真实 VS Code WSL Alpha Profile 的持续编辑、扩展所有权及其他 PHP Provider 冲突仍待人工验收。
