# C1 冷启动首次查询

日期：2026-09-24。独立 Composer 夹具含锁定的 30 个真实依赖包、Guzzle/PSR 源码和 9,100 个无关 PHP 文件；合计约 10,130 个 PHP 文件。测试为每种查询启动全新隔离 VS Code 1.139.0 Linux Extension Host，使用源码构建的 SoPHP Core、默认 `onDemand`，不打包 VSIX。测试在打开一个指向 `ResponseInterface::getStatusCode()` 的 PHP 文件后，只发一次编辑器命令，不用重试等待结果。

第一次冷 References 命令返回 `[]`，而等待语言服务响应的测试握手后，相同的首次语义查询返回 2 处引用，耗时 1,329 ms。检查发现 Core `activate()` 同步返回 API，但语言客户端仍在异步启动；测试刚取得激活结果时，VS Code 的 References Provider 尚未注册。现在 Core 完成语言客户端启动后才结束激活，注册命令与其它本地功能的顺序保持原状。此改动不使索引提前扫描；它让激活完成成为 Provider 已可用的边界。

| 全新宿主的单次命令 | 结果 | 编辑器命令等待 | 服务器处理 | 候选扫描 |
| --- | --- | ---: | ---: | ---: |
| References | 2 处，包含当前项目调用 | 1,157 ms | 未单独记录 | 未单独记录 |
| Implementation | 1 处，Guzzle `Response.php` | 1,651 ms | 1,510 ms | 1,492 ms |

两次均退出码 0、候选版本重试 0。随后同一规模源码宿主的 10 轮未保存 Response/Request 类型切换完成 60 次六项查询，结果全部正确，退出码 0；热态 Implementation 中位数 4 ms，References 中位数 93 ms。改动文件 ESLint、测试 TypeScript 与源码构建通过。测试只证明隔离 Linux 宿主的首次命令；它没有覆盖用户 Profile、Remote、其它系统或数小时会话。

额外运行较大源码宿主套件时，执行到 C2 控制流诊断检查：预期 10 条不可达语句，只收到 7 条，缺少同文件 `never` 调用后的三处。该套件退出码 1，故不列为本次通过证据。相同缺口在 Open Source Pack 默认 `onDemand` 门禁中已经记录；仍需独立判定此处配置与索引完整性条件，随后修复 C2 诊断一致性。
