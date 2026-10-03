# phpstorm-stubs Redis 接入（2026-10-01）

按[前置审计](phpstorm-stubs-redis-audit-2026-10-01.md)的版本差异，SoPHP 现在使用项目 PHP 的 `phpversion('redis')` 选择本机反射快照。`scripts/sync-phpstorm-redis.mjs` 将固定 JetBrains/phpstorm-stubs 修订的四个类名称目录，与本机 Redis 4.3.0（PHP 7.2）、5.3.7（PHP 8.1）、6.3.0（PHP 7.4／8.5）逐项核对并生成声明数据。扩展未加载时整组类型撤回；未知扩展版本只推荐四组快照共同的方法及值一致的常量。

`Redis` 在三代扩展中分别提供 234／240／287 个直接方法，`RedisCluster` 分别为 185／190／255 个。`RedisSentinel` 在 4.3.0 不存在。`RedisArray` 的直接方法及上游明示、当前 Redis 版本可用的 `__call` 代理方法共同组成候选；生成声明中分别为 212／214／279 个方法。旧版 `getMultiple` 等别名保留，新版才有的 `acl` 等方法不会进入旧版候选；固定上游已有但本机 6.3.0 尚未导出的十个 `Redis` 方法不进入 6.3.0 候选。

异常类的父类也随 phpredis 版本变化：4.3.0／5.3.7 继承 `Exception`，6.3.0 继承 `RuntimeException`。方法参数名、必填数、引用方式、默认值和 PHPDoc 类型来自相应运行时反射；没有将上游现代原生类型直接放进旧 PHP 声明。此快照覆盖本机已审计的扩展构建，不声称覆盖所有 phpredis 小版本；未知版本的共享成员是保守后备。

客户端运行时传递路径也已修正：原先 Readline、PCNTL、PostgreSQL、XSL 的事实虽在探测器和语言服务器中存在，却没有从 VS Code 客户端发送；现与 Redis 一起通过共享序列化函数传递，避免后续字段再次遗漏。定向单元测试核对这些字段和客户端专用字段的排除。

固定上游同步、四版 PHP `-n -l`、四版解析器零错误、语言规格 119 项、运行时探测 25 项、客户端传递测试以及真实 stdio LSP 的 6.3→4.3→卸载切换测试通过。通用编辑热补全 P95 为 2.40 ms，热成员补全 P95 为 6.01 ms，均低于 150 ms 预算；该基准不是 Redis 专项 UI 测量。未打包、安装或更新 Profile，真实 WSL 可见列表仍待使用反馈。
